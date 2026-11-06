import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
import {fresh,maxHP} from '../web/core.js';
import {walkable} from '../web/maps.js';
test('12 named patrol actors have varied levels, are separate from users and move on valid terrain',()=>{
 const w=new World({roamers:true,maxPlayers:1});assert.equal(w.roamers.size,12);assert.equal(w.players.size,0);assert.equal(w.sleepers.size,0);
 assert.equal(new Set([...w.roamers.values()].map(p=>p.name)).size,12);assert.ok(new Set([...w.roamers.values()].map(p=>p.s.level)).size>8);
 const p=w.join('human',fresh('sword-cockro'));assert.equal(w.snapshot(p).online,1);
 const before=[...w.roamers.values()].map(p=>[p.x,p.y]);for(let i=0;i<100;i++)w.tick(.1,100+i*.1);
 assert.ok([...w.roamers.values()].some((p,i)=>Math.hypot(p.x-before[i][0],p.y-before[i][1])>20));
 for(const p of w.roamers.values()){assert.ok(walkable(w.maps[p.map],p));assert.equal(p.s.gold,0);assert.equal(p.s.stones,0);}
 assert.equal(w.fights.size,0);assert.equal(w.loot.length,0);assert.equal(p.hp,maxHP(p.s));
});
test('patrol actors defend only after attack and respawn without granting currency',()=>{
 const w=new World({roamers:true}),p=w.join('human',fresh('sword-cockro')),bot=[...w.roamers.values()][0];Object.assign(p,{x:bot.x+20,y:bot.y});
 const gold=p.s.gold;w.tick(.1,100);assert.equal(w.fights.size,0);
 w.command(p,{type:'attackPlayer',target:bot.id},101);w.tick(.1,101.4);assert.ok(bot.hp<maxHP(bot.s));
 for(let i=0;i<20;i++)w.tick(.1,101.5+i*.1);assert.ok(p.hp<maxHP(p.s));assert.equal(p.s.gold,gold);
 bot.hp=0;w.tick(.1,105);assert.equal(bot.hp,0);w.tick(.1,136);assert.ok(bot.hp>0);assert.equal(w.players.size,1);
});
test('patrols are disabled unless explicitly requested by World',()=>assert.equal(new World().roamers.size,0));
