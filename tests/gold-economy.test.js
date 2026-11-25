import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {GOLD_CAP,buyGold,bountyBalance,bountyRate,exchangeBounty} from '../web/hunt-bounty.js';
import {monsterRewards,collectLoot} from '../web/ground-loot.js';
import {buyMerchantStack} from '../web/merchant.js';
import {buyShopGear} from '../web/gear.js';
import {merchantHTML} from '../web/shop-view.js';

test('both directions use 10 G per COCKRO, retain fractions and reject replayed exchanges',()=>{
 const s=fresh('sword-cockro');s.stones=100;s.bountyRemainder=7;
 assert(buyGold(s,100,0));assert.equal(s.gold,1000);assert.equal(s.stones,0);
 assert(!buyGold(s,100,0));
 const quote={coins:100,rate:10,revision:1};
 assert(!exchangeBounty(s,101,{...quote,rate:2}));
 assert(exchangeBounty(s,1,quote));assert.equal(s.stones,100);assert.equal(s.gold,0);
 assert.equal(bountyBalance(s),0.7);
 assert(!exchangeBounty(s,1,quote));assert.equal(bountyRate(),10);
 s.gold=GOLD_CAP;s.stones=50;assert(!buyGold(s,1,2));assert.equal(s.stones,50);
 for(const coins of [0,-1,0.5,NaN,Infinity])assert(!buyGold(s,coins,2));
});
test('standing in town generates neither spendable currency',async()=>{
 const {World}=await import('../server/world.js');
 const world=new World(),s=fresh('sword-cockro');
 world.join('idle',s);
 for(let i=0;i<650;i++)world.tick(.2,100+i*.2);
 assert.equal(s.gold,0);assert.equal(s.stones,0);
});

