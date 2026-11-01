import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {World,HEROES} from '../server/world.js';
import {fresh,maxHP,combatStats} from '../web/core.js';
import {knownSkills,compileSkill} from '../web/skills.js';
import {readyPvpSkill} from '../web/pvp-skills.js';
import {resolvePvpImpacts,tickPvp} from '../server/pvp.js';
function pair(hero='sword-cockro'){const w=new World(),s=fresh(hero);s.level=210;s.equipped=knownSkills(s).slice(0,5).map(k=>k.id);const a=w.join('a',s),b=w.join('b',{...fresh('sword-cockro'),level:210});b.x=a.x+40;b.y=a.y;return {w,a,b};}
test('all five equipped slots of every playable hero cast in PvP, consume MP and have independent cooldowns',()=>{
 for(const hero of HEROES){const {w,a,b}=pair(hero);for(let slot=0;slot<5;slot++){
  const now=100+slot,k=compileSkill(knownSkills(a.s).find(k=>k.id===a.s.equipped[slot])),mp=a.mp,hp=b.hp;
  w.command(a,{type:'skillPlayer',target:b.id,slot},now);
  assert.equal(a.castId,k.id,hero+' slot '+slot);assert.equal(a.mp,mp-k.mp);assert.equal(a.cd[k.id],now+k.cd);assert.equal(b.hp,hp);
  assert(w.events.some(e=>e.kind==='skill'&&e.skillId===k.id));resolvePvpImpacts(w,now+.56);assert(b.hp<hp);b.hp=maxHP(b.s);
 }
 }
});
test('PvP rotation uses every slot before returning to a fast first slot; skips unavailable skills',()=>{
 const {a}=pair();let next=0;const visited=[];
 for(let n=0;n<10;n++){const pick=readyPvpSkill(a.s,{},10000,30,next);visited.push(pick.slot);next=(pick.slot+1)%5;}
 assert.deepEqual(visited,[0,1,2,3,4,0,1,2,3,4]);
 assert.equal(readyPvpSkill(a.s,{s1:3},10000,30,0).slot,1);assert.equal(readyPvpSkill(a.s,{},0,30),null);assert.equal(readyPvpSkill(a.s,{},10000,2000),null);
 a.s.level=1;assert.equal(readyPvpSkill(a.s,{s1:1},10000,30),null);
});
test('offline defense rotates through all five ready skills without starving late slots',()=>{
 const {w,a,b}=pair();b.s.level=210;b.s.equipped=[...a.s.equipped];b.mp=combatStats(b.s).mp;w.disconnect(b);b.defender=a.id;
 const seen=[];
 for(let n=0;n<5;n++){b.lastPvp=100+n;b.hp=maxHP(b.s);a.hp=maxHP(a.s);tickPvp(w,0,100+n);seen.push(b.castId);resolvePvpImpacts(w,100+n+.6);}
 assert.deepEqual(seen,b.s.equipped);
});
test('manual skill rejection explains range, MP and cooldown without consuming resources',()=>{
 for(const reason of ['range','mana','cooldown']){const {w,a,b}=pair();if(reason==='range')b.x+=900;if(reason==='mana')a.mp=0;if(reason==='cooldown')a.cd.s1=200;const mp=a.mp;
 w.command(a,{type:'skillPlayer',slot:0,target:b.id,manual:true},100);
 assert.equal(a.mp,mp);assert(!a.pendingPvp);assert(w.events.some(e=>e.kind==='pvpSkillRejected'&&e.reason===reason));}
});
function harness(){const {a,b}=pair();const calls=[],notes=[];const context=vm.createContext({pvpTarget:'b',pvpManualSkill:null,pvpNextSkill:0,pvpActionUntil:101,time:100,p:{...a,dead:false},paused:false,s:a.s,net:{ready:true,players:[b],send:d=>{calls.push(d);return true;}},skillTimers:{},knownSkills,compileSkill,readyPvpSkill,lineClear:()=>true,toast:s=>notes.push(s),onlineMode:true});const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8');vm.runInContext(source.slice(source.indexOf('function castPvpSkill('),source.indexOf('function applyCast(')),context);return {context,calls,notes,a,b};}
test('manual button waits through basic animation, overrides auto selection, and casts selected slot once',()=>{
 const {context,calls}=harness();vm.runInContext('skill(4)',context);assert.equal(calls.length,0);assert.equal(context.pvpManualSkill.slot,4);
 context.time=101;vm.runInContext('castPvpSkill(true)',context);assert.equal(calls.length,1);assert.equal(calls[0].slot,4);assert.equal(calls[0].target,'b');assert(calls[0].manual);assert.equal(context.pvpManualSkill,null);
 vm.runInContext('castPvpSkill(true)',context);assert.equal(calls.length,1);
});
test('queued skill cannot switch targets, run after expiry, or cast a replaced skill',()=>{
 for(const mode of ['target','expiry','replace']){const {context,calls}=harness();vm.runInContext('skill(3)',context);context.time=101;
 if(mode==='target')context.pvpTarget='another';if(mode==='expiry')context.time=103;if(mode==='replace')context.s.equipped[3]='s6';
 vm.runInContext('castPvpSkill()',context);assert.equal(calls.length,0);assert.equal(context.pvpManualSkill,null);}
});
