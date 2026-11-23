import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
import {fresh,validSave,reward} from '../web/core.js';
import {ADVANCED_SPECIES,ADVANCED_MONSTERS} from '../web/advanced-monsters.js';
import {drawAdvancedMonster} from '../web/monster-render.js';

test('all twenty distinct species are spawned on the server, in levels 61-120 only',()=>{
 const w=new World();assert.equal(ADVANCED_SPECIES.length,20);assert.equal(new Set(ADVANCED_SPECIES.map(s=>s.form)).size,20);assert.equal(new Set(ADVANCED_SPECIES.map(s=>s.name)).size,20);
 assert.equal(new Set(w.mobs.star.map(m=>m.def.species)).size,20);
 assert.equal(new Set(w.mobs.star.filter(m=>!m.def.boss).map(m=>m.def.level)).size,60);
 assert(w.mobs.star.every(m=>m.def.level>=61&&m.def.level<=120&&m.hp>0));
 assert(w.mobs.forest.every(m=>m.def.level<=60));
 assert.equal(w.mobs.star.filter(m=>m.def.boss).length,6);
});
test('all levels can enter every map gate while invalid gates stay rejected',()=>{
 const w=new World(),s=fresh('sword-cockro'),p=w.join('gate-check',s);
 for(const level of [1,60,61,120]){s.level=level;for(let gate=0;gate<12;gate++)assert.equal(w.enter(p,'star',gate),true);for(let gate=0;gate<6;gate++)assert.equal(w.enter(p,'forest',gate),true);}
 assert.equal(w.enter(p,'star',99),false);assert.equal(w.enter(p,'forest',99),false);assert.equal(w.enter(p,'unknown',0),false);
});
test('advanced enemy kills, boss records and rewards survive save round-trip',()=>{
 const s=fresh('sword-cockro');s.level=61;s.mutationStage=2;for(const m of ADVANCED_MONSTERS)reward(s,m,()=>1);const copy=validSave(s);assert.equal(copy.seen.length,66);assert.equal(copy.bosses.length,6);assert.equal(copy.bountyHeads,2*(60+6*10));assert.equal(copy.level,61);assert.equal(copy.kills,66);assert(copy.xp>0);
});
test('all twenty drawings and dead/boss states produce finite canvas geometry',()=>{
 let draws=0;const gradient={addColorStop(){}};const g=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>gradient:(...args)=>{for(const x of args)if(typeof x==='number')assert(Number.isFinite(x),key);draws++;},set:()=>true});
 for(const m of ADVANCED_MONSTERS)for(const hp of [0,m.hp])drawAdvancedMonster(g,{def:m,hp,face:-1,state:'windup',moving:true,walkDistance:150},0,0,100,7);assert(draws>1000);
});
test('online area attacks hit nearby players and directional attacks respect their aim',()=>{
 for(const kind of ['burst','cone','projectile','dash']){
  const w=new World(),a=w.join('front',fresh('sword-cockro')),b=w.join('behind',fresh('sword-cockro'));w.enter(a,'forest');w.enter(b,'forest');const e=w.mobs.forest[0];w.mobs.forest=[e];e.def={...e.def,attack:kind};e.state='windup';e.clock=0;e.angle=0;e.aggro='front';Object.assign(a,{x:e.x+60,y:e.y});Object.assign(b,{x:e.x-60,y:e.y});const before=a.hp;
  w.tick(.01,1000);
  if(kind==='burst'){assert(a.hp<before);assert(b.hp<before);}
  if(kind==='cone'||kind==='projectile'){assert(a.hp<before);assert.equal(b.hp,before);}
  if(kind==='dash'){assert(e.x>e.homeX+100);assert.equal(b.hp,before);}
 }
});


