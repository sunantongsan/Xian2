import test from 'node:test';
import assert from 'node:assert/strict';
import {footAt,gaitPose,CYCLE_DISTANCE} from '../web/gait.js';
test('each leg lifts and passes the other; opposite contact poses are not duplicates',()=>{
 const a=gaitPose(0,1,.4),b=gaitPose(CYCLE_DISTANCE/2,1,.4);
 assert(a.legs[0].foot.x>a.legs[1].foot.x);
 assert(b.legs[0].foot.x<b.legs[1].foot.x);
 for(const leg of [0,1]){
 const poses=Array.from({length:80},(_,i)=>gaitPose(i/80*CYCLE_DISTANCE,1,.4).legs[leg]);
 assert(poses.some(p=>p.lift>.1));assert(poses.some(p=>p.planted));
 assert(poses.some(p=>p.foot.x<0));assert(poses.some(p=>p.foot.x>0));
 }
});
test('planted feet cancel root displacement rather than sliding with the character',()=>{
 for(const [dx,dy]of [[1.13,0],[.8,.4],[.8,-.4],[0,.565]]){
 const t1=.1,t2=.5,a=footAt(t1,dx,dy),b=footAt(t2,dx,dy),travel=(t2-t1)*CYCLE_DISTANCE/110;
 assert(Math.abs(b.x-a.x+dx*travel)<1e-10);
 assert(Math.abs(b.y-a.y+dy*travel)<1e-10);
 }
});
test('cycle closes continuously, idle has no foot lift, and joints have fixed lengths',()=>{
 for(const [dx,dy]of [[1.13,0],[.8,.4],[.8,-.4],[0,.565]])for(let i=0;i<100;i++){
 const p=gaitPose(i/100*CYCLE_DISTANCE,dx,dy);
 for(const leg of p.legs){const l=leg.world;assert(Math.abs(Math.hypot(l.knee.x-l.hip.x,l.knee.y-l.hip.y)-.275)<1e-8);assert(Math.abs(Math.hypot(l.foot.x-l.knee.x,l.foot.y-l.knee.y)-.285)<1e-8);}
 }
 const a=footAt(.999999,1,.4),b=footAt(0,1,.4);assert(Math.hypot(a.x-b.x,a.y-b.y)<.00001);
 assert(gaitPose(30,1,.4,0).legs.every(l=>l.lift===0));
});
