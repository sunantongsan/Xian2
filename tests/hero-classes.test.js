import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fresh,validSave} from '../web/core.js';
import {drawHero,CLASS_SHEETS} from '../web/hero-animation.js';
test('Scorpion Man saves round trip as a full class',()=>{const s=fresh('demon-scorpion');assert.equal(validSave(JSON.parse(JSON.stringify(s))).hero,'demon-scorpion');});
test('class sheet exists and draws one foot-anchored frame per state',()=>{
 for(const id of CLASS_SHEETS){assert(fs.existsSync(new URL(`../web/heroes/${id}.webp`,import.meta.url)));
  const calls=[];const ctx=new Proxy({},{get:(_,k)=>k==='drawImage'?(...a)=>calls.push(a):()=>{}});const im={width:1536,height:1536};
  const frames=new Set();for(const actor of [{anim:'idle'},{anim:'walk',walkDistance:30},{anim:'walk',back:true},{anim:'attack',animTime:.3},{anim:'skill'},{anim:'hurt'},{anim:'dead'}]){const r=drawHero(ctx,new Map([[`heroes/${id}.webp`,im]]),id,actor,0,0,110);frames.add(r.frame);}
  assert(frames.size>=6,id);assert(calls.length>=7);}
});
test('Dragonfly and Cricket save round trip and keep a skill-specific cricket pose',async()=>{
 for(const id of ['sword-dragonfly','sword-cricket']){const s=fresh(id);assert.equal(validSave(JSON.parse(JSON.stringify(s))).hero,id);}
 const {classFrame}=await import('../web/hero-animation.js');
 assert.equal(classFrame('sword-cricket',{anim:'skill',castId:'s6'}),13);assert.equal(classFrame('sword-cricket',{anim:'idle'}),14);assert.equal(classFrame('sword-dragonfly',{anim:'idle'}),12);
});


