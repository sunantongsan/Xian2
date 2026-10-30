import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {issueTestTicket,completeTestTicket} from '../server/test-rewards.js';
import {applyVerifiedReward} from '../server/rewarded-ads.js';
import {inventoryEntries} from '../web/inventory.js';
test('demo completion grants selected item once across restart and appears in visual inventory',()=>{
 let s=fresh('sword-cockro');const t=issueTestTicket(s,'ruby');
 assert.equal(s.upgradeItems.ruby,0);
 assert.equal(issueTestTicket(s,'ruby').nonce,t.nonce);
 assert.equal(completeTestTicket(s,t.nonce).duplicate,false);
 s=validSave(JSON.parse(JSON.stringify(s)));
 assert.equal(completeTestTicket(s,t.nonce).duplicate,true);
 assert.equal(s.upgradeItems.ruby,1);
 const items=inventoryEntries(s);
 assert.equal(items.find(e=>e.key==='material:ruby').count,1);
 assert(!items.some(e=>e.key==='material:diamond'));
});
test('test grants reject missing, expired and invalid tickets and cap at 20 per day',()=>{
 const s=fresh('sword-cockro'),now=Date.now();
 assert.throws(()=>issueTestTicket(s,'fake'),/invalid_reward/);
 assert.throws(()=>completeTestTicket(s,'missing'),/invalid_test_ticket/);
 const t=issueTestTicket(s,'ruby',now);
 assert.throws(()=>completeTestTicket(s,t.nonce,now+3600001),/invalid_test_ticket/);
 completeTestTicket(s,t.nonce,now);
 for(let i=1;i<20;i++)completeTestTicket(s,issueTestTicket(s,'ruby',now).nonce,now);
 assert.equal(s.upgradeItems.ruby,20);
 assert.throws(()=>issueTestTicket(s,'ruby',now),/test_limit/);
 assert(issueTestTicket(s,'ruby',now+86400001));
});
test('Google verification never consumes demo tickets',()=>{
 const s=fresh('sword-cockro'),t=issueTestTicket(s,'ruby');
 assert.throws(()=>applyVerifiedReward(s,{custom_data:t.nonce}),/unknown_ticket/);
});
