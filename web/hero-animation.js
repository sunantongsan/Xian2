import {drawCockroach3D} from './cockroach-3d.js';
import {drawEvolutionWings} from './evolution-wings.js';
import {drawHumanHero} from './human-hero.js';
import {mutationVisualLevel} from './mutation.js';
import {drawMutationHero} from './mutation-art.js';
import {drawLayeredHero} from './layered-hero.js';
import {drawFashion} from './fashion-render.js';
// Whole-body hand-painted animation. A frame is never cut into separate body parts.
export const HERO_IDS=['sword-male','sword-female','demon-male','demon-female'];
export const WALK_DISTANCE=112;
export const CELL=256;
// New hero classes packed by tools/pack-class-sheet.py (same frame order as the Cockro combat sheet).
export const CLASS_SHEETS=['demon-scorpion','sword-dragonfly','sword-cricket'];
// The cricket sheet was painted with one pose per skill: row 3 and row 4 hold skill poses, idle and hurt.
const CLASS_FRAMES={'sword-cricket':{idle:14,attack:[14,12,8,14],hurt:15,dead:15,skill:{s1:8,s2:9,s3:10,s4:11,s5:12,s6:13},fallback:13,deadTilt:true}};
export function classFrame(hero,actor={}){
 const m=CLASS_FRAMES[hero];if(!m)return cockroFrame(actor);
 const t=Math.max(0,actor.animTime||0),u=t/(actor.animDuration||.58);
 if(actor.dead||actor.anim==='dead')return m.dead;
 if(actor.anim==='hurt')return m.hurt;
 if(actor.anim==='skill')return m.skill[actor.castId]??m.fallback;
 if(actor.anim==='attack')return m.attack[u<.25?0:u<.5?1:u<.76?2:3];
 if(actor.anim==='walk')return (actor.back?4:0)+walkFrame(actor);
 return m.idle;
}
export function heroFrame(actor={}){
 const back=!!actor.back,flip=(actor.face||1)<0;
 const t=Math.max(0,Number.isFinite(actor.animTime)?actor.animTime:0);
 if(actor.dead||actor.anim==='dead')return {sheet:'actions',frame:7,flip};
 if(actor.anim==='hurt')return {sheet:'actions',frame:6,flip};
 if(actor.anim==='attack')return {sheet:'actions',frame:2+(t/(actor.animDuration||.58)<.25?0:t/(actor.animDuration||.58)<.5?1:2),flip};
 if(actor.anim==='skill')return {sheet:'actions',frame:5,flip};
 if(actor.anim==='walk'){
  const distance=Number.isFinite(actor.walkDistance)?actor.walkDistance:0;
  const phase=((distance/WALK_DISTANCE)%1+1)%1;
  return {sheet:'walk',frame:(back?8:0)+Math.floor(phase*8),flip};
 }
 return {sheet:'actions',frame:back?1:0,flip};
}
export function drawHero(ctx,images,hero,actor,x,y,size){
 drawEvolutionWings(ctx,hero,actor,x,y,size);
 if(drawCockroach3D(ctx,actor,x,y,size))return;
 if(hero==='sword-cockro'){const result=drawBaseHero(ctx,images,hero,actor,x,y,size);if(result)drawFashion(ctx,images,hero,actor,x,y,size,result.frame);return result;}
 const human=drawHumanHero(ctx,images,hero,actor,x,y,size);if(human)return human;
 const visualActor={...actor,level:mutationVisualLevel({...actor,hero})};
 const result=drawMutationHero(ctx,images,hero,visualActor,x,y,size)||drawLayeredHero(ctx,images,hero,actor,x,y,size)||drawBaseHero(ctx,images,hero,actor,x,y,size);if(result)drawFashion(ctx,images,hero,actor,x,y,size,result.frame);return result;
}
function drawBaseHero(ctx,images,hero,actor,x,y,size){
 if(hero==='sword-cricket'&&actor.anim==='walk'&&images.has('cricket-walk-prepared')){
  const im=images.get('cricket-walk-prepared'),frame=Math.floor((((actor.walkDistance||0)%150)+150)%150/150*6),unit=size/314;
  ctx.save();ctx.translate(x,y);ctx.scale((actor.face||1)<0?-1:1,1);
  ctx.drawImage(im,frame*384,actor.back?384:0,384,384,-192*unit,-352*unit,384*unit,384*unit);ctx.restore();return {sheet:'cricket-owner-walk',frame};
 }

 if(hero==='sword-cockro'){
  const im=images.get('heroes/cockro-combat-v2.webp');if(!im||!Number.isFinite(size)||size<=0)return;
  const frame=cockroFrame(actor),cw=im.width/4,ch=im.height/4;
  const rects={8:[0,627,320,290,158,290],9:[323,627,302,290,150,290],10:[630,627,365,290,155,290],11:[323,627,302,290,150,290],12:[0,925,313,310,158,290],13:[314,930,320,305,160,285],14:[638,930,285,305,142,285],15:[937,1100,317,135,158,130]};
  const r=rects[frame]||[(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,cw*.5,ch*.94],unit=size/314;
  ctx.save();ctx.translate(x,y);ctx.scale((actor.face||1)<0?-1:1,1);
  drawFrame(ctx,im,r[0],r[1],r[2],r[3],-r[4]*unit,-r[5]*unit,r[2]*unit,r[3]*unit,walkMotion(actor,unit));
  ctx.restore();return {sheet:'cockro-combat-v2',frame};
 }
 if(CLASS_SHEETS.includes(hero)){
  // Normalised 4x4 class sheets: every frame is foot-anchored at (192,352) inside a 384px cell.
  const im=images.get(`heroes/${hero}.webp`);if(!im||!Number.isFinite(size)||size<=0)return;
  const frame=classFrame(hero,actor),c=im.width/4,unit=size/314;
  ctx.save();ctx.translate(x,y);ctx.scale((actor.face||1)<0?-1:1,1);
  if((actor.dead||actor.anim==='dead')&&CLASS_FRAMES[hero]?.deadTilt){ctx.translate(0,-18*unit);ctx.rotate(-1.25);ctx.globalAlpha*=.92;}
  const m=walkMotion(actor,unit);
  drawFrame(ctx,im,(frame%4)*c,Math.floor(frame/4)*c,c,c,-c/2*unit,-(c-32)*unit,c*unit,c*unit,m);

  ctx.restore();return {sheet:hero,frame};
 }
 if(!HERO_IDS.includes(hero)||!Number.isFinite(size)||size<=0)return;
 const f=heroFrame(actor),im=images.get(`heroes/${hero}-${f.sheet}.webp`);
 if(!im)return;
 // Every source cell is the same size. Uniform scale only, anchored at its ground root.
 const sourceCell=im.width/4,drawSize=size/.82;
 ctx.save();ctx.translate(x,y);ctx.scale(f.flip?-1:1,1);
 ctx.drawImage(im,(f.frame%4)*sourceCell,Math.floor(f.frame/4)*sourceCell,sourceCell,sourceCell,-drawSize*.5,-drawSize*.91,drawSize,drawSize);
 ctx.restore();return f;
}


// Walk cycle: four painted frames per stride (two steps), driven by distance so feet do not slide.
export const STRIDE=150;
const walkPhase=actor=>(((actor.walkDistance||0)%STRIDE)+STRIDE)%STRIDE/STRIDE;
function walkFrame(actor){return Math.floor(walkPhase(actor)*4)%4;}
// Preserve the painted anatomy and planted feet. Never overlay two poses or
// rotate/stretch the sprite to simulate walking: this creates ghost limbs and sliding.
function walkMotion(){return null;}
function drawFrame(ctx,im,sx,sy,sw,sh,dx,dy,dw,dh){
 ctx.drawImage(im,sx,sy,sw,sh,dx,dy,dw,dh);
}
// Combat sheet is experimental until a genuine alternating walk cycle passes visual review.
export function cockroFrame(actor={}){
 const t=Math.max(0,actor.animTime||0),u=t/(actor.animDuration||.58);
 if(actor.dead||actor.anim==='dead')return 15;
 if(actor.anim==='hurt')return 14;
 if(actor.anim==='skill')return 13;
 if(actor.anim==='attack')return 8+(u<.25?0:u<.5?1:u<.76?2:3);
 if(actor.anim==='walk')return (actor.back?4:0)+walkFrame(actor);
 return 12;
}



