import {WALK_CAPTURE} from './walk-capture.js';
export const WALK_CYCLE=WALK_CAPTURE.cycleDistance;
const names=WALK_CAPTURE.jointNames;
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function sampleCapture(distance){
 const count=WALK_CAPTURE.frames.length,t=((distance/WALK_CYCLE)%1+1)%1*count,a=Math.floor(t),b=(a+1)%count,u=t-a;
 const joints=Object.fromEntries(names.map((n,i)=>[n,WALK_CAPTURE.frames[a][i].map((v,j)=>mix(v,WALK_CAPTURE.frames[b][i][j],u))]));
 // Project interpolated joints back onto the original measured bone lengths.
 for(const [parent,child,length] of WALK_CAPTURE.bones){const p=joints[parent],c=joints[child],d=c.map((v,k)=>v-p[k]),scale=length/(Math.hypot(...d)||1);joints[child]=p.map((v,k)=>v+d[k]*scale);}
 return joints;
}
const rest={Hips:[0,.65,0],Spine:[0,.735,0],Spine1:[0,.82,0],Neck1:[0,.89,0],Head:[0,.945,0],HeadEnd:[0,1.0,0],LeftUpLeg:[.065,.58,0],LeftLeg:[.065,.305,.014],LeftFoot:[.065,.045,0],LeftToeBase:[.065,.015,.08],LeftToeBaseEnd:[.065,.01,.12],RightUpLeg:[-.065,.58,0],RightLeg:[-.065,.305,.014],RightFoot:[-.065,.045,0],RightToeBase:[-.065,.015,.08],RightToeBaseEnd:[-.065,.01,.12],LeftArm:[.124,.845,0],LeftForeArm:[.142,.65,.005],LeftHand:[.139,.512,.014],RightArm:[-.124,.845,0],RightForeArm:[-.142,.65,.005],RightHand:[-.139,.512,.014]};
export function capturedBodyPose(distance=0,dx=.707,dy=.707,blend=0,clock=0){
 blend=clamp(blend,0,1);const raw=sampleCapture(distance),joints={};
 const ground=Math.min(...['LeftToeBaseEnd','RightToeBaseEnd','LeftToeBase','RightToeBase'].map(n=>raw[n][1]));
 for(const name of names){const b=rest[name];joints[name]=raw[name].map((v,i)=>mix(b[i],v-(i===1?ground:0),blend));}
 // One shared captured posture controls every joint, including the torso and shoulders.
 const magnitude=Math.hypot(dx,dy)||1;dx/=magnitude;dy/=magnitude;
 const project=v=>{const wx=v[2]*dx+v[0]*dy,wy=v[2]*dy-v[0]*dx;return {x:.8*(wx-wy),y:.4*(wx+wy)-v[1],depth:wx+wy};};
 const points=Object.fromEntries(Object.entries(joints).map(([k,v])=>[k,project(v)]));
 const hips=points.Hips,chest={...hips},neck=points.Neck1;
 const angle=(a,b)=>Math.atan2(b.x-a.x,a.y-b.y);
 const legs=['Left','Right'].map(side=>({hip:points[side+'UpLeg'],knee:points[side+'Leg'],foot:points[side+'Foot'],toe:points[side+'ToeBaseEnd'],depth:points[side+'UpLeg'].depth}));
 const arms=['Left','Right'].map(side=>{const elbow=points[side+'ForeArm'],wrist=points[side+'Hand'];return {shoulder:points[side+'Arm'],elbow,hand:{x:wrist.x+(wrist.x-elbow.x)*.23,y:wrist.y+(wrist.y-elbow.y)*.23},depth:points[side+'Arm'].depth};});
 const breath=Math.sin(clock*1.8)*.0015*(1-blend);chest.y-=breath;neck.y-=breath;
 const chestAngle=angle(hips,points.Neck1),hipAngle=Math.atan2(points.LeftUpLeg.y-points.RightUpLeg.y,Math.abs(points.LeftUpLeg.x-points.RightUpLeg.x)||.1)*.15;
 const phase=distance/WALK_CYCLE;
 return {legs,arms,hips,chest,neck,chestAngle,hipAngle,headAngle:angle(points.Neck1,points.HeadEnd)*.45,bodyLean:0,fall:0,phase,sashAngle:Math.sin(phase*Math.PI*2-.7)*.035*blend+Math.sin(clock*1.8)*.01,sashLift:0,joints};
}
