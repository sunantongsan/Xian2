import {LAYERED_HEROES} from './layered-hero-data.js';
export const layeredHeroFiles=hero=>LAYERED_HEROES[hero]?.pages||[];
const finite=(n,f=0)=>Number.isFinite(n)?n:f;
export function layeredFrame(actor={}){
 const t=Math.max(0,finite(actor.animTime));
 const duration=Math.max(.01,finite(actor.animDuration,actor.anim==='skill'?.6:.46));
 const phase=Math.min(3,Math.floor(t/duration*4));
 if(actor.dead||actor.anim==='dead')return {frame:16+Math.min(3,Math.floor(t/.225)),flip:(actor.face||1)<0};
 if(actor.anim==='attack')return {frame:8+phase,flip:(actor.face||1)<0};
 if(actor.anim==='skill')return {frame:12+phase,flip:(actor.face||1)<0};
 if(actor.anim==='walk'){
  const step=Math.floor(((finite(actor.walkDistance)%150+150)%150)/150*4);
  // Isometric projection: screen X = world X-Y, screen Y = (world X+Y)/2.
  const dx=finite(actor.walkDX),dy=finite(actor.walkDY),sx=dx-dy,sy=(dx+dy)*.5;
  const start=Math.abs(sx)>Math.abs(sy)*1.5?(sx<0?28:24):(actor.back?4:0);
  return {frame:start+step,flip:false};
 }
 return {frame:actor.anim==='hurt'?22:actor.anim==='guard'?21:actor.anim==='recover'?23:20,flip:(actor.face||1)<0};
}
export function drawLayeredHero(ctx,images,hero,actor,x,y,size){
 const data=LAYERED_HEROES[hero];if(!data||!Number.isFinite(size)||size<=0)return;
 if(data.pages.some(p=>!images.has(p)))return;
 const pose=layeredFrame(actor),frame=data.frames[pose.frame];
 // Unspecified means an old server/roster preview; explicit none means unequipped.
 const look=actor.weaponLook===undefined?data.weapons[0]:actor.weaponLook;
 const weapon=frame.weapons[look],effect=frame.effects[look];
 const draw=part=>{if(!part)return;const [sx,sy,w,h]=part.rect;ctx.drawImage(images.get(data.pages[part.page]),sx,sy,w,h,part.origin[0]-data.pivot[0],part.origin[1]-data.pivot[1],w,h);};
 ctx.save();ctx.translate(x,y);const scale=size/314;ctx.scale(pose.flip?-scale:scale,scale);
 if(['stowed','dropped'].includes(frame.mode)){draw(weapon);draw(frame.body);}else{draw(frame.body);draw(weapon);}
 draw(frame.foreground);draw(effect);ctx.restore();
 return {sheet:'layered',frame:pose.frame,flip:pose.flip};
}
