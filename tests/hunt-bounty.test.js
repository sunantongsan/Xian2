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

test('open inventory refreshes for a kill and for a subsequent coin pickup',async()=>{
 const {inventoryKey}=await import('../web/inventory.js');
 const {monsterRewards,collectLoot}=await import('../web/ground-loot.js');
 const s=fresh('sword-cockro');
 const before=inventoryKey(s);
 const drops=monsterRewards(s,{id:1060,level:10,boss:true,xp:0},()=>0);
 assert.equal(s.gold,0);assert(collectLoot(s,drops.find(d=>d.kind==='huntGold')));assert.equal(s.gold,83);
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
 for(const [gap,normal,elite,boss] of [[-1,90,270,900],[0,90,270,900],[1,72,216,720],[9,72,216,720],[10,45,135,450],[19,45,135,450],[20,9,27,90],[99,9,27,90]]){
  for(const [flags,expected] of [[{},normal],[{elite:true},elite],[{elite:true,boss:true},boss]]){
   assert.equal(killBountyTenths(11+gap,{level:11,...flags}),expected);
  }
 }
 for(let level=1;level<=240;level++){
  if(level>1)assert(killBountyTenths(level,{level})>killBountyTenths(level-1,{level:level-1}));
 }
 assert.equal(killBountyTenths(1,{level:120}),3768);
 let s=fresh('sword-cockro');s.level=21;s.gold=9;
 for(let i=0;i<11;i++)collectLoot(s,monsterRewards(s,{id:1000,level:1})[0]);
 s=validSave(s);assert.equal(bountyBalance(s),14.5);
 assert(exchangeBounty(s,1,{coins:1,rate:10,revision:0}));
 assert.equal(bountyBalance(validSave(s)),4.5);
 s=fresh('sword-cockro');s.level=39;s.xp=xpNeed(39)-1;
 collectLoot(s,monsterRewards(s,{id:1060,level:40,boss:true},()=>0)[0]);assert.equal(s.level,40);assert.equal(bountyBalance(s),488);
});

test('event uses world time at death, doubles only G, and ends at the advertised boundary',async()=>{
 const {World}=await import('../server/world.js');
 const {killBountyTenths}=await import('../web/hunt-bounty.js');
 const w=new World({goldEvent:{startMs:20000,endMs:30000,multiplier:2},rng:()=>0});
 const s=fresh('sword-cockro'),p=w.join('event-hunter',s);
 s.level=120;w.enter(p,'depths');
 const boss=w.mobs.depths.find(e=>e.def.boss);
 for(const [when,multiplier] of [[19.999,1],[20,2],[29.999,2],[30,1]]){
  const snapshot=w.snapshot(p,when);
  assert.equal(snapshot.goldDropMultiplier,multiplier);
  const preview=killBountyTenths(s.level,boss.def,snapshot.goldDropMultiplier)/10;
  boss.hp=1;const first=w.loot.length;w.hit(p,boss,1,when);
  const drops=w.loot.slice(first);
  assert.equal(drops.find(d=>d.kind==='huntGold').count,preview);
  assert.equal(drops.find(d=>d.kind==='cockro').count,1);
 }
 const normal=fresh('sword-cockro'),boosted=structuredClone(normal);
 const regularDrops=monsterRewards(normal,boss.def,()=>0,1);
 const eventDrops=monsterRewards(boosted,boss.def,()=>0,2);
 assert.deepEqual(boosted,normal);
 // Each equipment instance has its own ID even when both rolls are identical.
 const comparable=drops=>drops.slice(1).map(d=>d.item?{...d,item:{...d.item,id:null}}:d);
 assert.deepEqual(comparable(eventDrops),comparable(regularDrops));
 assert.equal(eventDrops[0].count,2*regularDrops[0].count);
});
