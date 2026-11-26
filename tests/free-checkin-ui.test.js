import {t,ui} from '../web/i18n.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {checkinPanelHTML,giftShell} from '../web/gift-center.js';
const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8');
function screen(online=true){const nodes={checkinMessage:{},claimDailyGift:{}};const sent=[];let fn;const context={t,ui,adPending:false,syncCheckinChoices(){},dailyGiftPending:false,dailyGiftTimer:null,onlineMode:online,onlineView:'gifts',net:{ready:online,send:d=>{sent.push(d);return true;}},$:id=>nodes[id],clearTimeout(){},setTimeout:f=>{fn=f;return 1;},checkinMenu(){}};vm.createContext(context);const a=source.indexOf('function claimDailyGift()');vm.runInContext(source.slice(a,source.indexOf('\nfunction checkinHTML',a)),context);return {context,nodes,sent,timeout:()=>fn()};}
test('free checkin sends a single server operation without any ads dependency',()=>{const s=screen();s.context.claimDailyGift();s.context.claimDailyGift();assert.equal(s.sent.length,1);assert.equal(s.sent[0].op,'dailyCheckin');assert.equal(s.sent[0].type,'op');assert.equal(s.nodes.claimDailyGift.disabled,true);s.timeout();assert.equal(s.context.dailyGiftPending,false);});
test('disconnected checkin explains connection requirement without awarding local coins',()=>{const s=screen(false);s.context.claimDailyGift();assert.equal(s.sent.length,0);assert.match(s.nodes.checkinMessage.textContent,/ออนไลน์/);});
test('gift center offers one free claim and an optional verified triple claim',()=>{
 const render=save=>giftShell('daily',checkinPanelHTML(save,Date.UTC(2026,10,26)));
 const html=render({stones:20});
 assert.match(html,/giftDailyTab/);assert.match(html,/giftCoinsTab/);
 assert.match(html,/id="claimDailyGift"[^>]*>/);assert.match(html,/data-reward-item="dailyCheckinTriple"/);
 assert.match(html,/6,000 COCKRO/);assert.match(html,/43,000 COCKRO/);
 const claimed=render({stones:20,checkin:{streak:1,lastDay:Math.floor(Date.UTC(2026,10,26)/86400000)}});
 assert.match(claimed,/id="claimDailyGift"[^>]*disabled/);assert.match(claimed,/id="claimTripleGift"[^>]*disabled/);
});
