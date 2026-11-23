import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../server/world.js';
import {capturePresence} from '../web/solo-world.js';
import {fresh,validSave} from '../web/core.js';
import {parseTiled,tileIndex} from '../web/tilemap.js';
import {STAR_HOME_RADIUS,STAR_REVISION} from '../web/star-data.js';
import {routeTo,traceStep} from '../web/maps.js';
const json=JSON.parse(fs.readFileSync(new URL('../web/maps/hero-star.json',import.meta.url)));
const scene=parseTiled(json);
test('expanded desert city preserves building collision and connects all services',()=>{
 assert.equal(scene.N,384);assert.equal(scene.rows,384);
 assert(scene.prop.filter(p=>p==='desert-house').length>=8);
 const houseIds=new Set(json.tilesets.find(t=>t.name==='hero-star-props').tiles.filter(t=>t.properties.some(p=>p.name==='kind'&&['desert-house','foundation'].includes(p.value))).map(t=>101+t.id));
 json.layers.find(l=>l.name==='props').data.forEach((gid,i)=>{if(houseIds.has(gid))assert.equal(scene.walk[i],0);});
 assert(!scene.spawns.some(s=>Math.hypot(s.x-scene.spawn.x,s.y-scene.spawn.y)<STAR_HOME_RADIUS+300));
 for(const poi of scene.pois){let last=scene.spawn;const route=routeTo(scene,last,poi.world);assert(route.length);for(const point of route){const end=traceStep(scene,last,point);assert(Math.hypot(end.x-point.x,end.y-point.y)<1);last=point;}assert(Math.hypot(last.x-poi.world.x,last.y-poi.world.y)<1,poi.name);}
});
test('old star saves arrive safely once and new desert locations survive reconnect',()=>{
 const w=new World(),s=fresh('sword-cockro');s.worldState={map:'star',x:100,y:100,hp:30,mp:20,cd:{}};
 const p=w.join('migration',s);assert.equal(p.map,'star');assert(w.home(p));assert.equal(s.worldState.mapRevision,STAR_REVISION);
 w.enter(p,'star',7);capturePresence(p);const saved=validSave(s),restored=w.makeActor('restored',saved);
 assert.equal(restored.map,'star');assert.equal(restored.x,p.x);assert.equal(restored.y,p.y);
 assert.equal(saved.worldState.mapRevision,STAR_REVISION);
 const edge={...p,map:'star',x:scene.spawn.x+STAR_HOME_RADIUS-1,y:scene.spawn.y};assert(w.home(edge));edge.x+=2;assert(!w.home(edge));
});
