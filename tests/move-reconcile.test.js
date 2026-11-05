import test from 'node:test';import assert from 'node:assert/strict';
import {MoveHistory} from '../web/move-reconcile.js';
const clear=(a,b)=>b;
test('applying a correction does not compound on delayed repeated acknowledgements',()=>{
 const h=new MoveHistory();h.sent({seq:1,x:100,y:50});h.sent({seq:2,x:120,y:60});
 let player={x:140,y:70};const self={x:0,y:0,moveAck:1};
 const corrected=h.target(player,self,clear);assert.deepEqual(corrected,{x:40,y:20});
 h.applied(player,corrected);player=corrected;
 for(let i=0;i<20;i++)assert.deepEqual(h.target(player,self,clear),player);
 player={x:50,y:25};assert.deepEqual(h.target(player,self,clear),player);
 h.sent({seq:3,...player});
 const next={x:20,y:10,moveAck:2};assert.deepEqual(h.target(player,next,clear),player);
});
test('delayed and repeated acknowledgements preserve steps taken after the acknowledged move',()=>{const h=new MoveHistory();h.sent({seq:1,x:20,y:0});h.sent({seq:2,x:40,y:0});h.sent({seq:3,x:60,y:0});const player={x:100,y:0},self={x:20,y:0,moveAck:1};assert.deepEqual(h.target(player,self,clear),player);assert.deepEqual(h.target(player,self,clear),player);assert.deepEqual(h.target(player,{x:40,y:0,moveAck:2},clear),player);});
test('replay retains authoritative correction and collision, teleport clears pending movement',()=>{const h=new MoveHistory();h.sent({seq:1,x:20,y:0});h.sent({seq:2,x:40,y:0});assert.deepEqual(h.target({x:60,y:0},{x:10,y:0,moveAck:1},(a,b)=>({x:Math.min(35,b.x),y:b.y})),{x:35,y:0});assert.deepEqual(h.target({x:60,y:0},{x:500,y:600,moveAck:2,correction:true},clear),{x:500,y:600});assert.equal(h.moves.length,0);assert.equal(h.anchor,null);});
test('old server or lost history falls back to authoritative position and history remains bounded',()=>{const h=new MoveHistory();for(let i=1;i<100;i++)h.sent({seq:i,x:i,y:0});assert.equal(h.moves.length,64);assert.deepEqual(h.target({x:200,y:0},{x:100,y:0},clear),{x:100,y:0});assert.deepEqual(h.target({x:200,y:0},{x:100,y:0,moveAck:1},clear),{x:100,y:0});});

