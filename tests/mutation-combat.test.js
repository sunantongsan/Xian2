import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave,maxHP,damage,combatStats} from '../web/core.js';
import {JOB_PATHS,mutationGrowth} from '../web/job-progression.js';
import {knownSkills,compileSkill} from '../web/skills.js';
import {monsterStats} from '../web/balance.js';
test('mutation boundaries boost base combat, retain equipment and never stack on reconnect',()=>{
 for(const hero of Object.keys(JOB_PATHS))for(const level of [20,60]){
  const s=fresh(hero);s.level=level-1;const before=[maxHP(s),damage(s),combatStats(s).mp,combatStats(s).defense];
  s.level=level;const after=[maxHP(s),damage(s),combatStats(s).mp,combatStats(s).defense];
  after.forEach((v,i)=>assert(v>before[i]*1.12,`${hero} ${level} stat ${i}`));
  const equip=structuredClone(s.equip),gold=s.gold,stones=s.stones;
  let copy=validSave(s);for(let i=0;i<4;i++)copy=validSave(copy);
  assert.equal(maxHP(copy),maxHP(s));assert.equal(damage(copy),damage(s));assert.deepEqual(copy.equip,equip);assert.equal(copy.gold,gold);assert.equal(copy.stones,stones);
 }
 assert.equal(mutationGrowth('sword-male',210),1);
});
test('job skills evolve at 20/60 without replacing IDs, ranks or custom recipes',()=>{
 for(const hero of Object.keys(JOB_PATHS)){
  const s=fresh(hero);s.level=19;const old=knownSkills(s).slice(0,6);s.skillRanks[old[0].id]=7;s.equipped=[old[0].id,old[1].id,old[2].id,null,null];
  for(const level of [20,60]){
   s.level=level;const list=knownSkills(s).slice(0,6);assert.deepEqual(list.map(r=>r.id),old.map(r=>r.id));assert.notEqual(list[0].name,old[0].name);
   list.forEach((r,i)=>{const a=compileSkill(old[i]),b=compileSkill(r);assert(b.power>a.power);assert.equal(b.mp,a.mp);assert.equal(b.cd,a.cd);});
   const restored=validSave(s);assert.equal(restored.skillRanks[old[0].id],7);assert.deepEqual(restored.equipped,s.equipped);
  }
  s.recipes=[{id:'custom0',name:'Custom',level:60,form:'wave',element:'fire',mods:[]}];assert.deepEqual(knownSkills(s).at(-1),s.recipes[0]);
 }
});
test('monster curve remains smooth at mutations and retains XP and rank scaling',()=>{
 for(let l=20;l<=210;l++){
  const m=monsterStats(l),p=monsterStats(l-1);assert(m.hp>p.hp);assert(m.hp/p.hp<1.10);assert(m.damage/p.damage<1.12);assert.equal(m.xp,20+8*l);
  assert(monsterStats(l,{boss:true}).hp>m.hp*6.9);
 }
});
