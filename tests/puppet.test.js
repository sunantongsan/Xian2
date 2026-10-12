import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyPose,walkingFoot,WALK_CYCLE,drawPuppet} from '../web/puppet.js';
import {PUPPET_ATLASES} from '../web/puppet-atlas.js';
test('both whole arms counter-swing with their corresponding leg',()=>{
 for(const phase of [0,.125,.25,.5,.625,.75]){const p=bodyPose(phase*WALK_CYCLE,1,0,1);for(let i=0;i<2;i++){const foot=walkingFoot(phase+i*.5);assert(p.arms[i].world.end.x*foot.x<=.000001);}}
 const a=bodyPose(0,1,0,1),b=bodyPose(WALK_CYCLE*.5,1,0,1);
 assert(a.arms[0].hand.x<a.arms[0].shoulder.x);assert(b.arms[0].hand.x>b.arms[0].shoulder.x);
 assert(a.legs[0].foot.x>b.legs[0].foot.x);
});
test('shoulder, pelvis and head move rather than keeping a static torso',()=>{
 const a=bodyPose(WALK_CYCLE*.25,1,0,1),b=bodyPose(WALK_CYCLE*.75,1,0,1);
 assert(a.chestAngle!==b.chestAngle);assert(a.hipAngle!==b.hipAngle);assert(a.headAngle!==b.headAngle);assert(a.chestAngle*a.hipAngle<0);assert(b.chestAngle*b.hipAngle<0);
});
test('cycle seam is continuous and planted feet cancel distance, at all camera headings',()=>{
 for(const [dx,dy]of [[1,0],[0,1],[-1,0],[0,-1],[.707,.707]]){
 const a=bodyPose(0,dx,dy,1,0),b=bodyPose(WALK_CYCLE,dx,dy,1,0);
 for(let i=0;i<2;i++)for(const key of ['hip','knee','foot'])assert(Math.hypot(a.legs[i][key].x-b.legs[i][key].x,a.legs[i][key].y-b.legs[i][key].y)<1e-8);
 }
 const a=walkingFoot(.1),b=walkingFoot(.5);assert(Math.abs(b.x-a.x+.4*WALK_CYCLE/110)<1e-8);
});
test('limb lengths are stable throughout the cycle and blend to a grounded idle',()=>{
 for(let i=0;i<80;i++){const p=bodyPose(i/80*WALK_CYCLE,1,0,1);for(const l of p.legs){const w=l.world;assert(Math.abs(Math.hypot(w.joint.x-w.root.x,w.joint.y-w.root.y )-.27)<1e-8);assert(Math.abs(Math.hypot(w.end.x-w.joint.x,w.end.y-w.joint.y )-.285)<1e-8);}for(const a of p.arms){const w=a.world;assert(Math.abs(Math.hypot(w.joint.x,w.joint.y)-.145)<1e-8);}}
 assert(bodyPose(30,1,0,0).legs.every(l=>Math.abs(l.world.end.y)<1e-8));
});
test('all four new characters render both facings and combat states without invalid draws',()=>{
 let count=0;const ctx=new Proxy({globalAlpha:1},{get(o,k){if(k in o)return o[k];return (...args)=>{if(k==='drawImage'){count++;for(const v of args.slice(1))assert(Number.isFinite(v));assert(args[3]>0&&args[4]>0);}else for(const v of args)if(typeof v==='number')assert(Number.isFinite(v));};}});
 for(const [hero,spec]of Object.entries(PUPPET_ATLASES))for(const back of [false,true])for(const face of [-1,1])for(const anim of ['walk','idle','attack','skill','hurt','dead'])drawPuppet(ctx,{},spec,{face,back,anim,animTime:.3,walkDistance:30,gaitBlend:anim==='walk'?1:0},0,0,110,1,hero);
 assert(count>1000);
});
