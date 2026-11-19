// Velocity is in world units per second. Exponential response is stable across frame rates.
export function glide(body, vx, vz, dt, valid, accel=10, brake=16) {
  const t=1-Math.exp(-dt*(vx||vz?accel:brake));
  body.vx=(body.vx||0)*(1-t)+vx*t;
  body.vz=(body.vz||0)*(1-t)+vz*t;
  if(Math.hypot(body.vx,body.vz)<.025)body.vx=body.vz=0;
  const nx=body.x+body.vx*dt,nz=body.z+body.vz*dt;
  if(valid(nx,body.z))body.x=nx;else body.vx=0;
  if(valid(body.x,nz))body.z=nz;else body.vz=0;
  return Math.hypot(body.vx,body.vz);
}
export function turn(angle,target,dt,rate=11){
  const diff=target-angle;
  return angle+Math.atan2(Math.sin(diff),Math.cos(diff))*(1-Math.exp(-rate*dt));
}

// A volume-preserving airborne pose with anticipation, extension, landing and settling.
export function leapScale(t){
  const pulse=(center,width)=>Math.exp(-((t-center)**2)/(width*width));
  return 1-.18*pulse(.08,.07)+.24*pulse(.4,.19)-.25*pulse(.82,.09)+.08*pulse(.94,.05);
}
