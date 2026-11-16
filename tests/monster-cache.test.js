import test from 'node:test';import assert from 'node:assert/strict';
import {createMonsterCache} from '../web/monster-cache.js';
test('crowds share cached poses while direction and size remain separate',()=>{
 let paints=0,blits=0;const g={save(){},restore(){},translate(){},scale(){},drawImage(){blits++;}};
 const c=createMonsterCache({makeCanvas:()=>({getContext:()=>({scale(){}})}),paint:()=>paints++});
 for(let i=0;i<60;i++)c.draw(g,{def:{species:3},hp:100,face:i%2?-1:1,moving:true,walkDistance:22},i,0,50+i,1);
 assert.equal(paints,1);assert.equal(blits,60);c.draw(g,{def:{species:3},hp:0},0,0,100);assert.equal(paints,2);c.clear();assert.equal(c.size,0);
});
test('monster pose cache releases old canvases at the memory bound',()=>{
 const canvases=[];const c=createMonsterCache({limit:4,makeCanvas:()=>{const cv={getContext:()=>({scale(){}})};canvases.push(cv);return cv;},paint:()=>{}});
 const g={save(){},restore(){},translate(){},scale(){},drawImage(){}};
 for(let i=0;i<20;i++)c.draw(g,{def:{species:i},hp:100},0,0,100,0);
 assert.equal(c.size,4);assert(canvases.slice(0,16).every(cv=>cv.width===1&&cv.height===1));
});

test('all advanced species and six boss variants retain every pose without eviction churn',()=>{
 let paints=0;const c=createMonsterCache({makeCanvas:()=>({getContext:()=>({})}),paint:()=>paints++});
 const g={save(){},restore(){},translate(){},scale(){},drawImage(){}};
 const sweep=()=>{for(let species=0;species<26;species++)for(const state of ['idle','walk','windup','dead'])for(let f=0;f<24;f++)c.draw(g,{def:{species:species%20,boss:species>=20},hp:state==='dead'?0:100,state,moving:state==='walk',walkDistance:f/24*Math.PI*2*22},0,0,110,f/24*Math.PI*2/3);};
 sweep();const initial=paints;sweep();assert.equal(paints,initial);assert.equal(c.size,286);assert.equal(paints,286);
});
test('boss halo never reuses the normal species pose',()=>{
 const painted=[];const c=createMonsterCache({makeCanvas:()=>({getContext:()=>({})}),paint:(_,e)=>painted.push(!!e.def.boss)}),g={save(){},restore(){},translate(){},scale(){},drawImage(){}};
 for(const boss of [false,true,false,true])c.draw(g,{def:{species:0,boss},hp:1},0,0,100,0);
 assert.deepEqual(painted,[false,true]);
});
