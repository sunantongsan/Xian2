export const MANTIS_FILES=['heroes/mantis/male.webp','heroes/mantis/female.webp'];
export function mantisVariant(){try{return localStorage.getItem('cockro-mantis-variant')==='female'?'female':'male';}catch{return 'male';}}
export function setMantisVariant(value){if(!['male','female'].includes(value))return;try{localStorage.setItem('cockro-mantis-variant',value);}catch{}}
export function mantisFrame(actor={}){
 const dx=Number.isFinite(actor.aimDX)?actor.aimDX:actor.walkDX??.707,dy=Number.isFinite(actor.aimDY)?actor.aimDY:actor.walkDY??.707;
 const sx=.8*(dx-dy),sy=.4*(dx+dy);
 const row=Math.abs(sx)>Math.abs(sy)?(sx<0?2:3):(sy<0?1:0);
 const t=Math.max(0,Number.isFinite(actor.animTime)?actor.animTime:0);
 const phase=duration=>Math.min(2,Math.floor(t/(Number.isFinite(actor.animDuration)&&actor.animDuration>0?actor.animDuration:duration)*3));
 let column=6,clip='idle';
 if(actor.dead||actor.anim==='dead'){column=10+phase(.8);clip='dead';}
 else if(actor.anim==='attack'){column=4+phase(.46);clip='attack';}
 else if(actor.anim==='skill'){column=7+phase(.6);clip='skill';}
 else if(actor.anim==='walk'){const d=Number.isFinite(actor.walkDistance)?actor.walkDistance:0;column=Math.floor(((d%78+78)%78)/78*4);clip='walk';}
 else if(actor.anim==='hurt'){column=10;clip='hurt';}
 return {row,column,clip};
}
export function drawMantisHero(ctx,images,actor,x,y,size){
 if(actor.insectArmor!=='mantis'||!Number.isFinite(size)||size<=0)return false;
 const variant=actor.insectVariant==='female'?'female':'male',im=images.get(`heroes/mantis/${variant}.webp`);
 if(!im||im.width!==2496||im.height!==768)return false;
 const pose=mantisFrame(actor),d=size*192/154;
 ctx.drawImage(im,pose.column*192,pose.row*192,192,192,x-d/2,y-d*176/192,d,d);
 return {...pose,frame:pose.column,sheet:'mantis-'+variant};
}
