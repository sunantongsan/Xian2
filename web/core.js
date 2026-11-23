import {normalizeEconomy,COIN_CAP} from './chain-economy.js';
import {t,ui} from './i18n.js';
import {MUTATION_VERSION,normalizeMutation,mutationStage} from './mutation.js';
import {mutationGrowth} from './job-progression.js';
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
import {GOLD_CAP} from './hunt-bounty.js';
import {buyMerchantStack,normalizePotionStock} from './merchant.js';
import {BALANCE_VERSION,levelXP,huntXP,migrateXP,PLAYER_GROWTH} from './balance.js';
import {buffMultiplier,normalizeTownBuff} from './town-buff.js';
export const VERSION=1;
export function fresh(hero){const s={version:VERSION,mutationVersion:MUTATION_VERSION,mutationStage:0,jobBranch:null,statProgressionVersion:STAT_PROGRESSION_VERSION,legacyStatLevels:0,name:'',townBuffUntil:0,enhancementVersion:2,balanceVersion:BALANCE_VERSION,mpPotions:5,potionStock:{},adTickets:[],accountRewardReceipts:[],playReceipts:[],pvpReports:[],hero,level:1,xp:0,gold:0,potions:10,bountyRemainder:0,bountyRevision:0,hunterBoostUntil:0,stones:0,upgrade:0,zone:0,kills:0,seen:[],bosses:[],sound:true,quality:'auto',attributes:{vit:0,str:0,int:0,agi:0},statPoints:0,skillPoints:0,skillRanks:{},reputation:0,autoAttack:false};normalizeEconomy(s);normalizePets(s);normalizeExpTickets(s);normalizeSkills(s);normalizeUpgradeItems(s);normalizeCheckin(s);freshGear(s);normalizeFashion(s);return s;}
export function xpNeed(level){return levelXP(level);}
export function maxHP(s){return buffMultiplier(s)*Math.round((120+s.level*PLAYER_GROWTH.hp)*mutationGrowth(s.hero,s.level,mutationStage(s))+s.upgrade*12+(s.attributes?.vit||0)*12+gearTotals(s).hp);}
export const HUNTER_BOOST_MINUTES=30;
export function damage(s,now=Date.now()){const huntBonus=s.hunterBoostUntil>now?1.35:1;return Math.round(huntBonus*buffMultiplier(s)*Math.round((16+s.level*PLAYER_GROWTH.attack)*mutationGrowth(s.hero,s.level,mutationStage(s))+s.upgrade*8+(s.attributes?.str||0)*2+gearTotals(s).atk));}
export function reward(s,m,rng=Math.random){const prior=statProgression(s,s.level);s.statProgressionVersion=prior.statProgressionVersion;s.legacyStatLevels=prior.legacyStatLevels;countActivity(s,'hunt');if(m.boss)countActivity(s,'boss');s.xp+=huntXP(s.level)*expMultiplier(s);s.kills++;s.reputation=(s.reputation||0)+(m.boss?25:1);if(!s.seen.includes(m.id))s.seen.push(m.id);if(m.boss&&!s.bosses.includes(m.id))s.bosses.push(m.id);const stone=false;normalizeUpgradeItems(s);advanceLevels(s);return stone;}
export function buyPotion(s){return buyMerchantStack(s,'buy',null,1);}
export function buyMPPotion(s){return buyMerchantStack(s,'buyMP',null,1);}
export function upgradeCost(s){return 3+s.upgrade*2;}
export function upgrade(s){const cost=upgradeCost(s);if(s.upgrade>=20||s.stones<cost)return false;s.stones-=cost;s.upgrade++;return true;}
export function unlocked(s,z){return z===0;}
export function validSave(v){if(!v||v.version!==VERSION||!['sword-male','sword-female','demon-male','demon-female','sword-cockro','demon-scorpion','sword-dragonfly','sword-cricket','sword-mage','sword-acolyte'].includes(v.hero))return null;const s=fresh(v.hero);
 for(const key of ['bountyRevision','hunterBoostUntil'])s[key]=Number.isSafeInteger(v[key])&&v[key]>=0?v[key]:0;
 s.bountyRemainder=Number.isInteger(v.bountyRemainder)&&v.bountyRemainder>=0&&v.bountyRemainder<10?v.bountyRemainder:0;
 s.accountRewardReceipts=Array.isArray(v.accountRewardReceipts)?[...new Set(v.accountRewardReceipts.filter(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))]:[];s.playReceipts=Array.isArray(v.playReceipts)?[...new Set(v.playReceipts.filter(x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x)))]:[];s.name=characterName(v.name)||'';normalizeTownBuff(s,v);normalizeExpTickets(s,v);normalizeWorldSave(s,v);normalizePets(s,v);normalizeActivities(s,v);if(v.testGoldGrant)s.testGoldGrant=v.testGoldGrant;for(const [k,max]of Object.entries({level:Math.floor(Number.MAX_SAFE_INTEGER/10),xp:1e8,gold:GOLD_CAP,potions:99999,stones:COIN_CAP,upgrade:20,zone:9,kills:Number.MAX_SAFE_INTEGER})){if(!Number.isFinite(v[k]))return null;s[k]=Math.max(k==='level'?1:0,Math.min(max,Math.floor(v[k])));}s.seen=Array.isArray(v.seen)?[...new Set(v.seen.filter(isKnownMonster))]:[];s.bosses=Array.isArray(v.bosses)?[...new Set(v.bosses.filter(isKnownBoss))]:[];s.sound=v.sound!==false;s.quality=['auto','low'].includes(v.quality)?v.quality:'auto';if(!unlocked(s,s.zone))s.zone=0;normalizeMutation(s,v);normalizeSkills(s,v);normalizeProgress(s,v);normalizeUpgradeItems(s,v);const gearSave=structuredClone(v);normalizeGear(s,gearSave);normalizeFashion(s,v);normalizeCheckin(s,v);normalizeEconomy(s,v);s.adTickets=Array.isArray(v.adTickets)?v.adTickets.filter(t=>t&&/^[a-f0-9]{48}$/.test(t.nonce)&&Number.isFinite(t.created)).slice(-100):[];s.mpPotions=Number.isFinite(v.mpPotions)?Math.max(0,Math.min(99999,Math.floor(v.mpPotions))):5;normalizePotionStock(s,v.potionStock);if(Number.isSafeInteger(v.bountyHeads)&&v.bountyHeads>0)s.gold=Math.min(GOLD_CAP,s.gold+v.bountyHeads);if(s.gold===GOLD_CAP)s.bountyRemainder=0;s.xp=migrateXP(s.xp,s.level,v.balanceVersion);return s;}
export function inCone(px,py,x,y,angle,range,arc){const dx=px-x,dy=py-y;return Math.hypot(dx,dy)<=range&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<=arc/2;}


const integer=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function normalizeProgress(s,v=s){
 const progress=statProgression(v,s.level);s.statProgressionVersion=progress.statProgressionVersion;s.legacyStatLevels=progress.legacyStatLevels;let left=progress.budget;const attrs={};
 for(const key of ['vit','str','int','agi']){attrs[key]=Math.min(left,integer(v.attributes?.[key],progress.budget));left-=attrs[key];}
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
export function combatStats(s){const a=s.attributes||{},g=gearTotals(s),b=buffMultiplier(s);return {mp:b*Math.round((80+s.level*PLAYER_GROWTH.mp)*mutationGrowth(s.hero,s.level,mutationStage(s))+(a.int||0)*8+g.mp),defense:b*(s.level*PLAYER_GROWTH.defense*mutationGrowth(s.hero,s.level,mutationStage(s))+(a.vit||0)*.6+g.def),crit:Math.min(1,b*Math.min(.5,.05+(a.agi||0)*.001+g.crit)),speed:Math.min(60,(a.agi||0)*.15+g.speed),haste:Math.min(.35,(a.agi||0)*.001),spell:1+(a.int||0)*.008+g.spell};}
export function reputationTitle(s){return s.reputation>=10000?t('ตำนานฮีโร่'):s.reputation>=2500?t('ฮีโร่เลื่องชื่อ'):s.reputation>=500?t('ผู้มีชื่อเสียง'):s.reputation>=100?t('ฮีโร่ดาวรุ่ง'):t('ฮีโร่หน้าใหม่');}









export function advanceLevels(s){while(s.xp>=xpNeed(s.level)&&s.level<Math.floor(Number.MAX_SAFE_INTEGER/10)){s.xp-=xpNeed(s.level);s.level++;s.statPoints=(s.statPoints||0)+STAT_POINTS_PER_LEVEL;s.skillPoints=(s.skillPoints||0)+10;}normalizeMutation(s);}


