import test from 'node:test';
import assert from 'node:assert/strict';

import {JOB_PATHS,jobFor} from '../web/job-progression.js';
import {fresh,validSave,reward,xpNeed,allocateStats} from '../web/core.js';
import {heroIdentity} from '../web/hero-ui.js';

test('all four species advance at 20 and 60, including returning high-level characters',()=>{
 const ids=new Set();
 for(const hero of Object.keys(JOB_PATHS)){
  for(const [level,stage] of [[1,0],[15,0],[19,0],[20,1],[59,1],[60,2],[120,2],[210,2]]){
   const s=fresh(hero);s.level=level;const copy=validSave(s);
   assert.equal(copy.hero,hero);assert.equal(jobFor(copy.hero,copy.level).stage,stage);
   assert.equal(heroIdentity(hero,level).id,hero);assert.equal(heroIdentity(hero,level).name,heroIdentity(hero,1).name);
   ids.add(jobFor(hero,level).id);
  }
 }
 assert.equal(ids.size,6);assert.equal(jobFor('sword-male',60),null);
});
test('legacy allocated and unspent points, inventory and balances survive repeated migrations',()=>{
 for(const level of [1,19,20,59,60,120,210]){
  const old=fresh('sword-cockro');delete old.mutationVersion;delete old.mutationStage;delete old.statProgressionVersion;delete old.legacyStatLevels;
  Object.assign(old,{level,xp:31,gold:987654,stones:4321});
  old.attributes={vit:(level-1)*3,str:(level-1)*4,int:(level-1)*2,agi:0};old.statPoints=level-1;
  let restored=validSave(old);
  for(let i=0;i<5;i++){
   assert.deepEqual(restored.attributes,old.attributes);assert.equal(restored.statPoints,old.statPoints);
   for(const k of ['hero','level','xp','stones','equip','bag'])assert.deepEqual(restored[k],old[k],k);
   const next=validSave(JSON.parse(JSON.stringify(restored)));assert.deepEqual(next,restored);restored=next;
  }
 }
});
test('legacy character crossing a job boundary earns four new points without losing old ones',()=>{
 const old=fresh('sword-dragonfly');delete old.mutationVersion;delete old.mutationStage;delete old.statProgressionVersion;delete old.legacyStatLevels;old.level=19;
 const s=validSave(old);assert.equal(s.statPoints,180);
 assert.equal(allocateStats(s,{agi:80,str:100}),true);
 s.xp=xpNeed(19)-1;reward(s,{id:1},()=>1);
 assert.equal(s.level,20);assert.equal(s.statPoints,4);assert.equal(s.legacyStatLevels,18);
 assert.equal(jobFor(s.hero,s.level).stage,1);
 const copy=validSave(s);assert.equal(copy.statPoints,4);assert.deepEqual(copy.attributes,s.attributes);
 for(let level=20;level<=21;level++){copy.xp=xpNeed(level)-1;reward(copy,{id:1},()=>1);}
 assert.equal(validSave(copy).statPoints,12);assert.equal(copy.legacyStatLevels,18);
});
test('new players earn four points per level and cannot spend beyond their budget',()=>{
 const s=fresh('sword-cricket');for(let level=1;level<=2;level++){s.xp=xpNeed(level)-1;reward(s,{id:1},()=>1);}
 assert.equal(s.statPoints,8);assert.equal(s.skillPoints,20);
 assert.equal(allocateStats(s,{int:9}),false);assert.equal(allocateStats(s,{int:8}),true);
 const copy=validSave(s);assert.equal(copy.attributes.int,8);assert.equal(copy.statPoints,0);
 assert.equal(copy.legacyStatLevels,0);
});

