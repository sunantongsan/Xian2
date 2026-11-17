import {test} from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,getStage,STORY_SAVE_KEY,stageScene,progress,begin,defeat,collect,runReady,finish,claim,storyMonster,encodeStory,decodeStory} from '../web/story-stage.js';
import {fresh,validSave} from '../web/core.js';
import {pendingMutation,completeMutation} from '../web/mutation.js';
import {toWorld,walkable,traceStep,routeTo} from '../web/maps.js';
import {MONSTERS} from '../web/catalog.js';
import {monsterRewards,collectLoot} from '../web/ground-loot.js';
import {upgradeGear} from '../web/gear.js';
function clear(state){const st=getStage(state.active.stage);for(const e of st.encounters)defeat(state,e.id);for(const o of st.objects)collect(state,o.id);assert.equal(finish(state),true);}
test('exactly 30 stages cover level 1–60 in exclusive pairs, including fetch and boss missions',()=>{
 assert.equal(STAGES.length,30);assert.equal(new Set(STAGES.map(s=>s.name)).size,30);
 for(const [i,s]of STAGES.entries()){assert.equal(s.min,2*i+1);assert.equal(s.max,2*i+2);assert.deepEqual([...new Set(s.encounters.map(e=>e.level))].sort((a,b)=>a-b),[s.min,s.max]);}
 assert.equal(STAGES.filter(s=>s.kind==='boss').length,6);assert.equal(STAGES.filter(s=>s.kind==='collect').length,12);
 let hp=0,damage=0;for(const s of STAGES)for(const level of [s.min,s.max]){const m=storyMonster(s,{level,boss:false},MONSTERS);assert.ok(m.hp>hp);assert.ok(m.damage>=damage);hp=m.hp;damage=m.damage;}
});
test('real pathfinding reaches every enemy, quest item and exit in all 30 stages',()=>{
 for(const st of STAGES){const scene=stageScene(st,'maps/thung-kula-fields.webp'),start=toWorld(st.spawn,scene);
  for(const uv of [st.spawn,st.exit,...st.encounters.map(e=>e.uv),...st.objects.map(o=>o.uv)])assert.equal(walkable(scene,toWorld(uv,scene)),true,`stage ${st.id}: ${uv}`);
  for(let i=1;i<st.path.length;i++){const a=toWorld(st.path[i-1],scene),b=toWorld(st.path[i],scene),end=traceStep(scene,a,b);assert.ok(Math.hypot(end.x-b.x,end.y-b.y)<1);}
  assert.ok(routeTo(scene,start,toWorld(st.exit,scene)).length>0);assert.equal(walkable(scene,toWorld([.8,.8],scene)),false);
 }
});
test('fetch missions cannot finish without all objects and all enemies',()=>{
 const state=progress({cleared:[1]});assert.equal(begin(state,2),true);const st=getStage(2);
 for(const e of st.encounters){assert.equal(defeat(state,e.id),true);assert.equal(defeat(state,e.id),false);}
 assert.equal(runReady(state),false);assert.equal(finish(state),false);
 assert.equal(collect(state,'bogus'),false);for(const o of st.objects){assert.equal(collect(state,o.id),true);assert.equal(collect(state,o.id),false);}
 assert.equal(runReady(state),true);assert.equal(finish(state),true);assert.equal(state.location,'town');
});
test('play all 30: return to town, restore pending reward, claim once, unlock next, and evolve offline',()=>{
 let state=progress(),save=fresh('sword-cockro');save.gold=1000;
 for(const st of STAGES){assert.equal(begin(state,st.id+1),false);assert.equal(begin(state,st.id),true);
  for(const e of st.encounters){for(const drop of monsterRewards(save,storyMonster(st,e,MONSTERS),()=>.6))collectLoot(save,drop);defeat(state,e.id);}
  for(const o of st.objects)collect(state,o.id);assert.equal(finish(state),true);assert.equal(begin(state,st.id),false);
  const reloaded=decodeStory(encodeStory(save,state),validSave);assert.ok(reloaded);state=reloaded.progress;save=reloaded.save;assert.equal(state.location,'town');
  const gold=save.gold,gift=claim(state,save);assert.ok(gift?.first);assert.equal(save.gold,gold+st.gold);assert.equal(claim(state,save),null);
  if(pendingMutation(save))assert.equal(completeMutation(save),true);
  assert.equal(state.unlocked,Math.min(30,st.id+1));assert.equal(state.cleared.length,st.id);
 }
 assert.equal(save.level,60);assert.equal(state.cleared.length,30);
});
test('replays pay reduced rewards without duplicating first-clear XP or unlocks',()=>{
 const state=progress(),save=fresh('sword-cockro');begin(state,1);clear(state);claim(state,save);const level=save.level;
 begin(state,1);clear(state);const g=claim(state,save);assert.equal(g.first,false);assert.equal(g.gold,220);assert.equal(save.level,level);assert.equal(state.unlocked,2);
});
test('interrupted runs preserve kills and collected items without touching account keys',()=>{
 const state=progress({cleared:[1]});begin(state,2);defeat(state,getStage(2).encounters[0].id);collect(state,getStage(2).objects[0].id);state.location='town';
 const v=decodeStory(encodeStory(fresh('sword-cockro'),state),validSave);assert.equal(begin(v.progress,2),true);assert.equal(v.progress.active.defeated.length,1);assert.equal(v.progress.active.found.length,1);
 assert.notEqual(STORY_SAVE_KEY,'road-to-immortality-v1');assert.notEqual(STORY_SAVE_KEY,'cockro-online-device-token-v1');
});
test('invalid saves fail closed; old one-stage test retains character but starts campaign in town',()=>{
 assert.equal(decodeStory('{',validSave),null);assert.equal(decodeStory('{"version":3}',validSave),null);
 const p=progress({unlocked:30,cleared:[1,3,30],active:{stage:30,complete:true,defeated:[],found:[]}});assert.equal(p.unlocked,2);assert.equal(p.active,null);
 const old=decodeStory(JSON.stringify({version:1,save:fresh('sword-cockro'),progress:{defeated:['scout-1'],claimed:true}}),validSave);assert.ok(old);assert.equal(old.progress.unlocked,1);assert.equal(old.progress.location,'town');
});
test('first clear supplies enough G and materials for a real local equipment upgrade',()=>{
 const state=progress(),save=fresh('sword-cockro');save.gold=0;begin(state,1);clear(state);claim(state,save);assert.ok(save.equip.weapon);assert.equal(upgradeGear(save,'weapon',()=>0),true);assert.equal(save.equip.weapon.plus,1);
});
