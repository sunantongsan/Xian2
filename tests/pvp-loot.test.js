import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
import {fresh,validSave,maxHP,combatStats} from '../web/core.js';
import {toWorld,MAPS} from '../web/maps.js';
import {aggressiveMonster,monsterNameColor} from '../web/monster-behavior.js';
import {monsterRewards,collectLoot} from '../web/ground-loot.js';
const pair=()=>{const w=new World();w.mobs.forest=[];w.mobs.star=[];const sa=fresh('sword-cockro'),sb=fresh('sword-cockro');sa.name='Attacker';sb.name='Defender';const a=w.join('a',sa),b=w.join('b',sb);b.x=a.x+40;b.y=a.y;return {w,a,b};};
test('player attack and skill packets cannot affect a character or open a duel',()=>{
 const {w,a,b}=pair(),before=[b.hp,b.mp,b.s.potions,a.mp];
 for(const type of ['attackPlayer','skillPlayer'])w.command(a,{type,target:b.id,slot:0},100);
 assert.deepEqual([b.hp,b.mp,b.s.potions,a.mp],before);
 assert.equal(w.events.length,0);
});
test('loot waits on ground, only close living owner can collect once, expires after eight seconds',()=>{
 const {w,a,b}=pair();w.enter(a,'forest');const e={id:'loot-boss',x:a.x+200,y:a.y,hp:1,def:{id:1060,boss:true,level:10,gold:100,xp:1},homeX:a.x+200,homeY:a.y};const before={g:a.s.stones,alloy:a.s.upgradeItems.alloy,bag:a.s.bag.length};w.hit(a,e,2,100);assert.equal(a.s.stones,before.g);assert.equal(a.s.upgradeItems.alloy,before.alloy);assert.equal(a.s.bag.length,before.bag);assert.equal(a.s.bountyHeads,10);assert.equal(w.loot.length,2);
 w.hit(a,e,2,100);assert.equal(a.s.bountyHeads,10);assert.equal(w.loot.length,2);
 assert.deepEqual(w.loot.filter(d=>d.kind==='cockro').map(d=>d.count),[1]);
 Object.assign(b,{map:'forest',x:e.x,y:e.y});w.collectGround(101);assert.equal(w.loot.length,2);
 Object.assign(a,{x:e.x,y:e.y});w.collectGround(101);assert.equal(w.loot.length,0);assert.equal(a.s.stones,before.g+1);assert.deepEqual(a.s.upgradeItems,{});assert.equal(a.s.bag.length,before.bag+1);
 w.collectGround(102);assert.equal(a.s.stones,before.g+1);
 e.hp=1;e.x+=500;w.hit(a,e,2,103);w.collectGround(111);assert.equal(w.loot.length,0);assert.equal(a.s.stones,before.g+1);
});
test('full inventory leaves equipment on ground instead of silently selling it',()=>{
 const s=fresh('sword-cockro');s.bag=Array.from({length:40},()=>s.equip.weapon);const gold=s.gold;assert.equal(collectLoot(s,{kind:'gear',item:s.equip.weapon,count:1}),false);assert.equal(s.gold,gold);
});
test('yellow monsters only retaliate; red monsters initiate combat on proximity',()=>{
 for(const aggressive of [false,true]){const w=new World(),p=w.join('p',fresh('sword-cockro'));w.enter(p,'forest');const e=w.mobs.forest[0];Object.assign(e,{x:p.x+40,y:p.y,homeX:p.x+40,homeY:p.y,hp:999999,state:'idle',clock:0});e.def={...e.def,aggressive,attack:'melee'};w.mobs.forest=[e];w.mobs.star=[];w.tick(.1,100);assert.equal(e.state,aggressive?'windup':'idle');assert.equal(aggressiveMonster(e.def),aggressive);assert.equal(monsterNameColor(e.def),aggressive?'#ff6b68':'#ffe16b');if(!aggressive){w.hit(p,e,1,101);e.clock=0;w.tick(.1,101.1);assert.equal(e.state,'windup');}}
});


