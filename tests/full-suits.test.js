import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fresh,validSave} from '../web/core.js';
import {makeItem,rollDrop,rollInsectArmor,equip,unequip} from '../web/gear.js';
import {INSECT_ARMOR,isRetiredArmor} from '../web/insect-armor.js';
import {migrateArmorSaves} from '../server/armor-migration.js';
import {backupBefore416} from '../server/release-backup.js';
import {createCommerce,give,take} from '../server/commerce.js';
import {heroAppearance} from '../web/hero-appearance.js';
const old=()=>({...makeItem('armor',0,0),insect:'beetle'});
test('all old suits are retired and cannot drop or equip',()=>{for(const insect of Object.keys(INSECT_ARMOR)){const s=fresh('sword-cockro'),it={...makeItem('armor',0,0),insect};s.bag.push(it);assert(isRetiredArmor(it));assert.notEqual(equip(s,it.id),null);assert.equal(validSave(s).bag.length,0);}assert.equal(rollInsectArmor({level:210,boss:true},()=>0),null);for(let i=0;i<100;i++)assert(['weapon','ring','amulet'].includes(rollDrop({level:1,boss:true},()=>i/100).slot));});

test('retired armor is removed from saves and commerce with originals backed up and balances retained',t=>{
 const dir=mkdtempSync(join(tmpdir(),'full-suits-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const id='a'.repeat(64),s=fresh('sword-cockro'),suit=makeItem('armor',0,2),ring=makeItem('ring',1,1);s.gold=12345;s.stones=678;s.equip.armor=old();s.equip.boots=makeItem('boots',1,2);s.bag=[old(),makeItem('helm',0,0),suit,ring];
 writeFileSync(join(dir,id+'.json'),JSON.stringify(s));
 const cargo=item=>({kind:'gear',item,key:item.id});const ledger={revision:12,vaults:{[id]:{pinHash:'preserve-hash',gold:4321,stones:123,items:[cargo(old()),cargo(suit),cargo(ring)]}},shops:{[id]:{listings:[{cargo:cargo(old())},{cargo:cargo(suit)}],sales:[{price:25}]}}};writeFileSync(join(dir,'commerce.json'),JSON.stringify(ledger));
 backupBefore416(dir,'test-full-suits');assert.deepEqual(migrateArmorSaves(dir),{characters:1,items:5});assert.deepEqual(migrateArmorSaves(dir),{characters:0,items:0});
 const saved=JSON.parse(readFileSync(join(dir,id+'.json')));assert.equal(saved.gold,12345);assert.equal(saved.stones,678);assert.equal(saved.equip.armor,null);assert.deepEqual(saved.bag,[ring]);assert.equal(JSON.parse(readFileSync(join(dir,'release-backups/before-test-full-suits',id+'.json'))).equip.armor.insect,'beetle');
 createCommerce(dir,{players:()=>new Map()});const after=JSON.parse(readFileSync(join(dir,'commerce.json')));assert.equal(after.vaults[id].gold,4321);assert.equal(after.vaults[id].stones,12);assert.equal(after.vaults[id].pinHash,'preserve-hash');assert.equal(after.vaults[id].items.length,1);assert.equal(after.shops[id].listings.length,0);assert.deepEqual(after.shops[id].sales,[{price:25}]);
 assert(!validSave(s).bag.some(isRetiredArmor));assert.throws(()=>give(saved,cargo(old())),/item_retired/);s.bag=[old()];assert.throws(()=>take(s,'gear',s.bag[0].id,1),/item_missing/);
});
