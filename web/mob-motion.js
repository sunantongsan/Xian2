import {traceStep,walkable} from './maps.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function moveMonster(e,scene,goal,step){const n=dist(e,goal);if(n<.01)return;const next=traceStep(scene,e,{x:e.x+(goal.x-e.x)/n*Math.min(n,step),y:e.y+(goal.y-e.y)/n*Math.min(n,step)}),moved=dist(e,next);if(moved>.01){e.walkDistance=(e.walkDistance||0)+moved;e.face=(next.x-e.x)-(next.y-e.y)>=0?1:-1;e.moving=true;Object.assign(e,next);}return moved;}
export function wanderMonster(e,scene,dt,now){
 if(e.state==='windup')return;e.state='idle';if(now<(e.restUntil||0))return;
 if(!e.roamGoal){const seed=String(e.id||e.spawnId).split('').reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,0),turn=e.roamTurn||0;e.roamTurn=turn+1;const a=(seed%628)/100+turn*2.399,r=70+(seed+turn*37)%150;
  const goal={x:e.homeX+Math.cos(a)*r,y:e.homeY+Math.sin(a)*r};if(!walkable(scene,goal)){e.restUntil=now+1;return;}e.roamGoal=goal;}
 const moved=moveMonster(e,scene,e.roamGoal,e.def.speed*.45*dt);
 if(dist(e,e.roamGoal)<8||!moved){e.roamGoal=null;e.restUntil=now+1+(e.roamTurn%4)*.6;}
}
