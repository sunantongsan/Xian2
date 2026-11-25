import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../web/core.js';
import {monsterRewards,collectLoot,lootName} from '../web/ground-loot.js';
import {monsterStats,BOSS_HP,BOSS_DAMAGE} from '../web/balance.js';
import {World} from '../server/world.js';

test('ordinary and elite monsters drop COCKRO only, never equipment',()=>{
 for(const m of [{id:1000,level:1},{id:1030,level:31,elite:true},{id:2000,level:61}])for(const r of [0,.5,.99]){
  const s=fresh('sword-cockro');s.level=m.level;const drops=monsterRewards(s,{xp:0,...m},()=>r);
  assert.deepEqual(drops.map(d=>d.kind),['cockro']);assert(drops[0].count>0);
 }
});
test('bosses drop a 20x COCKRO share and a protection ticket 30% of the time, never equipment',()=>{
 const boss={id:1060,level:10,boss:true,xp:0},s=fresh('sword-cockro');s.level=10;
 assert.deepEqual(monsterRewards(s,boss,()=>0).map(d=>d.kind),['cockro','protection']);
 assert.deepEqual(monsterRewards(s,boss,()=>.99).map(d=>d.kind),['cockro']);
 let tickets=0;for(let i=0;i<2000;i++)tickets+=monsterRewards(s,boss).some(d=>d.kind==='protection');assert(tickets>450&&tickets<750);
});
test('protection tickets are collected up to the cap of five',()=>{
 const s=fresh('sword-cockro');s.protectionTickets=4;
 assert(collectLoot(s,{kind:'protection',count:1}));assert.equal(s.protectionTickets,5);
 assert.equal(collectLoot(s,{kind:'protection',count:1}),false);assert.equal(s.protectionTickets,5);
 assert.equal(lootName({kind:'protection',count:1}),'ใบป้องกัน');
});
test('bosses have much more HP and hit harder',()=>{
 const normal=monsterStats(50),boss=monsterStats(50,{boss:true});
 assert.equal(BOSS_HP,14);assert.equal(BOSS_DAMAGE,2.6);
 assert(boss.hp>=normal.hp*13);assert(boss.damage>=normal.damage*2.5);
});
test('the world holds many more bosses on every hunting map',()=>{
 const w=new World(),count=k=>w.mobs[k].filter(e=>e.def.boss).length;
 assert.equal(count('forest'),114);assert.equal(count('ruins'),114);assert.equal(count('star'),42);assert.equal(count('depths'),6);
 assert.equal(new Set(w.mobs.star.map(e=>e.id)).size,w.mobs.star.length);
});
