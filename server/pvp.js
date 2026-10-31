import {maxHP,combatStats,damage} from '../web/core.js';
import {knownSkills,compileSkill} from '../web/skills.js';
import {traceStep} from '../web/maps.js';
function checkpointFight(world,key,f,now){
 for(const id of [f.a,f.b]){const p=world.getActor(id);if(!p)continue;const other=id===f.a?f.b:f.a,rid=`${key}-${Math.round(f.started*1000)}`;p.s.pvpReports??=[];const report={id:rid,at:now*1000,opponent:f.names[other],result:'interrupted',...f.stats[id],unread:false,pending:true};const i=p.s.pvpReports.findIndex(r=>r.id===rid);if(i<0)p.s.pvpReports.push(report);else p.s.pvpReports[i]=report;p.s.pvpReports=p.s.pvpReports.slice(-30);p.dirty=true;}
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function capturePresence(p){p.s.worldState={map:p.map,x:p.x,y:p.y,hp:p.hp,mp:p.mp,cd:{...p.cd},offlineSince:p.offlineSince||0};}
export function finishFight(world,key,resultA,resultB,now){
 const f=world.fights.get(key);if(!f)return;world.fights.delete(key);
 for(const [id,other,result] of [[f.a,f.b,resultA],[f.b,f.a,resultB]]){const p=world.getActor(id);if(!p)continue;const record=f.stats[id];p.s.pvpReports??=[];p.s.pvpReports=p.s.pvpReports.filter(r=>r.id!==`${key}-${Math.round(f.started*1000)}`);p.s.pvpReports.push({id:`${key}-${Math.round(f.started*1000)}`,at:now*1000,opponent:f.names[other],result,...record,unread:true});p.s.pvpReports=p.s.pvpReports.slice(-30);p.dirty=true;world.event(p,{kind:'pvpResult',result,opponent:f.names[other]});}
}
export function pvpAttack(world,p,d,now){
 const target=world.getActor(d.target);if(!target||target===p||target.hp<=0||p.hp<=0||target.map!==p.map||now<p.actionUntil||now<(target.pvpShield||0))return false;
 let range=p.s.hero==='sword-dragonfly'?340:120,power=1,k;
 if(d.type==='skillPlayer'){if(!Number.isInteger(d.slot)||d.slot<0||d.slot>4)return false;const r=knownSkills(p.s).find(r=>r.id===p.s.equipped[d.slot]&&r.level<=p.s.level);if(!r)return false;k=compileSkill(r);if(now<(p.cd[r.id]||0)||p.mp<k.mp)return false;range=k.range;power=k.power*combatStats(p.s).spell*(1+(p.s.skillRanks[r.id]||0)*.06);}
 else if(now<(p.cd.attack||0))return false;
 if(distance(p,target)>range||distance(traceStep(world.maps[p.map],p,target),target)>1)return false;
 const key=[p.id,target.id].sort().join(':');let f=world.fights.get(key);
 if(!f){const blank=()=>({damageTaken:0,damageDealt:0,potions:0,mpPotions:0});f={a:p.id,b:target.id,started:now,last:now,names:{[p.id]:p.name,[target.id]:target.name},stats:{[p.id]:blank(),[target.id]:blank()}};world.fights.set(key,f);}
 f.last=now;p.lastPvp=target.lastPvp=now;target.defender=p.id;
 if(k){p.mp-=k.mp;p.cd[k.id]=now+k.cd;p.castId=k.id;}else p.cd.attack=now+.46*(1-combatStats(p.s).haste);
 p.actionUntil=now+(k?.5:.35);p.actionKind=k?'skill':'attack';p.anim=p.actionKind;p.animTime=0;
 const hit=Math.min(target.hp,Math.max(1,damage(p.s)*power*.45*100/(100+combatStats(target.s).defense)));
 target.hp-=hit;f.stats[p.id].damageDealt+=Math.round(hit);f.stats[target.id].damageTaken+=Math.round(hit);p.dirty=target.dirty=true;
 world.event(p,{kind:'hit',target:target.id,x:target.x,y:target.y,amount:Math.round(hit)});
 world.event(p,{kind:k?'skill':'attack',hero:p.s.hero,skillId:k?.id,form:k?.form,aim:{x:target.x,y:target.y},range,color:k?.color,radius:k?.radius});
 checkpointFight(world,key,f,now);
 if(target.hp<=0){target.anim='dead';target.defender=null;for(const [id,fight]of [...world.fights])if(fight.a===target.id||fight.b===target.id)finishFight(world,id,fight.a===target.id?'lost':'won',fight.b===target.id?'lost':'won',now);}
 return true;
}
export function tickPvp(world,dt,now){
 for(const p of world.sleepers.values()){
  if(p.hp<=0)continue;const enemy=world.getActor(p.defender);
  if(!enemy||enemy.hp<=0||enemy.map!==p.map||now-(p.lastPvp||0)>10||distance(p,enemy)>650)continue;
  const use=(type,key,condition)=>{if(!condition)return;const before=p.s[key];world.command(p,{type},now);if(p.s[key]<before)for(const f of world.fights.values())if(f.stats[p.id])f.stats[p.id][key==='potions'?'potions':'mpPotions']++;};
  use('potion','potions',p.hp<maxHP(p.s)*.5);use('mpPotion','mpPotions',p.mp<combatStats(p.s).mp*.25);
  // Offline characters defend in place; they do not hunt, collect loot or gain XP unattended.
  let cast=false;for(let slot=0;slot<5&&!cast;slot++)cast=pvpAttack(world,p,{type:'skillPlayer',target:enemy.id,slot},now);
  if(!cast)pvpAttack(world,p,{type:'attackPlayer',target:enemy.id},now);
 }
 for(const [key,f]of [...world.fights]){
  checkpointFight(world,key,f,now);const a=world.getActor(f.a),b=world.getActor(f.b);
  if(!a||!b)finishFight(world,key,'interrupted','interrupted',now);
  else if(a.map!==b.map||distance(a,b)>650||now-f.last>10)finishFight(world,key,'escaped','escaped',now);
 }
}
