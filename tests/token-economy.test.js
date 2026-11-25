import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fresh,validSave} from '../web/core.js';
import {World} from '../server/world.js';
import {freshEconomy,normalizeEconomyState,rollDay,dailyBudget,killReward,spend,grant,refund,presaleCredit,presaleRate,redenominate,thb,SUPPLY,MIN_DAU} from '../web/token-economy.js';
import {SKILL_BOOKS} from '../web/skills.js';
import {gearShopPrice} from '../web/gear.js';
import {PROTECTION_PRICE,COSTS} from '../web/chain-economy.js';
import {PET_PRICE} from '../web/loot-pets.js';
const DAY=86400000,t0=Date.parse('2026-12-01T05:00:00Z');
test('allocation adds up to the 100B supply and prices are set in baht',()=>{
 const e=freshEconomy(t0);assert.equal(e.farm+e.presale+e.reserve+e.lp,SUPPLY);
 assert.equal(thb(1),1_000_000);assert.equal(SKILL_BOOKS[0].price,thb(2));assert.equal(SKILL_BOOKS.at(-1).price,thb(30));
 assert.equal(PROTECTION_PRICE,thb(1));assert.equal(PET_PRICE,thb(20));assert.equal(gearShopPrice('weapon',0,'divine'),thb(100));assert(gearShopPrice('weapon',20,'divine')>=thb(600));assert.equal(COSTS[0],thb(.1));
});
test('each Thai day releases 0.1% of the farm and splits it over at least 100 players',()=>{
 const e=normalizeEconomyState(null,t0);assert.equal(e.poolStart,Math.floor(SUPPLY*.85*.001));assert.equal(dailyBudget(e),Math.floor(e.poolStart/MIN_DAU));
 for(let i=0;i<250;i++)e.players['p'+i]=0;assert.equal(dailyBudget(e),Math.floor(e.poolStart/250));
 const farm=e.farm;rollDay(e,t0+DAY);assert(e.farm<farm+e.poolStart);assert.equal(e.dauYesterday,250);assert.equal(dailyBudget(e),Math.floor(e.poolStart/250));
});
test('kills pay full until the daily budget, 10% to 150%, then nothing; bosses weigh 20',()=>{
 const e=normalizeEconomyState(null,t0),budget=dailyBudget(e);
 const normal=killReward(e,'a',{playerLevel:10,level:10},t0),boss=killReward(e,'b',{playerLevel:10,level:10,boss:true},t0);
 assert(normal>0);assert(Math.abs(boss-normal*20)<=20);
 let paid=normal;while(paid<budget)paid+=killReward(e,'a',{playerLevel:10,level:10},t0);
 const slow=killReward(e,'a',{playerLevel:10,level:10},t0);assert(slow>0&&slow<=Math.ceil(normal*.1));
 while(e.players.a<budget*1.5){const n=killReward(e,'a',{playerLevel:10,level:10},t0);if(!n)break;}
 assert.equal(killReward(e,'a',{playerLevel:10,level:10},t0),0);
 assert(killReward(e,'c',{playerLevel:40,level:10},t0)<normal);
});
test('every purchase burns half and returns half to tomorrow; expired drops come back',()=>{
 const e=normalizeEconomyState(null,t0);assert.deepEqual(spend(e,1001),{burned:500,recycled:501});assert.equal(e.burned,500);
 refund(e,99);const pool=e.recycledPending;rollDay(e,t0+DAY);assert(e.poolStart>=pool);assert.equal(e.recycledPending,0);
 assert.equal(grant(e,'x',thb(.1),t0+DAY),thb(.1));
});
test('presale packs step down from 1M to 600k COCKRO per baht and then draw on the reserve',()=>{
 const e=freshEconomy(t0);assert.equal(presaleCredit(e,30),30_000_000);
 e.presaleSold=SUPPLY*.04*.3;assert.equal(presaleRate(e),850_000);e.presaleSold=SUPPLY*.04*.8;assert.equal(presaleRate(e),600_000);
 e.presale=10;const r=e.reserve;assert.equal(presaleCredit(e,1),600_000);assert.equal(e.presale,0);assert.equal(e.reserve,r-599_990);
});
test('legacy balances redenominate once: coins x6000, G x600, G removed',()=>{
 const old=fresh('sword-cockro');delete old.economyVersion;old.stones=5000;old.gold=1000;
 const v=validSave(JSON.parse(JSON.stringify(old)));assert.equal(v.stones,5000*6000+1000*600);assert.equal(v.gold,0);assert.equal(v.redenominatedMint,v.stones-5000);
 delete v.redenominatedMint;const again=validSave(JSON.parse(JSON.stringify(v)));assert.equal(again.stones,v.stones);assert.equal(again.redenominatedMint,undefined);
 const s={stones:1};assert.equal(redenominate(s,{economyVersion:3}),0);assert.equal(s.stones,1);
});
test('server world pays kills from the shared pool and books every purchase',()=>{
 const e=normalizeEconomyState(null,t0),w=new World({economy:e,rng:()=>.99}),s=fresh('sword-cockro');s.level=10;const p=w.join('hunter',s);
 w.enter(p,'forest');const m=w.mobs.forest.find(x=>!x.def.boss);Object.assign(m,{x:p.x+40,y:p.y,hp:1});const pool=e.pool;
 w.hit(p,m,5,t0/1000);const drop=w.loot.find(d=>d.kind==='cockro');assert(drop.count>0);assert.equal(e.pool,pool-drop.count);assert.equal(e.players.hunter,drop.count);
 w.enter(p,'town');s.stones=SKILL_BOOKS[0].price;w.command(p,{type:'op',op:'buySkillBook',id:'b1'},t0/1000+1);assert(p.opResult.ok);assert.equal(e.burned,SKILL_BOOKS[0].price/2);
 const snap=w.snapshot(p,t0/1000+2);assert.equal(snap.economy.earned,drop.count);assert.equal(snap.economy.burned,e.burned);
});
