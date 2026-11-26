import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave} from '../web/core.js';
import {EXP_TICKETS,buyExpTicket,useExpTicket,expMultiplier,expBoostUntil} from '../web/exp-tickets.js';
import {World} from '../server/world.js';
test('EXP tickets are retired: no purchase, no use, and the shop has no ticket tab',async()=>{
 const s=fresh('sword-cockro');s.stones=1e9;for(const id of Object.keys(EXP_TICKETS)){assert.equal(buyExpTicket(s,id),false);assert.equal(useExpTicket(s,id),false);}assert.equal(s.stones,1e9);
 const {merchantHTML}=await import('../web/shop-view.js');assert.ok(!merchantHTML(s,()=>'',x=>x).includes('data-shop-panel="tickets"'));
 const w=new World(),p=w.join('ticket-player',fresh('sword-cockro'));p.s.stones=1e9;w.command(p,{type:'op',op:'buyExpTicket',id:'x2'},1);assert.notEqual(p.opResult?.ok,true);assert.equal(p.s.stones,1e9);
});
test('unused tickets are refunded once at their price, an active ticket boost ends, the ad EXP x5 stays',()=>{
 const now=Date.now(),old=fresh('sword-cockro');old.stones=1000;old.expTickets={x2:2,x10:1};old.expBoost={id:'x10',until:now+60000};old.adExpUntil=now+60000;
 const s=validSave(JSON.parse(JSON.stringify(old)));
 const refund=2*EXP_TICKETS.x2.price+EXP_TICKETS.x10.price;
 assert.equal(s.stones,1000+refund);assert.equal(s.redenominatedMint,refund);assert.deepEqual(s.expTickets,{});assert.equal(s.expBoost,null);
 assert.equal(expMultiplier(s,now),5);assert.equal(expBoostUntil(s,now),now+60000);
 delete s.redenominatedMint;const again=validSave(JSON.parse(JSON.stringify(s)));assert.equal(again.stones,s.stones);assert.equal(again.redenominatedMint,undefined);
 s.adExpUntil=0;assert.equal(expMultiplier(s,now),1);
});
