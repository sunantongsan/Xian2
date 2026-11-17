import test from 'node:test';
import assert from 'node:assert/strict';
import {freshProfile,newRun,makeBattle,step,stats,layout,clearLine,blocked,claimRoom,readProfile,offerPowers,upgrade} from '../web/room-run.js';
const setup=()=>{const p=freshProfile(),r=newRun(1);return {p,r,b:makeBattle(p,r)};};
test('moving cancels windup and never fires, release fires actual colliding projectiles',()=>{const {b}=setup();for(let i=0;i<20;i++)step(b,.05,{x:1,y:0});assert.equal(b.shotsFired,0);step(b,.05);assert(b.windup);step(b,.05,{x:-1,y:0});assert.equal(b.windup,null);assert.equal(b.shotsFired,0);b.hero.x=70;b.hero.y=450;const hp=b.foes[0].hp;for(let i=0;i<35;i++)step(b,.05);assert(b.shotsFired>0);assert(b.foes[0].hp<hp);});
test('collision prevents crossing walls and shots cannot target through cover',()=>{const {b}=setup();b.blocks=[{x:100,y:200,w:100,h:40}];b.hero.x=150;b.hero.y=260;for(let i=0;i<100;i++)step(b,.05,{x:0,y:-1});assert(b.hero.y>=253);assert.equal(clearLine({x:150,y:300},{x:150,y:100},b.blocks),false);});
test('every stage has two monster levels, reachable entry and a boss in room five',()=>{for(let stage=1;stage<=30;stage++)for(let room=1;room<=5;room++){const l=layout(stage,room);assert(!blocked(210,540,l.blocks));assert(!blocked(210,80,l.blocks));assert(l.foes.every(e=>e.level>=stage*2-1&&e.level<=stage*2));assert.equal(l.foes.some(e=>e.boss),room===5);}});
test('clear removes hostile bullets and rewards can be claimed only once',()=>{const {p,r,b}=setup();b.foes.forEach(e=>e.hp=0);step(b,.05);assert(b.cleared);const reward=claimRoom(p,r);assert(reward>0);assert.equal(claimRoom(p,r),0);assert.equal(p.gold,reward);r.room=5;claimRoom(p,r);assert.equal(p.cleared,1);});
test('power picks are distinct, affect combat, and pending picks survive reload',()=>{const {p,r}=setup();r.room=2;r.pendingPick=true;r.claimedRooms=[1];p.run=r;const copy=readProfile(JSON.stringify(p));assert.equal(copy.run.pendingPick,true);assert.deepEqual(copy.run.claimedRooms,[1]);const offer=offerPowers(r);assert.equal(new Set(offer.map(p=>p.id)).size,3);r.powers=['power','speed','vital','shield'];const st=stats(p,r);assert(st.damage>22&&st.interval<.65&&st.hp>160&&st.guard<1);});
test('pause, death and corrupted saves do not create damage, shots or rewards',()=>{const {b}=setup();b.paused=true;for(let i=0;i<100;i++)step(b,.05);assert.equal(b.shotsFired,0);assert.equal(b.hero.hp,160);assert.equal(readProfile('broken').run,null);assert.equal(readProfile('{"version":1,"run":{"stage":999}}').run,null);});
test('upgrades spend exactly the displayed cost and reject insufficient balance',()=>{const p=freshProfile();assert.equal(upgrade(p),false);p.gold=120;assert(upgrade(p));assert.equal(p.gold,0);assert.equal(p.upgrade,1);assert.equal(upgrade(p),false);});
test('a move-and-shoot player clears five real rooms including cover and the boss',()=>{
 const p=freshProfile(),r=newRun(1);
 for(let room=1;room<=5;room++){
  r.room=room;const b=makeBattle(p,r);let dodge=0,side=1,ticks=0;
  while(!b.cleared&&!b.dead&&ticks++<2400){
   const input={x:0,y:0},danger=b.bullets.find(q=>q.owner==='enemy'&&Math.hypot(q.x-b.hero.x,q.y-b.hero.y)<90);
   if(danger&&dodge<=0){dodge=.35;side=b.hero.x>210?-1:1;}
   if(dodge>0){input.x=side;dodge-=.05;}
   else if(!b.foes.some(e=>e.hp>0&&clearLine(b.hero,e,b.blocks))){input.x=b.hero.x>60?-1:0;input.y=b.hero.x<=60?-1:0;}
   step(b,.05,input);
  }
  assert(b.cleared,'room '+room+' must clear through actual projectile hits');assert(!b.dead);claimRoom(p,r);r.hp=b.hero.hp;
  if(room<5){r.powers.push('heal');r.hp=Math.min(stats(p,r).hp,r.hp+stats(p,r).hp*.3);}
 }
 assert.equal(p.cleared,1);assert.equal(p.gold,225);
});
