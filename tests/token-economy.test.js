import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fresh,validSave} from '../web/core.js';
import {World} from '../server/world.js';
import {freshEconomy,normalizeEconomyState,rollDay,dailyBudget,releaseRate,baseKillCoins,thaiDay,PLAYER_DAILY_CAP,killReward,spend,grant,refund,presaleCredit,presaleRate,redenominate,mint,unmint,thb,SUPPLY,MIN_DAU} from '../web/token-economy.js';
import {SKILL_BOOKS} from '../web/skills.js';
import {gearShopPrice} from '../web/gear.js';
import {PROTECTION_PRICE,COSTS} from '../web/chain-economy.js';
import {PET_PRICE} from '../web/loot-pets.js';
const DAY=86400000,t0=Date.parse('2026-12-01T05:00:00Z');
test('allocation adds up to the 100B supply and prices are set in baht',()=>{
 const e=freshEconomy(t0);assert.equal(e.farm+e.presale+e.reserve+e.lp,SUPPLY);
 assert.equal(thb(1),100_000);assert.equal(SKILL_BOOKS[0].price,thb(2));assert.equal(SKILL_BOOKS.at(-1).price,thb(30));
 assert.equal(PROTECTION_PRICE,thb(1));assert.equal(PET_PRICE,20_000);assert.equal(gearShopPrice('weapon',0,'divine'),thb(100));assert(gearShopPrice('weapon',20,'divine')>=thb(600));assert.ok(COSTS.every(c=>c===0));
});
test('pioneer days release 1% of the farm, later 0.1%; budget is min(8 THB, pool / players)',()=>{
 const e=normalizeEconomyState(null,t0);assert.equal(e.poolStart,Math.floor(SUPPLY*.85*.01));assert.equal(releaseRate(e),.01);
 assert.equal(dailyBudget(e),PLAYER_DAILY_CAP);for(let i=0;i<250;i++)e.players['p'+i]=0;assert.equal(dailyBudget(e),Math.min(PLAYER_DAILY_CAP,Math.floor(e.poolStart/250)));
 rollDay(e,t0+DAY);assert.equal(e.dauYesterday,250);
 rollDay(e,t0+30*DAY);assert.equal(releaseRate(e),.001);const farm=e.farm;e.pool=0;rollDay(e,t0+31*DAY);assert.equal(e.poolStart,Math.floor(farm*.001)+0);
 const old=normalizeEconomyState({...freshEconomy(t0-5*DAY),launchDay:undefined,day:thaiDay(t0),poolStart:85_000_000,pool:85_000_000},t0);assert.equal(old.launchDay,thaiDay(t0));assert(old.poolStart>=Math.floor(old.farm*.01));
});
test('500 + 10 per monster level, x3 elite, x10 boss: about 20 THB in 5 hours',()=>{
 assert.equal(baseKillCoins({level:1}),510);assert.equal(baseKillCoins({level:60,playerLevel:60}),1100);assert.equal(baseKillCoins({level:240,playerLevel:240}),2900);
 assert.equal(baseKillCoins({level:60,playerLevel:60,boss:true}),11000);assert.equal(baseKillCoins({level:60,playerLevel:60,elite:true}),3300);
 assert.equal(baseKillCoins({level:10,playerLevel:40}),Math.floor(600*.1));
 let coins=0;for(let k=0;k<2000;k++){const lv=1+Math.floor(k/60);coins+=baseKillCoins({level:lv,playerLevel:lv,boss:k%40===39});}assert(coins>thb(16)&&coins<thb(26),String(coins));
});

test('kills always pay full with no per-player cap; only the shared pool limits drops; bosses weigh 10',()=>{
 const e=normalizeEconomyState(null,t0),budget=dailyBudget(e);
 const normal=killReward(e,'a',{playerLevel:10,level:10},t0),boss=killReward(e,'b',{playerLevel:10,level:10,boss:true},t0);
 assert(normal>0);assert.equal(boss,normal*10);
 e.players.a=budget*5;assert.equal(killReward(e,'a',{playerLevel:10,level:10},t0),normal);
 assert(killReward(e,'c',{playerLevel:40,level:10},t0)<normal);
 e.pool=0;assert.equal(killReward(e,'a',{playerLevel:10,level:10},t0),0);
})
test('every purchase burns half and returns half to tomorrow; expired drops come back',()=>{
 const e=normalizeEconomyState(null,t0);assert.deepEqual(spend(e,1001),{burned:500,recycled:501});assert.equal(e.burned,500);
 refund(e,99);const pool=e.recycledPending;rollDay(e,t0+DAY);assert(e.poolStart>=pool);assert.equal(e.recycledPending,0);
 assert.equal(grant(e,'x',thb(.1),t0+DAY),thb(.1));
});
test('presale packs step down from 100k to 60k COCKRO per baht and then draw on the reserve',()=>{
 const e=freshEconomy(t0);assert.equal(presaleCredit(e,30),3_000_000);
 e.presaleSold=SUPPLY*.04*.3;assert.equal(presaleRate(e),85_000);e.presaleSold=SUPPLY*.04*.8;assert.equal(presaleRate(e),60_000);
 e.presale=10;const r=e.reserve;assert.equal(presaleCredit(e,1),60_000);assert.equal(e.presale,0);assert.equal(e.reserve,r-59_990);
});
test('legacy balances redenominate once: coins x600, G x60, G removed; 7.3-7.7 balances /10',()=>{
 const old=fresh('sword-cockro');delete old.economyVersion;old.stones=5000;old.gold=1000;
 const v=validSave(JSON.parse(JSON.stringify(old)));assert.equal(v.stones,(5000*6000+1000*600)/10);assert.equal(v.gold,0);assert.equal(v.redenominatedMint,v.stones-5000);
 delete v.redenominatedMint;const again=validSave(JSON.parse(JSON.stringify(v)));assert.equal(again.stones,v.stones);assert.equal(again.redenominatedMint,undefined);
 const s={stones:1};assert.equal(redenominate(s,{economyVersion:4}),0);assert.equal(s.stones,1);
 const v3={stones:12345,economyVersion:3};assert.equal(redenominate(v3,v3),1234-12345);assert.equal(v3.stones,1234);assert.equal(v3.economyVersion,4);
 const e=freshEconomy(t0),farm=e.farm;mint(e,500);unmint(e,200);assert.equal(e.minted,300);assert.equal(e.farm,farm-500+200);
});
test('server world pays kills from the shared pool and books every purchase',()=>{
 const e=normalizeEconomyState(null,t0),w=new World({economy:e,rng:()=>.99}),s=fresh('sword-cockro');s.level=10;const p=w.join('hunter',s);
 w.enter(p,'forest');const m=w.mobs.forest.find(x=>!x.def.boss);Object.assign(m,{x:p.x+40,y:p.y,hp:1});const pool=e.pool;
 w.hit(p,m,5,t0/1000);const drop=w.loot.find(d=>d.kind==='cockro');assert(drop.count>0);assert.equal(e.pool,pool-drop.count);assert.equal(e.players.hunter,drop.count);
 w.enter(p,'town');s.stones=SKILL_BOOKS[0].price;w.command(p,{type:'op',op:'buySkillBook',id:'b1'},t0/1000+1);assert(p.opResult.ok);assert.equal(e.burned,SKILL_BOOKS[0].price/2);
 const snap=w.snapshot(p,t0/1000+2);assert.equal(snap.economy.earned,drop.count);assert.equal(snap.economy.burned,e.burned);
});
test('daily totals counted before the reprice are cleared once so drops resume',()=>{
 const old={...normalizeEconomyState(null,t0),players:{a:5_000_000}};delete old.priceVersion;
 const e=normalizeEconomyState(old,t0);assert.deepEqual(e.players,{});assert.equal(e.priceVersion,2);assert(killReward(e,'a',{playerLevel:10,level:10},t0)>0);
 e.players.a=123;const again=normalizeEconomyState(JSON.parse(JSON.stringify(e)),t0);assert.equal(again.players.a,123);
});
