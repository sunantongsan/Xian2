// Visual interpolation only: authoritative positions remain unchanged for combat.
export function renderPosition(actor,now=performance.now()){
 const f=actor.renderFrom;if(!f)return actor;
 const t=Math.max(0,Math.min(1,(now-f.at)/100));
 return {x:f.x+(actor.x-f.x)*t,y:f.y+(actor.y-f.y)*t};
}
export function receiveActor(previous,next,now=performance.now()){
 const visual=typeof next.anim==='string'?{receivedAt:now,aimDX:['attack','skill'].includes(next.anim)?previous?.aimDX:undefined,aimDY:['attack','skill'].includes(next.anim)?previous?.aimDY:undefined,visualAnimTime:previous?.anim===next.anim?(previous.visualAnimTime||0)+Math.max(0,Math.min(.2,(now-(previous.receivedAt??now))/1000)):0}:{};
 if(!previous||Math.hypot(next.x-previous.x,next.y-previous.y)>300)return {...next,...visual};
 const point=renderPosition(previous,now);return {...next,...visual,renderFrom:{x:point.x,y:point.y,at:now,walkDistance:previous.walkDistance||0}};
}

export function updateActor(previous,next,now=performance.now()){
 const received=receiveActor(previous,next,now);
 return previous?Object.assign(previous,received,{renderFrom:received.renderFrom}):received;
}
