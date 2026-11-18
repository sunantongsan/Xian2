import test from 'node:test';
import assert from 'node:assert/strict';
import {begin,step,pick,openSkills,deferSkills} from '../web/survivor-run.js';
test('level-ups bank skill choices without interrupting movement',()=>{
 const r=begin();r.gems.push({x:r.h.x,y:r.h.y,value:8});step(r,.016,0,0);
 assert.equal(r.state,'play');assert.equal(r.credits,2);
 const x=r.h.x;step(r,.016,1,0);assert(r.h.x>x);
 assert(openSkills(r));const choices=[...r.choices];deferSkills(r);
 assert.equal(r.credits,2);assert(openSkills(r));assert.deepEqual(r.choices,choices);
 assert(!pick(r,'fake'));assert(pick(r,choices[0]));assert.equal(r.credits,1);
 assert.equal(r.state,'play');assert(!pick(r,choices[0]));
 assert(openSkills(r));assert(pick(r,r.choices[0]));assert(!openSkills(r));
});
test('all lands allow rescuing the companion and defeating a boss with normal combat',()=>{
 for(let zone=0;zone<3;zone++){let seed=72;const r=begin(zone,()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296));
 for(let i=0;i<18000&&['play','pick'].includes(r.state);i++){
 if(openSkills(r)){pick(r,['ice','storm','orbit','blade','vitality'].filter(id=>r.choices.includes(id)).sort((a,b)=>r.skills[a]-r.skills[b])[0]);continue;}
 const b=r.enemies.find(e=>e.boss);let dx=Math.cos(r.t*.85),dy=Math.sin(r.t*.85);
 if(r.egg){dx=r.egg.x-r.h.x;dy=r.egg.y-r.h.y;}
 else if(b){const x=b.x-r.h.x,y=b.y-r.h.y,d=Math.hypot(x,y);dx=x/Math.max(1,d)*(d-43)-y*.7;dy=y/Math.max(1,d)*(d-43)+x*.7;}
 step(r,1/60,dx,dy);
 }
 assert(r.pet);assert.equal(r.state,'won','land '+zone+' hp '+r.h.hp);
 }
});
