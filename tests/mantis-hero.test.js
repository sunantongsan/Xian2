import test from 'node:test';import assert from 'node:assert/strict';
import {mantisFrame,drawMantisHero,MANTIS_FILES} from '../web/mantis-hero.js';
import {createHeroAssetLoader} from '../web/hero-assets.js';
test('four screen directions, complete 52-frame mapping and held death',()=>{
 const vectors=[[1,1],[-1,-1],[-1,1],[1,-1]];
 for(let r=0;r<4;r++){
  const [walkDX,walkDY]=vectors[r];const base={walkDX,walkDY};
  for(let c=0;c<4;c++)assert.deepEqual(mantisFrame({...base,anim:'walk',walkDistance:c*(r>=2?24:19.5)}),{row:r,column:c,clip:'walk'});
  for(const [anim,start,duration]of [['attack',4,.46],['skill',7,.6],['dead',10,.8]])for(let c=0;c<3;c++)assert.equal(mantisFrame({...base,anim,animTime:duration*(c+.1)/3}).column,start+c);
  assert.equal(mantisFrame({...base,dead:true,animTime:100}).column,12);
 }
});
test('equipment gate, variants, fallback and atlas bounds',()=>{
 const images=new Map(MANTIS_FILES.map(f=>[f,{width:2496,height:768}]));let calls=[];const ctx={drawImage:(...args)=>calls.push(args)};
 assert.equal(drawMantisHero(ctx,images,{insectArmor:'beetle'},0,0,110),false);
 assert.equal(drawMantisHero(ctx,new Map(),{insectArmor:'mantis'},0,0,110),false);
 for(const insectVariant of ['male','female'])for(const anim of ['walk','attack','skill','dead'])for(const v of [[1,1],[-1,-1],[-1,1],[1,-1]]){
  const f=drawMantisHero(ctx,images,{insectArmor:'mantis',insectVariant,anim,animTime:1,walkDX:v[0],walkDY:v[1]},100,200,110);assert.equal(f.sheet,'mantis-'+insectVariant);
  const a=calls.at(-1);assert(a[1]>=0&&a[1]+a[3]<=2496&&a[2]>=0&&a[2]+a[4]<=768);
 }
});
test('optional mantis loading failure preserves base character boot',async()=>{
 const load=createHeroAssetLoader(async f=>{if(f.includes('mantis'))throw Error('missing optional asset');return {};});await load('sword-cockro');
});

test('side walking follows movement rather than stale aim, selects dedicated sex and direction rows',()=>{
 const sides={width:768,height:768},images=new Map([['heroes/mantis/side-walk.webp',sides],...MANTIS_FILES.slice(0,2).map(f=>[f,{width:2496,height:768}])]);
 let call;const ctx={drawImage:(...a)=>call=a};
 for(const sex of ['male','female'])for(const left of [false,true])for(let frame=0;frame<4;frame++){
  const actor={insectArmor:'mantis',insectVariant:sex,anim:'walk',walkDX:left?-1:1,walkDY:left?1:-1,aimDX:1,aimDY:1,walkDistance:frame*24};
  drawMantisHero(ctx,images,actor,0,0,110);assert.equal(call[0],sides);assert.equal(call[1],frame*192);assert.equal(call[2],((sex==='female'?2:0)+(left?1:0))*192);
 }
});
