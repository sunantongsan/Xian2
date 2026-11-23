import test from 'node:test';
import assert from 'node:assert/strict';
import {bountyRate,exchangeBounty} from '../web/hunt-bounty.js';
import {fresh,validSave} from '../web/core.js';
import {COIN_CAP} from '../web/chain-economy.js';
import {hunterStatistics} from '../server/hunter-statistics.js';

test('rates follow current online accounts at tenfold thresholds, up and down',()=>{
 for(const [online,rate] of [[1,20],[100,20],[101,40],[1000,40],[1001,80],[10000,80],[10001,160],[90,20]])assert.equal(bountyRate(online),rate);
});
test('old saves start at zero and only the quoted whole coins can be exchanged',()=>{
 const old=fresh('sword-cockro');old.kills=80;delete old.bountyHeads;delete old.bountyRevision;
 const s=validSave(old);assert.equal(s.bountyHeads,0);assert.equal(s.bountyRevision,0);
 s.bountyHeads=82;
 const quote={rate:20,coins:4,revision:0};
 for(const change of [{coins:5},{coins:-1},{coins:0.5},{revision:1}]){
  assert.equal(exchangeBounty(s,99,{...quote,...change}),false);
 }
 assert.equal(exchangeBounty(s,101,quote),false);
 s.stones=COIN_CAP-1;assert.equal(exchangeBounty(s,100,quote),false);
 assert.equal(s.bountyHeads,82);s.stones=0;
 assert(exchangeBounty(s,100,quote));assert.equal(s.stones,4);assert.equal(s.bountyHeads,2);
});
test('wealth ranking includes old saves without active presence and excludes deleted characters',()=>{
 const stats=hunterStatistics({players:new Map(),getActor:()=>null}),p={s:fresh('sword-cockro')};
 stats.record('a',{name:'A',stones:15});stats.record('b',{name:'B',stones:900});stats.record('a',{name:'A',stones:10});
 assert.equal(stats.view(p).accounts,2);assert.equal(stats.view(p).leader.name,'B');
 stats.remove('b');assert.deepEqual(stats.view(p).leader,{name:'A',coins:10});
});
