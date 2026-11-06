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
