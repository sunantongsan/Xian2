import test from 'node:test';
import assert from 'node:assert/strict';
import {newRun,step,target,dash} from '../web/wings-run.js';
test('each mission can be completed with normal movement, combat and dash',()=>{
 for(let index=0;index<3;index++){
  const r=newRun(index,['power','heart'].slice(0,index));
  for(let i=0;i<18000&&r.mode==='play';i++){
   const t=target(r),h=r.hero;
   let x=t.x-h.x,y=t.y-h.y,d=Math.hypot(x,y);
   if(index===2&&!r.open&&d<150){const z=x;x=-y;y=z;if(d<75){x+=h.x-t.x;y+=h.y-t.y;}}
   d=Math.hypot(x,y);const v=d>5?{x:x/d,y:y/d}:{x:0,y:0};
   if(r.enemies.some(e=>e.phase==='warn'&&Math.hypot(e.ax-h.x,e.ay-h.y)<45))dash(r,v.x,v.y);
   step(r,1/60,v);
  }
  assert.equal(r.mode,'won','mission '+(index+1));
 }
});
test('dash respects cooldown and an idle hero can be defeated',()=>{
 const r=newRun(2);r.hero.hp=12;r.hero.x=415;r.hero.y=210;assert(dash(r,1,0));assert(!dash(r));for(let i=0;i<16000&&r.mode==='play';i++)step(r,1/60,{x:0,y:0});assert.equal(r.mode,'lost');
});
