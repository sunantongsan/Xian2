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

test('open inventory refreshes for a kill and for a subsequent coin pickup',async()=>{
 const {inventoryKey}=await import('../web/inventory.js');
 const {monsterRewards,collectLoot}=await import('../web/ground-loot.js');
 const s=fresh('sword-cockro');
 const before=inventoryKey(s);
 const drops=monsterRewards(s,{id:1060,level:10,boss:true,xp:0},()=>.99);
 assert.equal(s.bountyHeads,10);
 assert.equal(s.stones,0);
 const afterKill=inventoryKey(s);
 assert.notEqual(afterKill,before);
 assert(collectLoot(s,drops.find(d=>d.kind==='cockro')));
 assert.equal(s.stones,1);
 assert.notEqual(inventoryKey(s),afterKill);
});

test('bounties use both levels before the kill and retain tenths across redemption and reload',async()=>{
 const {killBountyTenths,bountyBalance}=await import('../web/hunt-bounty.js');
 const {reward,xpNeed}=await import('../web/core.js');
 for(const [gap,factor] of [[-1,10],[0,10],[1,8],[9,8],[10,5],[19,5],[20,1],[99,1]]){
  for(const [flags,base] of [[{},1],[{elite:true},3],[{elite:true,boss:true},10]])
   assert.equal(killBountyTenths(10+Math.max(0,gap),{level:gap<0?11:10,...flags}),base*factor);
 }
 for(const [level,multiplier] of [[39,1],[40,2],[79,2],[80,3],[119,3],[120,4]])
  assert.equal(killBountyTenths(level,{level,boss:true}),100*multiplier);
 assert.equal(killBountyTenths(1,{level:120}),10);
 let s=fresh('sword-cockro');s.level=21;s.bountyHeads=19;
 for(let i=0;i<11;i++)reward(s,{id:1000,level:1});
 s=validSave(s);assert.equal(bountyBalance(s),20.1);
 assert(exchangeBounty(s,1,{coins:1,rate:20,revision:0}));
 assert.equal(bountyBalance(validSave(s)),.1);
 s=fresh('sword-cockro');s.level=39;s.xp=xpNeed(39)-1;
 reward(s,{id:1060,level:40,boss:true});assert.equal(s.level,40);assert.equal(bountyBalance(s),10);
});
