import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAccounts} from '../server/accounts.js';
import {characterId} from '../server/characters.js';
import {createBillingService} from '../server/play-billing.js';
import {fresh} from '../web/core.js';
const hash=v=>createHash('sha256').update(v).digest('hex');
function setup(t,options){const dir=mkdtempSync(join(tmpdir(),'account-management-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const token='a'.repeat(64),account=hash(token),s=fresh('sword-cockro');s.name='QA Hero';writeFileSync(join(dir,account+'.json'),JSON.stringify(s));return {dir,token,account,api:createAccounts(dir,options)};}
async function password(f){await f.api.manage(f.token,{action:'setPassword',password:'safe-pass-429'});}
test('change password requires old secret; deletion rejects wrong phrase/password without losing data',async t=>{
 const f=setup(t);await password(f);await assert.rejects(f.api.manage(f.token,{action:'setPassword',password:'other-pass',oldPassword:'wrong'}),/wrong_password/);
 await assert.rejects(f.api.manage(f.token,{action:'deleteAccount',password:'safe-pass-429',confirmText:'wrong'}),/confirmation_mismatch/);
 assert(existsSync(join(f.dir,f.account+'.json')));await f.api.manage(f.token,{action:'setPassword',oldPassword:'safe-pass-429',password:'new-safe-429'});
 await assert.rejects(f.api.manage(f.token,{action:'deleteAccount',password:'safe-pass-429',confirmText:'ลบบัญชี COCKRO'}),/wrong_password/);
});
test('whole account deletion purges all slots, archive and backup; revokes token; receipt becomes unlinkable',async t=>{
 const f=setup(t);await password(f);const slot=characterId(f.account,'slot2');writeFileSync(join(f.dir,slot+'.json'),readFileSync(join(f.dir,f.account+'.json')));
 for(const sub of ['deleted-characters','release-backups/before-test','play-receipts'])mkdirSync(join(f.dir,sub),{recursive:true});
 writeFileSync(join(f.dir,'deleted-characters',slot+'-123.json'),'{}');writeFileSync(join(f.dir,'release-backups/before-test',f.account+'.json'),'{}');
 writeFileSync(join(f.dir,'play-receipts',hash('receipt')+'.json'),JSON.stringify({owner:f.account,character:slot,orderId:'GPA.private',product:'cockro_gold_5000',gold:5000,credited:true}));
 const out=await f.api.manage(f.token,{action:'deleteAccount',password:'safe-pass-429',confirmText:'ลบบัญชี COCKRO'});assert.equal(out.identityCleanupPending,false);
 for(const p of [f.account+'.json',slot+'.json','deleted-characters/'+slot+'-123.json','release-backups/before-test/'+f.account+'.json'])assert(!existsSync(join(f.dir,p)));
 assert.throws(()=>f.api.resolve(f.token),/account_deleted/);assert(f.api.deletion.isCharacterDeleted(slot));
 const receipt=readFileSync(join(f.dir,'play-receipts',hash('receipt')+'.json'),'utf8');assert(!receipt.includes(f.account));assert(!receipt.includes(slot));assert(!receipt.includes('GPA.private'));
 const restarted=createAccounts(f.dir);assert.throws(()=>restarted.resolve(f.token),/account_deleted/);assert(restarted.deletion.isCharacterDeleted(slot));
});
test('Google password recovery binds to same identity and grants one short-lived reset',async t=>{
 let uid='qa-google';const fetcher=async u=>({ok:true,json:async()=>u.includes('/token?')?{access_token:'test'}:{id:uid,identities:[{provider:'google'}]}});
 const f=setup(t,{fetcher});const link=await f.api.authStart(f.token);const signed=await f.api.authFinish(link.flow,'code');f.token=signed.token;await password(f);
 await assert.rejects(f.api.manage(f.token,{action:'setPassword',reset:true,password:'recovered-pass'}),/reauth_required/);
 let flow=await f.api.authStart(f.token,'resetPassword');uid='different-google';await assert.rejects(f.api.authFinish(flow.flow,'code'),/wrong_google_account/);
 uid='qa-google';flow=await f.api.authStart(f.token,'resetPassword');const proof=await f.api.authFinish(flow.flow,'code');assert(proof.passwordReset);
 await f.api.manage(proof.token,{action:'setPassword',reset:true,password:'recovered-pass'});
 await assert.rejects(f.api.manage(proof.token,{action:'setPassword',reset:true,password:'again-pass'}),/reauth_required/);
});
test('identity deletion stays pending without admin access and retries server-side without reviving game data',async t=>{
 let deleted=false;const fetcher=async(u,options)=>{if(options.method==='DELETE'){deleted=true;return {ok:true};}return {ok:true,json:async()=>u.includes('/token?')?{access_token:'test'}:{id:'qa-google',identities:[{provider:'google'}]}};};
 const f=setup(t,{fetcher,adminKey:''});const begin=await f.api.authStart(f.token),session=await f.api.authFinish(begin.flow,'code');f.token=session.token;await password(f);
 const result=await f.api.manage(f.token,{action:'deleteAccount',password:'safe-pass-429',confirmText:'ลบบัญชี COCKRO'});assert(result.identityCleanupPending);
 await f.api.deletion.processPending();assert(!deleted);const again=await f.api.authStart();await assert.rejects(f.api.authFinish(again.flow,'code'),/deletion_pending/);
 const retry=createAccounts(f.dir,{fetcher,adminKey:'server-only-test-key'});await retry.deletion.processPending();assert(deleted);
 const request=JSON.parse(readFileSync(join(f.dir,'account-deletions',f.account+'.json')));assert(request.identityComplete);assert(!request.uid);assert.throws(()=>retry.resolve(session.token));
});
test('history is account-scoped, paginated, preserves verified order/test status and never reveals tokens',async t=>{
 const f=setup(t);const actor={account:f.account,id:f.account,s:fresh('sword-cockro')};const api=createBillingService(f.dir,{enabled:true,verify:async()=>({purchaseState:0,consumptionState:0,obfuscatedExternalAccountId:f.account,obfuscatedExternalProfileId:f.account,orderId:'GPA.test',purchaseTimeMillis:'123456789',purchaseType:0}),consume:async()=>{}});
 for(let i=0;i<21;i++)await api.redeem(actor,{productId:'cockro_gold_5000',token:'verified-test-token-'+i},()=>{});
 assert.equal(api.history('different').purchases.length,0);assert.equal(api.history(f.account).purchases.length,20);assert.equal(api.history(f.account).nextOffset,20);const next=api.history(f.account,20);assert.equal(next.purchases.length,1);assert.equal(next.nextOffset,null);assert.equal(next.purchases[0].orderId,'GPA.test');assert(next.purchases[0].test);assert.equal(next.purchases[0].purchasedAt,123456789);assert(!JSON.stringify(next).includes('verified-test-token'));
 assert.throws(()=>api.history(f.account,-1));
});
