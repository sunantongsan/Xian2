import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
import {fresh,validSave,maxHP,combatStats} from '../web/core.js';
import {toWorld,MAPS} from '../web/maps.js';
import {aggressiveMonster,monsterNameColor} from '../web/monster-behavior.js';
import {monsterRewards,collectLoot} from '../web/ground-loot.js';
import {capturePresence,resolvePvpImpacts} from '../server/pvp.js';
const pair=()=>{const w=new World();w.mobs.forest=[];w.mobs.star=[];const sa=fresh('sword-cockro'),sb=fresh('sword-cockro');sa.name='Attacker';sb.name='Defender';const a=w.join('a',sa),b=w.join('b',sb);b.x=a.x+40;b.y=a.y;return {w,a,b};};
test('explicit online PvP works in town, validates range, target, cooldown and map',()=>{
 const {w,a,b}=pair(),hp=b.hp;w.command(a,{type:'attackPlayer',target:'b'},100);assert.equal(b.hp,hp);resolvePvpImpacts(w,100.32);assert(b.hp<hp);const hit=b.hp;w.command(a,{type:'attackPlayer',target:'b'},100.1);assert.equal(b.hp,hit);
 w.command(a,{type:'attackPlayer',target:'missing'},101);w.command(a,{type:'attackPlayer',target:'a'},102);assert.equal(b.hp,hit);
 b.x+=1000;w.command(a,{type:'attackPlayer',target:'b'},103);assert.equal(b.hp,hit);b.x=a.x;b.map='forest';w.command(a,{type:'skillPlayer',target:'b',slot:0},104);assert.equal(b.hp,hit);
});
test('offline body stays in place, defends and consumes real HP and MP potions',()=>{
 const {w,a,b}=pair();b.hp=maxHP(b.s)*.3;b.mp=0;const hpB=b.s.potions,mpB=b.s.mpPotions;w.disconnect(b);const position={x:b.x,y:b.y};w.command(a,{type:'attackPlayer',target:'b'},100);const hpA=a.hp;w.tick(.1,100.1);resolvePvpImpacts(w,100.7);
 assert(a.hp<hpA);assert.equal(b.s.potions,hpB-1);assert.equal(b.s.mpPotions,mpB-1);assert.deepEqual({x:b.x,y:b.y},position);assert.equal(w.players.size,1);assert(w.snapshot(a).players.find(p=>p.id==='b').offline);
 w.tick(.1,100.2);assert.equal(b.s.potions,hpB-1);assert.equal(b.s.mpPotions,mpB-1);
 a.x+=800;w.tick(.1,101);const report=b.s.pvpReports.at(-1);assert.equal(report.opponent,'Attacker');assert.equal(report.potions,1);assert.equal(report.mpPotions,1);assert(report.damageTaken>0&&report.damageDealt>0);
 capturePresence(b);const restored=validSave(JSON.parse(JSON.stringify(b.s)));const newWorld=new World();newWorld.restore('b',restored);assert.equal(newWorld.sleepers.get('b').hp,b.hp);const again=newWorld.join('b',restored);assert.equal(newWorld.sleepers.size,0);assert.equal(again.hp,b.hp);assert.equal(again.s.potions,hpB-1);assert.equal(again.s.pvpReports.at(-1).opponent,'Attacker');
});
test('offline death persists with winner, no reward theft, no repeat damage and deliberate revive',()=>{
 const {w,a,b}=pair();b.hp=1;b.s.potions=0;w.disconnect(b);const gold=b.s.gold,xp=b.s.xp;w.command(a,{type:'attackPlayer',target:'b'},100);resolvePvpImpacts(w,100.32);assert.equal(b.hp,0);assert.equal(b.s.pvpReports.at(-1).result,'lost');assert.equal(a.s.pvpReports.at(-1).result,'won');w.command(a,{type:'attackPlayer',target:'b'},102);assert.equal(b.s.pvpReports.length,1);assert.equal(b.s.gold,gold);assert.equal(b.s.xp,xp);
 capturePresence(b);w.join('b',validSave(b.s));assert.equal(b.hp,0);w.command(b,{type:'revive'},103);assert.equal(b.hp,maxHP(b.s));w.command(a,{type:'attackPlayer',target:'b'},104);assert.equal(b.hp,maxHP(b.s));
});
test('no potions are invented and forged skill/damage cannot bypass PvP validation',()=>{
 const {w,a,b}=pair();b.hp=40;b.s.potions=b.s.mpPotions=0;b.mp=0;w.disconnect(b);a.s.equipped=[];w.command(a,{type:'skillPlayer',target:'b',slot:0,damage:999999},100);assert.equal(b.hp,40);w.command(a,{type:'attackPlayer',target:'b'},101);w.tick(.1,101.1);resolvePvpImpacts(w,101.32);assert.equal(b.s.potions,0);assert.equal(b.s.mpPotions,0);assert(b.hp<40);
});
test('loot waits on ground, only close living owner can collect once, expires after eight seconds',()=>{
 const {w,a,b}=pair();w.enter(a,'forest');const e={id:'loot-boss',x:a.x+200,y:a.y,hp:1,def:{id:1060,boss:true,level:10,gold:100,xp:1},homeX:a.x+200,homeY:a.y};const before={g:a.s.gold,alloy:a.s.upgradeItems.alloy,bag:a.s.bag.length};w.hit(a,e,2,100);assert.equal(a.s.gold,before.g);assert.equal(a.s.upgradeItems.alloy,before.alloy);assert.equal(a.s.bag.length,before.bag);assert.equal(w.loot.length,4);
 Object.assign(b,{map:'forest',x:e.x,y:e.y});w.collectGround(101);assert.equal(w.loot.length,4);Object.assign(a,{x:e.x,y:e.y});w.collectGround(101);assert.equal(w.loot.length,0);assert.equal(a.s.gold,before.g+100);assert.equal(a.s.upgradeItems.alloy,before.alloy+3);assert.equal(a.s.bag.length,before.bag+2);w.collectGround(102);assert.equal(a.s.gold,before.g+100);
 e.hp=1;e.x+=500;w.hit(a,e,2,103);w.collectGround(111);assert.equal(w.loot.length,0);assert.equal(a.s.gold,before.g+100);
});
test('full inventory leaves equipment on ground instead of silently selling it',()=>{
 const s=fresh('sword-cockro');s.bag=Array.from({length:40},()=>s.equip.weapon);const gold=s.gold;assert.equal(collectLoot(s,{kind:'gear',item:s.equip.weapon,count:1}),false);assert.equal(s.gold,gold);
});
test('yellow monsters only retaliate; red monsters initiate combat on proximity',()=>{
 for(const aggressive of [false,true]){const w=new World(),p=w.join('p',fresh('sword-cockro'));w.enter(p,'forest');const e=w.mobs.forest[0];Object.assign(e,{x:p.x+40,y:p.y,homeX:p.x+40,homeY:p.y,hp:999999,state:'idle',clock:0});e.def={...e.def,aggressive,attack:'melee'};w.mobs.forest=[e];w.mobs.star=[];w.tick(.1,100);assert.equal(e.state,aggressive?'windup':'idle');assert.equal(aggressiveMonster(e.def),aggressive);assert.equal(monsterNameColor(e.def),aggressive?'#ff6b68':'#ffe16b');if(!aggressive){w.hit(p,e,1,101);e.clock=0;w.tick(.1,101.1);assert.equal(e.state,'windup');}}
});

