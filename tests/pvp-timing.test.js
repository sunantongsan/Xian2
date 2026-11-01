import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
import {fresh,maxHP} from '../web/core.js';
import {resolvePvpImpacts} from '../server/pvp.js';
function pair(){const w=new World(),a=w.join('a',fresh('sword-cockro')),b=w.join('b',fresh('sword-cockro'));b.x=a.x+40;b.y=a.y;return {w,a,b};}
test('windup emits animation before damage and cannot finish a fight on click',()=>{
 const {w,a,b}=pair();b.hp=1;
 w.command(a,{type:'attackPlayer',target:'b'},100);
 assert.equal(b.hp,1);assert.equal(a.s.pvpReports.at(-1).pending,true);
 assert(w.events.some(e=>e.kind==='attack'));assert(!w.events.some(e=>e.kind==='pvpResult'));
 resolvePvpImpacts(w,100.31);assert.equal(b.hp,1);
 resolvePvpImpacts(w,100.33);assert.equal(b.hp,0);
 assert.equal(a.s.pvpReports.at(-1).result,'won');assert.equal(a.s.pvpReports.at(-1).pending,undefined);
 resolvePvpImpacts(w,101);assert.equal(a.s.pvpReports.length,1);
});
test('movement and dash can evade a committed attack at impact',()=>{
 for(const evade of ['range','dash']){const {w,a,b}=pair(),hp=b.hp;
 w.command(a,{type:'attackPlayer',target:'b'},100);
 if(evade==='range')b.x+=200;else b.inv=101;
 resolvePvpImpacts(w,100.4);assert.equal(b.hp,hp);assert(w.events.some(e=>e.kind==='pvpMiss'));
 assert.equal(a.s.pvpReports.at(-1).damageDealt,0);
 }
});
test('spam cannot queue multiple attacks and full-health target cannot be one-shot',()=>{
 const {w,a,b}=pair();a.s.level=210;const hp=b.hp;
 for(let i=0;i<100;i++)w.command(a,{type:'attackPlayer',target:'b'},100+i*.001);
 resolvePvpImpacts(w,100.4);assert(b.hp>=hp*.7);assert(b.hp<hp);
 assert.equal(w.events.filter(e=>e.kind==='attack').length,1);
 const after=b.hp;w.command(a,{type:'attackPlayer',target:'b'},100.5);resolvePvpImpacts(w,100.9);assert.equal(b.hp,after);
});
test('dead attacker and changed-map target cancel pending impact',()=>{
 for(const cancel of ['death','map']){const {w,a,b}=pair(),hp=b.hp;
 w.command(a,{type:'attackPlayer',target:'b'},100);
 if(cancel==='death')a.hp=0;else b.map='forest';
 resolvePvpImpacts(w,100.4);assert.equal(b.hp,hp);assert.equal(a.pendingPvp,undefined);
 }
});
