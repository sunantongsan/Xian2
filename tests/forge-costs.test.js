import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COSTS,SUCCESS} from '../web/chain-economy.js';
test('enhancement fee per step is 3% of its value and shown in the forge',()=>{
 assert.deepEqual(COSTS,[6000,9000,15000,24000,36000,54000,81000,120000,180000,270000,405000,600000]);assert.equal(SUCCESS.length,12);
 const src=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8');
 assert.ok(src.includes('function forgeCostTable(plus)'));assert.ok(src.includes("t('ค่าตีครั้งนี้')"));assert.ok(src.includes("t('ตีบวก')+' • '+gearUpgradeCost(it)"));
});
