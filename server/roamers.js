import {fresh,maxHP,combatStats} from '../web/core.js';
import {knownSkills} from '../web/skills.js';
import {traceStep,walkable,toWorld,MAPS,REGIONS} from '../web/maps.js';
import {pvpAttack} from './pvp.js';
const ROSTER=[['แสงเหนือ',5],['ดาวหาง',8],['มะลิซ่า',12],['ขุนเหล็ก',16],['สายหมอก',20],['วายุคราม',25],['จันทร์เจ้า',30],['ตะวันแดง',35],['นิลกาฬ',12],['ประกายดาว',20],['พยัคฆ์เงิน',42],['อัศวินรุ่ง',60]];
const HEROES=['sword-cockro','sword-dragonfly','sword-cricket','demon-scorpion'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function createRoamers(world){
 const result=new Map();
 ROSTER.forEach(([name,level],i)=>{
  const s=fresh(HEROES[i%HEROES.length]);Object.assign(s,{name,level,gold:0,stones:0,potions:0,mpPotions:0});
  s.equipped=knownSkills(s).filter(k=>k.level<=level).slice(0,5).map(k=>k.id);
  const p=world.makeActor('roamer-'+(i+1),s),map=i<8?'town':'forest';
  const center=toWorld(map==='town'?MAPS.town.spawn:REGIONS[0].entry,MAPS[map]);
  const angle=i*2.399,offset=90+(i%4)*100;
  const home=traceStep(world.maps[map],center,{x:center.x+Math.cos(angle)*offset,y:center.y+Math.sin(angle)*offset});
  Object.assign(p,home,{map,roamer:true,home:{...home},routeIndex:i,nextWander:0,hp:maxHP(s),mp:combatStats(s).mp});result.set(p.id,p);
 });return result;
}
export function tickRoamers(world,dt,now){
 for(const p of world.roamers.values()){
  if(p.hp<=0){p.respawnAt??=now+30;if(now<p.respawnAt)continue;Object.assign(p,p.home,{hp:maxHP(p.s),mp:combatStats(p.s).mp,anim:'idle',defender:null,pvpShield:now+5,cd:{},actionUntil:0});delete p.pendingPvp;delete p.respawnAt;p.nextWander=now+3;}
  const enemy=world.getActor(p.defender);
  if(enemy&&!enemy.roamer&&enemy.hp>0&&enemy.map===p.map&&now-(p.lastPvp||0)<10&&distance(p,enemy)<600){
   // Only retaliate after a real player attacks. Never pursue beyond the patrol area.
   if(distance(p,enemy)>100&&distance(p,p.home)<450&&now>=p.actionUntil)move(world,p,enemy,dt,now);
   let cast=false;for(let n=0;n<5&&!cast;n++){const slot=((p.pvpNextSkill||0)+n)%5;cast=pvpAttack(world,p,{type:'skillPlayer',slot,target:enemy.id},now);}
   if(!cast)pvpAttack(world,p,{type:'attackPlayer',target:enemy.id},now);
   continue;
  }
  p.defender=null;
  if(now-(p.lastPvp||0)<12||now<p.actionUntil)continue;
  p.hp=Math.min(maxHP(p.s),p.hp+maxHP(p.s)*dt*.08);
  if(now<p.nextWander)continue;
  if(!p.destination||distance(p,p.destination)<8){
   const angle=++p.routeIndex*2.399,radius=100+(p.routeIndex%4)*65;
   const destination=traceStep(world.maps[p.map],p.home,{x:p.home.x+Math.cos(angle)*radius,y:p.home.y+Math.sin(angle)*radius});
   p.destination=walkable(world.maps[p.map],destination)?destination:{...p.home};p.nextWander=now+1+(p.routeIndex%3);p.anim='idle';continue;
  }
  move(world,p,p.destination,dt,now);
 }
}
function move(world,p,target,dt,now){
 const d=distance(p,target);if(d<1)return;const ratio=Math.min(1,90*Math.min(.2,dt)/d),next=traceStep(world.maps[p.map],p,{x:p.x+(target.x-p.x)*ratio,y:p.y+(target.y-p.y)*ratio});
 const dx=next.x-p.x,dy=next.y-p.y;
 if(Math.hypot(dx,dy)<.05){p.destination=null;p.nextWander=now+1;return;}
 Object.assign(p,next,{anim:'walk',moveAt:now,walkDX:dx,walkDY:dy,face:dx-dy>=0?1:-1,back:dx+dy<0});p.walkDistance+=Math.hypot(dx,dy);
}
