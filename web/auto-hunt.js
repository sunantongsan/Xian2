// Bounded, reachability-aware auto hunting. Paths that stop at a wall are not valid targets.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class AutoHunt {
 constructor(){this.reset();}
 reset(){this.target=null;this.path=[];this.nextScan=0;this.blocked=new WeakMap();this.lastPosition=null;this.stalled=0;}
 plan(actor,enemies,now,reach,{route,clear}){
  const candidates=enemies.filter(e=>e.hp>0&&!e.returning&&(this.blocked.get(e)||0)<=now&&distance(actor,e)<=480).sort((a,b)=>distance(actor,a)-distance(actor,b)).slice(0,6);
  let best=null;
  for(const enemy of candidates){
   const d=distance(actor,enemy);
   const path=d<=reach&&clear(actor,enemy)?[]:route(actor,enemy);
   const end=path.at(-1)||actor;
   if(distance(end,enemy)>reach||!clear(end,enemy)){this.blocked.set(enemy,now+4);continue;}
   let length=0,from=actor;for(const point of path){length+=distance(from,point);from=point;}
   const score=Math.max(d,length)+(enemy===this.target?-24:0);
   if(!best||score<best.score)best={enemy,path,score};
  }
  const changed=best?.enemy!==this.target;
  this.target=best?.enemy||null;this.path=best?.path||[];
  if(changed){this.stalled=0;this.lastPosition={...actor};}
  this.nextScan=now+.6;
 }
 update(actor,enemies,now,dt,reach,nav){
  if(now>=this.nextScan||(this.target&&(this.target.hp<=0||this.target.returning)))this.plan(actor,enemies,now,reach,nav);
  if(!this.target)return null;
  const ready=distance(actor,this.target)<=reach&&nav.clear(actor,this.target);
  if(ready){this.stalled=0;this.lastPosition={...actor};return {target:this.target,ready:true,point:actor};}
  while(this.path.length&&distance(actor,this.path[0])<8)this.path.shift();
  if(this.lastPosition&&distance(actor,this.lastPosition)<1)this.stalled+=dt;else{this.stalled=0;this.lastPosition={...actor};}
  if(!this.path.length||this.stalled>1.2){this.blocked.set(this.target,now+5);this.target=null;this.path=[];this.nextScan=0;this.stalled=0;return null;}
  return {target:this.target,ready:false,point:this.path[0]};
 }
}


