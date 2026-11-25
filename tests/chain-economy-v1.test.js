import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {enhance,COSTS,SUCCESS,PRACTICE,trainingPoints,creditOnlineMinute,onlineRate} from '../web/chain-economy.js';
import {issueTestTicket,completeTestTicket} from '../server/test-rewards.js';
test('all enhancement tiers require no stones or training, enforce full price and protected loss',()=>{
 for(let p=0;p<12;p++){
  const s=fresh('sword-cockro');s.level=210;s.stones=1000000000;s.protectionTickets=5;const it={plus:p};
  const a=enhance(s,it,true,()=>0);assert.equal(a.success,true);assert.equal(it.plus,p+1);assert.equal(s.stones,1000000000-COSTS[p]);assert.equal(s.protectionTickets,4);
  if(p>0){it.plus=p;s.stones=1000000000;assert.equal(enhance(s,it,true,()=>.999).success,false);assert.equal(it.plus,p);assert.equal(s.stones,999950000);assert.equal(s.protectionTickets,3);
   s.stones=1000000000;enhance(s,it,false,()=>.999);assert.equal(s.stones,1000000000-COSTS[p]);assert.equal(it.plus,p);}
  s.level=1;s.stones=1000000000;s.upgradeItems={};assert.equal(enhance(s,{plus:p},false,()=>0).success,true);
 }
 assert.equal(trainingPoints({level:100}),495);assert.equal(SUCCESS[11],15);assert.equal(PRACTICE[11],1000);
});
test('ticket cap, duplicate callback and save persistence',()=>{
 const s=fresh('sword-cockro');s.protectionTickets=4;const ticket=issueTestTicket(s,'protectionTicket');completeTestTicket(s,ticket.nonce);completeTestTicket(s,ticket.nonce);assert.equal(s.protectionTickets,5);assert.throws(()=>issueTestTicket(s,'protectionTicket'));assert.equal(validSave(s).protectionTickets,5);
});
test('reward boundaries and fractional carry survive save',()=>{
 assert.deepEqual([99,100,999,1000,99999,100000].map(onlineRate),[5,2.5,2.5,1,1,.5]);let s=fresh('sword-cockro');creditOnlineMinute(s,100);assert.equal(s.stones,2);s=validSave(s);creditOnlineMinute(s,100);assert.equal(s.stones,5);
});

