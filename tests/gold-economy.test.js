import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {GOLD_CAP,buyGold,bountyBalance,bountyRate,exchangeBounty} from '../web/hunt-bounty.js';
import {monsterRewards,collectLoot} from '../web/ground-loot.js';
import {buyMerchantStack} from '../web/merchant.js';
import {buyShopGear} from '../web/gear.js';
import {merchantHTML} from '../web/shop-view.js';

test('existing spending gold and unspent bounty migrate once, including tenths',()=>{
 const old={...fresh('sword-cockro'),gold:123,bountyHeads:12,bountyRemainder:3};
 const migrated=validSave(old);
 assert.equal(bountyBalance(migrated),135.3);
 assert.equal(migrated.bountyHeads,undefined);
 assert.deepEqual(validSave(migrated),migrated);
});
test('changing online counts and replaying either exchange cannot mint coins',()=>{
 const s=fresh('sword-cockro');s.stones=100;
 assert(buyGold(s,100,0));assert.equal(s.gold,100);assert.equal(s.stones,0);
 assert(!buyGold(s,100,0));
 const quote={coins:10,rate:10,revision:1};
 assert(!exchangeBounty(s,101,{...quote,rate:2}));
 assert(exchangeBounty(s,1,quote));assert.equal(s.stones,10);assert.equal(s.gold,0);
 assert(!exchangeBounty(s,1,quote));assert.equal(bountyRate(),10);
 s.gold=GOLD_CAP;s.stones=50;assert(!buyGold(s,1,2));assert.equal(s.stones,50);
 for(const coins of [0,-1,0.5,NaN,Infinity])assert(!buyGold(s,coins,2));
});
test('ten starter kills cover supplies and leave G available for exchange',()=>{
 const s=fresh('sword-cockro');
 for(let i=0;i<10;i++)assert(collectLoot(s,monsterRewards(s,{id:1000,level:1},()=>.99)[0]));
 const other=structuredClone(s);
 assert(buyMerchantStack(s,'buy',null,2));assert.equal(s.gold,26);assert.equal(s.potions,12);
 assert(buyMerchantStack(other,'buy',null,1));
 assert(exchangeBounty(other,1,{coins:2,rate:10,revision:0}));assert.equal(other.gold,18);assert.equal(other.stones,2);
});
test('G can rent a weapon while divine gear still requires COCKRO',()=>{
 const s=fresh('sword-cockro');s.gold=100;
 assert(!buyShopGear(s,'weapon',0,'divine'));assert(buyShopGear(s,'weapon',0,'day'));
 assert.equal(s.gold,0);assert.equal(s.stones,0);assert(s.bag[0].expiresAt>Date.now());
 const page=merchantHTML(s,()=>'',x=>x);assert(page.includes('id="shopRedeemGold"'));assert(page.includes('data-price="12" data-currency="G"'));
});

test('standing in town generates neither spendable currency',async()=>{
 const {World}=await import('../server/world.js');
 const world=new World(),s=fresh('sword-cockro');
 world.join('idle',s);
 for(let i=0;i<650;i++)world.tick(.2,100+i*.2);
 assert.equal(s.gold,0);assert.equal(s.stones,0);
});

test('new bottles retain strength in saves, the vault, and combat while old bottles keep 50%',async()=>{
 const {drinkPotion,potionStacks}=await import('../web/merchant.js');
 const {take,give}=await import('../server/commerce.js');
 const s=fresh('sword-cockro');s.gold=145;
 assert(buyMerchantStack(s,'buy','hpMedium',1));
 assert(buyMerchantStack(s,'buy','hpSmall',2));
 assert.equal(s.gold,1);assert.equal(s.potions,13);
 assert(!buyMerchantStack(s,'buy','mpMedium',1));
 assert.throws(()=>take(s,'potion','hp',11),/item_missing/);
 const cargo=take(s,'potion','hpMedium',1);
 const restored=validSave(s);give(restored,cargo);
 assert.deepEqual(potionStacks(restored,'hp').map(x=>[x.id,x.count]),[['hpSmall',2],['hpMedium',1],['hp',10]]);
 assert.equal(drinkPotion(restored,'hp',970,1000),1000);
 assert.equal(restored.potionStock.hpSmall,1);
 assert.equal(drinkPotion(restored,'hp',100,1000),900);
 assert.equal(restored.potionStock.hpMedium,undefined);
 assert.equal(drinkPotion(restored,'hp',0,2000),1000);
 assert.equal(restored.potions,10);
 const full=restored.potions;assert.equal(drinkPotion(restored,'hp',2000,2000),2000);assert.equal(restored.potions,full);
 const panel=merchantHTML(restored,()=>'',x=>x);
 for(const [id,restore,price] of [['hpLarge',8000,1200],['mpLarge',1200,300]]){
  assert(panel.includes('+'+restore.toLocaleString('en-US')));
  assert(panel.includes('data-id="'+id+'" data-price="'+price+'" data-currency="G"'));
 }
});

test('hidden gifts are earned by hunting and grant one level-appropriate prize on collection',async()=>{
 const {World}=await import('../server/world.js');
 const {fieldGift}=await import('../web/ground-loot.js');
 const {walkable,traceStep}=await import('../web/maps.js');
 const w=new World(),s=fresh('sword-cockro'),p=w.join('hunter',s);
 s.level=240;w.enter(p,'depths');
 const enemy=w.mobs.depths.find(e=>e.def.level===240),map=w.maps.depths;
 const trace=(a,b)=>traceStep(map,a,b);
 assert.equal(fieldGift(11,s.level,enemy.def,p,trace,1),null);
 assert.equal(fieldGift(12,s.level,enemy.def,p,a=>a,1),null);
 const prize=fieldGift(12,s.level,enemy.def,p,trace,1,()=>.75);
 assert.equal(prize.itemId,'mpLarge');assert(collectLoot(s,prize));assert.equal(s.potionStock.mpLarge,1);
 const coins=fieldGift(12,s.level,enemy.def,p,trace,1,()=>.25);
 assert.equal(coins.itemId,undefined);assert(coins.count>=2937&&coins.count<5876);
 s.kills=11;w.hit(p,enemy,enemy.hp,100);
 const gift=w.loot.find(d=>d.kind==='fieldGift');assert(gift);assert(walkable(map,gift));
 assert(Math.hypot(gift.x-p.x,gift.y-p.y)>=120);
 assert(w.snapshot(p,101).loot.some(d=>d.id===gift.id));
 s.kills=23;enemy.hp=1;w.hit(p,enemy,1,102);
 assert.equal(w.loot.filter(d=>d.kind==='fieldGift').length,1);
 Object.assign(p,{x:gift.x,y:gift.y});w.collectGround(103);
 const after=structuredClone(s);w.collectGround(104);assert.deepEqual(s,after);
 assert(!w.loot.includes(gift));
 s.kills=35;enemy.hp=1;w.hit(p,enemy,1,106);
 assert(w.loot.some(d=>d.kind==='fieldGift'));w.collectGround(286);
 assert(!w.loot.some(d=>d.kind==='fieldGift'));
});
