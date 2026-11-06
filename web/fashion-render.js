import {fashionItem} from './fashion.js';
// Atlas source rectangles are measured against each generated sheet, not a guessed uniform grid.
const SPLIT={cowboy:425,wuxia:394,knight:450};
const cache=new WeakMap();
export function fashionRect(im,set,slot,view=0){
 let all=cache.get(im);if(!all){all=new Map();cache.set(im,all);}const key=slot+view;if(all.has(key))return all.get(key);
 const w=im.width/3,split=SPLIT[set]/1024*im.height,sy=slot==='hat'?0:split,sh=slot==='hat'?split:im.height-split;
 let r=[Math.floor(view*w),Math.floor(sy),Math.floor(w),Math.floor(sh)];
 // Read alpha once to trim transparent padding; never alters or uploads the source image.
 if(typeof document!=='undefined')try{const c=document.createElement('canvas');c.width=r[2];c.height=r[3];const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,...r,0,0,c.width,c.height);const a=g.getImageData(0,0,c.width,c.height).data;let l=c.width,t=c.height,rr=0,b=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>80){l=Math.min(l,x);rr=Math.max(rr,x);t=Math.min(t,y);b=Math.max(b,y);}if(rr>l&&b>t)r=[r[0]+l,r[1]+t,rr-l+1,b-t+1];}catch{}
 all.set(key,r);return r;
}
export function drawFashionIcon(g,images,id,x,y,size){const it=fashionItem(id),im=it&&images.get(it.file);if(!im)return;const r=fashionRect(im,it.set,it.slot,2),k=size/Math.max(r[2],r[3]);g.drawImage(im,...r,x+(size-r[2]*k)/2,y+(size-r[3]*k)/2,r[2]*k,r[3]*k);}
export function fashionAnchors(hero,actor={},frame=12){
 const back=actor.anim==='walk'&&actor.back;
 let head=[18,-220],body=[10,-165,118,140];
 if(hero==='sword-dragonfly'){head=[38,-235];body=[30,-180,91,145];}
 if(hero==='demon-scorpion'){head=[40,-205];body=[24,-157,112,135];}
 if(hero==='sword-cricket'){head=[12,-220];body=[6,-175,112,145];}
 body[1]-=18;body[2]*=1.12;body[3]+=15;
 if(back){head[0]-=8;body[0]-=10;body[2]*=1.12;}
 if(actor.anim==='attack'||actor.anim==='skill'){
  if(hero==='sword-cockro'){const offsets={8:[-3,13],9:[14,0],10:[40,36],11:[14,0],13:[-20,0]};const o=offsets[frame]||[0,0];head[0]+=o[0];head[1]+=o[1];body[0]+=o[0]*.65;body[1]+=o[1]*.6;}
  else if(hero==='demon-scorpion'){head[0]+=18;head[1]+=32;body[0]+=13;body[1]+=20;}
  else if(hero==='sword-dragonfly'){head[0]-=10;head[1]+=12;body[0]-=12;}
  else {head[0]+=12;head[1]+=20;body[0]+=12;body[1]+=15;}
 }
 if(actor.anim==='hurt'){head[0]-=20;head[1]+=20;body[0]-=10;}
 return {head,body,back};
}
export function drawFashion(g,images,hero,actor,x,y,size,frame){
 const look=actor.appearance;if(!look||(!look.hat&&!look.outfit))return;
 const {head,body,back}=fashionAnchors(hero,actor,frame),unit=size/314;
 g.save();g.translate(x,y);g.scale((actor.face||1)<0?-unit:unit,unit);
 if(actor.dead||actor.anim==='dead'){g.translate(45,-22);g.rotate(-Math.PI/2);g.scale(.8,.8);}
 const coat=fashionItem(look.outfit),ci=coat&&images.get(coat.file);if(ci){const r=fashionRect(ci,coat.set,'outfit',back?1:0);g.drawImage(ci,...r,body[0]-body[2]/2,body[1],body[2],body[3]);}
 const hat=fashionItem(look.hat),hi=hat&&images.get(hat.file);if(hi){const lift=hat.set==='knight'?0:({'sword-cockro':24,'sword-cricket':24,'demon-scorpion':12,'sword-dragonfly':10}[hero]||20);head[1]-=lift;const r=fashionRect(hi,hat.set,'hat',back?1:0),width=hat.set==='knight'?110:160,height=width*r[3]/r[2];const brim=hat.set==='wuxia'?.5:hat.set==='knight'?.6:.87;g.drawImage(hi,...r,head[0]-width/2,head[1]-height*brim,width,height);}
 g.restore();
}

