import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave,reward,xpNeed} from '../web/core.js';
import {jobFor} from '../web/job-progression.js';
test('heroes pass former class gates with XP overflow, gear and allocated points intact',()=>{
 for(const hero of ['sword-cockro','sword-cricket','sword-dragonfly','demon-scorpion'])for(const gate of [20,60]){
  const s=fresh(hero);s.level=gate-1;s.xp=xpNeed(s.level)-1;s.attributes.str=12;
  const weapon=structuredClone(s.equip.weapon);
  reward(s,{id:1000,gold:0,xp:5},()=>1);
  assert.equal(s.level,gate);assert.equal(s.xp,4);
  assert.equal(s.hero,hero);assert.equal(s.attributes.str,12);assert.deepEqual(s.equip.weapon,weapon);
  assert.equal(jobFor(hero,gate).name,jobFor(hero,1).name);
  const old=validSave({...s,mutationStage:0});assert.equal(old.xp,4);
  reward(old,{id:1000,gold:0,xp:xpNeed(gate)},()=>1);assert.equal(old.level,gate+1);
 }
});
