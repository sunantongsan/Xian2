import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STAGE,STORY_SAVE_KEY,progress,defeat,cleared,claim,encodeStory,decodeStory,stageScene} from '../web/story-stage.js';
test('completion requires every encounter, reward is claimed once across reload',()=>{
 const p=progress(),s={gold:0};assert.equal(claim(p,s),false);
 for(const e of STAGE.encounters){assert.equal(defeat(p,e.id),true);assert.equal(defeat(p,e.id),false);}
 assert.equal(cleared(p),true);assert.equal(claim(p,s),true);assert.equal(s.gold,500);
 const loaded=decodeStory(encodeStory(s,p),v=>v);assert.equal(claim(loaded.progress,loaded.save),false);assert.equal(loaded.save.gold,500);
});
test('partial run restores only defeated enemies; malformed data cannot grant completion',()=>{
 const p=progress({defeated:['scout-1','scout-1','bogus'],claimed:true});assert.deepEqual(p,{defeated:['scout-1'],claimed:false});
 assert.equal(STAGE.encounters.filter(e=>!p.defeated.includes(e.id)).length,6);
 assert.equal(decodeStory('{',v=>v),null);assert.equal(decodeStory('{"version":2}',v=>v),null);
 assert.equal(decodeStory(encodeStory({},p),()=>null),null);
 assert.notEqual(STORY_SAVE_KEY,'road-to-immortality-v1');
});
import {fresh,validSave} from '../web/core.js';
import {toWorld,walkable,traceStep,routeTo} from '../web/maps.js';
import {monsterRewards,collectLoot} from '../web/ground-loot.js';
import {MONSTERS} from '../web/catalog.js';
test('real engine can navigate every segment and reject out-of-corridor walking',()=>{
 const scene=stageScene('maps/thung-kula-fields.webp');
 for(const uv of [STAGE.spawn,STAGE.exit,...STAGE.encounters.map(e=>e.uv)])assert.equal(walkable(scene,toWorld(uv,scene)),true);
 for(let i=1;i<STAGE.path.length;i++){
  const a=toWorld(STAGE.path[i-1],scene),b=toWorld(STAGE.path[i],scene),end=traceStep(scene,a,b);
  assert.ok(Math.hypot(end.x-b.x,end.y-b.y)<1);
 }
 assert.ok(routeTo(scene,toWorld(STAGE.spawn,scene),toWorld(STAGE.exit,scene)).length>0);
 assert.equal(walkable(scene,toWorld([.8,.8],scene)),false);
});
test('real rewards and character validation preserve isolated stage progress',()=>{
 const save=fresh('sword-cockro');save.name='นักสำรวจ';save.gold=300;const state=progress();
 for(const e of STAGE.encounters){
  const m={...MONSTERS.find(m=>m.id===1000+e.level-1),boss:!!e.boss,xp:35,gold:15};
  for(const drop of monsterRewards(save,m,()=>.5))assert.equal(collectLoot(save,drop),true);
  storyKill(e.id);
 }
 function storyKill(id){assert.equal(defeat(state,id),true);}
 assert.equal(claim(state,save),true);
 const restored=decodeStory(encodeStory(save,state),validSave);
 assert.ok(restored);assert.equal(restored.save.gold,905);assert.equal(restored.save.kills,7);
 assert.equal(restored.progress.claimed,true);assert.equal(claim(restored.progress,restored.save),false);
});
