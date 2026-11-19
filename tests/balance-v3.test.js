import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave,damage,maxHP,combatStats} from '../web/core.js';
import {levelXP,previousLevelXP,monsterStats,migrateXP} from '../web/balance.js';

test('XP requirement rises 30% across the full level range without raising monster rewards',()=>{
 for(let l=1;l<=210;l++){
  const prior=(20+8*l)*Math.round(8+1.2*l+.006*l*l);
  assert.equal(levelXP(l),Math.ceil(prior*13/10));
  assert.equal(monsterStats(l).xp,20+8*l);
  assert.equal(monsterStats(l,{elite:true}).xp,(20+8*l)*3);
  assert.equal(monsterStats(l,{boss:true}).xp,(20+8*l)*10);
 }
});
test('v2 saves preserve XP-bar percentage once, all old points and upgraded items',()=>{
 for(const hero of ['sword-cockro','demon-scorpion','sword-dragonfly','sword-cricket']){
  for(const level of [1,5,19,20,59,60,119,120,209,210]){
   for(const fraction of [0,.25,.5,.999,1.25]){
    const old=fresh(hero);Object.assign(old,{level,balanceVersion:2,xp:Math.floor(previousLevelXP(level)*fraction),gold:912345,stones:321});
    delete old.mutationVersion;delete old.mutationStage;delete old.statProgressionVersion;delete old.legacyStatLevels;
    old.attributes={str:3*(level-1),vit:2*(level-1),agi:level-1,int:level-1};old.statPoints=3*(level-1);
    old.equip.weapon.plus=9;old.equip.weapon.gems={};
    const next=validSave(old);assert.equal(next.balanceVersion,3);
    assert(Math.abs(next.xp/levelXP(level)-old.xp/previousLevelXP(level))<=1/levelXP(level));
    for(const k of ['hero','level','gold','stones','attributes','statPoints','equip','bag'])assert.deepEqual(next[k],old[k],k);
    for(let i=0;i<3;i++)assert.deepEqual(validSave(JSON.parse(JSON.stringify(next))),next);
   }
  }
 }
});
test('new base growth strengthens existing builds without changing allocated attributes',()=>{
 for(const level of [1,20,60,120,210]){
  const s=fresh('sword-cockro');s.level=level;s.equip={};s.attributes={str:20,vit:20,int:20,agi:20};
  const before=structuredClone(s);
  assert(maxHP(s)>120+20*level+240);assert(damage(s)>16+4*level+40);
  assert(combatStats(s).mp>80+3*level+160);assert(combatStats(s).defense>.25*level+12);
  assert.deepEqual(s,before);
 }
});
test('monster rank and species toughness remain meaningful, with no premium-currency reward',()=>{
 for(const level of [1,20,60,120,210]){
  const normal=monsterStats(level),elite=monsterStats(level,{elite:true}),boss=monsterStats(level,{boss:true});
  assert(elite.hp>normal.hp&&boss.hp>elite.hp);assert(boss.damage>elite.damage&&elite.damage>normal.damage);
  assert(monsterStats(level,{toughness:1.4}).hp>normal.hp);assert(!('stones' in boss));
 }
 assert.equal(migrateXP(3060,20,2),3978);
});
