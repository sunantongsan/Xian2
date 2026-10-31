import {monsterZones,zoneContains} from '../web/forest-species.js';
import {wanderMonster,moveMonster} from '../web/mob-motion.js';
import {roadDestination,roadArrival} from '../web/roads.js';
import {BUFF_NPC_UV,grantTownBuff,buffActive,movementMultiplier} from '../web/town-buff.js';
import {claimActivity} from '../web/daily-activities.js';
import {rerollSpecial,applyRegen,auraLevel,exchangeGold} from '../web/enhancement.js';
import {claimCheckin} from '../web/checkin.js';
import {buyUpgradeItem,socketGem} from '../web/upgrade-items.js';
import {manaRegen} from '../web/balance.js';
import {normalizeFashion,wearFashion,removeFashion,appearance} from '../web/fashion.js';
import {fresh,inCone,maxHP,damage,reward,combatStats,buyPotion,buyMPPotion,upgrade,allocateStat,allocateStats,trainSkill} from '../web/core.js';
import {knownSkills,compileSkill,skillTargets} from '../web/skills.js';
import {rollDrop,addToBag,equip,unequip,sell,upgradeGear,buyShopGear} from '../web/gear.js';
import {MAPS,REGIONS,toWorld,traceStep,walkable} from '../web/maps.js';
import {makePopulation} from '../web/alien-population.js';
import {parseTiled} from '../web/tilemap.js';
import {STAR_ZONES,starMonster} from '../web/star-data.js';
import mapJSON from '../web/maps/hero-star.json' with {type:'json'};
export const HEROES=['sword-cockro','sword-dragonfly','sword-cricket','demon-scorpion'];
export const PROTOCOL='cockro-online-2';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const finite=(...v)=>v.every(x=>typeof x==='number'&&Number.isFinite(x));
export class World {
 constructor({maxPlayers=64,testRewards=false}={}){if(!Number.isInteger(maxPlayers)||maxPlayers<1||maxPlayers>256)throw Error('invalid_capacity');this.testRewards=testRewards;this.maxPlayers=maxPlayers;this.players=new Map();this.maps={town:MAPS.town,forest:MAPS.forest,star:parseTiled(mapJSON)};this.mobs={town:[],forest:makePopulation().map(e=>({...e,id:e.spawnId})),star:[]};this.events=[];this.sequence=0;
  for(const c of this.maps.star.spawns)for(let k=0;k<c.count;k++){const def=starMonster(c.level,{slot:c.species,elite:c.elite&&!c.boss,boss:c.boss});let pos={x:c.x+Math.cos(k*2.4+c.id)*(k?48:0),y:c.y+Math.sin(k*2.4+c.id)*(k?48:0)};if(!walkable(this.maps.star,pos))pos={x:c.x,y:c.y};this.mobs.star.push({id:`${c.id}-${k}`,def,...pos,homeX:pos.x,homeY:pos.y,hp:def.hp,state:'idle',clock:1,face:1});}
 }
 join(id,s){normalizeFashion(s);if(this.players.has(id))throw Error('already_online');if(this.players.size>=this.maxPlayers)throw Error('room_full');const p={id,s,name:s.name||'กรุณาตั้งชื่อ',map:'town',...toWorld(MAPS.town.spawn,MAPS.town),hp:maxHP(s),mp:combatStats(s).mp,face:1,anim:'idle',walkDX:.707,walkDY:.707,walkDistance:0,animTime:0,cd:{},moveAt:Date.now()/1000,actionUntil:0,seq:0};this.players.set(id,p);return p;}
 home(p){return p.map==='town'||(p.map==='star'&&dist(p,this.maps.star.spawn)<430);}
 enter(p,map,gate=0){if(!Object.hasOwn(this.maps,map))return false;gate=Number.isInteger(gate)?gate:0;let pos;if(map==='star'){if(!STAR_ZONES[gate]||p.s.level<STAR_ZONES[gate].min)return false;const g=this.maps.star.pois.find(q=>q.action==='warp'&&q.zone===gate);pos={x:g.world.x+40,y:g.world.y+70};}else if(map==='forest'){if(!REGIONS[gate]||p.s.level<REGIONS[gate].min)return false;pos=toWorld(REGIONS[gate].entry,MAPS.forest);}else pos=toWorld(MAPS.town.spawn,MAPS.town);Object.assign(p,pos,{map,hp:maxHP(p.s),mp:combatStats(p.s).mp,anim:'idle',moveAt:Date.now()/1000});return true;}
 event(p,data){this.events.push({id:++this.sequence,map:p.map,player:p.id,x:p.x,y:p.y,...data});if(this.events.length>80)this.events.shift();}
 hit(p,e,amount,now){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.flash=.15;e.aggro=p.id;this.event(p,{kind:'hit',target:e.id,x:e.x,y:e.y,amount:Math.round(amount)});if(!e.hp){e.respawnAt=now+(e.def.boss?25:8);e.state='dead';e.clock=1;const before=p.s.level;reward(p.s,e.def);const loot=rollDrop(e.def);if(loot)addToBag(p.s,loot);if(p.s.level>before){p.hp=maxHP(p.s);for(const r of knownSkills(p.s).filter(r=>r.level>before&&r.level<=p.s.level)){const slot=[0,1,2,3,4].find(i=>!p.s.equipped[i]);if(slot!==undefined)p.s.equipped[slot]=r.id;}}p.dirty=true;}}
 command(p,d,now=Date.now()/1000){if(!d||typeof d!=='object'||Array.isArray(d))return;const s=p.s;
  if(d.type==='move'){
   if(!finite(d.x,d.y,d.seq)||d.seq<=p.seq||p.hp<=0)return;p.seq=d.seq;const elapsed=Math.min(.3,Math.max(0,now-p.moveAt));p.moveAt=now;const speed=((s.hero.startsWith('sword')?165:160)+combatStats(s).speed)*movementMultiplier(s,now*1000);const n=dist(p,d),allowed=speed*elapsed;const ratio=n?Math.min(1,allowed/n):0;const next=traceStep(this.maps[p.map],p,{x:p.x+(d.x-p.x)*ratio,y:p.y+(d.y-p.y)*ratio});const dx=next.x-p.x,dy=next.y-p.y;p.walkDistance+=Math.hypot(dx,dy);p.anim=Math.hypot(dx,dy)>.1?'walk':'idle';if(now<p.actionUntil)p.anim=p.actionKind;Object.assign(p,next);if(Math.hypot(dx,dy)>.1){p.face=dx-dy>=0?1:-1;p.walkDX=dx;p.walkDY=dy;p.back=dx+dy<0;}const destination=roadDestination(p.map,p,s.level,this.maps.star);if(destination&&now>(p.cd.road||0)){const arrival=roadArrival(destination,this.maps.star);Object.assign(p,arrival,{map:destination.map,entered:true});p.cd.road=now+2;}return;
  }
  if(d.type==='enter'){if(now<(p.cd.enter||0))return;p.cd.enter=now+1;if(this.enter(p,d.map,d.gate))p.entered=true;return;}
  if(d.type==='revive'){if(p.hp<=0){this.enter(p,'town');p.entered=true;}return;}
  if(d.type==='op'){p.opResult={ok:false,message:'คำขอถี่เกินไป กรุณาลองใหม่'};if(now<(p.cd.op||0))return;p.cd.op=now+.1;p.opResult={ok:false,message:'ทำรายการไม่ได้ กรุณาตรวจเงิน วัสดุ และพื้นที่กระเป๋า'};const atHome=this.home(p);switch(d.op){case 'townBuff':{const near=p.map==='town'&&dist(p,toWorld(BUFF_NPC_UV,MAPS.town))<=120;if(grantTownBuff(p,this.testRewards,near,now*1000)){p.hp=maxHP(s);p.mp=combatStats(s).mp;this.event(p,{kind:'buff'});}break;}case 'claimActivity':claimActivity(s,d.id,now*1000);break;case 'rerollSpecial':if(atHome)rerollSpecial(s,d.slot);break;case 'exchangeGold':p.opResult.ok=!!exchangeGold(s,Number(d.amount));break;case 'buyShopGear':p.opResult.ok=!!buyShopGear(s,d.slot);break;case 'fashionWear':wearFashion(s,d.id);break;case 'fashionRemove':removeFashion(s,d.slot);break;case 'dailyCheckin':claimCheckin(s,now*1000);break;case 'buy':p.opResult.ok=!!buyPotion(s);break;case 'buyMP':p.opResult.ok=!!buyMPPotion(s);break;case 'upgrade':break;case 'buyUpgradeItem':if(typeof d.id==='string')p.opResult.ok=buyUpgradeItem(s,d.id);break;case 'allocateStats':p.opResult.ok=allocateStats(s,d.values);p.opResult.message='แต้มไม่พอหรือจำนวนไม่ถูกต้อง';break;case 'socketGem':if(atHome&&typeof d.id==='string'&&typeof d.slot==='string')socketGem(s,d.slot,d.id);break;case 'upgradeGear':if(atHome&&typeof d.slot==='string')upgradeGear(s,d.slot);break;case 'stat':if(typeof d.key==='string')allocateStat(s,d.key);break;case 'train':if(typeof d.id==='string')trainSkill(s,d.id);break;case 'equipSkill':{const r=knownSkills(s).find(r=>r.id===d.id&&r.level<=s.level);if(r&&Number.isInteger(d.slot)&&d.slot>=0&&d.slot<5){const old=s.equipped.indexOf(r.id);if(old>=0)s.equipped[old]=null;s.equipped[d.slot]=r.id;}break;}case 'equip':if(typeof d.id==='string')equip(s,d.id);break;case 'unequip':if(typeof d.slot==='string'&&Object.hasOwn(s.equip,d.slot))unequip(s,d.slot);break;case 'sell':if(atHome&&typeof d.id==='string')sell(s,d.id);break;default:return;}p.dirty=true;return;}
  if(p.hp<=0)return;
  if(d.type==='mpPotion'){if(now<(p.cd.mpPotion||0)||(s.mpPotions||0)<1||p.mp>=combatStats(s).mp)return;p.cd.mpPotion=now+6;s.mpPotions--;p.mp=Math.min(combatStats(s).mp,p.mp+combatStats(s).mp*.5);p.dirty=true;return;}
  if(d.type==='potion'){if(now<(p.cd.potion||0)||s.potions<1||p.hp>=maxHP(s))return;p.cd.potion=now+4;s.potions--;p.hp=Math.min(maxHP(s),p.hp+maxHP(s)*.5);p.dirty=true;return;}
  if(d.type==='dash'){if(now<(p.cd.dash||0)||!finite(d.x,d.y))return;const n=dist(p,d)||1;Object.assign(p,traceStep(this.maps[p.map],p,{x:p.x+(d.x-p.x)/n*150,y:p.y+(d.y-p.y)/n*150}));p.cd.dash=now+2;p.inv=now+.6;p.entered=true;return;}
  if(!['attack','skill'].includes(d.type)||this.home(p)||now<p.actionUntil)return;
  const targets=this.mobs[p.map].filter(e=>e.hp>0).sort((a,b)=>dist(p,a)-dist(p,b));const target=targets.find(e=>e.id===d.target)||targets[0];
  if(d.type==='attack'){const range=s.hero==='sword-dragonfly'?340:120;if(now<(p.cd.attack||0)||!target||dist(p,target)>range)return;const end=traceStep(this.maps[p.map],p,target);if(dist(end,target)>1)return;p.cd.attack=now+.46*(1-combatStats(s).haste);p.actionUntil=now+.35;p.actionKind='attack';p.anim='attack';this.hit(p,target,damage(s)*(Math.random()<combatStats(s).crit?1.5:1),now);this.event(p,{kind:'attack',hero:s.hero,aim:{x:target.x,y:target.y},range});return;}
  if(!Number.isInteger(d.slot)||d.slot<0||d.slot>4)return;const r=knownSkills(s).find(r=>r.id===s.equipped[d.slot]&&r.level<=s.level);if(!r)return;const k=compileSkill(r);if(now<(p.cd[r.id]||0)||p.mp<k.mp)return;p.mp-=k.mp;p.cd[r.id]=now+k.cd;p.actionUntil=now+.5;p.actionKind='skill';p.anim='skill';p.castId=r.id;let aim=target?{x:target.x,y:target.y}:{x:p.x+p.face*150,y:p.y-p.face*150};const n=dist(p,aim);if(n>k.range)aim={x:p.x+(aim.x-p.x)/n*k.range,y:p.y+(aim.y-p.y)/n*k.range};
  const origin={x:p.x,y:p.y},length=dist(origin,aim)||1,direction={x:(aim.x-origin.x)/length,y:(aim.y-origin.y)/length};
  let endpoint={x:origin.x+direction.x*k.range,y:origin.y+direction.y*k.range};
  if(k.form==='dash'){endpoint=traceStep(this.maps[p.map],origin,endpoint);k.range=dist(origin,endpoint);aim=endpoint;}
  const victims=skillTargets(k,origin,aim,targets).filter(e=>dist(traceStep(this.maps[p.map],origin,e),e)<1);
  if(k.form==='bolt'&&victims.length)endpoint={x:victims.at(-1).x,y:victims.at(-1).y};
  for(const e of victims){if(dist(traceStep(this.maps[p.map],p,e),e)>1)continue;const amount=damage(s)*k.power*combatStats(s).spell*(1+(s.skillRanks[r.id]||0)*.06)*(k.element==='lightning'?1.2:1);this.hit(p,e,amount,now);if(k.mods.includes('drain'))p.hp=Math.min(maxHP(s),p.hp+Math.min(amount*.08,maxHP(s)*.08));if(e.hp>0&&['fire','poison'].includes(k.element))e.dot={owner:p.id,left:k.element==='fire'?3:6,dps:damage(s)*(k.element==='fire'?.15:.1)};if(k.element==='ice')e.slow=now+3;}
  if(k.form==='dash')Object.assign(p,endpoint);this.event(p,{kind:'skill',x:origin.x,y:origin.y,hero:s.hero,skillId:k.id,form:k.form,aim:['field','circle'].includes(k.form)?aim:endpoint,color:k.color,radius:k.radius,range:k.range});
 }
 tick(dt,now=Date.now()/1000){for(const p of this.players.values()){if(p.s.townBuffUntil&&(!this.testRewards||!buffActive(p.s,now*1000))){p.s.townBuffUntil=0;p.hp=Math.min(p.hp,maxHP(p.s));p.mp=Math.min(p.mp,combatStats(p.s).mp);p.dirty=true;}p.animTime+=dt;applyRegen(p,dt,maxHP(p.s),combatStats(p.s).mp);p.mp=Math.min(combatStats(p.s).mp,p.mp+dt*manaRegen(p.s));if(this.home(p)&&p.hp>0)p.hp=Math.min(maxHP(p.s),p.hp+dt*maxHP(p.s)*.1);if(now-p.moveAt>.25&&now>=p.actionUntil)p.anim='idle';}
  for(const map of ['forest','star']){const players=[...this.players.values()].filter(p=>p.map===map&&p.hp>0&&!this.home(p));for(const e of this.mobs[map]){e.clock=Math.max(0,(e.clock||0)-dt);e.flash=Math.max(0,(e.flash||0)-dt);e.moving=false;if(e.hp<=0){if(now>=e.respawnAt&&players.every(p=>dist(p,{x:e.homeX,y:e.homeY})>220))Object.assign(e,{x:e.homeX,y:e.homeY,hp:e.def.hp,state:'idle',dot:null,aggro:null});continue;}if(e.dot?.left>0){const owner=this.players.get(e.dot.owner);if(owner&&owner.map===map)this.hit(owner,e,e.dot.dps*Math.min(dt,e.dot.left),now);e.dot.left-=dt;if(e.hp<=0)continue;}let p=players.filter(p=>dist(p,e)<700).sort((a,b)=>dist(a,e)-dist(b,e))[0];if(!p){wanderMonster(e,this.maps[map],dt,now);continue;}const distance=dist(p,e);
   if(e.returning||dist(e,{x:e.homeX,y:e.homeY})>650){e.returning=true;e.state='idle';e.aggro=null;moveMonster(e,this.maps[map],{x:e.homeX,y:e.homeY},e.def.speed*dt);if(dist(e,{x:e.homeX,y:e.homeY})<12){e.returning=false;e.hp=e.def.hp;}continue;}
   if(distance>230&&e.aggro!==p.id&&e.state!=='windup'){wanderMonster(e,this.maps[map],dt,now);continue;}
   const kind=e.def.attack,range=kind==='signature'?Math.min(e.def.range,350):kind==='projectile'?280:kind==='cone'?210:kind==='burst'?150:kind==='dash'?180:65;
   if(kind==='signature'&&e.state==='windup'){
    if(e.clock<=0){const zones=monsterZones(e);this.event({id:e.id,map,x:e.x,y:e.y},{kind:'monsterSkill',zones,color:e.def.color,pattern:e.def.pattern});
     for(const victim of players)if(zones.some(z=>zoneContains(z,victim))&&dist(traceStep(this.maps[map],e,victim),victim)<1&&now>(victim.inv||0)){victim.hp=Math.max(0,victim.hp-e.def.damage*100/(100+combatStats(victim.s).defense));victim.inv=now+.35;}
     if(['charge','drill'].includes(e.def.pattern))Object.assign(e,traceStep(this.maps[map],e,{x:e.x+Math.cos(e.angle)*e.def.range,y:e.y+Math.sin(e.angle)*e.def.range}));
     e.state='idle';e.clock=e.def.cooldown;
    }continue;
   }
   if(e.state==='windup'){if(e.clock<=0){if(kind==='dash'){Object.assign(e,traceStep(this.maps[map],e,{x:e.x+Math.cos(e.angle)*160,y:e.y+Math.sin(e.angle)*160}));}
    for(const victim of players){const d=dist(victim,e),dx=victim.x-e.x,dy=victim.y-e.y,along=dx*Math.cos(e.angle)+dy*Math.sin(e.angle),across=Math.abs(-dx*Math.sin(e.angle)+dy*Math.cos(e.angle));
     const hit=kind==='burst'?d<150:kind==='cone'?inCone(victim.x,victim.y,e.x,e.y,e.angle,245,Math.PI*.7):kind==='projectile'?along>0&&along<315&&across<28:d<(kind==='dash'?85:100);
     if(hit&&dist(traceStep(this.maps[map],e,victim),victim)<1&&now>(victim.inv||0)){victim.hp=Math.max(0,victim.hp-e.def.damage*100/(100+combatStats(victim.s).defense));victim.inv=now+.35;}
    }e.state='idle';e.clock=e.def.cooldown;}continue;}
   if(distance<range&&e.clock<=0){e.state='windup';e.clock=e.def.boss?1.1:e.def.attack==='signature'?1:.75;e.aimX=p.x;e.aimY=p.y;e.angle=Math.atan2(p.y-e.y,p.x-e.x);}else if(distance>range*.8){const speed=e.def.speed*(now<(e.slow||0)?.65:1),step=Math.min(distance-range*.8,speed*dt);const next=traceStep(this.maps[map],e,{x:e.x+(p.x-e.x)/distance*step,y:e.y+(p.y-e.y)/distance*step});e.walkDistance=(e.walkDistance||0)+dist(e,next);e.moving=dist(e,next)>.01;e.face=(next.x-e.x)-(next.y-e.y)>=0?1:-1;Object.assign(e,next);}
  }}
 }
 snapshot(p,now=Date.now()/1000){const actor=q=>({id:q.id,name:q.name,hero:q.s.hero,townBuffUntil:q.s.townBuffUntil||0,auraLevel:auraLevel(q.s),appearance:appearance(q.s),level:q.s.level,x:q.x,y:q.y,hp:q.hp,maxHp:maxHP(q.s),face:q.face,anim:q.hp<=0?'dead':q.anim,animTime:q.animTime,walkDX:q.walkDX,walkDY:q.walkDY,walkDistance:q.walkDistance,back:q.back,castId:q.castId});const self={...actor(p),map:p.map,mp:p.mp,save:p.s,correction:!!p.entered,cooldowns:Object.fromEntries(Object.entries(p.cd).map(([k,v])=>[k,Math.max(0,v-now)]))};p.entered=false;return {type:'state',serverTime:now*1000,self,online:this.players.size,players:[...this.players.values()].filter(q=>q!==p&&q.map===p.map&&dist(p,q)<1800).sort((a,b)=>dist(p,a)-dist(p,b)).slice(0,32).map(actor),monsters:this.mobs[p.map].filter(e=>dist(p,e)<1700).map(e=>({id:e.id,x:e.x,y:e.y,def:e.def,hp:e.hp,state:e.state,clock:e.clock,angle:e.angle,aimX:e.aimX,aimY:e.aimY,face:e.face,flash:e.flash,moving:e.moving,walkDistance:e.walkDistance})),events:this.events.filter(e=>e.map===p.map&&dist(p,e)<1800)};}
}



