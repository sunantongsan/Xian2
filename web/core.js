import {STAT_PROGRESSION_VERSION,STAT_POINTS_PER_LEVEL,statProgression} from './stat-progression.js';
import {normalizeExpTickets,expMultiplier} from './exp-tickets.js';
import {normalizePets} from './loot-pets.js';
import {normalizeWorldSave} from './world-save.js';
import {characterName} from './character-name.js';
import {countActivity,normalizeActivities} from './daily-activities.js';
import {normalizeCheckin} from './checkin.js';
import {normalizeUpgradeItems} from './upgrade-items.js';
import {normalizeFashion} from './fashion.js';
import {isKnownMonster,isKnownBoss} from './catalog.js';
import {normalizeSkills,knownSkills} from './skills.js';
import {gearTotals,freshGear,normalizeGear} from './gear.js';
import {BALANCE_VERSION,levelXP} from './balance.js';
import {buffMultiplier,normalizeTownBuff} from './town-buff.js';
export const VERSION=1;
export function fresh(hero){const s={version:VERSION,statProgressionVersion:STAT_PROGRESSION_VERSION,legacyStatLevels:0,name:'',townBuffUntil:0,enhancementVersion:2,balanceVersion:BALANCE_VERSION,mpPotions:5,adTickets:[],accountRewardReceipts:[],playReceipts:[],pvpReports:[],hero,level:1,xp:0,gold:100000,potions:10,stones:0,upgrade:0,zone:0,kills:0,seen:[],bosses:[],sound:true,quality:'auto',attributes:{vit:0,str:0,int:0,agi:0},statPoints:0,skillPoints:0,skillRanks:{},reputation:0,autoAttack:false};normalizePets(s);normalizeExpTickets(s);normalizeSkills(s);normalizeUpgradeItems(s);normalizeCheckin(s);freshGear(s);normalizeFashion(s);return s;}
export function xpNeed(level){return levelXP(level);}
export function maxHP(s){return buffMultiplier(s)*Math.round(120+s.level*20+s.upgrade*12+(s.attributes?.vit||0)*12+gearTotals(s).hp);}
export function damage(s){return buffMultiplier(s)*Math.round(16+s.level*4+s.upgrade*8+(s.attributes?.str||0)*2+gearTotals(s).atk);}
export function reward(s,m,rng=Math.random){const prior=statProgression(s,s.level);s.statProgressionVersion=prior.statProgressionVersion;s.legacyStatLevels=prior.legacyStatLevels;countActivity(s,'hunt');if(m.boss)countActivity(s,'boss');s.gold+=m.gold;s.xp+=Math.floor(m.xp*expMultiplier(s));s.kills++;s.reputation=(s.reputation||0)+(m.boss?25:1);if(!s.seen.includes(m.id))s.seen.push(m.id);if(m.boss&&!s.bosses.includes(m.id))s.bosses.push(m.id);const stone=false;normalizeUpgradeItems(s);if(m.boss)s.upgradeItems.alloy=Math.min(99999,s.upgradeItems.alloy+3);else if(rng()<.08)s.upgradeItems.alloy=Math.min(99999,s.upgradeItems.alloy+1);while(s.level<210&&s.xp>=xpNeed(s.level)){s.xp-=xpNeed(s.level);s.level++;s.statPoints=(s.statPoints||0)+STAT_POINTS_PER_LEVEL;s.skillPoints=(s.skillPoints||0)+10;}if(s.level===210)s.xp=Math.min(s.xp,xpNeed(210));return stone;}
export function buyPotion(s){if(s.gold<50||s.potions>=99999)return false;s.gold-=50;s.potions++;return true;}
export function buyMPPotion(s){if(s.gold<60||(s.mpPotions||0)>=99999)return false;s.gold-=60;s.mpPotions=(s.mpPotions||0)+1;return true;}
export function upgradeCost(s){return 3+s.upgrade*2;}
export function upgrade(s){const cost=upgradeCost(s);if(s.upgrade>=20||s.stones<cost)return false;s.stones-=cost;s.upgrade++;return true;}
export function unlocked(s,z){return z===0;}
export function validSave(v){if(!v||v.version!==VERSION||!['sword-male','sword-female','demon-male','demon-female','sword-cockro','demon-scorpion','sword-dragonfly','sword-cricket'].includes(v.hero))return null;const s=fresh(v.hero);s.accountRewardReceipts=Array.isArray(v.accountRewardReceipts)?[...new Set(v.accountRewardReceipts.filter(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))]:[];s.playReceipts=Array.isArray(v.playReceipts)?[...new Set(v.playReceipts.filter(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))]:[];s.name=characterName(v.name)||'';normalizeTownBuff(s,v);normalizeExpTickets(s,v);normalizeWorldSave(s,v);normalizePets(s,v);normalizeActivities(s,v);if(v.testGoldGrant)s.testGoldGrant=v.testGoldGrant;for(const [k,max]of Object.entries({level:210,xp:1e8,gold:1e10,potions:99999,stones:1e7,upgrade:20,zone:9,kills:1e9})){if(!Number.isFinite(v[k]))return null;s[k]=Math.max(k==='level'?1:0,Math.min(max,Math.floor(v[k])));}s.seen=Array.isArray(v.seen)?[...new Set(v.seen.filter(isKnownMonster))]:[];s.bosses=Array.isArray(v.bosses)?[...new Set(v.bosses.filter(isKnownBoss))]:[];s.sound=v.sound!==false;s.quality=['auto','low'].includes(v.quality)?v.quality:'auto';if(!unlocked(s,s.zone))s.zone=0;normalizeSkills(s,v);normalizeProgress(s,v);normalizeUpgradeItems(s,v);const gearSave=structuredClone(v);if(v.enhancementVersion!==2){for(const it of [...Object.values(gearSave.equip||{}),...(gearSave.bag||[])]){if(!it)continue;let kept=false;for(const id of ['crystal','glowstone','diamond','ruby']){const n=Math.max(0,Math.min(10,Math.floor(it.gems?.[id]||0)));if(!n)continue;const keep=!kept&&['weapon','ring','amulet'].includes(it.slot);kept=kept||keep;s.upgradeItems[id]=Math.min(99999,s.upgradeItems[id]+n-(keep?1:0));it.gems[id]=keep?1:0;}if(it.plus>9&&['weapon','ring','amulet'].includes(it.slot))it.legacyPlus=it.plus;}gearSave.upgradeItems=s.upgradeItems;}normalizeGear(s,gearSave);normalizeFashion(s,v);normalizeCheckin(s,v);s.adTickets=Array.isArray(v.adTickets)?v.adTickets.filter(t=>t&&/^[a-f0-9]{48}$/.test(t.nonce)&&Number.isFinite(t.created)).slice(-100):[];s.mpPotions=Number.isFinite(v.mpPotions)?Math.max(0,Math.min(99999,Math.floor(v.mpPotions))):5;if(v.balanceVersion!==BALANCE_VERSION){s.xp=Math.floor(Math.min(1,s.xp/(45+s.level*s.level*4))*xpNeed(s.level));}return s;}
export function inCone(px,py,x,y,angle,range,arc){const dx=px-x,dy=py-y;return Math.hypot(dx,dy)<=range&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<=arc/2;}


const integer=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function normalizeProgress(s,v=s){
 const progress=statProgression(v,s.level);s.statProgressionVersion=progress.statProgressionVersion;s.legacyStatLevels=progress.legacyStatLevels;let left=progress.budget;const attrs={};
 for(const key of ['vit','str','int','agi']){attrs[key]=Math.min(left,integer(v.attributes?.[key],2090));left-=attrs[key];}
 s.attributes=attrs;s.statPoints=left;
 const ranks={};let points=(s.level-1)*10;
 for(const [id,value] of Object.entries(v.skillRanks||{})){if(!knownSkills(s).some(r=>r.id===id&&r.level<=s.level))continue;const rank=Math.min(points,integer(value,19));ranks[id]=rank;points-=rank;}
 s.skillRanks=ranks;s.skillPoints=points;s.reputation=integer(v.reputation??s.kills,1e10);s.autoAttack=v.autoAttack===true;return s;
}
export function allocateStats(s,values){
 if(!values||typeof values!=='object'||Array.isArray(values))return false;
 const keys=Object.keys(values);if(!keys.length||keys.some(k=>!Object.hasOwn(s.attributes,k)))return false;
 if(keys.some(k=>!Number.isSafeInteger(values[k])||values[k]<0))return false;
 const total=keys.reduce((n,k)=>n+values[k],0);if(!Number.isSafeInteger(total)||total<1||total>s.statPoints)return false;
 for(const k of keys)s.attributes[k]+=values[k];s.statPoints-=total;return true;
}
export function allocateStat(s,key){if(!Object.hasOwn(s.attributes,key)||s.statPoints<1)return false;s.attributes[key]++;s.statPoints--;return true;}
export function trainSkill(s,id){if(!knownSkills(s).some(r=>r.id===id&&r.level<=s.level)||s.skillPoints<1||(s.skillRanks[id]||0)>=19)return false;s.skillRanks[id]=(s.skillRanks[id]||0)+1;s.skillPoints--;return true;}
export function combatStats(s){const a=s.attributes||{},g=gearTotals(s),b=buffMultiplier(s);return {mp:b*Math.round(80+s.level*3+(a.int||0)*8+g.mp),defense:b*(s.level*.25+(a.vit||0)*.6+g.def),crit:Math.min(1,b*Math.min(.5,.05+(a.agi||0)*.001+g.crit)),speed:Math.min(60,(a.agi||0)*.15+g.speed),haste:Math.min(.35,(a.agi||0)*.001),spell:1+(a.int||0)*.008+g.spell};}
export function reputationTitle(s){return s.reputation>=10000?'ตำนานฮีโร่':s.reputation>=2500?'ฮีโร่เลื่องชื่อ':s.reputation>=500?'ผู้มีชื่อเสียง':s.reputation>=100?'ฮีโร่ดาวรุ่ง':'ฮีโร่หน้าใหม่';}








