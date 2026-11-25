import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
import {capturePresence} from '../web/solo-world.js';
import {fresh,validSave} from '../web/core.js';
import {walkable,routeTo,traceStep} from '../web/maps.js';
import {roadDestination} from '../web/roads.js';

test('town has exactly two open roads; hunting route never switches scenes',()=>{
 const w=new World(),m=w.maps.star,c=Math.floor(m.spawn.x/m.T),r=Math.floor(m.spawn.y/m.T),openings=[];
 for(let dy=-8;dy<=8;dy++)for(let dx=-9;dx<=9;dx++)if(Math.abs(dx)===9||Math.abs(dy)===8){if(m.walk[(r+dy)*m.N+c+dx])openings.push([dx,dy]);}
 assert.equal(openings.length,10);for(const [dx,dy]of openings){assert.equal(Math.abs(dx),9);assert(Math.abs(dy)<=2);}
 const hunt=m.pois.find(p=>p.action==='hunt').world;
 let last=m.spawn;for(const point of routeTo(m,last,hunt)){const end=traceStep(m,last,point);assert(Math.hypot(end.x-point.x,end.y-point.y)<1);assert.equal(roadDestination('star',point,1,m),null);last=point;}
 assert(Math.hypot(last.x-hunt.x,last.y-hunt.y)<1);assert(!w.home({map:'star',...hunt}));
 assert.equal(m.pois.filter(p=>['town','forest'].includes(p.action)).length,1);
});

test('desert return and revive use city 2; merchant is restricted to city',()=>{
 const w=new World(),s=fresh('sword-cockro'),p=w.join('oasis',s);s.gold=12;s.stones=100000;
 w.enter(p,'star',5);assert(!w.home(p));const n=s.potions;
 w.command(p,{type:'op',op:'buy',quantity:1},100);assert.equal(s.potions,n);
 w.enter(p,'star',0);assert(w.home(p));w.command(p,{type:'op',op:'buy',quantity:1},102);assert(s.potions>n);
 w.enter(p,'star',5);p.hp=0;w.command(p,{type:'revive'},104);assert.equal(p.map,'star');assert(w.home(p));
 assert(walkable(w.maps.star,p));assert(p.hp>0);
 const correction=w.snapshot(p).self;assert(correction.correction);assert.equal(correction.map,'star');
 capturePresence(p);const restored=w.makeActor('rejoin',validSave(s));
 assert.equal(restored.map,'star');assert.equal(restored.x,p.x);assert.equal(restored.y,p.y);
});

test('distant desert monsters sleep',()=>{
 const w=new World(),p=w.join('walker',fresh('sword-cockro'));w.enter(p,'star',4);
 const far=w.mobs.star.find(e=>Math.hypot(e.x-p.x,e.y-p.y)>5000),before={x:far.x,y:far.y};
 far.state='idle';far.clock=0;for(let n=0;n<30;n++)w.tick(.05,200+n*.05);
 assert.equal(far.x,before.x);assert.equal(far.y,before.y);assert.equal(far.moving,false);
});

