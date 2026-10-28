import test from 'node:test';
import assert from 'node:assert/strict';
import {heroFrame,drawHero,cockroFrame,HERO_IDS,WALK_DISTANCE} from '../web/hero-animation.js';
test('walk sequence visits every frame in both views and wraps correctly',()=>{
 for(const back of [false,true]){
 const frames=Array.from({length:8},(_,i)=>heroFrame({anim:'walk',walkDistance:(i+.01)*WALK_DISTANCE/8,back}).frame);
 assert.deepEqual(frames,Array.from({length:8},(_,i)=>i+(back?8:0)));
 assert.deepEqual(heroFrame({anim:'walk',walkDistance:0,back}),heroFrame({anim:'walk',walkDistance:WALK_DISTANCE,back}));
 }
});
test('stationary characters use a standing frame, never a frozen mid-step',()=>{
 for(const back of [false,true])for(const d of [0,10,50,100])assert.equal(heroFrame({anim:'idle',walkDistance:d,back}).frame,back?1:0);
});
test('full-body renderer never rotates, stretches or separates body parts',()=>{
 let calls=[];const ctx={save(){},restore(){},translate(){},scale(x,y){assert.equal(Math.abs(x),1);assert.equal(y,1)},drawImage(...args){calls.push(args)}};
 for(const id of HERO_IDS)for(const anim of ['idle','walk','attack','skill','hurt','dead'])for(const back of [false,true])for(const face of [-1,1]){
 const im={width:1024,height:1024};const images=new Map([[`heroes/${id}-walk.webp`,im],[`heroes/${id}-actions.webp`,im]]);
 const before=calls.length;drawHero(ctx,images,id,{anim,animTime:.2,walkDistance:20,back,face},30,40,110);
 assert.equal(calls.length,before+1);const a=calls.at(-1);assert(a.slice(1).every(Number.isFinite));assert.equal(a[3],a[4]);assert.equal(a[7],a[8]);assert(a[1]>=0&&a[2]>=0&&a[1]+a[3]<=1024&&a[2]+a[4]<=1024);
 }
});


test('Cockro anticipation, strike and recovery match the combat impact time',()=>{assert.equal(cockroFrame({anim:'attack',animTime:0,animDuration:.58}),8);assert.equal(cockroFrame({anim:'attack',animTime:.145,animDuration:.58}),9);assert.equal(cockroFrame({anim:'attack',animTime:.29,animDuration:.58}),10);assert.equal(cockroFrame({anim:'attack',animTime:.5,animDuration:.58}),11);assert.equal(cockroFrame({anim:'hurt'}),14);assert.equal(cockroFrame({dead:true}),15);});
