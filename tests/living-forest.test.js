import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_SPECIES,forestMonster,monsterZones,zoneContains} from '../web/forest-species.js';
import {MAPS,toWorld,traceStep,walkable,toUV} from '../web/maps.js';
import {World} from '../server/world.js';
import {fresh,validSave,reward} from '../web/core.js';
import {compileSkill,knownSkills} from '../web/skills.js';
test('all 20 new forest species coexist with original wildlife and retain save records',()=>{
 const w=new World(),units=w.mobs.forest,news=units.filter(e=>e.def.art==='forest-v2');assert.equal(new Set(news.map(e=>e.def.species)).size,20);assert(units.some(e=>!e.def.art&&!e.def.boss));assert.equal(units.filter(e=>e.def.boss).length,114);
 for(const e of news){assert(e.def.level>=1&&e.def.level<=60);assert(walkable(MAPS.forest,e));assert(e.def.hp>0&&e.def.damage>0);}
 const s=fresh('sword-cockro');FOREST_SPECIES.forEach(sp=>reward(s,forestMonster(sp.min),()=>1));assert.equal(validSave(s).seen.filter(id=>id>=1100&&id<=1119).length,20);
});
test('forest paths and deep woods share collision on server; world edges remain closed',()=>{
 for(const uv of [[.35,.48],[.65,.94],[.08,.12],[.9,.2]]){const goal=toWorld(uv,MAPS.forest),start=toWorld([.5,.5],MAPS.forest);assert(walkable(MAPS.forest,goal));assert(Math.hypot(traceStep(MAPS.forest,start,goal).x-goal.x,traceStep(MAPS.forest,start,goal).y-goal.y)<.1);}
 assert(!walkable(MAPS.forest,toWorld([1,.5],MAPS.forest)));
 const units=new World().mobs.forest.filter(e=>!e.def.boss);let offPath=0;for(const e of units){const uv=toUV(e,MAPS.forest),u=(uv[0]*9)%1,v=(uv[1]*6)%1;if(u<.22||u>.78||v<.27||v>.73)offPath++;}assert(offPath>units.length*.45);
});
test('unengaged monsters wander, pause, face movement and stay near their own home',()=>{
 const w=new World(),units=w.mobs.forest.slice(30,50),before=units.map(e=>({x:e.x,y:e.y}));w.mobs.forest=units;w.mobs.star=[];const observer=w.join("observer",fresh("sword-cockro"));w.enter(observer,"forest");Object.assign(observer,{x:100000,y:100000});let moving=0,paused=0;
 for(let i=0;i<400;i++){w.tick(.1,1000+i*.1);for(const e of units){e.moving?moving++:paused++;assert(walkable(MAPS.forest,e));assert(Math.hypot(e.x-e.homeX,e.y-e.homeY)<240);}}
 assert(moving>500&&paused>100);assert(units.some((e,i)=>Math.hypot(e.x-before[i].x,e.y-before[i].y)>40));assert(units.every(e=>e.walkDistance>0));
});
test('20 unique locked telegraphs resolve into exactly the same authoritative damage zones',()=>{
 const signatures=new Set();for(const sp of FOREST_SPECIES){const w=new World(),p=w.join('target',fresh('sword-cockro'));w.enter(p,'forest');const origin=toWorld([.5,.5],MAPS.forest),e={...origin,id:'signature',homeX:origin.x,homeY:origin.y,def:forestMonster(sp.min),hp:99999,state:'windup',clock:0,angle:0,aimX:origin.x+180,aimY:origin.y,aggro:p.id};w.mobs.forest=[e];w.mobs.star=[];const zones=monsterZones(e);signatures.add(JSON.stringify(zones));let inside;
  for(let x=-300;x<550&&!inside;x+=10)for(let y=-300;y<350;y+=10){const q={x:origin.x+x,y:origin.y+y};if(zones.some(z=>zoneContains(z,q))){inside=q;break;}}
  assert(inside,sp.pattern);Object.assign(p,inside);const hp=p.hp;w.tick(.01,100);assert(p.hp<hp,sp.pattern);const event=w.events.find(e=>e.kind==='monsterSkill');assert.deepEqual(event.zones,zones);assert.equal(e.state,'idle');
  // Same cast cannot damage someone outside every footprint, even if close enough to aggro.
  const safe={x:origin.x-250,y:origin.y-250};assert(!zones.some(z=>zoneContains(z,safe)),sp.pattern);
 }
 assert.equal(signatures.size,20);
});
test('dash skill broadcasts pre-move origin and damage extent; arrows broadcast the actual target',()=>{
 const w=new World(),s=fresh('sword-cockro');s.level=50;s.equipped=['s4'];const p=w.join('p',s);w.enter(p,'forest');const origin=toWorld([.5,.5],MAPS.forest);Object.assign(p,origin,{mp:999});const e=w.mobs.forest[0];Object.assign(e,{x:p.x+70,y:p.y,hp:99999});w.mobs.forest=[e];w.command(p,{type:'skill',slot:0,target:e.id},100);const event=w.events.find(e=>e.kind==='skill');assert(event);assert.equal(event.x,origin.x);assert.equal(event.y,origin.y);assert(Math.hypot(p.x-origin.x,p.y-origin.y)>70);assert.deepEqual(event.aim,{x:p.x,y:p.y});
 s.hero='sword-dragonfly';Object.assign(e,{x:p.x+200,y:p.y});w.command(p,{type:'attack',target:e.id},102);const arrow=w.events.find(e=>e.kind==='attack');assert.deepEqual(arrow.aim,{x:e.x,y:e.y});
});
