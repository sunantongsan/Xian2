import test from 'node:test';
import assert from 'node:assert/strict';
import {HERO_CLASSES,heroIdentity,uiArt} from '../web/hero-ui.js';
import {fresh,validSave} from '../web/core.js';
test('six human professions selectable with stable legacy IDs',()=>{assert.deepEqual(HERO_CLASSES.map(h=>h.name),['นักดาบ','นักเวท','นักธนู','นักบวช','โจร','พ่อค้า']);assert.deepEqual(HERO_CLASSES.filter(h=>h.playable).map(h=>h.id),['sword-cockro','sword-mage','sword-dragonfly','sword-acolyte','demon-scorpion','sword-cricket']);});
test('legacy progression survives and has a readable identity',()=>{for(const id of ['sword-male','demon-female','sword-cockro','demon-scorpion','sword-dragonfly','sword-cricket']){const save=fresh(id);save.gold=12345;const restored=validSave(save);assert.equal(restored.gold,12345);assert.equal(restored.hero,id);assert.ok(heroIdentity(id).name);}});
test('atlas indices are bounded and decorative art is hidden from screen readers',()=>{for(let i=0;i<16;i++)assert.match(uiArt(i),/aria-hidden="true"/);assert.throws(()=>uiArt(16),RangeError);});


