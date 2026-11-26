import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COSTS,SUCCESS,enhance} from '../web/chain-economy.js';
import {fresh} from '../web/core.js';
test('enhancing is free; the forge shows success rates, and results play a tune with a message',()=>{
 assert.ok(COSTS.every(c=>c===0));assert.equal(SUCCESS.length,12);
 const s=fresh('sword-cockro');s.stones=0;assert.ok(enhance(s,s.equip.weapon,false,()=>0));assert.equal(s.equip.weapon.plus,1);assert.equal(s.stones,0);
 const src=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8');
 assert.ok(src.includes('function forgeCostTable(plus)'));assert.ok(!src.includes('จ่ายค่าตี'));
 assert.ok(src.includes("gameAudio.jingle('win')"));assert.ok(src.includes("gameAudio.jingle('lose')"));
 assert.ok(src.includes('if(price>s.stones){await notEnoughCoins('));
 const result=fs.readFileSync(new URL('../web/forge-result.js',import.meta.url),'utf8');assert.ok(result.includes('ยินดีด้วย'));assert.ok(result.includes('เสียใจด้วย'));
});
