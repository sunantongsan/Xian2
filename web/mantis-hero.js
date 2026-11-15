export const MANTIS_FILES=['heroes/mantis/male.webp','heroes/mantis/female.webp','heroes/mantis/side-walk.webp'];
export function mantisVariant(){try{return localStorage.getItem('cockro-mantis-variant')==='female'?'female':'male';}catch{return 'male';}}
export function setMantisVariant(value){if(!['male','female'].includes(value))return;try{localStorage.setItem('cockro-mantis-variant',value);}catch{}}
export function mantisFrame(actor={}){
 // Walking follows movement, even when a remote snapshot retains an earlier attack aim.
 const walking=actor.anim==='walk';
 const dx=walking?(actor.walkDX??.707):(Number.isFinite(actor.aimDX)?actor.aimDX:actor.walkDX??.707),dy=walking?(actor.walkDY??.707):(Number.isFinite(actor.aimDY)?actor.aimDY:actor.walkDY??.707);
 const sx=.8*(dx-dy),sy=.4*(dx+dy);
 const row=Math.abs(sx)>Math.abs(sy)?(sx<0?2:3):(sy<0?1:0);
 const t=Math.max(0,Number.isFinite(actor.animTime)?actor.animTime:0);
 const phase=duration=>Math.min(2,Math.floor(t/(Number.isFinite(actor.animDuration)&&actor.animDuration>0?actor.animDuration:duration)*3));
 let column=6,clip='idle';
 if(actor.dead||actor.anim==='dead'){column=10+phase(.8);clip='dead';}
 else if(actor.anim==='attack'){column=4+phase(.46);clip='attack';}
 else if(actor.anim==='skill'){column=7+phase(.6);clip='skill';}
 else if(actor.anim==='walk'){const d=Number.isFinite(actor.walkDistance)?actor.walkDistance:0;const stride=row>=2?96:78;column=Math.floor(((d%stride+stride)%stride)/stride*4);clip='walk';}
 else if(actor.anim==='hurt'){column=10;clip='hurt';}
 return {row,column,clip};
}
export function drawMantisHero(ctx,images,actor,x,y,size){
 if(actor.insectArmor!=='mantis'||!Number.isFinite(size)||size<=0)return false;
 const variant=actor.insectVariant==='female'?'female':'male',im=images.get(`heroes/mantis/${variant}.webp`);
 if(!im||im.width!==2496||im.height!==768)return false;
 const pose=mantisFrame(actor),d=size*192/154;
 const side=images.get('heroes/mantis/side-walk.webp');
 if(pose.clip==='walk'&&pose.row>=2&&side?.width===768&&side?.height===768){
  const sideRow=(variant==='female'?2:0)+(pose.row===2?1:0);
  ctx.drawImage(side,pose.column*192,sideRow*192,192,192,x-d/2,y-d*176/192,d,d);
 }else ctx.drawImage(im,pose.column*192,pose.row*192,192,192,x-d/2,y-d*176/192,d,d);
 return {...pose,frame:pose.column,sheet:'mantis-'+variant};
}
