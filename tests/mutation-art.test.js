import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mutationArtFor,drawMutationHero} from '../web/mutation-art.js';
import {MUTATION_ART} from '../web/mutation-art-data.js';
import {MANTIS_FILES} from '../web/mantis-hero.js';
import {heroAssetFiles,createHeroAssetLoader} from '../web/hero-assets.js';
import {fresh,validSave} from '../web/core.js';
import {heroAppearance} from '../web/hero-appearance.js';
import {World} from '../server/world.js';
test('every supplied look is reachable and transitions at correct boundaries',()=>{
 const cases={'sword-dragonfly':['dragonfly-green',null,null],'demon-scorpion':['scorpion-gold',null,null],'sword-cockro':[null,null,'cockro-guard'],'sword-cricket':[null,'cricket-scientist','cricket-engineer']};
 const reached=new Set();for(const [hero,looks] of Object.entries(cases))for(const [level,stage] of [[1,0],[19,0],[20,1],[59,1],[60,2],[210,2]]){
  const state=validSave({...fresh(hero),level}),look=mutationArtFor(state.hero,state.level);assert.equal(look,looks[stage]);assert.equal(state.hero,hero);if(look)reached.add(look);
 }
 assert.deepEqual([...reached].sort(),Object.keys(MUTATION_ART).sort());assert.equal(mutationArtFor('sword-male',60),null);
});
test('packed source cells and ground roots are valid for every frame',()=>{
 for(const d of Object.values(MUTATION_ART)){
  assert(fs.existsSync(new URL('../web/'+d.file,import.meta.url)));assert.equal(d.frames.length,32);
  for(const f of d.frames){const [x,y,w,h]=f.rect;assert(x>=0&&y>=0&&x+w<=d.width&&y+h<=d.height);assert(f.pivot[0]>0&&f.pivot[0]<w&&f.pivot[1]>0&&f.pivot[1]<=h);}
 }
});
test('renderer uses one whole pose, no extra weapon overlay, and waits for complete image',()=>{
 const hero='sword-cricket',d=MUTATION_ART['cricket-engineer'];let calls=0;const ctx={save(){},restore(){},translate(){},scale(x,y){assert.equal(Math.abs(x),y);},drawImage(...a){calls++;assert(a.slice(1).every(Number.isFinite));}};
 assert.equal(drawMutationHero(ctx,new Map(),hero,{level:60},0,0,110),undefined);assert.equal(calls,0);
 const images=new Map([[d.file,{}]]);for(const anim of ['idle','walk','attack','skill','dead','hurt'])for(const face of [-1,1])assert.equal(drawMutationHero(ctx,images,hero,{level:60,anim,face,animTime:2},0,0,110).sheet,'cricket-engineer');assert.equal(calls,12);
});
test('equipment snapshot and local inventory select same mutation without new save fields',()=>{
 const w=new World(),s=fresh('sword-cricket');s.level=60;const p=w.join('a',s),q=w.join('b',fresh('sword-cockro'));
 assert.deepEqual(w.snapshot(q).players,[]);const remote=w.snapshot(p).self;assert.equal(mutationArtFor(remote.hero,remote.level),mutationArtFor(s.hero,heroAppearance(s).level));assert.equal(remote.hero,s.hero);
});
test('asset loading deduplicates in-flight requests, retries failure and invalidates portrait on success',async()=>{
 const expectedRequests=2*(heroAssetFiles('sword-cricket',20).length+MANTIS_FILES.length);
 let count=0,ready=0,rejectFirst=true;const load=createHeroAssetLoader(async()=>{count++;if(rejectFirst)throw Error('offline');},()=>ready++);
 await assert.rejects(load('sword-cricket',20));rejectFirst=false;
 await Promise.all([load('sword-cricket',20),load('sword-cricket',59)]);assert.equal(count,expectedRequests);assert.equal(ready,1);
 await load('sword-cricket',30);assert.equal(count,expectedRequests);await load('sword-cricket',60);assert.equal(count,expectedRequests);assert.equal(ready,1);
});
test('human rig clips are shared across classes and evolution levels',()=>{
 assert.deepEqual(heroAssetFiles('sword-cricket',60),heroAssetFiles('sword-cockro',1));
 assert.equal(heroAssetFiles('sword-dragonfly',20).length,6);assert.equal(heroAssetFiles('sword-cricket',1).length,6);
});

