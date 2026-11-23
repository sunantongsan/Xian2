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
 const quote={coins:50,rate:2,revision:1};
 assert(!exchangeBounty(s,101,quote));
 assert(exchangeBounty(s,1,quote));assert.equal(s.stones,50);assert.equal(s.gold,0);
 assert(!exchangeBounty(s,1,quote));assert(bountyRate(1000)>1);
 s.gold=GOLD_CAP;s.stones=50;assert(!buyGold(s,1,2));assert.equal(s.stones,50);
 for(const coins of [0,-1,0.5,NaN,Infinity])assert(!buyGold(s,coins,2));
});
test('ten starter kills buy two HP potions or a potion and two COCKRO with G left over',()=>{
 const s=fresh('sword-cockro');
 for(let i=0;i<10;i++)assert(collectLoot(s,monsterRewards(s,{id:1000,level:1},()=>.99)[0]));
 const other=structuredClone(s);
 assert(buyMerchantStack(s,'buy',null,2));assert.equal(s.gold,0);assert.equal(s.potions,12);
 assert(buyMerchantStack(other,'buy',null,1));
 assert(exchangeBounty(other,1,{coins:2,rate:2,revision:0}));assert.equal(other.gold,1);assert.equal(other.stones,2);
});
test('G can rent a weapon while divine gear still requires COCKRO',()=>{
 const s=fresh('sword-cockro');s.gold=100;
 assert(!buyShopGear(s,'weapon',0,'divine'));assert(buyShopGear(s,'weapon',0,'day'));
 assert.equal(s.gold,0);assert.equal(s.stones,0);assert(s.bag[0].expiresAt>Date.now());
 const page=merchantHTML(s,()=>'',x=>x);assert(page.includes('id="shopRedeemGold"'));assert(page.includes('data-price="5" data-currency="G"'));
});

test('standing in town generates neither spendable currency',async()=>{
 const {World}=await import('../server/world.js');
 const world=new World(),s=fresh('sword-cockro');
 world.join('idle',s);
 for(let i=0;i<650;i++)world.tick(.2,100+i*.2);
 assert.equal(s.gold,0);assert.equal(s.stones,0);
});
