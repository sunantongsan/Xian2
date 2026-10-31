import test from 'node:test';import assert from 'node:assert/strict';import {AutoHunt} from '../web/auto-hunt.js';
const foe=x=>({x,y:0,hp:100});const a={x:0,y:0};
test('auto skips unreachable closer enemies and picks a nearby reachable one',()=>{const h=new AutoHunt(),wall=foe(40),near=foe(90),far=foe(400);assert.equal(h.update(a,[far,wall,near],0,.016,60,{route:(_,e)=>e===wall?[{x:10,y:0}]:[e],clear:(_,e)=>e!==wall}).target,near);});
test('partial paths cannot qualify as reachable targets',()=>{assert.equal(new AutoHunt().update(a,[foe(200)],0,.016,60,{route:()=>[{x:20,y:0}],clear:()=>true}),null);});
test('stuck pursuit is abandoned and another enemy selected',()=>{const h=new AutoHunt(),e=foe(150),other=foe(240),nav={route:(_,e)=>[e],clear:()=>true};for(let i=0;i<16;i++)h.update(a,[e,other],i*.1,.1,60,nav);assert.equal(h.update(a,[e,other],1.7,.1,60,nav).target,other);});
test('walls prevent attacks even within weapon range',()=>{assert.equal(new AutoHunt().update(a,[foe(40)],0,.016,90,{route:()=>[],clear:()=>false}),null);});
test('reconsiders long pursuit when a closer enemy arrives',()=>{const h=new AutoHunt(),far=foe(420),near=foe(70),nav={route:(_,e)=>[e],clear:()=>true};assert.equal(h.update(a,[far],0,.016,60,nav).target,far);assert.equal(h.update(a,[far,near],.7,.016,60,nav).target,near);});


test('empty or unreachable area respects scan cooldown instead of pathfinding every frame',()=>{let calls=0;const h=new AutoHunt(),e=foe(200),nav={route:()=>{calls++;return [];},clear:()=>false};for(let i=0;i<30;i++)h.update(a,[e],i/60,1/60,60,nav);assert.equal(calls,1);});
