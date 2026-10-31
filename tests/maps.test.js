import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,toWorld,toUV,walkable,routeTo,traceStep} from '../web/maps.js';
test('painted maps have connected safe spawns, services, exits and monster placements',()=>{
 for(const scene of Object.values(MAPS)){
 const start=toWorld(scene.spawn,scene);assert(walkable(scene,start));
 for(const uv of [...scene.pois.filter(p=>p.action!=='shop').map(p=>p.uv),...(scene.spawns||[])]){
 const goal=toWorld(uv,scene);assert(walkable(scene,goal),scene.name+uv);
 const route=routeTo(scene,start,goal);assert(route.length>0);let last=start;
 for(const p of route){assert(walkable(scene,p));const end=traceStep(scene,last,p);assert(Math.hypot(end.x-p.x,end.y-p.y)<1,`unreachable segment ${scene.name} ${uv}`);last=p;}
 assert(Math.hypot(last.x-goal.x,last.y-goal.y)<1);
 }
 }
});
test('water, rooftops and outer scenery cannot be entered or dashed through',()=>{
 for(const [scene,uv]of [[MAPS.town,[.15,.16]],[MAPS.town,[.5,.13]],[MAPS.town,[.1,.8]],[MAPS.forest,[.005,.48]],[MAPS.forest,[.65,.995]]]){
 const target=toWorld(uv,scene),start=toWorld(scene.spawn,scene);assert(!walkable(scene,target));const end=traceStep(scene,start,target);assert(walkable(scene,end));assert(Math.hypot(end.x-target.x,end.y-target.y)>10);
 }
});
test('painted-map projection round trips accurately',()=>{for(const uv of [[.1,.1],[.5,.6],[.9,.9]]){const actual=toUV(toWorld(uv));assert(Math.abs(actual[0]-uv[0])<1e-9);assert(Math.abs(actual[1]-uv[1])<1e-9)}});



