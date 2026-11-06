import {drawAdvancedMonster} from './monster-render.js';
// Reuse twenty-four poses per state/species; keep authoritative movement and combat untouched.
export function createMonsterCache({makeCanvas=()=>document.createElement('canvas'),paint=drawAdvancedMonster,limit=128}={}){
 const frames=new Map();const count=24,cycle=Math.PI*2;
 return {draw(g,e,x,y,size,time=0){
  const state=e.hp<=0?'dead':e.state==='windup'?'windup':e.moving?'walk':'idle';
  const phase=state==='walk'?(e.walkDistance||0)/22:time*3;
  const frame=state==='dead'?0:Math.floor(((phase%cycle+cycle)%cycle)/cycle*count);
  const key=e.def.species+':'+state+':'+frame;let cv=frames.get(key);
  if(!cv){cv=makeCanvas();cv.width=200;cv.height=190;const c=cv.getContext('2d');c.scale(1.25,1.25);const pose=frame/count*cycle;paint(c,{...e,face:1,moving:state==='walk',walkDistance:pose*22},80,128,100,pose/3);frames.set(key,cv);while(frames.size>limit){const oldest=frames.keys().next().value;const old=frames.get(oldest);frames.delete(oldest);old.width=old.height=1;}}
  else{frames.delete(key);frames.set(key,cv);}
  const k=size/100;g.save();g.translate(x,y);g.scale(e.face<0?-1:1,1);g.drawImage(cv,-80*k,-128*k,160*k,152*k);g.restore();
 },clear(){for(const cv of frames.values())cv.width=cv.height=1;frames.clear();},get size(){return frames.size;}};
}
