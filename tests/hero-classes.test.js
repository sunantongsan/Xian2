import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,validSave} from '../web/core.js';
import {knownSkills,compileSkill,SCORPION_SKILLS} from '../web/skills.js';
import {drawHero,CLASS_SHEETS} from '../web/hero-animation.js';
test('Scorpion Man is a full class: six poison skills unlocked by level, save round trip',()=>{
 const s=fresh('demon-scorpion');assert.equal(validSave(JSON.parse(JSON.stringify(s))).hero,'demon-scorpion');
 const skills=knownSkills(s);assert.deepEqual(skills.slice(0,6).map(r=>r.id),SCORPION_SKILLS.map(r=>r.id));
 assert.deepEqual(SCORPION_SKILLS.map(r=>r.level),[1,5,12,25,40,55]);
 for(const r of SCORPION_SKILLS)assert(compileSkill(r),r.name);
 assert.equal(s.equipped[0],'d1');
});
test('class sheet exists and draws one foot-anchored frame per state',()=>{
 for(const id of CLASS_SHEETS){assert(fs.existsSync(new URL(`../web/heroes/${id}.webp`,import.meta.url)));
  const calls=[];const ctx=new Proxy({},{get:(_,k)=>k==='drawImage'?(...a)=>calls.push(a):()=>{}});const im={width:1536,height:1536};
  const frames=new Set();for(const actor of [{anim:'idle'},{anim:'walk',walkDistance:30},{anim:'walk',back:true},{anim:'attack',animTime:.3},{anim:'skill'},{anim:'hurt'},{anim:'dead'}]){const r=drawHero(ctx,new Map([[`heroes/${id}.webp`,im]]),id,actor,0,0,110);frames.add(r.frame);}
  assert.equal(frames.size,7);assert.equal(calls.length,7);}
});
