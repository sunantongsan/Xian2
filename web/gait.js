// A complete two-leg cycle. Feet remain planted for 60% of each cycle;
// the other 40% lifts, passes the supporting leg, and lands ahead.
export const CYCLE_DISTANCE=76;
const STANCE=.6;
const mix=(a,b,t)=>a+(b-a)*t;
export function footAt(phase,dx,dy,blend=1){
 const t=((phase%1)+1)%1,planted=t<STANCE;
 const swing=(t-STANCE)/(1-STANCE);
 const travel=planted?.5-t/STANCE:-.5+(swing*swing*(3-2*swing));
 return {x:dx*CYCLE_DISTANCE*STANCE/110*travel*blend,
 y:(dy*CYCLE_DISTANCE*STANCE/110*travel-(planted?0:Math.sin(Math.PI*swing)*.115))*blend,
 planted,lift:planted?0:Math.sin(Math.PI*swing)*.115*blend};
}
export function bendLeg(hip,foot){
 const upper=.275,lower=.285,dx=foot.x-hip.x,dy=foot.y-hip.y,d0=Math.hypot(dx,dy),d=Math.min(upper+lower-.001,Math.max(.02,d0));
 const ux=dx/(d0||1),uy=dy/(d0||1),along=(upper*upper-lower*lower+d*d)/(2*d),across=Math.sqrt(Math.max(0,upper*upper-along*along));
 return {hip,knee:{x:hip.x+ux*along+uy*across,y:hip.y+uy*along-ux*across},foot:{x:hip.x+ux*d,y:hip.y+uy*d}};
}
export function gaitPose(distance,dx=1,dy=.5,blend=1){
 const phase=distance/CYCLE_DISTANCE,bob=Math.cos(phase*Math.PI*4)*.01*blend;
 const legs=[0,.5].map((offset,i)=>{
  // Solve in the vertical walking plane first, then project into the isometric camera.
  // Solving directly in screen space would make forward strides crouch unnaturally.
  const f=footAt(phase+offset,1,0,blend),side=i===0?1:-1;
  const world=bendLeg({x:0,y:-.51+bob},{x:f.x,y:f.y});
  const project=v=>({x:side*.037+v.x*dx,y:side*.018+v.x*dy+v.y});
  return {hip:project(world.hip),knee:project(world.knee),foot:project(world.foot),world,planted:f.planted,lift:f.lift};
 });
 return {legs,bob,phase};
}
