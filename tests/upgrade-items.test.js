import {MERCHANT_UV} from '../web/merchant.js';import {MAPS as SHOP_MAPS,toWorld as shopWorld} from '../web/maps.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,validSave,damage,maxHP,combatStats} from '../web/core.js';
import {UPGRADE_ITEMS,GEM_IDS,buyUpgradeItem,socketGem,normalizeUpgradeItems} from '../web/upgrade-items.js';
import {upgradeGear,gearUpgradeCost,equip,unequip,makeItem} from '../web/gear.js';
import {World} from '../server/world.js';
test('retired material purchases do not spend either currency',()=>{const s=fresh('sword-cockro'),before=JSON.stringify(s);for(const id of ['alloy','protect','ruby','meteor','crystal','glowstone','diamond'])assert.equal(buyUpgradeItem(s,id),false);assert.deepEqual(UPGRADE_ITEMS,{});assert.equal(JSON.stringify(s),before);});

test('COCKRO-only upgrades preserve materials and gold and stop at +12',()=>{const s=fresh('sword-cockro');s.level=210;s.stones=1e9;s.upgradeItems.alloy=9;const gold=s.gold;for(let i=1;i<=12;i++){assert(upgradeGear(s,'weapon',()=>0));assert.equal(s.equip.weapon.plus,i);}assert.equal(s.gold,gold);assert.equal(s.upgradeItems.alloy,9);const before=JSON.stringify(s);assert(!upgradeGear(s,'weapon'));assert.equal(JSON.stringify(s),before);assert.equal(validSave(s).equip.weapon.plus,12);});
test('retired gem sockets cannot alter gear or combat stats',()=>{const s=fresh('sword-cockro');s.upgradeItems.crystal=10;const before=JSON.stringify(s);assert.equal(socketGem(s,'weapon','crystal'),false);assert.equal(JSON.stringify(s),before);assert.deepEqual(GEM_IDS,[]);});

test('migration removes old materials and sockets but preserves paid enhancement',()=>{const s=fresh('sword-cockro');s.upgradeItems={alloy:94,crystal:45};s.equip.weapon.gems={crystal:1};s.equip.weapon.plus=9;s.stones=123187;const v=validSave(s);assert.deepEqual(v.upgradeItems,{});assert.deepEqual(v.equip.weapon.gems,{});assert.equal(v.equip.weapon.plus,9);assert.equal(v.stones,123187);assert.deepEqual(validSave(v),v);});

test('server rejects old materials and gems even from legacy clients',()=>{const w=new World(),p=w.join('items',fresh('sword-cockro'));const before=JSON.stringify(p.s);for(const op of ['buyUpgradeItem','socketGem','rerollSpecial']){w.command(p,{type:'op',op,id:'crystal',slot:'weapon'});assert.equal(p.opResult.ok,false);}assert.equal(JSON.stringify(p.s),before);});

test('five skill slots keep their order; fifth skill casts online',()=>{let s=fresh('sword-cockro');s.level=60;s.skillBooks=['b1','b2','b3','b4','b5'];s.equipped=['b1','b2','b3',null,'b5'];s=validSave(s);assert.deepEqual(s.equipped,['b1','b2','b3',null,'b5']);assert.deepEqual(validSave(s).equipped,s.equipped);const w=new World(),p=w.join('five',s);w.enter(p,'forest');const mp=p.mp;w.command(p,{type:'skill',slot:4},100);assert(p.mp<mp);assert(p.cd.b5>100);const after=p.mp;w.command(p,{type:'skill',slot:5},110);assert.equal(p.mp,after);});


import {upgradeChance,upgradeMaterial} from '../web/gear.js';
test('protected failure costs 0.05 baht, consumes ticket and has no cumulative pity',()=>{let s=fresh('sword-cockro');s.level=210;s.stones=1e9;s.protectionTickets=2;s.equip.weapon.plus=3;assert(upgradeGear(s,'weapon',()=>.99,true));assert.equal(s.stones,1e9-50000);assert.equal(s.protectionTickets,1);assert.equal(s.equip.weapon.plus,3);s=validSave(s);assert.equal(upgradeChance(s.equip.weapon),.8);assert(upgradeGear(s,'weapon',()=>0,true));assert.equal(s.equip.weapon.plus,4);assert.equal(s.protectionTickets,0);});
test('accessories and armor use the same COCKRO schedule without materials',()=>{const s=fresh('sword-cockro');s.level=210;s.stones=1e9;for(const slot of ['ring','amulet']){s.equip[slot]=makeItem(slot,0,1);assert(upgradeGear(s,slot,()=>0));assert.equal(s.equip[slot].plus,1);}assert.equal(s.stones,1e9-200000);assert.equal(upgradeChance({plus:8,upgradeFails:18}),.35);});

import {buyMerchantStack} from '../web/merchant.js';
import {merchantHTML} from '../web/shop-view.js';
test('legacy protection materials cannot replace rewarded tickets or fund COCKRO costs',()=>{const s=fresh('sword-cockro');s.level=210;s.stones=0;s.upgradeItems.protect=50;s.equip.weapon.plus=3;const before=JSON.stringify(s);assert(!upgradeGear(s,'weapon',()=>0,true));assert.equal(JSON.stringify(s),before);s.stones=1000;assert(!upgradeGear(s,'weapon',()=>0,true));assert.equal(s.stones,1000);});

