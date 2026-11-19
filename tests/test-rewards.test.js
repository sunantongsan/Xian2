import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {issueTestTicket,completeTestTicket} from '../server/test-rewards.js';
import {applyVerifiedReward} from '../server/rewarded-ads.js';
import {inventoryEntries} from '../web/inventory.js';
test('demo completion grants selected item once across restart and appears in visual inventory',()=>{
 let s=fresh('sword-cockro');const t=issueTestTicket(s,'protectionTicket');
 assert.equal(s.protectionTickets,0);
 assert.equal(issueTestTicket(s,'protectionTicket').nonce,t.nonce);
 assert.equal(completeTestTicket(s,t.nonce).duplicate,false);
 s=validSave(JSON.parse(JSON.stringify(s)));
 assert.equal(completeTestTicket(s,t.nonce).duplicate,true);
 assert.equal(s.protectionTickets,1);
 const items=inventoryEntries(s);
 assert(!items.some(e=>e.kind==='material'));assert.equal(s.protectionTickets,1);
 assert(!items.some(e=>e.key==='material:diamond'));
});
test('test grants reject missing, expired and invalid tickets and cap at 20 per day',()=>{
 const s=fresh('sword-cockro'),now=Date.now();
 assert.throws(()=>issueTestTicket(s,'fake'),/invalid_reward/);
 assert.throws(()=>completeTestTicket(s,'missing'),/invalid_test_ticket/);
 const t=issueTestTicket(s,'protectionTicket',now);
 assert.throws(()=>completeTestTicket(s,t.nonce,now+3600001),/invalid_test_ticket/);
 completeTestTicket(s,t.nonce,now);
 for(let i=1;i<20;i++){s.protectionTickets=0;completeTestTicket(s,issueTestTicket(s,'protectionTicket',now).nonce,now);}
 assert.equal(s.protectionTickets,1);
 assert.throws(()=>issueTestTicket(s,'protectionTicket',now),/test_limit/);
 assert(issueTestTicket(s,'protectionTicket',now+86400001));
});
test('Google verification never consumes demo tickets',()=>{
 const s=fresh('sword-cockro'),t=issueTestTicket(s,'protectionTicket');
 assert.throws(()=>applyVerifiedReward(s,{custom_data:t.nonce}),/unknown_ticket/);
});
