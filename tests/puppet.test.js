import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyPose,WALK_CYCLE,drawPuppet} from '../web/puppet.js';
import {sampleCapture} from '../web/captured-walk.js';
import {WALK_CAPTURE} from '../web/walk-capture.js';
import {PUPPET_ATLASES} from '../web/puppet-atlas.js';
const samples=Array.from({length:128},(_,i)=>sampleCapture(i/128*WALK_CYCLE));
const range=values=>Math.max(...values)-Math.min(...values);
test('captured gait preserves whole-body movement and opposing arm/leg swing',()=>{
 assert.equal(WALK_CAPTURE.frames.length,64);
 assert(WALK_CAPTURE.duration>1&&WALK_CAPTURE.duration<1.2);
 for(const name of ['Hips','Neck1','LeftArm','RightArm'])assert(range(samples.map(j=>j[name][1]))>.02,name);
 for(const side of ['Left','Right']){
  assert(range(samples.map(j=>j[side+'Hand'][2]))>.2);
  let opposite=0;for(const j of samples)if((j[side+'Hand'][2]-j[side+'Arm'][2])*(j[side+'Foot'][2]-j[side+'UpLeg'][2])<0)opposite++;
  assert(opposite>90,`${side}: ${opposite}`);
 }
});
test('captured limbs retain their lengths rather than rubber-stretching',()=>{
 for(const side of ['Left','Right'])for(const [a,b] of [['UpLeg','Leg'],['Leg','Foot'],['Arm','ForeArm'],['ForeArm','Hand']]){
 const lengths=samples.map(j=>Math.hypot(...j[side+a].map((v,k)=>v-j[side+b][k])));
 assert(range(lengths)<1e-7,`${side} ${a}: ${range(lengths)}`);
 }
});
test('loop has no pose jump and transforms correctly in all eight headings',()=>{
 for(let i=0;i<8;i++){
  const dx=Math.cos(i*Math.PI/4),dy=Math.sin(i*Math.PI/4);
  const a=bodyPose(0,dx,dy,1),b=bodyPose(WALK_CYCLE,dx,dy,1),near=bodyPose(WALK_CYCLE-0.001,dx,dy,1);
  for(let l=0;l<2;l++)for(const key of ['hip','knee','foot','toe']){
   assert.deepEqual(a.legs[l][key],b.legs[l][key]);
   assert(Math.hypot(a.legs[l][key].x-near.legs[l][key].x,a.legs[l][key].y-near.legs[l][key].y)<.0001);
  }
 }
});
test('idle transition is grounded and walking includes ankle articulation',()=>{
 for(let i=0;i<64;i++){
 const p=bodyPose(i/64*WALK_CYCLE,1,0,1);
 const toes=['LeftToeBase','RightToeBase','LeftToeBaseEnd','RightToeBaseEnd'].map(n=>p.joints[n][1]);
 assert(Math.abs(Math.min(...toes))<1e-8);
 }
 const idle=bodyPose(50,1,0,0);assert.equal(idle.joints.LeftFoot[1],idle.joints.RightFoot[1]);
 const angles=samples.map(j=>Math.atan2(j.LeftToeBaseEnd[1]-j.LeftFoot[1],j.LeftToeBaseEnd[2]-j.LeftFoot[2]));
 assert(range(angles)>.4);
});
test('all four new characters render both facings and combat states without invalid draws',()=>{
 let count=0;const ctx=new Proxy({globalAlpha:1},{get(o,k){if(k in o)return o[k];return (...args)=>{if(k==='drawImage'){count++;for(const v of args.slice(1))assert(Number.isFinite(v));assert(args[3]>0&&args[4]>0);}else for(const v of args)if(typeof v==='number')assert(Number.isFinite(v));};}});
 for(const [hero,spec]of Object.entries(PUPPET_ATLASES))for(const back of [false,true])for(const face of [-1,1])for(const anim of ['walk','idle','attack','skill','hurt','dead'])drawPuppet(ctx,{},spec,{face,back,anim,animTime:.3,walkDistance:30,gaitBlend:anim==='walk'?1:0},0,0,110,1,hero);
 assert(count>1000);
});
