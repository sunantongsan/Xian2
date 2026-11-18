import test from 'node:test';
import assert from 'node:assert/strict';
import {battle,place,wave,cast,tick,maps} from '../web/ward-run.js';
test('first fight teaches placement, starting a wave, and aiming a real skill',()=>{
 const r=battle();assert(!wave(r));assert(!place(r,1,0));assert(place(r,0,0));assert.equal(r.coins,50);assert(!place(r,0,1));assert(wave(r));
 for(let i=0;i<360;i++)tick(r,1/60);assert.equal(r.guide,'aim');const e=r.foes[0],d=e.d;tick(r,.05);assert.equal(e.d,d);
 assert(!cast(r,0,790,340));assert(cast(r,0,e.x,e.y));assert.equal(r.guide,'');assert(!cast(r,0,e.x,e.y));
});
test('a full squad can defend all maps including the boss and receive wave breaks',()=>{
 for(let i=0;i<3;i++){const r=battle(i,[0,0,0],false);for(const [pad,id] of [[0,0],[2,1],[3,2]])assert(place(r,pad,id));let boss=false;
 for(let j=0;j<50000&&!['won','lost'].includes(r.phase);j++){
 if(['setup','break'].includes(r.phase))assert(wave(r));tick(r,1/30);const e=r.foes.find(e=>e.boss)||r.foes[0];if(e?.boss)boss=true;
 if(e&&(maps[i].squad||e.d>240))for(const u of r.units)cast(r,u.id,e.x,e.y);
 }assert.equal(r.phase,'won');assert(boss);assert.equal(r.wave,maps[i].waves);}
});
