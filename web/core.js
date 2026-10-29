import {normalizeFashion} from './fashion.js';
import {isKnownMonster,isKnownBoss} from './catalog.js';
import {normalizeSkills,knownSkills} from './skills.js';
import {gearTotals,freshGear,normalizeGear} from './gear.js';
export const VERSION=1;
export function fresh(hero){const s={version:VERSION,hero,level:1,xp:0,gold:100000,potions:10,stones:0,upgrade:0,zone:0,kills:0,seen:[],bosses:[],sound:true,quality:'auto',attributes:{vit:0,str:0,int:0,agi:0},statPoints:0,skillPoints:0,skillRanks:{},reputation:0,autoAttack:false};normalizeSkills(s);freshGear(s);normalizeFashion(s);return s;}
export function xpNeed(level){return Math.round(45+level*level*4);}
export function maxHP(s){return Math.round(120+s.level*20+s.upgrade*12+(s.attributes?.vit||0)*12+gearTotals(s).hp);}
export function damage(s){return Math.round(16+s.level*4+s.upgrade*8+(s.attributes?.str||0)*2+gearTotals(s).atk);}
export function reward(s,m,rng=Math.random){s.gold+=m.gold;s.xp+=m.xp;s.kills++;s.reputation=(s.reputation||0)+(m.boss?25:1);if(!s.seen.includes(m.id))s.seen.push(m.id);if(m.boss&&!s.bosses.includes(m.id))s.bosses.push(m.id);const stone=rng()<.1;if(stone)s.stones++;while(s.level<210&&s.xp>=xpNeed(s.level)){s.xp-=xpNeed(s.level);s.level++;s.statPoints=(s.statPoints||0)+10;s.skillPoints=(s.skillPoints||0)+10;}if(s.level===210)s.xp=Math.min(s.xp,xpNeed(210));return stone;}
export function buyPotion(s){if(s.gold<50)return false;s.gold-=50;s.potions++;return true;}
export function upgradeCost(s){return 100*(s.upgrade+1)**2;}
export function upgrade(s){const cost=upgradeCost(s);if(s.upgrade>=20||s.gold<cost)return false;s.gold-=cost;s.upgrade++;return true;}
export function unlocked(s,z){return z===0;}
export function validSave(v){if(!v||v.version!==VERSION||!['sword-male','sword-female','demon-male','demon-female','sword-cockro','demon-scorpion','sword-dragonfly','sword-cricket'].includes(v.hero))return null;const s=fresh(v.hero);for(const [k,max]of Object.entries({level:210,xp:1e8,gold:1e10,potions:99999,stones:1e7,upgrade:20,zone:9,kills:1e9})){if(!Number.isFinite(v[k]))return null;s[k]=Math.max(k==='level'?1:0,Math.min(max,Math.floor(v[k])));}s.seen=Array.isArray(v.seen)?[...new Set(v.seen.filter(isKnownMonster))]:[];s.bosses=Array.isArray(v.bosses)?[...new Set(v.bosses.filter(isKnownBoss))]:[];s.sound=v.sound!==false;s.quality=['auto','low'].includes(v.quality)?v.quality:'auto';if(!unlocked(s,s.zone))s.zone=0;normalizeSkills(s,v);normalizeProgress(s,v);normalizeGear(s,v);normalizeFashion(s,v);return s;}
export function inCone(px,py,x,y,angle,range,arc){const dx=px-x,dy=py-y;return Math.hypot(dx,dy)<=range&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<=arc/2;}


const integer=(v,max)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export function normalizeProgress(s,v=s){
 const budget=(s.level-1)*10;let left=budget;const attrs={};
 for(const key of ['vit','str','int','agi']){attrs[key]=Math.min(left,integer(v.attributes?.[key],2090));left-=attrs[key];}
 s.attributes=attrs;s.statPoints=left;
 const ranks={};let points=budget;
 for(const [id,value] of Object.entries(v.skillRanks||{})){if(!knownSkills(s).some(r=>r.id===id&&r.level<=s.level))continue;const rank=Math.min(points,integer(value,19));ranks[id]=rank;points-=rank;}
 s.skillRanks=ranks;s.skillPoints=points;s.reputation=integer(v.reputation??s.kills,1e10);s.autoAttack=v.autoAttack===true;return s;
}
export function allocateStat(s,key){if(!Object.hasOwn(s.attributes,key)||s.statPoints<1)return false;s.attributes[key]++;s.statPoints--;return true;}
export function trainSkill(s,id){if(!knownSkills(s).some(r=>r.id===id&&r.level<=s.level)||s.skillPoints<1||(s.skillRanks[id]||0)>=19)return false;s.skillRanks[id]=(s.skillRanks[id]||0)+1;s.skillPoints--;return true;}
export function combatStats(s){const a=s.attributes||{},g=gearTotals(s);return {mp:Math.round(80+s.level*3+(a.int||0)*8+g.mp),defense:s.level*.25+(a.vit||0)*.6+g.def,crit:Math.min(.5,.05+(a.agi||0)*.001+g.crit),speed:Math.min(60,(a.agi||0)*.15+g.speed),haste:Math.min(.35,(a.agi||0)*.001),spell:1+(a.int||0)*.008+g.spell};}
export function reputationTitle(s){return s.reputation>=10000?'ตำนานฮีโร่':s.reputation>=2500?'ฮีโร่เลื่องชื่อ':s.reputation>=500?'ผู้มีชื่อเสียง':s.reputation>=100?'ฮีโร่ดาวรุ่ง':'ฮีโร่หน้าใหม่';}


