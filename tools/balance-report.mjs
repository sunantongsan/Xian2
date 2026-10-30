import {fresh,maxHP,damage,combatStats,xpNeed} from '../web/core.js';
import {monsterStats,killsPerLevel,manaRegen} from '../web/balance.js';
import {SLOTS,makeItem,tierForLevel} from '../web/gear.js';
import {knownSkills,compileSkill} from '../web/skills.js';
// Stationary single-target estimate, no dodging, AoE, DoTs, travel or potion use.
console.log('level,hero,hp,damage,xpNeed,kills,estimatedTTK,unspentTTK,hitsToDefeat,mpPerSecond,regen');
for(const level of [1,10,30,60,90,120])for(const hero of ['sword-cockro','sword-dragonfly','sword-cricket','demon-scorpion']){
 const s=fresh(hero);s.level=level;s.upgrade=Math.min(20,Math.floor(level/5));s.attributes={str:4*(level-1),vit:3*(level-1),int:2*(level-1),agi:level-1};s.equip=Object.fromEntries(Object.keys(SLOTS).map(k=>[k,makeItem(k,tierForLevel(level),1)]));
 const c=combatStats(s),m=monsterStats(level),skills=knownSkills(s).filter(k=>k.level<=level).slice(0,3).map(compileSkill);let frequency=0,skillDPS=0,mp=0;
 for(const k of skills){const rank=Math.min(19,Math.floor((level-1)*10/skills.length));frequency+=1/k.cd;mp+=k.mp/k.cd;skillDPS+=damage(s)*k.power*c.spell*(1+rank*.06)/k.cd;}
 const dps=damage(s)*(1+c.crit*.5)/(.46*(1-c.haste))*Math.max(0,1-frequency*.5)+skillDPS;
 const bare=fresh(hero);bare.level=level;const bareDPS=damage(bare)/.46;
 console.log([level,hero,m.hp,m.damage,xpNeed(level),killsPerLevel(level),(m.hp/dps).toFixed(1),(m.hp/bareDPS).toFixed(1),(maxHP(s)/(m.damage*100/(100+c.defense))).toFixed(1),mp.toFixed(1),manaRegen(s).toFixed(1)].join(','));
}
