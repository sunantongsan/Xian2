import {DEPTHS_MIN_LEVEL,makeDepthsPopulation} from './crystal-depths.js';
import {exchangeBounty} from './hunt-bounty.js';
import {buyProtectionTicket} from './chain-economy.js';
import {baseAttackRange} from './jobs.js';
import {mutationStage} from './mutation.js';
import {equippedWeaponLook} from './hero-appearance.js';
import {buyPet,equipPet,stepPet,PET_PICKUP_RADIUS} from './loot-pets.js';
import {buyExpTicket,useExpTicket} from './exp-tickets.js';
import {aggressiveMonster} from './monster-behavior.js';
import {monsterRewards,collectLoot,LOOT_SECONDS,LOOT_RADIUS} from './ground-loot.js';
import {monsterZones,zoneContains} from './forest-species.js';
import {wanderMonster,moveMonster} from './mob-motion.js';
import {roadDestination,roadArrival} from './roads.js';
import {BUFF_NPC_UV,grantTownBuff,buffActive,movementMultiplier} from './town-buff.js';
import {claimActivity} from './daily-activities.js';
import {rerollSpecial,applyRegen,auraLevel,exchangeGold} from './enhancement.js';
import {claimCheckin} from './checkin.js';
import {UPGRADE_ITEMS,buyUpgradeItem,socketGem} from './upgrade-items.js';
import {manaRegen} from './balance.js';
import {normalizeFashion,wearFashion,removeFashion,appearance} from './fashion.js';
import {fresh,inCone,maxHP,damage,reward,combatStats,buyPotion,buyMPPotion,upgrade,allocateStat,allocateStats,trainSkill} from './core.js';
import {knownSkills,compileSkill,skillTargets} from './skills.js';
import {MERCHANT_UV,MERCHANT_RANGE,MERCHANT_OPS,buyMerchantStack} from './merchant.js';
import {expireRentals,rollDrop,addToBag,equip,unequip,sell,upgradeGear,buyShopGear} from './gear.js';
import {MAPS,REGIONS,toWorld,traceStep,walkable} from './maps.js';
import {makePopulation} from './alien-population.js';
import {parseTiled} from './tilemap.js';
import {STAR_ZONES,starMonster,STAR_HOME_RADIUS,STAR_REVISION} from './star-data.js';
export function capturePresence(p){
 p.s.worldState={townRevision:711,mapRevision:p.map==='star'?STAR_REVISION:0,map:p.map,x:p.x,y:p.y,hp:p.hp,mp:p.mp,cd:{...p.cd},offlineSince:p.offlineSince||0};
}
function castHealing(world,p,k,now){
 const max=maxHP(p.s);if(p.hp<=0||p.hp>=max||now<p.actionUntil||now<(p.cd[k.id]||0)||p.mp<k.mp)return false;
 p.mp-=k.mp;p.cd[k.id]=now+k.cd;p.actionUntil=now+.5;p.actionKind='skill';p.anim='skill';p.animTime=0;p.castId=k.id;
 p.hp=Math.min(max,p.hp+max*.22*combatStats(p.s).spell);p.dirty=true;
 world.event(p,{kind:'skill',hero:p.s.hero,skillId:k.id,form:'circle',aim:{x:p.x,y:p.y},color:'#a4ffd0',radius:120,range:120});return true;
}

export const HEROES=['sword-cockro','sword-dragonfly','sword-cricket','demon-scorpion','sword-mage','sword-acolyte'];
export const PROTOCOL='cockro-online-4';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const finite=(...v)=>v.every(x=>typeof x==='number'&&Number.isFinite(x));
export class World {
 constructor({mapJSON,maxPlayers=64,testRewards=false,onlineCount}={}){if(!Number.isInteger(maxPlayers)||maxPlayers<1||maxPlayers>256)throw Error('invalid_capacity');this.onlineCount=onlineCount||(()=>this.players.size);this.testRewards=testRewards;this.maxPlayers=maxPlayers;this.players=new Map();this.loot=[];this.lootSequence=0;this.maps={...MAPS,star:parseTiled(mapJSON)};this.mobs={depths:makeDepthsPopulation(toWorld),town:[],aurora:[],ruins:makePopulation().map(e=>({...e,id:"ruins-"+e.spawnId})),forest:makePopulation().map(e=>({...e,id:e.spawnId})),star:[]};this.events=[];this.sequence=0;this.roamers=new Map();
  // Small dungeon plaza encounters use only validated legacy-floor spawn points.
  const dungeonSeeds=makePopulation().filter(e=>!e.def.boss&&e.def.level<=20).slice(0,12);
  for(const [i,e] of dungeonSeeds.entries()){const uv=[.32+(i%4)*.115,.38+Math.floor(i/4)*.10],pos=toWorld(uv,MAPS.aurora);if(walkable(MAPS.aurora,pos))this.mobs.aurora.push({...e,...pos,homeX:pos.x,homeY:pos.y,id:'aurora-'+i});}
  for(const c of this.maps.star.spawns)for(let k=0;k<c.count;k++){const def=starMonster(c.level,{slot:c.species,elite:c.elite&&!c.boss,boss:c.boss});let pos={x:c.x+Math.cos(k*2.4+c.id)*(k?48:0),y:c.y+Math.sin(k*2.4+c.id)*(k?48:0)};if(!walkable(this.maps.star,pos))pos={x:c.x,y:c.y};this.mobs.star.push({id:`${c.id}-${k}`,def,...pos,homeX:pos.x,homeY:pos.y,hp:def.hp,state:'idle',clock:1,face:1});}
 }
 getActor(id){return this.players.get(id)||this.roamers.get(id);}
 actors(){return [...this.players.values(),...this.roamers.values()];}
 makeActor(id,s){normalizeFashion(s);const p={id,s,name:s.name||'กรุณาตั้งชื่อ',map:'town',...toWorld(MAPS.town.spawn,MAPS.town),hp:maxHP(s),mp:combatStats(s).mp,face:1,anim:'idle',walkDX:.707,walkDY:.707,walkDistance:0,animTime:0,cd:{},moveAt:Date.now()/1000,actionUntil:0,seq:0};let w=s.worldState;if(w?.map==='town'&&w.townRevision!==711){w={...w,x:w.x*.6,y:w.y*.6,townRevision:711};s.worldState=w;}if(w?.map==='star'&&w.mapRevision!==STAR_REVISION){w={...w,...this.maps.star.spawn,mapRevision:STAR_REVISION};s.worldState=w;}if(w&&(w.map!=='depths'||s.level>=DEPTHS_MIN_LEVEL)&&this.maps[w.map]&&walkable(this.maps[w.map],w)){Object.assign(p,{map:w.map,x:w.x,y:w.y,hp:Math.min(maxHP(s),w.hp),mp:Math.min(combatStats(s).mp,w.mp),cd:{...w.cd},offlineSince:w.offlineSince||0});}return p;}
 join(id,s){if(this.players.has(id))throw Error('already_online');if(this.players.size>=this.maxPlayers)throw Error('room_full');const p=this.makeActor(id,s);p.s=s;p.name=s.name||p.name;Object.assign(p,{offline:false,seq:0,moveAt:Date.now()/1000,entered:true});this.players.set(id,p);return p;}
 disconnect(p){if(this.players.get(p.id)!==p)return;this.players.delete(p.id);p.offline=true;p.offlineSince=Date.now();p.anim='idle';capturePresence(p);p.dirty=true;}
 spawnLoot(p,e,now){const rewards=monsterRewards(p.s,e.def);rewards.forEach((item,i)=>this.loot.push({...item,id:`loot-${++this.lootSequence}`,owner:p.id,hero:p.s.hero,map:p.map,x:e.x+Math.cos(i*Math.PI*2/rewards.length)*40,y:e.y+Math.sin(i*Math.PI*2/rewards.length)*40,created:now,expires:now+LOOT_SECONDS}));}
 collectGround(now){this.loot=this.loot.filter(d=>{if(now>=d.expires)return false;if(now-d.created<.35)return true;const p=this.players.get(d.owner);if(p&&p.hp>0&&p.map===d.map&&((dist(p,d)<=LOOT_RADIUS&&dist(traceStep(this.maps[p.map],p,d),d)<1)||(p.pet&&dist(p.pet,d)<=PET_PICKUP_RADIUS&&dist(p,d)<=400&&dist(traceStep(this.maps[p.map],p.pet,d),d)<1))&&collectLoot(p.s,d)){p.dirty=true;this.event(p,{kind:'lootPickup',loot:d});return false;}return true;});}
 home(p){return p.map==='town'||(p.map==='star'&&dist(p,this.maps.star.spawn)<STAR_HOME_RADIUS);}
 enter(p,map,gate=0){if(!Object.hasOwn(this.maps,map)||(map==='depths'&&p.s.level<DEPTHS_MIN_LEVEL))return false;gate=Number.isInteger(gate)?gate:0;let pos;if(map==='star'){if(!STAR_ZONES[gate])return false;const g=this.maps.star.pois.find(q=>q.action==='warp'&&q.zone===gate);pos={x:g.world.x+40,y:g.world.y+70};}else if(map==='forest'){if(!REGIONS[gate])return false;pos=toWorld(REGIONS[gate].entry,MAPS.forest);}else pos=toWorld(this.maps[map].spawn,this.maps[map]);Object.assign(p,pos,{map,hp:maxHP(p.s),mp:combatStats(p.s).mp,anim:'idle',moveAt:Date.now()/1000});return true;}
 event(p,data){this.events.push({id:++this.sequence,map:p.map,player:p.id,x:p.x,y:p.y,...data});if(this.events.length>80)this.events.shift();}
 hit(p,e,amount,now){if(e.hp<=0)return;e.hp=Math.max(0,e.hp-amount);e.flash=.15;e.aggro=p.id;this.event(p,{kind:'hit',target:e.id,x:e.x,y:e.y,amount:Math.round(amount)});if(!e.hp){e.respawnAt=now+(e.def.boss?25:8);e.state='dead';e.clock=1;const before=p.s.level;this.spawnLoot(p,e,now);if(p.s.level>before){this.event(p,{kind:'levelUp',level:p.s.level});p.hp=maxHP(p.s);for(const r of knownSkills(p.s).filter(r=>r.level>before&&r.level<=p.s.level)){const slot=[0,1,2,3,4].find(i=>!p.s.equipped[i]);if(slot!==undefined)p.s.equipped[slot]=r.id;}}p.dirty=true;}}
 command(p,d,now=Date.now()/1000){if(!d||typeof d!=='object'||Array.isArray(d))return;const s=p.s;if(expireRentals(s))p.dirty=true;
  if(d.type==='op'&&['townBuff','buyUpgradeItem','socketGem','rerollSpecial','fashionWear','fashionRemove'].includes(d.op)){p.opResult={ok:false,message:'ระบบนี้ยกเลิกแล้ว'};return;}
  if(d.type==='move'){
   if(!finite(d.x,d.y,d.seq)||d.seq<=p.seq||p.hp<=0)return;p.seq=d.seq;const elapsed=Math.min(.3,Math.max(0,now-p.moveAt));p.moveAt=now;const speed=((s.hero.startsWith('sword')?165:160)+combatStats(s).speed)*movementMultiplier(s,now*1000);const n=dist(p,d),allowed=speed*elapsed;const ratio=n?Math.min(1,allowed/n):0;const next=traceStep(this.maps[p.map],p,{x:p.x+(d.x-p.x)*ratio,y:p.y+(d.y-p.y)*ratio});const dx=next.x-p.x,dy=next.y-p.y;p.walkDistance+=Math.hypot(dx,dy);p.anim=Math.hypot(dx,dy)>.1?'walk':'idle';if(now<p.actionUntil)p.anim=p.actionKind;Object.assign(p,next);if(Math.hypot(dx,dy)>.1)p.dirty=true;if(Math.hypot(dx,dy)>.1){p.face=dx-dy>=0?1:-1;p.walkDX=dx;p.walkDY=dy;p.back=dx+dy<0;}const destination=roadDestination(p.map,p,s.level,this.maps.star);if(destination&&now>(p.cd.road||0)){const arrival=roadArrival(destination,this.maps.star);Object.assign(p,arrival,{map:destination.map,entered:true});p.cd.road=now+2;}return;
  }
  if(d.type==='enter'){if(p.hp<=0)return;if(now<(p.cd.enter||0))return;p.cd.enter=now+1;if(this.enter(p,d.map,d.gate))p.entered=true;return;}
  if(d.type==='revive'){if(p.hp<=0){this.enter(p,p.map==='star'?'star':'town',0);p.entered=true;}return;}
  if(d.type==='op'){p.opResult={ok:false,message:'คำขอถี่เกินไป กรุณาลองใหม่'};if(now<(p.cd.op||0))return;p.cd.op=now+.1;p.opResult={ok:false,message:'ทำรายการไม่ได้ กรุณาตรวจเงิน วัสดุ และพื้นที่กระเป๋า'};const atHome=this.home(p);if(MERCHANT_OPS.has(d.op)&&!atHome){p.opResult.message='กรุณาคุยกับหุ่นพ่อค้า MERC-01 ในยาน';return;}switch(d.op){case 'exchangeBounty':{
   p.opResult.ok=exchangeBounty(s,this.onlineCount(),d);
   break;
  }case 'buyProtectionTicket':p.opResult.ok=buyProtectionTicket(s,d.quantity??1);p.opResult.message=p.opResult.ok?'ได้รับใบป้องกันแล้ว':'COCKRO ไม่พอ หรือเก็บใบป้องกันครบ 5 ใบแล้ว';break;case 'buyPet':p.opResult.ok=buyPet(s,d.id);break;case 'equipPet':p.opResult.ok=equipPet(s,d.id==='none'?null:d.id);break;case 'buyExpTicket':p.opResult.ok=buyExpTicket(s,d.id);break;case 'useExpTicket':p.opResult.ok=p.hp>0&&useExpTicket(s,d.id,d.replaceUntil,now*1000);break;case 'townBuff':{const near=p.map==='town';if(grantTownBuff(p,this.testRewards,near,now*1000)){p.hp=maxHP(s);p.mp=combatStats(s).mp;this.event(p,{kind:'buff'});p.opResult.ok=true;}break;}case 'claimActivity':claimActivity(s,d.id,now*1000);break;case 'rerollSpecial':if(atHome)rerollSpecial(s,d.slot);break;case 'exchangeGold':p.opResult.ok=!!exchangeGold(s,Number(d.amount),d.revision);break;case 'buyShopGear':p.opResult.ok=!!buyShopGear(s,d.slot,d.tier,d.term);break;case 'fashionWear':wearFashion(s,d.id);break;case 'fashionRemove':removeFashion(s,d.slot);break;case 'dailyCheckin':{const amount=claimCheckin(s,now*1000);p.opResult.ok=amount>0;p.opResult.amount=amount;p.opResult.message=amount?'รับ '+amount+' COCKRO coin แล้ว':'วันนี้รับรางวัลแล้ว หรือยอดเหรียญเต็ม';break;}case 'buy':p.opResult.ok=buyMerchantStack(s,d.op,null,d.quantity??1,UPGRADE_ITEMS);break;case 'buyMP':p.opResult.ok=buyMerchantStack(s,d.op,null,d.quantity??1,UPGRADE_ITEMS);break;case 'upgrade':break;case 'buyUpgradeItem':if(typeof d.id==='string')p.opResult.ok=buyMerchantStack(s,d.op,d.id,d.quantity??1,UPGRADE_ITEMS);break;case 'allocateStats':p.opResult.ok=allocateStats(s,d.values);p.opResult.message='แต้มไม่พอหรือจำนวนไม่ถูกต้อง';break;case 'socketGem':if(atHome&&typeof d.id==='string'&&typeof d.slot==='string')socketGem(s,d.slot,d.id);break;case 'upgradeGear':if(atHome&&typeof d.slot==='string'){const item=s.equip?.[d.slot],before=item?.plus||0;
 if(d.slot==='weapon' && before>0 && d.useProtection!==true && (d.itemId!==item.id||d.expectedPlus!==before)){p.opResult.message='กรุณายืนยันความเสี่ยงของอาวุธชิ้นนี้';break;}
 p.opResult.ok=upgradeGear(s,d.slot,Math.random,d.useProtection===true);p.opResult.message=p.opResult.ok&&!s.equip[d.slot]?'อาวุธแตก':p.opResult.ok&&s.equip[d.slot].plus===before?'ตีบวกไม่สำเร็จ • อุปกรณ์ไม่แตกและระดับไม่ลด':p.opResult.ok?'ตีบวกสำเร็จ':'COCKRO หรือใบป้องกันไม่เพียงพอ';p.opResult.enhanced=!!(p.opResult.ok&&s.equip[d.slot]?.plus>before);}break;case 'stat':if(typeof d.key==='string')allocateStat(s,d.key);break;case 'train':if(typeof d.id==='string')trainSkill(s,d.id);break;case 'equipSkill':{const r=knownSkills(s).find(r=>r.id===d.id&&r.level<=s.level);if(r&&Number.isInteger(d.slot)&&d.slot>=0&&d.slot<5){const old=s.equipped.indexOf(r.id);if(old>=0)s.equipped[old]=null;s.equipped[d.slot]=r.id;}break;}case 'equip':if(typeof d.id==='string')equip(s,d.id);break;case 'unequip':if(typeof d.slot==='string'&&Object.hasOwn(s.equip,d.slot))unequip(s,d.slot);break;case 'sell':if(atHome&&typeof d.id==='string')sell(s,d.id);break;default:return;}p.dirty=true;return;}
  if(p.hp<=0)return;
  if(d.type==='mpPotion'){if(now<(p.cd.mpPotion||0)||(s.mpPotions||0)<1||p.mp>=combatStats(s).mp)return;p.cd.mpPotion=now+6;s.mpPotions--;p.mp=Math.min(combatStats(s).mp,p.mp+combatStats(s).mp*.5);p.dirty=true;return;}
  if(d.type==='potion'){if(now<(p.cd.potion||0)||s.potions<1||p.hp>=maxHP(s))return;p.cd.potion=now+4;s.potions--;p.hp=Math.min(maxHP(s),p.hp+maxHP(s)*.5);p.dirty=true;return;}
  if(d.type==='dash'){if(now<(p.cd.dash||0)||!finite(d.x,d.y))return;const n=dist(p,d)||1;Object.assign(p,traceStep(this.maps[p.map],p,{x:p.x+(d.x-p.x)/n*150,y:p.y+(d.y-p.y)/n*150}));p.cd.dash=now+2;p.inv=now+.6;p.entered=true;return;}
  if(!['attack','skill'].includes(d.type)||this.home(p)||now<p.actionUntil)return;
  const targets=this.mobs[p.map].filter(e=>e.hp>0).sort((a,b)=>dist(p,a)-dist(p,b));const target=targets.find(e=>e.id===d.target)||targets[0];
  if(d.type==='attack'){const range=baseAttackRange(s.hero);if(now<(p.cd.attack||0)||!target||dist(p,target)>range)return;const end=traceStep(this.maps[p.map],p,target);if(dist(end,target)>1)return;p.cd.attack=now+.46*(1-combatStats(s).haste);p.actionUntil=now+.35;p.actionKind='attack';p.combo=now-(p.lastComboAt||0)<1.4?((p.combo||0)+1)%3:0;p.lastComboAt=now;p.anim='attack';p.animTime=0;this.hit(p,target,damage(s)*(Math.random()<combatStats(s).crit?1.5:1),now);this.event(p,{kind:'attack',combo:p.combo,hero:s.hero,aim:{x:target.x,y:target.y},range});return;}
  if(!Number.isInteger(d.slot)||d.slot<0||d.slot>4)return;const r=knownSkills(s).find(r=>r.id===s.equipped[d.slot]&&r.level<=s.level);if(!r)return;const k=compileSkill(r);if(k.effect==='heal'){castHealing(this,p,k,now);return;}if(now<(p.cd[r.id]||0)||p.mp<k.mp)return;p.mp-=k.mp;p.cd[r.id]=now+k.cd;p.actionUntil=now+.5;p.actionKind='skill';p.anim='skill';p.animTime=0;p.castId=r.id;let aim=target?{x:target.x,y:target.y}:{x:p.x+p.face*150,y:p.y-p.face*150};const n=dist(p,aim);if(n>k.range)aim={x:p.x+(aim.x-p.x)/n*k.range,y:p.y+(aim.y-p.y)/n*k.range};
  const origin={x:p.x,y:p.y},length=dist(origin,aim)||1,direction={x:(aim.x-origin.x)/length,y:(aim.y-origin.y)/length};
  let endpoint={x:origin.x+direction.x*k.range,y:origin.y+direction.y*k.range};
  if(k.form==='dash'){endpoint=traceStep(this.maps[p.map],origin,endpoint);k.range=dist(origin,endpoint);aim=endpoint;}
  const victims=skillTargets(k,origin,aim,targets).filter(e=>dist(traceStep(this.maps[p.map],origin,e),e)<1);
  if(k.form==='bolt'&&victims.length)endpoint={x:victims.at(-1).x,y:victims.at(-1).y};
  for(const e of victims){if(dist(traceStep(this.maps[p.map],p,e),e)>1)continue;const amount=damage(s)*k.power*combatStats(s).spell*(1+(s.skillRanks[r.id]||0)*.06)*(k.element==='lightning'?1.2:1);this.hit(p,e,amount,now);if(k.mods.includes('drain'))p.hp=Math.min(maxHP(s),p.hp+Math.min(amount*.08,maxHP(s)*.08));if(e.hp>0&&['fire','poison'].includes(k.element))e.dot={owner:p.id,left:k.element==='fire'?3:6,dps:damage(s)*(k.element==='fire'?.15:.1)};if(k.element==='ice')e.slow=now+3;}
  if(k.form==='dash')Object.assign(p,endpoint);this.event(p,{kind:'skill',x:origin.x,y:origin.y,hero:s.hero,skillId:k.id,form:k.form,aim:['field','circle'].includes(k.form)?aim:endpoint,color:k.color,radius:k.radius,range:k.range});
 }
 tick(dt,now=Date.now()/1000){if((this.nextRentalCheck||0)<=now){
   this.nextRentalCheck=now+1;
   for(const actor of this.actors())if(!actor.economyBusy&&expireRentals(actor.s))actor.dirty=true;
  }
  for(const p of this.players.values())stepPet(p,this.loot,dt,now,(a,b)=>traceStep(this.maps[p.map],a,b));this.collectGround(now);for(const p of this.actors()){if(p.s.townBuffUntil&&(!this.testRewards||!buffActive(p.s,now*1000))){p.s.townBuffUntil=0;p.hp=Math.min(p.hp,maxHP(p.s));p.mp=Math.min(p.mp,combatStats(p.s).mp);p.dirty=true;}p.animTime+=dt;applyRegen(p,dt,maxHP(p.s),combatStats(p.s).mp);p.mp=Math.min(combatStats(p.s).mp,p.mp+dt*manaRegen(p.s));if(this.home(p)&&p.hp>0)p.hp=Math.min(maxHP(p.s),p.hp+dt*maxHP(p.s)*.1);if(now-p.moveAt>.25&&now>=p.actionUntil)p.anim='idle';}
  for(const map of ['forest','star','aurora','ruins','depths']){const players=[...this.players.values()].filter(p=>p.map===map&&p.hp>0&&!this.home(p));if(!players.length)continue;for(const e of this.mobs[map]){e.clock=Math.max(0,(e.clock||0)-dt);e.flash=Math.max(0,(e.flash||0)-dt);e.moving=false;if(e.hp<=0){if(now>=e.respawnAt&&players.every(p=>dist(p,{x:e.homeX,y:e.homeY})>220))Object.assign(e,{x:e.homeX,y:e.homeY,hp:e.def.hp,state:'idle',dot:null,aggro:null});continue;}if(e.dot?.left>0){const owner=this.players.get(e.dot.owner);if(owner&&owner.map===map)this.hit(owner,e,e.dot.dps*Math.min(dt,e.dot.left),now);e.dot.left-=dt;if(e.hp<=0)continue;}if((map==='star'||map==='depths')&&!e.returning&&!players.some(a=>dist(a,e)<1800)){e.state='idle';e.aggro=null;continue;}let p=players.find(p=>p.id===e.aggro&&dist(p,e)<700)||players.filter(p=>aggressiveMonster(e.def)&&dist(p,e)<230).sort((a,b)=>dist(a,e)-dist(b,e))[0];if(!p){wanderMonster(e,this.maps[map],dt,now);continue;}const distance=dist(p,e);
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
   if(e.state==='windup'){if(e.clock<=0){const end={x:e.x+Math.cos(e.angle)*range,y:e.y+Math.sin(e.angle)*range};this.event({id:e.id,map,x:e.x,y:e.y},{kind:'monsterSkill',color:'#ffad65',pattern:kind==='projectile'?'rail':'rupture',zones:kind==='projectile'?[{type:'poly',points:[[e.x-12*Math.sin(e.angle),e.y+12*Math.cos(e.angle)],[end.x-12*Math.sin(e.angle),end.y+12*Math.cos(e.angle)],[end.x+12*Math.sin(e.angle),end.y-12*Math.cos(e.angle)],[e.x+12*Math.sin(e.angle),e.y-12*Math.cos(e.angle)]]}]:[{type:'disk',x:e.x,y:e.y,radius:kind==='burst'?150:kind==='cone'?200:85}]});if(kind==='dash'){Object.assign(e,traceStep(this.maps[map],e,{x:e.x+Math.cos(e.angle)*160,y:e.y+Math.sin(e.angle)*160}));}
    for(const victim of players){const d=dist(victim,e),dx=victim.x-e.x,dy=victim.y-e.y,along=dx*Math.cos(e.angle)+dy*Math.sin(e.angle),across=Math.abs(-dx*Math.sin(e.angle)+dy*Math.cos(e.angle));
     const hit=kind==='burst'?d<150:kind==='cone'?inCone(victim.x,victim.y,e.x,e.y,e.angle,245,Math.PI*.7):kind==='projectile'?along>0&&along<315&&across<28:d<(kind==='dash'?85:100);
     if(hit&&dist(traceStep(this.maps[map],e,victim),victim)<1&&now>(victim.inv||0)){victim.hp=Math.max(0,victim.hp-e.def.damage*100/(100+combatStats(victim.s).defense));victim.inv=now+.35;}
    }e.state='idle';e.clock=e.def.cooldown;}continue;}
   if(distance<range&&e.clock<=0){e.state='windup';e.clock=e.def.boss?1.1:e.def.attack==='signature'?1:.75;e.aimX=p.x;e.aimY=p.y;e.angle=Math.atan2(p.y-e.y,p.x-e.x);}else if(distance>range*.8){const speed=e.def.speed*(now<(e.slow||0)?.65:1),step=Math.min(distance-range*.8,speed*dt);const next=traceStep(this.maps[map],e,{x:e.x+(p.x-e.x)/distance*step,y:e.y+(p.y-e.y)/distance*step});e.walkDistance=(e.walkDistance||0)+dist(e,next);e.moving=dist(e,next)>.01;e.face=(next.x-e.x)-(next.y-e.y)>=0?1:-1;Object.assign(e,next);}
  }}
 }
 snapshot(p,now=Date.now()/1000){const actor=q=>({id:q.id,pet:q.pet?{...q.pet}:null,offline:!!q.offline,shopTitle:q.offline?'':q.shopTitle||'',name:q.name,hero:q.s.hero,weaponLook:equippedWeaponLook(q.s),townBuffUntil:q.s.townBuffUntil||0,auraLevel:auraLevel(q.s),appearance:appearance(q.s),level:q.s.level,mutationVersion:q.s.mutationVersion,mutationStage:mutationStage(q.s),jobBranch:q.s.jobBranch,insectArmor:q.s.equip?.armor?.insect||null,x:q.x,y:q.y,hp:q.hp,maxHp:maxHP(q.s),face:q.face,anim:q.hp<=0?'dead':q.anim,animTime:q.animTime,combo:q.combo||0,walkDX:q.walkDX,walkDY:q.walkDY,walkDistance:q.walkDistance,back:q.back,castId:q.castId});const self={...actor(p),map:p.map,mp:p.mp,actionRemaining:Math.max(0,p.actionUntil-now),save:p.s,moveAck:p.seq,correction:!!p.entered,cooldowns:Object.fromEntries(Object.entries(p.cd).map(([k,v])=>[k,Math.max(0,v-now)]))};p.entered=false;return {type:'state',serverTime:now*1000,self,online:this.onlineCount(),loot:this.loot.filter(d=>d.map===p.map&&dist(p,d)<1700).map(d=>({...d,owner:undefined})),players:[],monsters:this.mobs[p.map].filter(e=>dist(p,e)<1700).map(e=>({id:e.id,x:e.x,y:e.y,def:e.def,hp:e.hp,state:e.state,clock:e.clock,angle:e.angle,aimX:e.aimX,aimY:e.aimY,face:e.face,flash:e.flash,moving:e.moving,walkDistance:e.walkDistance})),events:this.events.filter(e=>e.map===p.map&&dist(p,e)<1800)};}
}











