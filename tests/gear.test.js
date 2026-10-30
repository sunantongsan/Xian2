import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave,maxHP,damage,combatStats} from '../web/core.js';
import {rollDrop,addToBag,equip,unequip,sell,makeItem,BAG_SIZE,TIERS,itemPower} from '../web/gear.js';
test('new heroes start with gear and spare items; gear raises real stats',()=>{
 const s=fresh('sword-cricket');assert(s.equip.weapon&&s.equip.armor);assert.equal(s.bag.length,3);
 const hp=maxHP(s),dmg=damage(s),def=combatStats(s).defense;
 const helm=s.bag.find(i=>i.slot==='helm');assert.equal(equip(s,helm.id),null);assert(maxHP(s)>hp);assert(combatStats(s).defense>def);
 s.level=50;const w=makeItem('weapon',5,3);s.bag.push(w);assert.equal(equip(s,w.id),null);assert(damage(s)>dmg+50);
});
test('level requirement, unequip, sell, full bag auto-sells',()=>{
 const s=fresh('demon-scorpion');const hi=makeItem('ring',4,2);s.bag.push(hi);assert.match(equip(s,hi.id),/เลเวล/);
 const g=s.gold;assert(sell(s,hi.id)>0);assert(s.gold>g);assert.equal(unequip(s,'weapon'),null);assert(!s.equip.weapon);
 while(s.bag.length<BAG_SIZE)s.bag.push(makeItem('boots',0,0));const g2=s.gold;assert.equal(addToBag(s,makeItem('helm',1,1)),false);assert(s.gold>g2);
});
test('drops scale with monster level and rank; save round trip keeps equipment',()=>{
 assert(rollDrop({level:33,boss:false},()=>.009));assert.equal(rollDrop({level:33,boss:false},()=>.01),null);
 const b=rollDrop({level:60,boss:true});assert(b&&b.rarity>=2&&b.tier===TIERS.length-1);
 assert(itemPower(makeItem('weapon',5,3))>itemPower(makeItem('weapon',0,0)));
 const s=fresh('sword-dragonfly');s.equip.wings=makeItem('wings',0,1);const r=validSave(JSON.parse(JSON.stringify(s)));assert.equal(r.equip.wings.rarity,1);assert.equal(r.bag.length,s.bag.length);
 const old=JSON.parse(JSON.stringify(s));delete old.equip;delete old.bag;assert(validSave(old).equip.weapon,'old saves get starter gear');
});

