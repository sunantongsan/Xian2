import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameLoop} from '../web/frame-loop.js';
test('pause cancels rendering and repeated resumes never create duplicate loops',()=>{
 const pending=new Map(),ticks=[];let seq=0;
 const loop=createFrameLoop((now,dt)=>ticks.push(dt),{request:fn=>{pending.set(++seq,fn);return seq;},cancel:id=>pending.delete(id)});
 const tick=now=>{const [id,fn]=pending.entries().next().value;pending.delete(id);fn(now);};
 loop.start();loop.start();assert.equal(pending.size,1);tick(100);tick(116);assert.deepEqual(ticks,[0,.016]);loop.stop();assert.equal(pending.size,0);
 loop.start();loop.start();tick(50000);assert.equal(ticks.at(-1),0);assert.equal(pending.size,1);loop.stop();assert.equal(pending.size,0);
});
test('exit during a frame never schedules another frame',()=>{
 let next;let count=0;const loop=createFrameLoop(()=>{count++;loop.stop();},{request:fn=>{next=fn;return 1;},cancel:()=>{}});loop.start();next(1);assert.equal(count,1);assert.equal(loop.running,false);
});
