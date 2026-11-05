import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave,reward,xpNeed,damage,allocateStats} from '../web/core.js';
import {pendingMutation,mutationStage,completeMutation,mutationVisualLevel,DOCTOR_UV} from '../web/mutation.js';
import {World} from '../server/world.js';
import {MAPS,toWorld,walkable,routeTo} from '../web/maps.js';
import {heroAppearance} from '../web/hero-appearance.js';
import {mutationArtFor} from '../web/mutation-art.js';
const heroes=['sword-cockro','sword-dragonfly','sword-cricket','demon-scorpion'];
const grant=(s,xp)=>reward(s,{id:1,xp,gold:0},()=>1);
test('20 and 60 stop level and discard overflow, tickets and subsequent EXP until mutation',()=>{
 for(const hero of heroes)for(const gate of [20,60]){
  const s=fresh(hero);s.level=gate-1;s.mutationStage=gate===20?0:1;s.xp=xpNeed(s.level)-1;
  s.expBoost={multiplier:10,until:Date.now()+3600000};grant(s,1e7);
  assert.equal(s.level,gate);assert.equal(s.xp,0);assert.equal(pendingMutation(s).level,gate);
  const points=s.statPoints;for(let i=0;i<3;i++)grant(s,1e7);assert.equal(s.level,gate);assert.equal(s.xp,0);assert.equal(s.statPoints,points);
  assert.equal(validSave({...s,xp:999999}).xp,0);
  assert(completeMutation(s));assert.equal(s.xp,0);grant(s,1);assert(s.xp>0);assert.equal(s.level,gate);
 }
});
test('doctor resets attributes once, returns exactly allocated points and preserves other possessions',()=>{
 for(const level of [20,60]){
  const s=fresh('sword-cockro');s.level=level;s.mutationStage=level===20?0:1;s.statPoints=(level-1)*4;
  assert(allocateStats(s,{str:12,vit:8,agi:6,int:4}));s.skillRanks={s1:3};s.skillPoints=(level-1)*10-3;
  const before=structuredClone(s);assert(completeMutation(s));assert.equal(s.statPoints,(level-1)*4);assert.deepEqual(s.attributes,{vit:0,str:0,int:0,agi:0});
  for(const key of ['equip','bag','gold','stones','skillRanks','skillPoints','level'])assert.deepEqual(s[key],before[key]);
  const after=structuredClone(s);assert.equal(completeMutation(s),false);assert.deepEqual(s,after);
  let restored=validSave(s);for(let i=0;i<5;i++)restored=validSave(restored);assert.equal(restored.statPoints,s.statPoints);assert.equal(restored.mutationStage,s.mutationStage);
 }
});
test('existing 4.38 characters keep completed mutations and XP; new pending characters retain old appearance',()=>{
 for(const hero of heroes)for(const level of [19,20,59,60,120,210]){
  const old=fresh(hero);old.level=level;old.xp=17;delete old.mutationVersion;delete old.mutationStage;
  const copy=validSave(old);assert.equal(copy.mutationStage,level>=60?2:level>=20?1:0);assert.equal(copy.xp,17);assert.equal(pendingMutation(copy),null);
 }
 const s=fresh('sword-cricket');s.level=20;assert.equal(mutationVisualLevel(s),19);assert.equal(mutationArtFor(s.hero,mutationVisualLevel(s)),null);
 completeMutation(s);assert.equal(mutationVisualLevel(s),20);assert.equal(mutationArtFor(s.hero,mutationVisualLevel(s)),'cricket-scientist');
});
test('server requires living player at doctor in town, out of combat, and rejects repeated requests',()=>{
 const w=new World(),s=fresh('sword-cricket');s.level=20;s.statPoints=76;const p=w.join('mutator',s),at=toWorld(DOCTOR_UV,MAPS.town);
 assert(walkable(MAPS.town,at));assert(routeTo(MAPS.town,toWorld(MAPS.town.spawn,MAPS.town),at).length>0);
 let now=100;for(const mode of ['away','forest','dead','combat']){
  Object.assign(p,at,{map:'town',hp:100,lastPvp:-Infinity});if(mode==='away')p.x+=500;if(mode==='forest')p.map='forest';if(mode==='dead')p.hp=0;if(mode==='combat')p.lastPvp=now;
  w.command(p,{type:'op',op:'mutate',stage:2},now++);assert.equal(p.opResult.ok,false,mode);assert.equal(s.mutationStage,0);
 }
 Object.assign(p,at,{map:'town',hp:100,lastPvp:-Infinity});w.command(p,{type:'op',op:'mutate',stage:2},now++);assert.equal(p.opResult.ok,true);assert.equal(s.mutationStage,1);assert(w.events.some(e=>e.kind==='mutation'));
 const snapshot=w.snapshot(p);assert.equal(snapshot.self.mutationStage,1);assert.equal(heroAppearance(snapshot.self.save).mutationStage,1);
 w.command(p,{type:'op',op:'mutate'},now);assert.equal(p.opResult.ok,false);assert.equal(s.statPoints,76);
});
