// Full-body animation: continuous joints, distance-driven stance and soft secondary motion.
import {capturedBodyPose, WALK_CYCLE} from './captured-walk.js';
export {WALK_CYCLE};
const smooth=t=>t*t*(3-2*t);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function solveLimb(root,end,upper,lower,bend=1){
 const x=end.x-root.x,y=end.y-root.y,raw=Math.hypot(x,y)||1,d=clamp(raw,.001,upper+lower-.00001),ux=x/raw,uy=y/raw;
 const a=(upper*upper-lower*lower+d*d)/(2*d),b=Math.sqrt(Math.max(0,upper*upper-a*a))*bend;
 return {root,joint:{x:root.x+ux*a+uy*b,y:root.y+uy*a-ux*b},end:{x:root.x+ux*d,y:root.y+uy*d}};
}
export function bodyPose(distance=0,dx=.707,dy=.707,blend=0,clock=0,anim='idle',animTime=0){
 const pose=capturedBodyPose(distance,dx,dy,blend,clock);
 const {legs,arms,hips,chest,neck,chestAngle,hipAngle,phase}=pose;
 let bodyLean=0,fall=0;
 if(anim==='attack'||anim==='skill'){
  const t=clamp(animTime/(anim==='attack'?.55:.7),0,1),strike=Math.sin(Math.PI*t),reach=anim==='attack'?Math.sin((t*.95-.35)*Math.PI):Math.sin(t*Math.PI);
  bodyLean=-.09*strike;neck.x+=strike*.025;chest.x+=strike*.016;
  arms.forEach((a,i)=>{if(i===1&&anim==='attack')return;const end={x:a.shoulder.x+(anim==='attack'?.19*reach:.16),y:a.shoulder.y-(anim==='attack'?.06*strike:.08*strike)};const l=solveLimb(a.shoulder,end,.145,.15,i===0?1:-1);a.elbow=l.joint;a.hand=l.end;});
 }else if(anim==='hurt'){bodyLean=Math.sin(clamp(animTime/.3,0,1)*Math.PI)*.12;}
 else if(anim==='dead'){fall=smooth(clamp(animTime/.65,0,1));bodyLean=1.38*fall;}
 return {...pose,chestAngle:chestAngle+bodyLean*.3,bodyLean,fall};
}
function stamp(ctx,im,part,anchor,height,at,angle=0){
 const r=part.rect,k=height/r[3];ctx.save();ctx.translate(at.x,at.y);ctx.rotate(angle);ctx.drawImage(im,...r,-anchor[0]*k,-anchor[1]*k,r[2]*k,r[3]*k);ctx.restore();
}
function bone(ctx,im,part,a,b,width=1){
 const r=part.rect,px=part.bottom[0]-part.top[0],py=part.bottom[1]-part.top[1],dx=b.x-a.x,dy=b.y-a.y,k=Math.hypot(dx,dy)/Math.hypot(px,py);
 ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx));ctx.scale(k,k*width);ctx.rotate(-Math.atan2(py,px));ctx.drawImage(im,...r,-part.top[0],-part.top[1],r[2],r[3]);ctx.restore();
}
function weapon(ctx,hand,angle,demon){
 ctx.save();ctx.translate(hand.x,hand.y);ctx.rotate(angle);ctx.lineCap='round';ctx.strokeStyle='#392a30';ctx.lineWidth=.016;ctx.beginPath();ctx.moveTo(0,.028);ctx.lineTo(0,-.036);ctx.stroke();ctx.strokeStyle=demon?'#ba9673':'#b6cbd1';ctx.lineWidth=.012;ctx.beginPath();ctx.moveTo(-.027,-.034);ctx.lineTo(.027,-.034);ctx.stroke();ctx.fillStyle=demon?'#b5a5bb':'#d9f4ff';ctx.beginPath();ctx.moveTo(-.010,-.04);ctx.lineTo(-.007,-.27);ctx.lineTo(0,-.31);ctx.lineTo(.009,-.27);ctx.lineTo(.010,-.04);ctx.closePath();ctx.fill();ctx.restore();
}
export function drawPuppet(ctx,im,spec,actor,x,y,size,clock=0,hero='sword-male'){
 if(!im||!spec)return;const back=actor.back&&['idle','walk'].includes(actor.anim),view=spec[back?'back':'front'];
 const facing=actor.face||1,dx=(actor.walkDX??.707),dy=(actor.walkDY??.707);
 // Calculate in screen space, then reflect the artwork and the movement direction together.
 const pose=bodyPose(actor.walkDistance||0,dx,dy,actor.gaitBlend||0,clock,actor.anim||'idle',actor.animTime||0);
 if(facing<0){for(const l of pose.legs)for(const p of [l.hip,l.knee,l.foot,l.toe])p.x*=-1;for(const a of pose.arms)for(const p of [a.shoulder,a.elbow,a.hand])p.x*=-1;pose.hips.x*=-1;pose.chest.x*=-1;pose.neck.x*=-1;for(const k of ['chestAngle','hipAngle','headAngle','sashAngle'])pose[k]*=-1;}
 ctx.save();ctx.translate(x,y);ctx.scale(size*facing,size);if(pose.fall){ctx.translate(.12*pose.fall,-.03*pose.fall);ctx.rotate(pose.bodyLean);}else ctx.rotate(pose.bodyLean);
 const leg=i=>{const l=pose.legs[i];bone(ctx,im,view.thigh,l.hip,l.knee);
  const r=view.shin.rect,ankleX=r[2]*(hero==='sword-female'&&back?.62:.33),ankleY=r[3]*.73,cut=Math.floor(r[3]*.68);
  const shin={rect:[r[0],r[1],r[2],Math.ceil(r[3]*.79)],top:view.shin.top,bottom:[ankleX,ankleY]};
  const foot={rect:[r[0],r[1]+cut,r[2],r[3]-cut],top:[ankleX,ankleY-cut],bottom:[r[2]*(hero==='sword-female'&&back?.09:.92),r[3]*.94-cut]};
  bone(ctx,im,shin,l.knee,l.foot);bone(ctx,im,foot,l.foot,l.toe);
 };
 const arm=i=>{const a=pose.arms[i];bone(ctx,im,view.upperArm,a.shoulder,a.elbow,1.18);bone(ctx,im,view.forearm,a.elbow,a.hand,1.16);};
 // Sash is behind the body and follows the previous half-step instead of flapping in lockstep.
 stamp(ctx,im,view.sash,view.sash.top,.28,{x:pose.hips.x-.075,y:pose.hips.y+.01-pose.sashLift},.20+pose.sashAngle);
 const farLeg=pose.legs[0].depth<pose.legs[1].depth?0:1,farArm=pose.arms[0].depth<pose.arms[1].depth?0:1;ctx.save();ctx.globalAlpha*=.94;leg(farLeg);arm(farArm);ctx.restore();leg(1-farLeg);
 stamp(ctx,im,view.pelvis,view.pelvis.anchor,.185,{x:pose.hips.x,y:pose.hips.y+.005},pose.hipAngle);
 stamp(ctx,im,view.chest,view.chest.anchor,.27,pose.chest,pose.chestAngle);
 stamp(ctx,im,view.head,view.head.anchor,.215,pose.neck,pose.headAngle);
 arm(1-farArm);
 if(actor.anim==='attack'||actor.anim==='skill')weapon(ctx,pose.arms[0].hand,-.4+Math.sin((actor.animTime||0)*7)*1.1,hero.startsWith('demon'));
 else weapon(ctx,{x:pose.hips.x-.065,y:pose.hips.y+.035},-.38,hero.startsWith('demon'));
 ctx.restore();return pose;
}
