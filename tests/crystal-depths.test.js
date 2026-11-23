import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
import {capturePresence} from '../web/solo-world.js';
import {fresh,validSave,maxHP} from '../web/core.js';
import {MAPS,toWorld,walkable,routeTo} from '../web/maps.js';
import {roadDestination,roadArrival,TOWN_ROADS} from '../web/roads.js';
import {DEPTHS_EXIT,DEPTHS_ROOMS} from '../web/crystal-depths.js';
import {killBountyTenths} from '../web/hunt-bounty.js';
import {monsterStats} from '../web/balance.js';

test('level 120 can reach all six chambers and leave through the marked road',()=>{
 const w=new World(),p=w.join('hunter',fresh('sword-cockro'));
 const gate=toWorld(TOWN_ROADS.find(r=>r.id==='depths').end,MAPS.town);
 assert(walkable(MAPS.town,gate));assert(!roadDestination('town',gate,119));
 p.s.level=119;w.command(p,{type:'enter',map:'depths'},10);assert.equal(p.map,'town');
 p.s.level=120;const entrance=roadDestination('town',gate,120);assert.equal(entrance.map,'depths');
 Object.assign(p,gate);w.command(p,{type:'move',...gate,seq:1},20);assert.equal(p.map,'depths');
 assert.deepEqual({x:p.x,y:p.y},roadArrival(entrance));
 const mobs=w.mobs.depths;
 assert.equal(mobs.length,135);assert.equal(new Set(mobs.map(m=>m.id)).size,135);
 assert.equal(mobs.filter(e=>e.def.boss).length,3);assert.equal(mobs.filter(e=>e.def.elite).length,24);
 assert(mobs.every(e=>walkable(MAPS.depths,e)&&e.def.aggressive&&Math.hypot(p.x-e.x,p.y-e.y)>230));
 assert.deepEqual([Math.min(...mobs.map(e=>e.def.level)),Math.max(...mobs.map(e=>e.def.level))],[120,240]);
 let from=p;for(const r of DEPTHS_ROOMS){const goal=toWorld(r.center,MAPS.depths);assert(routeTo(MAPS.depths,from,goal).length);from=goal;}
 capturePresence(p);const saved=validSave(p.s);assert.equal(w.makeActor('restored',saved).map,'depths');
 saved.level=100;assert.equal(w.makeActor('low',saved).map,'town');
 const exit=toWorld(DEPTHS_EXIT,MAPS.depths);Object.assign(p,exit);w.command(p,{type:'move',...exit,seq:2},24);
 assert.equal(p.map,'town');assert(walkable(MAPS.town,p));
});
test('full bounties double, credit once, and boss records survive saving',()=>{
 const w=new World(),s=fresh('sword-cockro');s.level=240;
 const p=w.join('hero',s);w.enter(p,'depths');
 const boss=w.mobs.depths.find(e=>e.def.level===240&&e.def.boss);
 assert.equal(boss.def.damage,Math.round(monsterStats(240,{boss:true}).damage*1.5));
 for(const [rank,points] of [[{},8],[{elite:true},24],[{boss:true},80]]){
  assert.equal(killBountyTenths(120,{depths:true,level:120,...rank})/10,points);
  assert.equal(killBountyTenths(150,{depths:true,level:120,...rank})/10,points/10);
 }
 w.hit(p,boss,boss.hp+1,21);w.hit(p,boss,10,22);
 assert.equal(w.loot.find(d=>d.kind==='huntGold').count,80);assert.equal(s.kills,1);
 assert.deepEqual(w.loot.filter(d=>d.kind==='cockro').map(d=>d.count),[1]);
 assert(validSave(s).bosses.includes(boss.def.id));
});
test('a hunter without healing or movement can die in a pack and revive in town',()=>{
 const w=new World(),s=fresh('sword-cockro');s.level=120;
 const p=w.join('hero',s);w.enter(p,'depths');const enemy=w.mobs.depths[0];
 Object.assign(p,{x:enemy.x+15,y:enemy.y});const hp=maxHP(s);
 for(let i=0;i<240&&p.hp>0;i++)w.tick(.2,40+i*.2);
 assert.equal(p.hp,0);assert(hp>0);
 w.command(p,{type:'revive'},100);assert.equal(p.map,'town');assert.equal(p.hp,hp);
});
