import test from 'node:test';
import assert from 'node:assert/strict';
import {begin,step,pick} from '../web/survivor-run.js';
test('gems trigger a paused choice and each offered card applies once',()=>{
 const r=begin();r.gems.push({x:r.h.x,y:r.h.y,value:r.need});step(r,.016,0,0);assert.equal(r.state,'pick');const t=r.t;step(r,.1,1,0);assert.equal(r.t,t);assert(!pick(r,'fake'));const id=r.choices[0],before=r.skills[id];assert(pick(r,id));assert.equal(r.skills[id],before+1);assert(!pick(r,id));
});
test('all lands allow rescuing the companion and defeating a boss with normal combat',()=>{
 for(let zone=0;zone<3;zone++){let seed=72;const r=begin(zone,()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296));
 for(let i=0;i<18000&&['play','pick'].includes(r.state);i++){
 if(r.state==='pick'){pick(r,['ice','storm','orbit','blade','vitality'].filter(id=>r.choices.includes(id)).sort((a,b)=>r.skills[a]-r.skills[b])[0]);continue;}
 const b=r.enemies.find(e=>e.boss);let dx=Math.cos(r.t*.85),dy=Math.sin(r.t*.85);
 if(r.egg){dx=r.egg.x-r.h.x;dy=r.egg.y-r.h.y;}
 else if(b){const x=b.x-r.h.x,y=b.y-r.h.y,d=Math.hypot(x,y);dx=x/Math.max(1,d)*(d-43)-y*.7;dy=y/Math.max(1,d)*(d-43)+x*.7;}
 step(r,1/60,dx,dy);
 }
 assert(r.pet);assert.equal(r.state,'won','land '+zone+' hp '+r.h.hp);
 }
});
