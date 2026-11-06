// Requires sharp. Uniformly resample full poses; never rotate, warp or separate limbs.
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp':'sharp');
const base=new URL('../',import.meta.url).pathname;
const sources=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
fs.mkdirSync(base+'web/heroes',{recursive:true});
const reports={};
async function readCells(path){
 const {data,info}=await sharp(path).ensureAlpha().raw().toBuffer({resolveWithObject:true});const cells=[];
 for(let i=0;i<8;i++){
  const x0=Math.round((i%4)*info.width/4),x1=Math.round((i%4+1)*info.width/4),y0=Math.round(Math.floor(i/4)*info.height/2),y1=Math.round((Math.floor(i/4)+1)*info.height/2);
  let left=x1,top=y1,right=x0,bottom=y0,count=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
  if(count<100)throw Error('Missing pose '+path+':'+i);
  let hx=0,hn=0;for(let y=top;y<top+(bottom-top)*.22;y++)for(let x=left;x<=right;x++)if(data[(y*info.width+x)*4+3]>96){hx+=x;hn++;}
  cells.push({left,top,width:right-left+1,height:bottom-top+1,headX:hn?hx/hn-left:(right-left)/2,path});
 }
 return cells;
}
for(const [id,paths]of Object.entries(sources)){
 const front=await readCells(paths.front),back=await readCells(paths.back),actions=await readCells(paths.actions);
 const walk=[...front,...back];reports[id]={};
 for(const [kind,frames]of [['walk',walk],['actions',actions]]){
  const standing=kind==='walk'?frames:frames.slice(0,2);
  const median=standing.map(f=>f.height).sort((a,b)=>a-b)[Math.floor(standing.length/2)];
  const ratio=210/median;const layers=[];const details=[];
  for(let i=0;i<frames.length;i++){
   const f=frames[i];let scale=ratio;
   // Death is horizontal; keep it wholly inside its cell, at plausible body length.
   if(kind==='actions'&&i===7)scale=Math.min(216/f.width,110/f.height);
   let w=Math.round(f.width*scale),h=Math.round(f.height*scale);
   if(w>244||h>244){const k=Math.min(244/w,244/h);scale*=k;w=Math.round(f.width*scale);h=Math.round(f.height*scale);}
   const anchor=kind==='actions'&&i>=2?w/2:f.headX*scale;
   const left=Math.max(6,Math.min(250-w,Math.round(128-anchor))),top=233-h;
   const buf=await sharp(f.path).extract({left:f.left,top:f.top,width:f.width,height:f.height}).resize(w,h).png().toBuffer();
   layers.push({input:buf,left:(i%4)*256+left,top:Math.floor(i/4)*256+top});details.push({frame:i,source:f,scale,left,top,width:w,height:h});
  }
  await sharp({create:{width:1024,height:kind==='walk'?1024:512,channels:4,background:'#00000000'}}).composite(layers).webp({quality:90,alphaQuality:100,effort:6}).toFile(base+`web/heroes/${id}-${kind}.webp`);
  reports[id][kind]=details;
 }
}
fs.writeFileSync(base+'docs/hero-packing-report.json',JSON.stringify(reports,null,2));
console.log(Object.keys(reports));
