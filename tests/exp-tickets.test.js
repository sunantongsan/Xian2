import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,validSave,reward} from '../web/core.js';
import {EXP_TICKETS,EXP_DURATION,buyExpTicket,useExpTicket,expMultiplier} from '../web/exp-tickets.js';
import {World} from '../server/world.js';
test('all tickets charge COCKRO exactly and preserve legacy G',()=>{
 for(const [id,it]of Object.entries(EXP_TICKETS)){const s=fresh('sword-cockro');s.stones=it.price;s.gold=500;assert.equal(buyExpTicket(s,id),true);assert.equal(s.stones,0);assert.equal(s.gold,500);assert.equal(validSave(s).expTickets[id],1);const before=JSON.stringify(s);assert.equal(buyExpTicket(s,id),false);assert.equal(buyExpTicket(s,'__proto__'),false);assert.equal(JSON.stringify(s),before);}
});
test('ticket boosts actual monster XP only for one hour and replacement requires current expiry',()=>{
 const s=fresh('sword-cockro'),now=Date.now();s.expTickets={x2:2,x5:2,x10:1};
 assert.equal(useExpTicket(s,'x2',0,now),true);assert.equal(s.expBoost.until,now+EXP_DURATION);
 const m={id:0,xp:1,gold:1};reward(s,m,()=>1);assert.equal(s.xp,2);
 assert.equal(useExpTicket(s,'x5',0,now+1),false);assert.equal(s.expTickets.x5,2);
 const old=s.expBoost.until;assert.equal(useExpTicket(s,'x5',old,now+2),true);assert.equal(useExpTicket(s,'x5',old,now+3),false);
 assert.equal(s.expTickets.x5,1);assert.equal(expMultiplier(validSave(s),now+3),5);assert.equal(expMultiplier(s,now+2+EXP_DURATION),1);
});
test('malformed inventory/boost rejected and old balances retained',()=>{
 const s=fresh('sword-cockro');s.stones=98765;s.expTickets={x2:-1,x5:Infinity,x10:1.5};s.expBoost={id:'x99',until:Infinity};const v=validSave(s);assert.deepEqual(v.expTickets,{x2:0,x5:0,x10:0});assert.equal(v.expBoost,null);assert.equal(v.stones,98765);
});
test('server enforces shop map, balance, owned tickets and dead-player restrictions',()=>{
 const w=new World(),p=w.join('ticket-player',fresh('sword-cockro')),now=Date.now()/1000;p.s.stones=100000;p.map='forest';w.command(p,{type:'op',op:'buyExpTicket',id:'x2'},now);assert.equal(p.opResult.ok,false);
 p.map='town';w.command(p,{type:'op',op:'buyExpTicket',id:'x2'},now+1);assert.equal(p.opResult.ok,true);assert.equal(p.s.stones,50000);
 p.hp=0;w.command(p,{type:'op',op:'useExpTicket',id:'x2'},now+2);assert.equal(p.opResult.ok,false);assert.equal(p.s.expTickets.x2,1);
 p.hp=1;w.command(p,{type:'op',op:'useExpTicket',id:'x2'},now+3);assert.equal(p.opResult.ok,true);w.command(p,{type:'op',op:'useExpTicket',id:'x2'},now+4);assert.equal(p.opResult.ok,false);
});

