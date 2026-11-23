import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {layeredFrame,drawLayeredHero} from '../web/layered-hero.js';
import {LAYERED_HEROES} from '../web/layered-hero-data.js';
import {equippedWeaponLook} from '../web/hero-appearance.js';
import {fresh} from '../web/core.js';
import {World} from '../server/world.js';
test('authored walking directions are not double-mirrored and use distance',()=>{
 for(const [dx,dy,back,start] of [[1,1,false,0],[-1,-1,true,4],[1,-1,false,24],[-1,1,false,28]])
  for(let i=0;i<4;i++)assert.deepEqual(layeredFrame({anim:'walk',walkDX:dx,walkDY:dy,back,face:-1,walkDistance:i*37.5}),{frame:start+i,flip:false});
});
test('combat, skill and death timing clamps at final authored frame',()=>{
 for(const [anim,start] of [['attack',8],['skill',12]])for(let i=0;i<4;i++)assert.equal(layeredFrame({anim,animDuration:1,animTime:i*.25}).frame,start+i);
 for(let i=0;i<4;i++)assert.equal(layeredFrame({dead:true,animTime:i*.225}).frame,16+i);
 assert.equal(layeredFrame({dead:true,animTime:100}).frame,19);
 for(const anim of ['idle','guard','hurt','recover'])assert(layeredFrame({anim,animTime:NaN}).frame>=20);
});
test('all packed rectangles exist, fit atlas and render atomically',()=>{
 for(const [hero,data] of Object.entries(LAYERED_HEROES)){
  const images=new Map(data.pages.map(p=>{assert(fs.existsSync(new URL('../web/'+p,import.meta.url)));return [p,{width:1024,height:1024}]}));
  for(const f of data.frames)for(const part of [f.body,f.foreground,...Object.values(f.weapons),...Object.values(f.effects)].filter(Boolean)){
   const [x,y,w,h]=part.rect;assert(x>=0&&y>=0&&x+w<=1024&&y+h<=1024);assert(data.pages[part.page]);
  }
  let n=0;const ctx={save(){},restore(){},translate(){},scale(){},drawImage(...a){n++;assert(a.slice(1).every(Number.isFinite));}};
  for(const weaponLook of ['none',...data.weapons])for(const anim of ['idle','walk','attack','skill','hurt','dead'])assert(drawLayeredHero(ctx,images,hero,{anim,weaponLook,animTime:.3},0,0,110));
  const before=n;images.delete(data.pages[0]);assert.equal(drawLayeredHero(ctx,images,hero,{},0,0,110),undefined);assert.equal(n,before);
 }
});
test('equipment appearance survives save reload and reaches remote snapshots',()=>{
 for(const hero of Object.keys(LAYERED_HEROES)){
  const w=new World(),s=fresh(hero),p=w.join('a',s),other=w.join('b',fresh(hero));
  for(const item of [null,{slot:'weapon',rarity:0,tier:0},{slot:'weapon',rarity:0,tier:6}]){
   p.s.equip.weapon=item;const saved=JSON.parse(JSON.stringify(p.s));const look=equippedWeaponLook(saved);
   assert.equal(w.snapshot(p).self.weaponLook,look);assert.equal(w.snapshot(other).players.find(q=>q.id==='a').weaponLook,look);
   assert.equal(look,item?LAYERED_HEROES[hero].weapons[0]:'none');
  }
 }
});
