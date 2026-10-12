// Full-body animation: continuous joints, distance-driven stance and soft secondary motion.
export const WALK_CYCLE=88;
const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function solveLimb(root,end,upper,lower,bend=1){
 const x=end.x-root.x,y=end.y-root.y,raw=Math.hypot(x,y)||1,d=clamp(raw,.001,upper+lower-.00001),ux=x/raw,uy=y/raw;
 const a=(upper*upper-lower*lower+d*d)/(2*d),b=Math.sqrt(Math.max(0,upper*upper-a*a))*bend;
 return {root,joint:{x:root.x+ux*a+uy*b,y:root.y+uy*a-ux*b},end:{x:root.x+ux*d,y:root.y+uy*d}};
}
export function walkingFoot(phase,blend=1){
 const t=((phase%1)+1)%1,stance=t<.55,u=(t-.55)/.45;
 return {x:(stance?.5-t/.55:-.5+smooth(u))*WALK_CYCLE*.55/110*blend,y:stance?0:-Math.sin(Math.PI*u)*.085*blend,stance};
}
export function bodyPose(distance=0,dx=.707,dy=.707,blend=0,clock=0,anim='idle',animTime=0){
 blend=clamp(blend,0,1);const phase=distance/WALK_CYCLE,beat=phase*TAU;
 const sx=.8*(dx-dy),sy=.4*(dx+dy),breath=Math.sin(clock*2.1)*.002*(1-blend);
 const bob=Math.cos(beat*2)*.006*blend+breath,sway=Math.sin(beat)*.009*blend;
 const hips={x:sway,y:mix(-.54,-.495,blend)+bob},chestAngle=Math.sin(beat)*.035*blend+.015*blend,hipAngle=-Math.sin(beat)*.045*blend;
 const chest={x:sway*.5,y:hips.y-.01},neck={x:sway*.35+Math.sin(chestAngle)*.22,y:hips.y-.242};
 const project=(v,side=0)=>({x:side*.038+v.x*sx,y:side*.014+v.x*sy+v.y});
 const legs=[1,-1].map((side,i)=>{const foot=walkingFoot(phase+i*.5,blend);const world=solveLimb({x:0,y:hips.y},{x:foot.x,y:foot.y},.27,.285);const hip=project(world.root,side);hip.x+=sway;const knee=project(world.joint,side);knee.x+=sway*.45;return {hip,knee,foot:project(world.end,side),world,stance:foot.stance};});
 const arms=[1,-1].map((side,i)=>{const foot=walkingFoot(phase+i*.5,blend),shoulder={x:chest.x+side*.085,y:hips.y-.20+side*.018};const swing=-foot.x*.95;
 const arm=solveLimb({x:0,y:0},{x:swing,y:.265-Math.max(0,swing)*.12},.145,.15,-1);
 const projectArm=v=>({x:shoulder.x+v.x*sx,y:shoulder.y+v.x*sy+v.y});return {shoulder,elbow:projectArm(arm.joint),hand:projectArm(arm.end),world:arm};});
 let bodyLean=0,fall=0;
 if(anim==='attack'||anim==='skill'){
  const t=clamp(animTime/(anim==='attack'?.55:.7),0,1),strike=Math.sin(Math.PI*t),reach=anim==='attack'?Math.sin((t*.95-.35)*Math.PI):Math.sin(t*Math.PI);
  bodyLean=-.09*strike;neck.x+=strike*.025;chest.x+=strike*.016;
  arms.forEach((a,i)=>{if(i===1&&anim==='attack')return;const end={x:a.shoulder.x+(anim==='attack'?.19*reach:.16),y:a.shoulder.y-(anim==='attack'?.06*strike:.08*strike)};const l=solveLimb(a.shoulder,end,.145,.15,i===0?1:-1);a.elbow=l.joint;a.hand=l.end;});
 }else if(anim==='hurt'){bodyLean=Math.sin(clamp(animTime/.3,0,1)*Math.PI)*.12;}
 else if(anim==='dead'){fall=smooth(clamp(animTime/.65,0,1));bodyLean=1.38*fall;}
 return {legs,arms,hips,chest,neck,chestAngle:chestAngle+bodyLean*.3,hipAngle,headAngle:-chestAngle*.65+Math.sin(beat-.7)*.02*blend,bodyLean,fall,phase,sashAngle:Math.sin(beat-.8)*.10*blend+Math.sin(clock*2.5)*.025,sashLift:.015*blend};
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
 if(facing<0){for(const l of pose.legs)for(const p of [l.hip,l.knee,l.foot])p.x*=-1;for(const a of pose.arms)for(const p of [a.shoulder,a.elbow,a.hand])p.x*=-1;pose.hips.x*=-1;pose.chest.x*=-1;pose.neck.x*=-1;}
 ctx.save();ctx.translate(x,y);ctx.scale(size*facing,size);if(pose.fall){ctx.translate(.12*pose.fall,-.03*pose.fall);ctx.rotate(pose.bodyLean);}else ctx.rotate(pose.bodyLean);
 const leg=i=>{const l=pose.legs[i];bone(ctx,im,view.thigh,l.hip,l.knee);bone(ctx,im,view.shin,l.knee,l.foot);};
 const arm=i=>{const a=pose.arms[i];bone(ctx,im,view.upperArm,a.shoulder,a.elbow,1.18);bone(ctx,im,view.forearm,a.elbow,a.hand,1.16);};
 // Sash is behind the body and follows the previous half-step instead of flapping in lockstep.
 stamp(ctx,im,view.sash,view.sash.top,.28,{x:pose.hips.x-.075,y:pose.hips.y+.01-pose.sashLift},.20+pose.sashAngle);
 ctx.save();ctx.globalAlpha*=.87;leg(1);arm(1);ctx.restore();leg(0);
 stamp(ctx,im,view.pelvis,view.pelvis.anchor,.155,pose.hips,pose.hipAngle);
 stamp(ctx,im,view.chest,view.chest.anchor,.28,pose.chest,pose.chestAngle);
 stamp(ctx,im,view.head,view.head.anchor,.265,pose.neck,pose.headAngle);
 arm(0);
 if(actor.anim==='attack'||actor.anim==='skill')weapon(ctx,pose.arms[0].hand,-.4+Math.sin((actor.animTime||0)*7)*1.1,hero.startsWith('demon'));
 else weapon(ctx,{x:pose.hips.x-.065,y:pose.hips.y+.035},-.38,hero.startsWith('demon'));
 ctx.restore();return pose;
}
