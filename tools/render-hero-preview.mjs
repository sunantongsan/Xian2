// Render the shipping drawHero function using a minimal image-only Canvas adapter.
import fs from 'node:fs';import {createRequire} from 'node:module';
import {drawHero,HERO_IDS,WALK_DISTANCE} from '../web/hero-animation.js';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp':'sharp');
const base=new URL('../',import.meta.url).pathname,images=new Map(),cache=new Map();
for(const id of HERO_IDS)for(const state of ['walk','actions']){const path=base+`web/heroes/${id}-${state}.webp`;if(!fs.existsSync(path))throw new Error('Missing hero sheet '+path);{const meta=await sharp(path).metadata();images.set(`heroes/${id}-${state}.webp`,{path,width:meta.width,height:meta.height});}}
class Canvas{constructor(){this.calls=[];this.state={x:0,y:0,sx:1,sy:1};this.stack=[]}save(){this.stack.push({...this.state})}restore(){this.state=this.stack.pop()}translate(x,y){this.state.x+=x;this.state.y+=y}scale(x,y){this.state.sx*=x;this.state.sy*=y}drawImage(im,sx,sy,sw,sh,dx,dy,dw,dh){this.calls.push({im,srcX:sx,srcY:sy,sw,sh,dx,dy,dw,dh,...this.state})}}
const dir='/tmp/new-hero-frames';fs.mkdirSync(dir,{recursive:true});
const background=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="100%" height="100%" fill="#c6d4cf"/><path d="M0,295H960M0,550H960" stroke="#899f98"/><g font-family="sans-serif" fill="#304d46" font-size="17"><text x="24" y="30">WITHEE XIAN · NEW WHOLE-BODY CHARACTERS · 0.1.7</text><text x="24" y="325">BACK VIEW / MIRRORED ACTIONS</text></g></svg>`);
for(let f=0;f<144;f++){
 const t=f/24,ctx=new Canvas();
 for(let h=0;h<4;h++)for(let row=0;row<2;row++){
  const anim=t<.75?'idle':t<4.75?'walk':t<5.3?'attack':'skill';
  drawHero(ctx,images,HERO_IDS[h],{anim,animTime:anim==='attack'?t-4.75:anim==='skill'?t-5.3:t,walkDistance:(t-.75)*110,face:row===1?-1:1,back:row===1},120+h*240,row===0?295:550,182);
 }
 const layers=[];
 for(const c of ctx.calls){
  const w=Math.round(c.dw),h=Math.round(c.dh),key=[c.im.path,c.srcX,c.srcY,w,c.sx].join(':');
  if(!cache.has(key)){let im=sharp(c.im.path).extract({left:c.srcX,top:c.srcY,width:c.sw,height:c.sh}).resize(w,h);if(c.sx<0)im=im.flop();cache.set(key,await im.png().toBuffer());}
  const left=Math.round(c.x+(c.sx<0?-c.dx-c.dw:c.dx)),top=Math.round(c.y+c.dy);
  layers.push({input:cache.get(key),left,top});
 }
 await sharp(background).composite(layers).png().toFile(dir+'/'+String(f).padStart(3,'0')+'.png');
 if(f%24===0)console.log('frame',f);
}
