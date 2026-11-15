import test from 'node:test';
import assert from 'node:assert/strict';
import {INSECT_LOOKS,insectSpriteFile,resolveInsectLook,drawInsectSprite,createInsectSpriteCache} from '../web/insect-sprites.js';

test('eight new source atlases stay in bounds for every action, sex and direction',()=>{
 const files=Object.keys(INSECT_LOOKS).filter(insectSpriteFile);assert.equal(files.length,8);
 const images=new Map(files.map(id=>[insectSpriteFile(id),{width:(INSECT_LOOKS[id].columns||13)*192,height:768}]));
 let args;const ctx={drawImage:(...a)=>args=a};
 for(const id of files)for(const [walkDX,walkDY] of [[1,1],[-1,-1],[-1,1],[1,-1]])for(const anim of ['idle','walk','attack','skill','hurt','dead'])for(const t of [0,.2,.5,2]){
  const r=drawInsectSprite(ctx,images,{spriteLook:id,anim,walkDX,walkDY,animTime:t,walkDistance:t*96},100,200,110);
  assert.equal(r.sheet,id);assert(args.slice(1).every(Number.isFinite));assert(args[1]>=0&&args[1]+192<=args[0].width);assert(args[2]>=0&&args[2]+192<=args[0].height);
  if(anim==='dead'&&t===2)assert.equal(r.frame,(INSECT_LOOKS[id].columns||13)-1);
 }
 assert.equal(resolveInsectLook({spriteLook:'auto',insectArmor:'beetle'}),'beetle-female');
 assert.equal(resolveInsectLook({insectArmor:'beetle'}),null,'remote appearance does not inherit local cosmetics');
 assert.equal(drawInsectSprite(ctx,new Map(),{spriteLook:'cockroach-male'},0,0,100),false);
});
test('lazy decoded-image cache deduplicates requests and retains only two atlases',async()=>{
 let calls=0;const cache=createInsectSpriteCache(async()=>{calls++;return {width:2496,height:768};});
 const [a,b]=await Promise.all([cache.ensure('cockroach-male'),cache.ensure('cockroach-male')]);assert.equal(a,b);assert.equal(calls,1);
 await cache.ensure('cockroach-female');await cache.ensure('ladybug-male');assert.equal(cache.size,2);assert.equal(cache.read('cockroach-male'),undefined);
 assert.equal(cache.revision,3);assert.equal(await cache.ensure('unknown'),null);
});
test('broken optional art returns a fallback and rate limits retries',async()=>{
 let calls=0;const cache=createInsectSpriteCache(async()=>{calls++;throw Error('offline');});
 assert.equal(await cache.ensure('cockroach-male'),null);assert.equal(await cache.ensure('cockroach-male'),null);assert.equal(calls,1);assert.equal(cache.size,0);
});
