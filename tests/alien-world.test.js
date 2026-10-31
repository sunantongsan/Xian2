import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,REGIONS,toWorld,toUV,walkable,routeTo,traceStep} from '../web/maps.js';
import {makePopulation,updateRespawns,POPULATION,CAMPS,PACK_SIZE,PACKS_PER_REGION} from '../web/alien-population.js';
import {fresh,validSave} from '../web/core.js';
test('large forest has connected checkpoints across all six level bands',()=>{assert(MAPS.forest.width*MAPS.forest.height>4800*3200*8);const start=toWorld(MAPS.forest.spawn,MAPS.forest);for(const region of REGIONS){const end=toWorld(region.entry,MAPS.forest);const path=routeTo(MAPS.forest,start,end);assert(path.length>0,region.name);let at=start;for(const point of path){const reached=traceStep(MAPS.forest,at,point);assert(Math.hypot(reached.x-point.x,reached.y-point.y)<1,region.name);at=point;}assert(Math.hypot(at.x-end.x,at.y-end.y)<1);}});
test('hunting population occupies valid terrain across six level bands',()=>{const enemies=makePopulation();assert.equal(enemies.length,POPULATION);assert.equal(new Set(enemies.map(e=>e.spawnId)).size,POPULATION);for(const r of REGIONS){const group=enemies.filter(e=>e.def.region===r.id);assert.equal(group.length,PACK_SIZE*PACKS_PER_REGION+1);assert.equal(group.filter(e=>e.def.boss).length,1);assert(group.every(e=>e.def.level>=r.min&&e.def.level<=r.max));}for(const e of enemies)assert(walkable(MAPS.forest,e),e.spawnId);});
test('respawn has a delay, never adds duplicate units or spawns on player',()=>{const units=makePopulation(),e=units[0],player={x:e.x,y:e.y};e.hp=0;e.respawn=7;updateRespawns(units,player,6);assert.equal(e.hp,0);updateRespawns(units,player,2);assert.equal(units.length,POPULATION);assert.equal(e.hp,e.def.hp);assert(Math.hypot(e.x-player.x,e.y-player.y)>=230);assert(walkable(MAPS.forest,e));});
test('new bestiary IDs persist alongside old save records',()=>{const s=fresh('sword-cockro');s.seen=[0,1000,1059,1065,9999];s.bosses=[9,1060,1065,1050];const copy=validSave(s);assert.deepEqual(copy.seen,[0,1000,1059,1065]);assert.deepEqual(copy.bosses,[9,1060,1065]);});
test('scene-specific coordinate conversions round trip without changing town scale',()=>{for(const scene of Object.values(MAPS)){for(const uv of [[.2,.3],[.8,.7]]){const p=toUV(toWorld(uv,scene),scene);assert(Math.abs(uv[0]-p[0])<1e-9);assert(Math.abs(uv[1]-p[1])<1e-9);}}});
test('each checkpoint has a reachable low-level wildlife nearby',()=>{
 const units=makePopulation();
 for(const region of REGIONS){
  const entry=toWorld(region.entry,MAPS.forest);
  const nearby=units.filter(e=>e.def.region===region.id&&!e.def.boss&&e.def.level<=region.min+2&&Math.hypot(e.x-entry.x,e.y-entry.y)<700);
  assert(nearby.length>=2,region.name);
  assert(routeTo(MAPS.forest,entry,nearby[0]).length>0);
 }
});
test('walking between level-band centers takes over a minute at base speed',()=>{
 const a=toWorld(REGIONS[0].center,MAPS.forest),b=toWorld(REGIONS[2].center,MAPS.forest);
 const route=routeTo(MAPS.forest,a,b);assert(route.length>0);
 let length=0,previous=a;for(const p of route){length+=Math.hypot(p.x-previous.x,p.y-previous.y);previous=p;}
 assert(length/110>60);
});
test('hunting camps span nine distinct clearings in every level band',()=>{
 for(const r of REGIONS){const camps=CAMPS.filter(c=>c.region===r.id);const tiles=new Set(camps.map(c=>Math.floor(c.uv[0]*9)+','+Math.floor(c.uv[1]*6)));assert.equal(tiles.size,9);}
});
test('opening wave hits an entire pack across its width, but not outside its footprint',async()=>{
 const {knownSkills,compileSkill,skillTargets}=await import('../web/skills.js');
 const skill=compileSkill(knownSkills(fresh('sword-cockro'))[0]);
 const pack=Array.from({length:6},(_,i)=>({x:240+Math.cos(i*Math.PI/3)*165,y:Math.sin(i*Math.PI/3)*165,hp:100}));
 assert.equal(skillTargets(skill,{x:0,y:0},{x:240,y:0},pack).length,6);
 assert.equal(skillTargets(skill,{x:0,y:0},{x:240,y:0},[{x:240,y:skill.radius+1,hp:100}]).length,0);
});


