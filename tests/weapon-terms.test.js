import {COSTS} from '../web/chain-economy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {buyShopGear,gearShopPrice,upgradeGear,equip,gearTotals,expireRentals,sellPrice,itemStats,makeItem,DIVINE_RARITY} from '../web/gear.js';
import {take} from '../server/commerce.js';
import {World} from '../server/world.js';

test('the shop sells divine gear only; old rentals keep their terms on reload',()=>{
 const s=fresh('sword-cockro');s.stones=1e9;s.gold=100;
 for(const term of ['permanent','day','unknown',undefined])for(const slot of ['weapon','ring','amulet'])assert(!buyShopGear(s,slot,0,term));
 assert.equal(s.stones,1e9);assert.equal(s.bag.length,0);
 assert(buyShopGear(s,'weapon',0,'divine'));assert.equal(s.stones,1e9-gearShopPrice('weapon',0,'divine'));assert.equal(s.bag[0].rarity,DIVINE_RARITY);
 const start=Date.now();s.bag.push({...makeItem('weapon',0,2),expiresAt:start+86400000});
 const [permanent,rental]=validSave(s).bag;
 assert.equal(permanent.expiresAt,undefined);
 assert.equal(rental.expiresAt,start+86400000);
 assert.equal(sellPrice(rental),0);
 assert.throws(()=>take(s,'gear',rental.id,1),/item_not_transferable/);
});

test('expiry removes an upgraded rental from the equipped slot or bag during play and on load',()=>{
 const s=fresh('sword-cockro');s.stones=300000;s.gold=200;
 for(let i=0;i<2;i++)s.bag.push({...makeItem('weapon',0,2),expiresAt:Date.now()+86400000});
 const [held,spare]=s.bag;
 assert.equal(equip(s,held.id),null);
 assert(upgradeGear(s,'weapon',()=>.99));
 assert.equal(validSave(s).equip.weapon.forgeBonus,5);
 assert(gearTotals(s).atk>0);
 held.expiresAt=spare.expiresAt=Date.now()-1;
 assert.equal(gearTotals(s).atk,0);
 const loaded=validSave(s);
 assert.equal(loaded.equip.weapon,null);
 assert(!loaded.bag.some(it=>it.id===spare.id));
 const world=new World(),actor=world.join('rental',s);
 world.tick(1.1);
 assert.equal(actor.s.equip.weapon,null);assert(!s.bag.some(it=>it.id===spare.id));
 assert.equal(expireRentals(s),false);
});

test('successful rolls vary, survive restart and preserve existing enhancement power',()=>{
 for(const [roll,bonus] of [[0,1],[.99,5]]){
  const s=fresh('sword-cockro');s.stones=2e8;
  assert(upgradeGear(s,'weapon',()=>roll));
  const saved=validSave(s).equip.weapon;
  assert.equal(saved.forgeBonus,bonus);
  assert.equal(itemStats(saved).atk,Number((9*(1.08+bonus/100)).toFixed(1)));
 }
 const s=fresh('sword-cockro');s.equip.weapon.plus=5;
 assert.equal(itemStats(validSave(s).equip.weapon).atk,12.6);
});

test('an unprotected failure destroys only the confirmed weapon, protection preserves its exact stats',()=>{
 const s=fresh('sword-cockro');s.stones=2e8;s.equip.weapon.plus=1;
 const w=new World(),p=w.join('forge-actor',s);const weapon=s.equip.weapon;
 w.command(p,{type:'op',op:'upgradeGear',slot:'weapon',expectedPlus:1,itemId:'stale'},1);
 assert.equal(p.opResult.ok,false);assert.equal(s.stones,2e8);
 s.protectionTickets=1;
 assert(upgradeGear(s,'weapon',()=>.99,true));
 assert.equal(s.equip.weapon,weapon);assert.equal(s.equip.weapon.plus,1);
 assert.equal(s.protectionTickets,0);assert.equal(s.stones,2e8-COSTS[1]);
 assert(upgradeGear(s,'weapon',()=>.99,false));
 assert.equal(s.equip.weapon,null);assert.equal(s.stones,2e8-2*COSTS[1]);
});
