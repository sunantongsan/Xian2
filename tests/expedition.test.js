import test from 'node:test';
import assert from 'node:assert/strict';
import {makePopulation} from '../web/alien-population.js';
import {MAPS,REGIONS,toWorld,toUV,routeTo,traceStep} from '../web/maps.js';
import {World} from '../server/world.js';
import {fresh} from '../web/core.js';
import {drawMonsterAttack} from '../web/forest-render.js';
import {monsterZones,forestMonster} from '../web/forest-species.js';
test('20 percent more wildlife plus exactly forty additional dispersed bosses',()=>{
 const all=makePopulation(),bosses=all.filter(e=>e.def.boss);
 assert.equal(all.filter(e=>!e.def.boss).length,Math.ceil(972*1.2));assert.equal(bosses.length,46);
 const extra=bosses.filter(e=>e.spawnId.startsWith('extra-'));
 assert.equal(new Set(extra.map(e=>{const [u,v]=toUV(e,MAPS.forest);return `${Math.floor(u*9)},${Math.floor(v*6)}`;})).size,40);
 for(const e of extra){for(const r of REGIONS){const p=toWorld(r.entry,MAPS.forest);assert(Math.hypot(e.x-p.x,e.y-p.y)>700,e.spawnId);}}
});
test('town spawn is the painted center and village paths and exits are reachable',()=>{
 const w=new World(),p=w.join('expedition-test',fresh('sword-cockro'));
 const uv=toUV(p,MAPS.town);assert(Math.abs(uv[0]-.5)<1e-9&&Math.abs(uv[1]-.445)<1e-9);
 for(const goalUV of [[.5,.37],[.06,.50],[.94,.50],[.25,.62],[.70,.62],[.5,.94],[.20,.83]]){
  const goal=toWorld(goalUV,MAPS.town),route=routeTo(MAPS.town,p,goal);assert(route.length,`${goalUV}`);let prev=p;
  for(const point of route){const reached=traceStep(MAPS.town,prev,point);assert(Math.hypot(reached.x-point.x,reached.y-point.y)<1);prev=point;}
  assert(Math.hypot(prev.x-goal.x,prev.y-goal.y)<1,`${goalUV}`);
 }
 w.enter(p,'forest');w.enter(p,'town');assert.deepEqual(toUV(p,MAPS.town),uv);
});
test('monster effects draw restored textures without advance aim indicators',()=>{
 let images=0;const g=new Proxy({},{get:(o,k)=>k==='drawImage'?()=>images++:()=>{},set:()=>true});
 for(let i=0;i<20;i++){const e={x:0,y:0,def:forestMonster(i*3+1),angle:0};const zones=monsterZones(e);drawMonsterAttack(g,{zones,color:'#fff',life:.2,max:.65},(x,y)=>({x,y}),1,'low',{width:1024,height:1024});}
 assert(images>0);
});

