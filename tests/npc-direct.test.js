import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8');
test('tapping an NPC opens its own window directly, buffs sit inside it',()=>{
 const npc=src.slice(src.indexOf('function npcMenu(kind)'),src.indexOf('let buffReturn'));
 assert.ok(npc.includes('n.open()'));assert.ok(!npc.includes('npc-choice'));
 assert.ok(src.includes('function shopHTML(){return withBuffChip('));
 assert.ok(src.includes('<h2>โรงตีอุปกรณ์</h2>${buffChip()}'));
 assert.ok(src.includes("closest?.('[data-open-buffs]')"));
 assert.ok(!src.includes('inventoryVault'));
});
test('every window uses the polished stylesheet last',()=>{
 const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
 assert.ok(html.lastIndexOf('ui-polish.css')>html.lastIndexOf('mobile-layout.css'));
});
