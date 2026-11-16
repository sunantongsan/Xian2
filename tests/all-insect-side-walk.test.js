import test from 'node:test';
import assert from 'node:assert/strict';
import {INSECT_DISPLAY_SCALE,INSECT_LOOKS,drawInsectSprite,insectSpriteFile} from '../web/insect-sprites.js';
import {insectSideFile,insectSideSpec,createInsectSideCache} from '../web/insect-side-walk.js';
const ids=Object.keys(INSECT_LOOKS);
test('all ten suits including mantis use eight side-walk frames at both detail levels',()=>{
 assert.equal(ids.length,10);
 for(const id of ids)for(const remote of [false,true]){
  const spec=insectSideSpec(id,remote),im={width:spec.width,height:spec.height};
  const images=new Map([[insectSideFile(id,remote),im]]);
  for(const [dx,dy,row] of [[1,-1,0],[-1,1,1]])for(let f=0;f<8;f++){
   let a;const r=drawInsectSprite({drawImage:(...args)=>a=args},images,{insectArmor:id,spriteDetail:remote?'remote':'full',anim:'walk',walkDX:dx,walkDY:dy,walkDistance:f*12},80,150,100);
   assert.equal(r.sideWalk,true,id);assert.equal(r.frame,f);assert.equal(r.sheet,id);
   assert.equal(a[0],im);assert.equal(a[1],f*spec.width/8);assert.equal(a[2],row*spec.height/2);
   assert(a.slice(1).every(Number.isFinite));assert(a[1]+a[3]<=im.width&&a[2]+a[4]<=im.height);
   assert(Math.abs(a[5]+a[7]/2-80)<1e-9);assert(Math.abs(a[6]+spec.foot*100*INSECT_DISPLAY_SCALE/spec.body-150)<1e-9);
  }
 }
});
test('side files do not replace front/back or combat; missing files preserve every existing suit',()=>{
 for(const id of ids){
  const baseFile=id.startsWith('mantis-')?`heroes/mantis/${id.split('-')[1]}.webp`:insectSpriteFile(id);
  const base={width:(INSECT_LOOKS[id].columns||13)*192,height:768},side=insectSideSpec(id);
  const images=new Map([[baseFile,base],[insectSideFile(id),side]]);
  for(const anim of ['idle','attack','skill','hurt','dead']){
   let selected;drawInsectSprite({drawImage:im=>selected=im},images,{insectArmor:id,spriteDetail:'full',anim,walkDX:1,walkDY:-1},0,0,100);assert.equal(selected,base,id+' '+anim);
  }
  for(const sign of [-1,1]){
   let selected;drawInsectSprite({drawImage:im=>selected=im},images,{insectArmor:id,spriteDetail:'full',anim:'walk',walkDX:sign,walkDY:sign},0,0,100);assert.equal(selected,base);
  }
  images.delete(insectSideFile(id));let selected;
  const r=drawInsectSprite({drawImage:im=>selected=im},images,{insectArmor:id,spriteDetail:'full',anim:'walk',walkDX:1,walkDY:-1},0,0,100);
  assert.equal(selected,base);assert.equal(r.clip,'walk');
 }
});
test('full and remote side images have identical world size, frame phase and foot position',()=>{
 for(const id of ids){const calls=[];
  for(const remote of [false,true]){
   const spec=insectSideSpec(id,remote);
   drawInsectSprite({drawImage:(...a)=>calls.push(a)},new Map([[insectSideFile(id,remote),spec]]),{insectArmor:id,spriteDetail:remote?'remote':'full',anim:'walk',walkDX:1,walkDY:-1,walkDistance:48},0,0,100);
  }
  for(let i=5;i<=8;i++)assert(Math.abs(calls[0][i]-calls[1][i])<1e-9,id);
 }
});
test('side cache deduplicates loads and bounds decoded images while rejecting invalid sheets',async()=>{
 let calls=0;const cache=createInsectSideCache(async file=>{calls++;const id=file.split('/').pop().replace('-side-walk.webp','');return insectSideSpec(id);},{limit:2});
 const [a,b]=await Promise.all([cache.ensure(ids[0]),cache.ensure(ids[0])]);assert.equal(a,b);assert.equal(calls,1);
 await cache.ensure(ids[1]);cache.read(ids[0]);await cache.ensure(ids[2]);assert.equal(cache.size,2);assert.equal(cache.read(ids[1]),undefined);assert.equal(cache.revision,3);
 assert.equal(await cache.ensure('unknown'),null);
 let failures=0;const broken=createInsectSideCache(async()=>{failures++;return {width:16,height:16};});
 assert.equal(await broken.ensure(ids[0]),null);assert.equal(await broken.ensure(ids[0]),null);assert.equal(failures,1);assert.equal(broken.size,0);
});
test('unknown suits never select side art and cannot start a load',()=>{
 assert.equal(insectSideFile('unknown'),null);assert.equal(insectSideSpec('unknown'),null);
 assert.equal(drawInsectSprite({drawImage:()=>assert.fail()},new Map(),{insectArmor:'unknown',anim:'walk'},0,0,100),false);
});

