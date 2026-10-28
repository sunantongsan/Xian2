import test from 'node:test';
import assert from 'node:assert/strict';
import {MONSTERS,ZONES,HEROES} from '../web/catalog.js';
import {fresh,reward,xpNeed,validSave,buyPotion,upgrade,unlocked,inCone} from '../web/core.js';
test('100 distinct monsters, 10 bosses, every region has ten and valid combat data',()=>{assert.equal(MONSTERS.length,100);assert.equal(new Set(MONSTERS.map(m=>m.name)).size,100);assert.equal(new Set(MONSTERS.map(m=>m.id)).size,100);assert.equal(MONSTERS.filter(m=>m.boss).length,10);for(let z=0;z<10;z++)assert.equal(MONSTERS.filter(m=>m.zone===z).length,10);for(const m of MONSTERS){assert(m.hp>0&&m.damage>0&&m.cooldown>0);assert(['melee','dash','projectile','cone','burst'].includes(m.attack));}});
test('save round-trip and reject corrupt or foreign save',()=>{const s=fresh(HEROES[0].id);assert.deepEqual(validSave(JSON.parse(JSON.stringify(s))),s);assert.equal(validSave({version:99}),null);assert.equal(validSave({...s,level:NaN}),null);assert.equal(validSave({...s,hero:'bad'}),null);assert.equal(validSave({...s,gold:-2}).gold,0);});
test('progression preserves overflow XP and caps level',()=>{const s=fresh('sword-male');reward(s,{id:0,gold:20,xp:xpNeed(1)+10,boss:false},()=>1);assert.equal(s.level,2);assert.equal(s.xp,10);assert.equal(s.stones,0);s.level=209;reward(s,{id:99,gold:10,xp:1e9,boss:true},()=>0);assert.equal(s.level,210);assert(s.xp<=xpNeed(210));assert.equal(s.stones,1);});
test('shops cannot spend missing gold and +20 is final',()=>{const s=fresh('demon-female');s.gold=49;assert.equal(buyPotion(s),false);assert.equal(s.gold,49);s.gold=100;assert(upgrade(s));assert.equal(s.upgrade,1);assert.equal(s.gold,0);s.upgrade=20;s.gold=1e8;assert.equal(upgrade(s),false);});
test('regions require both level and prior boss',()=>{const s=fresh('sword-female');assert(unlocked(s,0));assert(!unlocked(s,1));s.level=21;assert(!unlocked(s,1));s.bosses.push(9);assert(unlocked(s,1));});
test('enemy cone respects distance, angle wrap and rear dodge',()=>{assert(inCone(-50,0,0,0,Math.PI,100,1));assert(inCone(-50,-1,0,0,Math.PI,100,1));assert(!inCone(50,0,0,0,Math.PI,100,1));assert(!inCone(-150,0,0,0,Math.PI,100,1));});


test('Cockro prototype character survives local save round trip',()=>{const s=fresh('sword-cockro');const restored=validSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.hero,'sword-cockro');});
