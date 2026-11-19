import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,validSave,maxHP,combatStats,reward} from '../web/core.js';
import {makeItem,itemStats,buyShopGear} from '../web/gear.js';
import {rerollSpecial,restoreTarget,restoreSpecial,applyRegen,exchangeGold,SPECIALS} from '../web/enhancement.js';
import {issueTestTicket,completeTestTicket} from '../server/test-rewards.js';
import {issueRewardTicket,applyVerifiedReward} from '../server/rewarded-ads.js';
test('legacy premium grant marker and balances survive migration without a fresh grant',()=>{const s=fresh('sword-cockro');s.stones=50017;s.testGoldGrant='pioneer-50000-v1';const restored=validSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.stones,50017);assert.equal(restored.testGoldGrant,s.testGoldGrant);assert.equal(restored.gold,100000);});
test('retired special rerolls reject without spending currency',()=>{const s=fresh('sword-cockro');s.upgradeItems.meteor=3;const before=JSON.stringify(s);assert.equal(rerollSpecial(s,'weapon'),false);assert.equal(JSON.stringify(s),before);assert.equal(restoreTarget(s,'weapon'),null);assert.throws(()=>issueRewardTicket(s,'restore:weapon'));});

test('retired special rerolls reject without spending currency',()=>{const s=fresh('sword-cockro');s.upgradeItems.meteor=3;const before=JSON.stringify(s);assert.equal(rerollSpecial(s,'weapon'),false);assert.equal(JSON.stringify(s),before);assert.equal(restoreTarget(s,'weapon'),null);assert.throws(()=>issueRewardTicket(s,'restore:weapon'));});

test('retired special rerolls reject without spending currency',()=>{const s=fresh('sword-cockro');s.upgradeItems.meteor=3;const before=JSON.stringify(s);assert.equal(rerollSpecial(s,'weapon'),false);assert.equal(JSON.stringify(s),before);assert.equal(restoreTarget(s,'weapon'),null);assert.throws(()=>issueRewardTicket(s,'restore:weapon'));});

test('regen combines three slots, fires every 2s under repeated damage and never resurrects',()=>{const s=fresh('sword-cockro');for(const slot of ['weapon','ring','amulet']){s.equip[slot]=makeItem(slot,0,0);s.equip[slot].special='hp25';}const max=maxHP(s),p={s,hp:1,mp:0};applyRegen(p,1,max,100);assert.equal(p.hp,1);p.hp=2;applyRegen(p,1,max,100);assert.equal(p.hp,2+max*.04);p.hp=0;applyRegen(p,8,max,100);assert.equal(p.hp,0);p.hp=max;applyRegen(p,2,max,100);assert.equal(p.hp,max);});
test('gold exchange only reduces premium currency and rejects negative amounts',()=>{const s=fresh('sword-cockro');s.stones=3;assert(exchangeGold(s,2));assert.equal(s.stones,1);assert.equal(s.gold,120000);for(const n of [-1,0,.5,NaN,Infinity,1001,2])assert(!exchangeGold(s,n));});
test('shop equipment affects stats after equip and is level matched',()=>{const s=fresh('sword-cockro');s.stones=1000;assert(buyShopGear(s,'ring'));assert.equal(s.bag.at(-1).rarity,2);assert(itemStats(s.bag.at(-1)).crit>0);assert(!buyShopGear(s,'armor'));});
test('daily tasks reset at Thai midnight and cannot claim twice after reload',async()=>{const {countActivity,claimActivity}=await import('../web/daily-activities.js');let s=fresh('sword-cockro');const now=Date.parse('2026-10-30T16:59:00Z');for(let i=0;i<100;i++)countActivity(s,'hunt',now);assert(claimActivity(s,'hunt',now));s=validSave(JSON.parse(JSON.stringify(s)));assert(!claimActivity(s,'hunt',now));assert(!claimActivity(s,'hunt',now+120000));});


