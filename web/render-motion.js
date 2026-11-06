// Visual interpolation only: authoritative positions remain unchanged for combat.
export function renderPosition(actor,now=performance.now()){
 const f=actor.renderFrom;if(!f)return actor;
 const t=Math.max(0,Math.min(1,(now-f.at)/100));
 return {x:f.x+(actor.x-f.x)*t,y:f.y+(actor.y-f.y)*t};
}
export function receiveActor(previous,next,now=performance.now()){
 if(!previous||Math.hypot(next.x-previous.x,next.y-previous.y)>300)return {...next};
 const point=renderPosition(previous,now);return {...next,renderFrom:{x:point.x,y:point.y,at:now}};
}

export function updateActor(previous,next,now=performance.now()){
 const received=receiveActor(previous,next,now);
 return previous?Object.assign(previous,received,{renderFrom:received.renderFrom}):received;
}
