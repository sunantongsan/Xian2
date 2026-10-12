// Whole-body hand-painted animation. A frame is never cut into separate body parts.
export const HERO_IDS=['sword-male','sword-female','demon-male','demon-female'];
export const WALK_DISTANCE=112;
export const CELL=256;
export function heroFrame(actor={}){
 const back=!!actor.back,flip=(actor.face||1)<0;
 const t=Math.max(0,Number.isFinite(actor.animTime)?actor.animTime:0);
 if(actor.dead||actor.anim==='dead')return {sheet:'actions',frame:7,flip};
 if(actor.anim==='hurt')return {sheet:'actions',frame:6,flip};
 if(actor.anim==='attack')return {sheet:'actions',frame:2+Math.min(2,Math.floor(t/.55*3)),flip};
 if(actor.anim==='skill')return {sheet:'actions',frame:5,flip};
 if(actor.anim==='walk'){
  const distance=Number.isFinite(actor.walkDistance)?actor.walkDistance:0;
  const phase=((distance/WALK_DISTANCE)%1+1)%1;
  return {sheet:'walk',frame:(back?8:0)+Math.floor(phase*8),flip};
 }
 return {sheet:'actions',frame:back?1:0,flip};
}
export function drawHero(ctx,images,hero,actor,x,y,size){
 if(!HERO_IDS.includes(hero)||!Number.isFinite(size)||size<=0)return;
 const f=heroFrame(actor),im=images.get(`heroes/${hero}-${f.sheet}.webp`);
 if(!im)return;
 // Every source cell is the same size. Uniform scale only, anchored at its ground root.
 const sourceCell=im.width/4,drawSize=size/.82;
 ctx.save();ctx.translate(x,y);ctx.scale(f.flip?-1:1,1);
 ctx.drawImage(im,(f.frame%4)*sourceCell,Math.floor(f.frame/4)*sourceCell,sourceCell,sourceCell,-drawSize*.5,-drawSize*.91,drawSize,drawSize);
 ctx.restore();return f;
}
