export const VERSION=1;
export function fresh(hero){return {version:VERSION,hero,level:1,xp:0,gold:100000,potions:10,stones:0,upgrade:0,zone:0,kills:0,seen:[],bosses:[],sound:true,quality:'auto'};}
export function xpNeed(level){return Math.round(45+level*level*4);}
export function maxHP(s){return 120+s.level*20+s.upgrade*12;}
export function damage(s){return 16+s.level*4+s.upgrade*8;}
export function reward(s,m,rng=Math.random){s.gold+=m.gold;s.xp+=m.xp;s.kills++;if(!s.seen.includes(m.id))s.seen.push(m.id);if(m.boss&&!s.bosses.includes(m.id))s.bosses.push(m.id);const stone=rng()<.1;if(stone)s.stones++;while(s.level<210&&s.xp>=xpNeed(s.level)){s.xp-=xpNeed(s.level);s.level++;}if(s.level===210)s.xp=Math.min(s.xp,xpNeed(210));return stone;}
export function buyPotion(s){if(s.gold<50)return false;s.gold-=50;s.potions++;return true;}
export function upgradeCost(s){return 100*(s.upgrade+1)**2;}
export function upgrade(s){const cost=upgradeCost(s);if(s.upgrade>=20||s.gold<cost)return false;s.gold-=cost;s.upgrade++;return true;}
export function unlocked(s,z){return z===0||(s.level>=z*20+1&&s.bosses.includes(z*10-1));}
export function validSave(v){if(!v||v.version!==VERSION||!['sword-male','sword-female','demon-male','demon-female'].includes(v.hero))return null;const s=fresh(v.hero);for(const [k,max]of Object.entries({level:210,xp:1e8,gold:1e10,potions:99999,stones:1e7,upgrade:20,zone:9,kills:1e9})){if(!Number.isFinite(v[k]))return null;s[k]=Math.max(k==='level'?1:0,Math.min(max,Math.floor(v[k])));}s.seen=Array.isArray(v.seen)?[...new Set(v.seen.filter(n=>Number.isInteger(n)&&n>=0&&n<100))]:[];s.bosses=Array.isArray(v.bosses)?[...new Set(v.bosses.filter(n=>Number.isInteger(n)&&n%10===9&&n<100&&n>=0))]:[];s.sound=v.sound!==false;s.quality=['auto','low'].includes(v.quality)?v.quality:'auto';if(!unlocked(s,s.zone))s.zone=0;return s;}
export function inCone(px,py,x,y,angle,range,arc){const dx=px-x,dy=py-y;return Math.hypot(dx,dy)<=range&&Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle)))<=arc/2;}
