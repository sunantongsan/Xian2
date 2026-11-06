import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBillingService} from '../server/play-billing.js';
import {fresh,validSave} from '../web/core.js';
function fixture(t,receipt={}){
 const directory=mkdtempSync(join(tmpdir(),'coin-recipient-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const owner='a'.repeat(64),p={account:owner,id:owner,s:fresh('sword-cockro')},target={account:owner,id:'b'.repeat(64),s:fresh('demon-scorpion')};target.s.name='แมงป่อง';
 let consumed=0;const verifier={enabled:true,verify:async()=>({purchaseState:0,consumptionState:0,obfuscatedExternalAccountId:owner,obfuscatedExternalProfileId:target.id,...receipt}),consume:async()=>{consumed++;}};
 return {directory,p,target,verifier,consumed:()=>consumed,input:{productId:'cockro_gold_5000',token:'verified-purchase-12345'},persist:p=>writeFileSync(join(directory,p.id+'.json'),JSON.stringify(p.s)),resolve:profile=>profile===target.id?target:null};
}
test('verified profile gets coins even while another character is playing; survives restart and restore',async t=>{
 const f=fixture(t),api=createBillingService(f.directory,f.verifier);
 const result=await api.redeem(f.p,{...f.input,recipient:f.p.id},f.persist,f.resolve);
 assert.equal(result.character,f.target.id);assert.equal(f.p.s.stones,0);assert.equal(f.target.s.stones,5000);assert.equal(f.consumed(),1);
 f.target.s=validSave(JSON.parse(readFileSync(join(f.directory,f.target.id+'.json'))));
 const restarted=createBillingService(f.directory,f.verifier);assert((await restarted.redeem(f.p,f.input,f.persist,f.resolve)).duplicate);assert.equal(f.target.s.stones,5000);
 assert.equal(restarted.notifications(f.p.account,f.p.id).length,0);
 const notices=restarted.notifications(f.p.account,f.target.id);assert.equal(notices.length,1);assert.equal(notices[0].gold,5000);
 assert.throws(()=>restarted.acknowledge(f.p.account,f.p.id,notices[0].reference),/wrong_account/);
 restarted.acknowledge(f.p.account,f.target.id,notices[0].reference);assert.equal(restarted.notifications(f.p.account,f.target.id).length,0);
});
test('foreign owner, absent recipient and pending purchases never credit or consume',async t=>{
 for(const receipt of [{obfuscatedExternalAccountId:'c'.repeat(64)},{obfuscatedExternalProfileId:'d'.repeat(64)},{purchaseState:2}]){
 const f=fixture(t,receipt),api=createBillingService(f.directory,f.verifier);await assert.rejects(api.redeem(f.p,f.input,f.persist,f.resolve));assert.equal(f.target.s.stones,0);assert.equal(f.consumed(),0);
 }
});
test('destination save failure can retry without duplicate grants or lost notification',async t=>{
 const f=fixture(t),api=createBillingService(f.directory,f.verifier);
 await assert.rejects(api.redeem(f.p,f.input,()=>{throw Error('disk');},f.resolve));assert.equal(f.target.s.stones,0);assert.equal(f.consumed(),0);
 await api.redeem(f.p,f.input,f.persist,f.resolve);assert.equal(f.target.s.stones,5000);assert.equal(api.notifications(f.p.account,f.target.id).length,1);
});
