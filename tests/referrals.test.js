import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReferrals} from '../server/referrals.js';
import {fresh,validSave} from '../web/core.js';
function setup(t){const dir=mkdtempSync(join(tmpdir(),'cockro-referral-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return {dir,r:createReferrals(dir)};}
test('verified friend awards inviter 500 once, including reconnect and alternate character',t=>{
 const {r,dir}=setup(t),code=r.status('alice','google-a').code;assert.equal(r.redeem('bob','google-b',code).accepted,true);
 assert.throws(()=>r.redeem('bob','google-b',code),/referral_used/);assert.throws(()=>r.redeem('alice','google-a',code),/referral_self/);assert.throws(()=>r.redeem('guest',null,code),/google_required/);
 const s=fresh('sword-cockro');let saved;r.deliver('alice','main',s,v=>saved=validSave(v));assert.equal(saved.stones,500);assert.equal(r.status('alice','google-a').pending,0);
 const restarted=createReferrals(dir);restarted.deliver('alice','main',saved,()=>assert.fail());const alt=fresh('sword-cockro');restarted.deliver('alice','slot2',alt,()=>assert.fail());assert.equal(alt.stones,0);
});
test('failed delivery retries same character without losing or duplicating reward',t=>{
 const {r,dir}=setup(t),code=r.status('alice','a').code;r.redeem('bob','b',code);const s=fresh('sword-cockro');let disk;
 assert.throws(()=>r.deliver('alice','main',s,v=>{disk=validSave(v);throw Error('crash after save');}),/crash/);
 const restarted=createReferrals(dir);restarted.deliver('alice','slot2',fresh('sword-cockro'),()=>assert.fail());restarted.deliver('alice','main',disk,()=>assert.fail('receipt must prevent second credit'));assert.equal(disk.stones,500);assert.equal(restarted.status('alice','a').pending,0);
});
test('welcome grant is once per account; existing balances and full wallets are preserved',t=>{
 const {r}=setup(t),s=fresh('sword-cockro');r.deliver('new','main',s,()=>{},{welcome:true});assert.equal(s.stones,500);r.deliver('new','slot2',s,()=>assert.fail(),{welcome:true});assert.equal(s.stones,500);
 const old=fresh('sword-cockro');old.stones=50000;r.deliver('old','main',old,()=>assert.fail());assert.equal(old.stones,50000);
 const code=r.status('full','full-uid').code;r.redeem('bob','b',code);old.stones=1e7;r.deliver('full','main',old,()=>assert.fail());assert.equal(r.status('full','full-uid').pending,500);old.stones-=500;r.deliver('full','main',old,()=>{});assert.equal(old.stones,1e7);
});
test('deletion removes invite code and pending awards but does not reset referral eligibility',t=>{
 const {r}=setup(t),code=r.status('alice','a').code;r.redeem('bob','b',code);r.remove('alice');assert.throws(()=>r.redeem('carol','c',code),/referral_invalid/);assert.equal(r.status('bob','b').used,true);
});
