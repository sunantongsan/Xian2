// Visual impact only: never move collision coordinates or interrupt server AI.
const DURATION=.38;
export function triggerMonsterHit(monster,source,now){
 if(!monster||!Number.isFinite(now))return false;
 if(monster.hitReaction&&now-monster.hitReaction.at<.09)return false;
 const dx=monster.x-(source?.x??monster.x-1),dy=monster.y-(source?.y??monster.y),sx=dx-dy,sy=(dx+dy)*.5,n=Math.hypot(sx,sy)||1;
 monster.hitReaction={at:now,x:sx/n,y:sy/n,strength:monster.def?.boss ? .55 : monster.def?.elite ? .8 : 1};return true;
}
export function reactToMonsterHit(event,monsters,players,now){
 if(event.kind!=='hit'||!(event.amount>0))return null;
 const monster=monsters.find(m=>m.id===event.target);if(!monster||event.id!==undefined&&event.id<= (monster.lastHitEvent??-1))return null;
 if(event.id!==undefined)monster.lastHitEvent=event.id;
 return triggerMonsterHit(monster,players.find(p=>p?.id===event.player),now)?monster:null;
}
export function monsterHitPose(monster,now){
 const r=monster.hitReaction,age=r?now-r.at:DURATION;
 if(age<0||age>=DURATION)return null;
 // Sharp contact, visible recoil, then a small settling motion.
 const u=age/DURATION,k=u<.22?Math.sin(u/.22*Math.PI/2):Math.cos((u-.22)/.78*Math.PI/2)**2;
 const settle=u>.45?Math.sin((u-.45)/.55*Math.PI)*.045:0,a=k*r.strength;
 return {x:r.x*19*a,y:r.y*7*a-10*Math.sin(Math.PI*u)*r.strength,angle:(r.x<0?-1:1)*(.2*a-settle),sx:1+.15*a,sy:1-.14*a};
}
export function drawMonsterReaction(g,monster,x,y,size,now,draw){
 const pose=monsterHitPose(monster,now);if(!pose){draw();return;}
 const unit=size/100;g.save();try{g.translate(x+pose.x*unit,y+pose.y*unit);g.rotate(pose.angle);g.scale(pose.sx,pose.sy);g.translate(-x,-y);draw();}finally{g.restore();}
}
