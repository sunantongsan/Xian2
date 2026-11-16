import {drawAdvancedMonster} from './monster-render.js';
// Quantized poses fit the whole local crowd; no repeated vector painting after warmup.
export function createMonsterCache({makeCanvas=()=>document.createElement('canvas'),paint=drawAdvancedMonster,limit=288}={}){
 const frames=new Map();const cycle=Math.PI*2;
 return {draw(g,e,x,y,size,time=0){
  const state=e.hp<=0?'dead':e.state==='windup'?'windup':e.moving?'walk':'idle';
  const count=state==='walk'?6:state==='dead'?1:2;
  const phase=state==='walk'?(e.walkDistance||0)/22:time*3;
  const frame=state==='dead'?0:Math.floor(((phase%cycle+cycle)%cycle)/cycle*count);
  const key=e.def.species+':'+(e.def.boss?'boss':'normal')+':'+state+':'+frame;let cv=frames.get(key);
  if(!cv){cv=makeCanvas();cv.width=160;cv.height=152;const c=cv.getContext('2d');const pose=frame/count*cycle;paint(c,{...e,face:1,moving:state==='walk',walkDistance:pose*22},80,128,100,pose/3);frames.set(key,cv);while(frames.size>limit){const oldest=frames.keys().next().value;const old=frames.get(oldest);frames.delete(oldest);old.width=old.height=1;}}
  else{frames.delete(key);frames.set(key,cv);}
  const k=size/100;g.save();g.translate(x,y);g.scale(e.face<0?-1:1,1);g.drawImage(cv,-80*k,-128*k,160*k,152*k);g.restore();
 },clear(){for(const cv of frames.values())cv.width=cv.height=1;frames.clear();},get size(){return frames.size;}};
}

