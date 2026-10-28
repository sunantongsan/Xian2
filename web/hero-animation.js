// Whole-body hand-painted animation. A frame is never cut into separate body parts.
export const HERO_IDS=['sword-male','sword-female','demon-male','demon-female'];
export const WALK_DISTANCE=112;
export const CELL=256;
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
 if(hero==='sword-cockro'){
  const im=images.get('heroes/cockro-combat-v2.webp');if(!im||!Number.isFinite(size)||size<=0)return;
  const frame=cockroFrame(actor),cw=im.width/4,ch=im.height/4;
  const rects={8:[0,627,320,290,158,290],9:[323,627,302,290,150,290],10:[630,627,365,290,155,290],11:[323,627,302,290,150,290],12:[0,925,313,310,158,290],13:[314,930,320,305,160,285],14:[638,930,285,305,142,285],15:[937,1100,317,135,158,130]};
  const r=rects[frame]||[(frame%4)*cw,Math.floor(frame/4)*ch,cw,ch,cw*.5,ch*.94],unit=size/314;
  ctx.save();ctx.translate(x,y);ctx.scale((actor.face||1)<0?-1:1,1);
  ctx.drawImage(im,r[0],r[1],r[2],r[3],-r[4]*unit,-r[5]*unit,r[2]*unit,r[3]*unit);
  ctx.restore();return {sheet:'cockro-combat-v2',frame};
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


// Combat sheet is experimental until a genuine alternating walk cycle passes visual review.
export function cockroFrame(actor={}){
 const t=Math.max(0,actor.animTime||0),u=t/(actor.animDuration||.58);
 if(actor.dead||actor.anim==='dead')return 15;
 if(actor.anim==='hurt')return 14;
 if(actor.anim==='skill')return 13;
 if(actor.anim==='attack')return 8+(u<.25?0:u<.5?1:u<.76?2:3);
 if(actor.anim==='walk')return (actor.back?4:0)+Math.floor(((actor.walkDistance||0)%112)/28);
 return 12;
}
