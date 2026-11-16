import test from 'node:test';
import assert from 'node:assert/strict';
import {drawInsectSprite,insectSpriteFile,SCORPION_SIDE_FILE} from '../web/insect-sprites.js';
const atlas={width:2496,height:768},side={width:2172,height:724};
const images=new Map([[insectSpriteFile('scorpion-male'),atlas],[SCORPION_SIDE_FILE,side]]);
function draw(actor,imgs=images){let args;const pose=drawInsectSprite({drawImage:(...a)=>args=a},imgs,{insectArmor:'scorpion-male',spriteDetail:'full',...actor},100,200,100);return {args,pose};}
test('side walking uses all eight frames in both directions, bounded to one row',()=>{
 for(const [dx,dy,row] of [[1,-1,0],[-1,1,1]])for(let n=0;n<8;n++){
  const {args,pose}=draw({anim:'walk',walkDX:dx,walkDY:dy,walkDistance:n*12});
  assert.equal(pose.frame,n);assert.equal(pose.sideWalk,true);assert.equal(args[0],side);
  assert.equal(args[1],n*271.5);assert.equal(args[2],row*362);
  assert(args[1]+args[3]<=side.width&&args[2]+args[4]<=side.height);
 }
 assert.equal(draw({anim:'walk',walkDX:1,walkDY:-1,walkDistance:96}).pose.frame,0);
});
test('front/back walk and combat retain the original atlas',()=>{
 for(const anim of ['idle','attack','skill','hurt','dead'])assert.equal(draw({anim,walkDX:1,walkDY:-1}).args[0],atlas);
 for(const sign of [-1,1])assert.equal(draw({anim:'walk',walkDX:sign,walkDY:sign}).args[0],atlas);
});
test('missing side art falls back without hiding the character',()=>{
 const {args,pose}=draw({anim:'walk',walkDX:1,walkDY:-1},new Map([[insectSpriteFile('scorpion-male'),atlas]]));
 assert.equal(args[0],atlas);assert.equal(pose.clip,'walk');
});
test('suits are 32 percent larger with the same world foot anchor',()=>{
 const {args}=draw({anim:'idle'}),d=132*192/154;
 assert(Math.abs(args[7]-d)<1e-9);assert(Math.abs(args[5]+d/2-100)<1e-9);assert(Math.abs(args[6]+d*176/192-200)<1e-9);
});

