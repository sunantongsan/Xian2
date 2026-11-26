import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// Baht is only the designers' pricing unit; players never see coin-to-baht comparisons.
test('no window shows a baht comparison for COCKRO amounts',()=>{
 for(const f of ['game.js','shop-view.js','feedback-fx.js','gift-center.js','checkin.js'].filter(f=>fs.existsSync(new URL('../web/'+f,import.meta.url)))){
  const src=fs.readFileSync(new URL('../web/'+f,import.meta.url),'utf8');
  assert.ok(!src.includes('บาท'),f+' shows baht');assert.ok(!/toTHB\(/.test(src),f+' converts to baht');assert.ok(!src.includes('≈'),f+' shows an approximate price');
 }
});
test('field banner keeps the game size when a window or menu hides it',()=>{
 const src=fs.readFileSync(new URL('../web/field-banner.js',import.meta.url),'utf8');
 assert.ok(src.includes('if(hud.hidden)collapse();'));assert.ok(src.includes('if(!b.visible)return;'));
});
test('the field banner never pushes the game down with a band',()=>{
 const src=fs.readFileSync(new URL('../web/field-banner.js',import.meta.url),'utf8');
 assert.ok(!/reserve\(Math\.ceil/.test(src));
});
