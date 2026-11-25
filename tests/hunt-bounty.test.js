import test from 'node:test';
import assert from 'node:assert/strict';
import {bountyRate,exchangeBounty} from '../web/hunt-bounty.js';
import {monsterRewards,collectLoot} from '../web/ground-loot.js';
import {fresh,validSave} from '../web/core.js';
import {COIN_CAP} from '../web/chain-economy.js';
import {hunterStatistics} from '../server/hunter-statistics.js';

test('ten G buys one COCKRO at any online population',()=>{
 for(const online of [0,1,100,101,1000,1001,10000,10001]){
  const s=fresh('sword-cockro');s.gold=10;
  assert.equal(bountyRate(),10);assert(exchangeBounty(s,online,{coins:1,rate:10,revision:0}));
  assert.equal(s.gold,0);assert.equal(s.stones,1);
 }
});
test('old saves start at zero and only the quoted whole coins can be exchanged',()=>{
 const old=fresh('sword-cockro');old.kills=80;delete old.bountyHeads;delete old.bountyRevision;
 const s=validSave(old);assert.equal(s.gold,0);assert.equal(s.bountyRevision,0);
 s.gold=42;
 const quote={rate:10,coins:4,revision:0};
 for(const change of [{coins:6},{coins:-1},{coins:0.5},{revision:1}]){
  assert.equal(exchangeBounty(s,99,{...quote,...change}),false);
 }
 assert.equal(exchangeBounty(s,101,{...quote,rate:2}),false);
 s.stones=COIN_CAP-1;assert.equal(exchangeBounty(s,100,quote),false);
 assert.equal(s.gold,42);s.stones=0;
 assert(exchangeBounty(s,100,quote));assert.equal(s.stones,4);assert.equal(s.gold,2);
});
test('wealth ranking includes old saves without active presence and excludes deleted characters',()=>{
 const stats=hunterStatistics({players:new Map(),getActor:()=>null}),p={s:fresh('sword-cockro')};
 stats.record('a',{name:'A',stones:15});stats.record('b',{name:'B',stones:900});stats.record('a',{name:'A',stones:10});
 assert.equal(stats.view(p).accounts,2);assert.equal(stats.view(p).leader.name,'B');
 stats.remove('b');assert.deepEqual(stats.view(p).leader,{name:'A',coins:10});
});

