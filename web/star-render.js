// Procedural renderer for the ดาวฮีโร่ tile map: cached ground chunks, cliff faces over open space,
// depth-sorted props, warp gates, a parallax starfield and the minimap. No image assets are required.
import {STAR_ZONES} from './star-data.js';

const CH=12, PAD=10, FACE=180;
const hexRgb=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const shade=(a,f)=>a.map(v=>Math.max(0,Math.min(255,v*f)));
const rgb=(a,al=1)=>al>=1?`rgb(${a[0]|0},${a[1]|0},${a[2]|0})`:`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${al})`;
const hash=(x,y,s=0)=>{let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(s+1,2246822519);h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;};
const sm=t=>t*t*(3-2*t);
const vnoise=(x,y,s)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=sm(x-xi),yf=sm(y-yi),a=hash(xi,yi,s),b=hash(xi+1,yi,s),c=hash(xi,yi+1,s),d=hash(xi+1,yi+1,s);return a+(b-a)*xf+(c-a)*yf+(a-b-c+d)*xf*yf;};
const iso=(x,y)=>[.8*(x-y),.4*(x+y)];
const HOLE=new Set(['void','chasm']);
const LIQUID=new Set(['water','lava','acid','mist']);
const ROADLIKE=new Set(['road','bridge','plaza']);
function canvas(w,h){const c=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(Math.max(1,Math.ceil(w)),Math.max(1,Math.ceil(h))):Object.assign(document.createElement('canvas'),{width:Math.max(1,Math.ceil(w)),height:Math.max(1,Math.ceil(h))});return c;}

export function createStarRenderer(scene,{quality='auto',art={},images=new Map()}={}){
 const {N,rows,T}=scene,res=quality==='low'?.6:1;
 // Painted art (tools/pack-star-art.py): seamless ground textures mapped through the isometric projection,
 // and per-zone prop atlases. Zones without art keep the procedural look.
 const TEX_WORLD=520;
 const texOf=(z,key)=>{const f=art[z]?.[key]?.file;return f?images.get(f):null;};
 const patternMatrix=typeof DOMMatrix!=='undefined'?new DOMMatrix([.8*TEX_WORLD/1024,.4*TEX_WORLD/1024,-.8*TEX_WORLD/1024,.4*TEX_WORLD/1024,0,0]):null;
 function patternFor(g,cache,z,key){const id=z+key;if(cache.has(id))return cache.get(id);const im=texOf(z,key);let pt=null;if(im&&patternMatrix){pt=g.createPattern(im,'repeat');pt.setTransform(patternMatrix);}cache.set(id,pt);return pt;}
 const at=(c,r)=>c<0||r<0||c>=N||r>=rows?-1:r*N+c;
 const kindAt=(c,r)=>{const i=at(c,r);return i<0?'void':scene.kind[i];};
 const hole=(c,r)=>HOLE.has(kindAt(c,r));
 const zc=i=>STAR_ZONES[Math.max(0,scene.zone[i])];
 const groundRgb=(i,c,r)=>{const Z=zc(i),a=hexRgb(Z.ground[0]),b=hexRgb(Z.ground[1]);const n=vnoise(c/6,r/6,3)*.75+vnoise(c/2.5,r/2.5,8)*.25,v=scene.variant[i]?.25:0;return shade(mix(a,b,Math.min(1,n*.75+v)),.985+hash(c,r,9)*.03);};
 const colorOf=(i,c,r)=>{const k=scene.kind[i],Z=zc(i);if(k==='ground')return groundRgb(i,c,r);if(k==='road')return shade(mix(hexRgb('#cdb98d'),hexRgb(Z.ground[0]),.22),.95+hash(c,r,4)*.1);if(k==='plaza')return shade(hexRgb('#9aa4b0'),.93+hash(c,r,5)*.08);if(k==='bridge')return hexRgb('#8a6a4a');if(LIQUID.has(k))return hexRgb(scene.color[i]||Z.liquid.color);return [0,0,0];};

 // ---------- ground chunks ----------
 const chunks=new Map(),order=[];const CW=CH*T;
 const chunkBox=(cx,cy)=>{const x0=cx*CW,y0=cy*CW;return {x0,y0,X:.8*(x0-y0-CW)-PAD,Y:.4*(x0+y0)-PAD,w:1.6*CW+PAD*2,h:.8*CW+FACE+PAD*2};};
 function diamond(g,pts){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<4;k++)g.lineTo(pts[k][0],pts[k][1]);g.closePath();}
 function buildChunk(cx,cy){
  const box=chunkBox(cx,cy);let any=false;
  for(let r=cy*CH;r<cy*CH+CH&&!any;r++)for(let c=cx*CH;c<cx*CH+CH;c++){const k=kindAt(c,r);if(k!=='void'&&k!=='chasm'){any=true;break;}}
  if(!any)return null;
  const cv=canvas(box.w*res,box.h*res),g=cv.getContext('2d');g.scale(res,res);g.translate(-box.X,-box.Y);g.lineJoin='round';
  const corners=(c,r,grow=.7)=>{const x=c*T,y=r*T;const p=[iso(x,y),iso(x+T,y),iso(x+T,y+T),iso(x,y+T)];return [[p[0][0],p[0][1]-grow],[p[1][0]+grow,p[1][1]],[p[2][0],p[2][1]+grow],[p[3][0]-grow,p[3][1]]];};
  const tiles=[];for(let s=(cx+cy)*CH;s<=(cx+cy)*CH+2*CH-2;s++)for(let c=cx*CH;c<cx*CH+CH;c++){const r=s-c;if(r<cy*CH||r>=cy*CH+CH)continue;tiles.push([c,r]);}
  // Pass 1: land tops, decals and cliff faces, back to front.
  const pats=new Map();
  for(const [c,r]of tiles){const i=at(c,r),k=scene.kind[i];if(HOLE.has(k))continue;
   const wet=LIQUID.has(k)&&k!=='mist',col=wet?shade(groundRgb(i,c,r),.8):colorOf(i,c,r),P=corners(c,r),[X,Y]=iso((c+.5)*T,(r+.5)*T),h=hash(c,r,1),z=scene.zone[i];
   const tex=k!=='plaza'&&k!=='bridge'&&(texOf(z,'ground2')&&vnoise(c/7,r/7,5)>.56?patternFor(g,pats,z,'ground2'):patternFor(g,pats,z,'ground'));
   if(tex){g.fillStyle=tex;diamond(g,P);g.fill();g.fillStyle=`rgba(0,0,0,${(.16*vnoise(c/9,r/9,6)).toFixed(3)})`;g.fill();
    if(k==='road'){g.fillStyle=rgb(col,.62);g.fill();edgeLines(g,c,r,P,col,k);}
    else if(k==='mist'){g.fillStyle='rgba(225,220,255,.18)';g.beginPath();g.ellipse(X,Y,30,13,0,0,7);g.fill();}}
   else if(k==='mist'){g.fillStyle=rgb(groundRgb(i,c,r));diamond(g,P);g.fill();}else{g.fillStyle=rgb(col);diamond(g,P);g.fill();}
   if(tex||wet){/* textured ground carries its own detail; shoreline drawn in pass 2 */}
   else if(k==='road'||k==='plaza'||k==='bridge')edgeLines(g,c,r,P,col,k);
   else if(k==='mist'){g.fillStyle='rgba(225,220,255,.18)';g.beginPath();g.ellipse(X,Y,30,13,0,0,7);g.fill();}
   else decals(g,c,r,X,Y,z,col,h);
   // Cliff faces over open space (zone chasms and the planet rim).
   const deepR=hole(c+3,r)&&hole(c+6,r)?FACE:95,deepL=hole(c,r+3)&&hole(c,r+6)?FACE:95;
   const thick=k==='bridge'?10:0;
   if(hole(c+1,r))face(g,P[1],P[2],thick||deepR,shade(k==='bridge'?col:faceRgb(i),.62),c,r);
   if(hole(c,r+1))face(g,P[2],P[3],thick||deepL,shade(k==='bridge'?col:faceRgb(i),.45),c,r+7);
  }
  // Pass 2: liquids as overlapping ellipses (rounded shores), including the ring of tiles around the chunk so seams match.
  const wet=[];for(let r=cy*CH-1;r<=cy*CH+CH;r++)for(let c=cx*CH-1;c<=cx*CH+CH;c++){const i=at(c,r);if(i>=0&&LIQUID.has(scene.kind[i])&&scene.kind[i]!=='mist')wet.push([c,r,i]);}
  const blob=(c,r,k)=>{const [X,Y]=iso((c+.5)*T,(r+.5)*T);g.beginPath();g.ellipse(X,Y,.8*T*k,.4*T*k,0,0,7);g.fill();};
  for(const [c,r,i]of wet){const col=colorOf(i,c,r),kd=scene.kind[i];g.fillStyle=kd==='lava'?'#3a2622':kd==='acid'?rgb(shade(col,.55)):rgb(mix(col,[235,245,240],.55));blob(c,r,1.14);}
  for(const [c,r,i]of wet){const col=colorOf(i,c,r);g.fillStyle=rgb(shade(col,.88+vnoise(c/3,r/3,7)*.22));blob(c,r,1.0);}
  for(const [c,r,i]of wet){const kd=scene.kind[i],col=colorOf(i,c,r),[X,Y]=iso((c+.5)*T,(r+.5)*T),h=hash(c,r,11);
   if(kd==='water'&&h>.45){g.strokeStyle=rgb(shade(col,1.5),.5);g.lineWidth=1.4;g.beginPath();g.moveTo(X-14+h*8,Y-2);g.quadraticCurveTo(X,Y-6,X+12,Y-1);g.stroke();}
   else if(kd==='lava'){g.strokeStyle='rgba(255,226,120,.8)';g.lineWidth=2;g.beginPath();g.moveTo(X-18,Y+h*6-3);g.lineTo(X-3,Y+2);g.lineTo(X+9,Y-4+h*4);g.lineTo(X+20,Y);g.stroke();}
   else if(kd==='acid'){g.fillStyle='rgba(220,255,170,.55)';for(let n=0;n<2;n++){g.beginPath();g.arc(X-12+hash(c,r,n+20)*24,Y-5+hash(c,r,n+30)*10,1.5+hash(c,r,n)*2,0,7);g.fill();}}}
  return cv;
 }
 const faceRgb=i=>{const Z=zc(i),avg=art[scene.zone[i]]?.ground?.avg;return mix(hexRgb(avg||Z.ground[0]),[96,78,70],.5);};
 function face(g,a,b,D,col,c,r){
  const grd=g.createLinearGradient(0,Math.min(a[1],b[1]),0,Math.max(a[1],b[1])+D);grd.addColorStop(0,rgb(col));grd.addColorStop(.35,rgb(shade(col,.72)));grd.addColorStop(1,rgb(shade(col,.35),0));
  g.fillStyle=grd;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(b[0],b[1]+D);g.lineTo(a[0],a[1]+D);g.closePath();g.fill();
  if(D<20)return;
  g.strokeStyle=rgb(shade(col,.55),.6);g.lineWidth=1;for(let n=1;n<=3;n++){const o=D*n*.18+hash(c,r,n)*4;g.beginPath();g.moveTo(a[0],a[1]+o);g.lineTo(b[0],b[1]+o);g.stroke();}
  if(hash(c,r,77)>.72){g.fillStyle='rgba(140,230,255,.75)';const t=hash(c,r,78),y=D*(.25+.3*hash(c,r,79));g.beginPath();g.arc(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+y,1.8,0,7);g.fill();}
 }
 function edgeLines(g,c,r,P,col,k){
  if(k==='plaza'){g.strokeStyle=rgb(shade(col,.8),.7);g.lineWidth=1;g.beginPath();g.moveTo((P[0][0]+P[1][0])/2,(P[0][1]+P[1][1])/2);g.lineTo((P[3][0]+P[2][0])/2,(P[3][1]+P[2][1])/2);g.moveTo((P[0][0]+P[3][0])/2,(P[0][1]+P[3][1])/2);g.lineTo((P[1][0]+P[2][0])/2,(P[1][1]+P[2][1])/2);g.stroke();g.strokeStyle=rgb(shade(col,.72),.8);diamond(g,P);g.stroke();return;}
  if(k==='bridge'){g.strokeStyle='rgba(60,40,26,.7)';g.lineWidth=1.3;for(let n=1;n<4;n++){const t=n/4;g.beginPath();g.moveTo(P[0][0]+(P[3][0]-P[0][0])*t,P[0][1]+(P[3][1]-P[0][1])*t);g.lineTo(P[1][0]+(P[2][0]-P[1][0])*t,P[1][1]+(P[2][1]-P[1][1])*t);g.stroke();}
   g.strokeStyle='rgba(120,230,255,.8)';g.lineWidth=2;if(hole(c-1,r)){g.beginPath();g.moveTo(P[0][0],P[0][1]);g.lineTo(P[3][0],P[3][1]);g.stroke();}if(hole(c+1,r)){g.beginPath();g.moveTo(P[1][0],P[1][1]);g.lineTo(P[2][0],P[2][1]);g.stroke();}if(hole(c,r-1)){g.beginPath();g.moveTo(P[0][0],P[0][1]);g.lineTo(P[1][0],P[1][1]);g.stroke();}if(hole(c,r+1)){g.beginPath();g.moveTo(P[3][0],P[3][1]);g.lineTo(P[2][0],P[2][1]);g.stroke();}return;}
  // road: pebbles plus darker borders toward non-road ground
  g.fillStyle=rgb(shade(col,.78),.8);for(let n=0;n<3;n++){const [X,Y]=iso((c+hash(c,r,n+40))*T,(r+hash(c,r,n+50))*T);g.beginPath();g.ellipse(X,Y,2.2,1.2,0,0,7);g.fill();}
  g.strokeStyle=rgb(shade(col,.7),.55);g.lineWidth=2;
  const edge=(dc,dr,a,b)=>{const kk=kindAt(c+dc,r+dr);if(!ROADLIKE.has(kk)&&!HOLE.has(kk)){g.beginPath();g.moveTo(P[a][0],P[a][1]);g.lineTo(P[b][0],P[b][1]);g.stroke();}};
  edge(-1,0,0,3);edge(1,0,1,2);edge(0,-1,0,1);edge(0,1,3,2);
 }
 function decals(g,c,r,X,Y,z,col,h){
  const dark=rgb(shade(col,.78),.8),light=rgb(shade(col,1.18),.75);
  const grassy=[0,1,2,4].includes(z);
  if(grassy){g.lineWidth=1.2;for(let n=0;n<3;n++){if(hash(c,r,n+60)>.55)continue;const ox=X-20+hash(c,r,n+61)*40,oy=Y-8+hash(c,r,n+62)*16;g.strokeStyle=n%2?dark:light;g.beginPath();g.moveTo(ox-3,oy-4);g.lineTo(ox,oy);g.lineTo(ox+3,oy-5);g.stroke();}}
  if((z===0||z===2)&&h>.86){const f=['#ffd36e','#ff9ec4','#fff6f0','#b9a7ff'][Math.floor(hash(c,r,7)*4)];g.fillStyle=f;for(let n=0;n<4;n++){g.beginPath();g.arc(X-10+hash(c,r,n+70)*20,Y-4+hash(c,r,n+80)*8,1.6,0,7);g.fill();}}
  if((z===1||z===5||z===8||z===10)&&h>.8){g.fillStyle=z===10?'rgba(214,170,255,.8)':z===8?'rgba(255,120,220,.85)':'rgba(140,240,255,.8)';for(let n=0;n<3;n++){g.beginPath();g.arc(X-14+hash(c,r,n+90)*28,Y-6+hash(c,r,n+91)*12,1.3,0,7);g.fill();}}
  if(z===6||z===8||z===9){g.strokeStyle=rgb(shade(col,.82),.7);g.lineWidth=1;if(h>.55){g.beginPath();g.moveTo(X-16,Y);g.lineTo(X-4,Y-3+h*3);g.lineTo(X+8,Y+2);g.stroke();}}
  if((z===3||z===7)&&h>.82){g.fillStyle=rgb(shade(col,.72),.8);g.beginPath();g.ellipse(X+6,Y,3,1.5,.4,0,7);g.fill();}
  if(z===11&&h>.78){g.strokeStyle='rgba(255,140,60,.85)';g.lineWidth=1.6;g.beginPath();g.moveTo(X-14,Y-2);g.lineTo(X-2,Y+3);g.lineTo(X+12,Y-3);g.stroke();}
  if((z===0||z===7||z===11)&&h<.018){g.fillStyle=rgb(shade(col,.7));g.beginPath();g.ellipse(X,Y,22,10,0,0,7);g.fill();g.fillStyle=rgb(shade(col,.9));g.beginPath();g.ellipse(X+2,Y+2,16,7,0,0,7);g.fill();}
  if(!grassy&&h>.9){g.fillStyle=dark;g.beginPath();g.ellipse(X-8+h*10,Y,2.5,1.4,0,0,7);g.fill();}
 }
 function chunk(cx,cy,budget){const key=cx+','+cy;if(chunks.has(key)){const v=chunks.get(key);return v;}if(budget.n<=0)return undefined;budget.n--;const cv=buildChunk(cx,cy);chunks.set(key,cv);order.push(key);while(order.length>(quality==='low'?14:22)){const old=order.shift();chunks.delete(old);}return cv;}

 // ---------- starfield ----------
 const stars=canvas(512,512);{const g=stars.getContext('2d');for(let n=0;n<170;n++){const a=hash(n,1,500),b=hash(n,2,500),s=hash(n,3,500);g.fillStyle=`rgba(${200+s*55|0},${210+s*45|0},255,${.35+s*.6})`;g.beginPath();g.arc(a*512,b*512,s>.93?1.7:s*.9+.3,0,7);g.fill();}}
 let sky=null;
 function drawSpace(ctx,view){
  const {w,h}=view;
  // Gradient + nebulae are cached per screen size; only the parallax star layer moves.
  if(!sky||sky.width!==Math.ceil(w)||sky.height!==Math.ceil(h)){sky=canvas(w,h);const g=sky.getContext('2d');const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#070b22');bg.addColorStop(1,'#120a2a');g.fillStyle=bg;g.fillRect(0,0,w,h);
   for(const [x,y,r,c]of [[.25,.3,.5,'120,70,190,.22'],[.8,.75,.45,'40,140,200,.18']]){const n=g.createRadialGradient(w*x,h*y,10,w*x,h*y,w*r);n.addColorStop(0,`rgba(${c})`);n.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=n;g.fillRect(0,0,w,h);}}
  ctx.drawImage(sky,0,0,w,h);
  const px=-(view.camX*.12)%512,py=-(view.camY*.12)%512;for(let x=px-512;x<w;x+=512)for(let y=py-512;y<h;y+=512)ctx.drawImage(stars,x,y);
 }
 // view: {scale, ox, oy, w, h, camX, camY}; screen = o + iso*scale
 function visibleTiles(view,margin=2){
  const inv=(sx,sy)=>{const X=(sx-view.ox)/view.scale,Y=(sy-view.oy)/view.scale,a=X/.8,b=Y/.4;return {x:(a+b)/2,y:(b-a)/2};};
  const pts=[inv(0,0),inv(view.w,0),inv(0,view.h+FACE*view.scale),inv(view.w,view.h+FACE*view.scale),inv(0,-120*view.scale),inv(view.w,-120*view.scale)];
  const xs=pts.map(p=>p.x/T),ys=pts.map(p=>p.y/T);
  return {c0:Math.max(0,Math.floor(Math.min(...xs))-margin),c1:Math.min(N-1,Math.ceil(Math.max(...xs))+margin),r0:Math.max(0,Math.floor(Math.min(...ys))-margin),r1:Math.min(rows-1,Math.ceil(Math.max(...ys))+margin)};
 }
 function drawGround(ctx,view){
  drawSpace(ctx,view);
  const v=visibleTiles(view,CH);const budget={n:2};const list=[];
  for(let cy=Math.floor(v.r0/CH);cy<=Math.floor(v.r1/CH);cy++)for(let cx=Math.floor(v.c0/CH);cx<=Math.floor(v.c1/CH);cx++){const b=chunkBox(cx,cy),sx=view.ox+b.X*view.scale,sy=view.oy+b.Y*view.scale;if(sx>view.w||sy>view.h||sx+b.w*view.scale<0||sy+b.h*view.scale<0)continue;list.push([cx,cy,sx,sy,b]);}
  list.sort((a,b)=>(a[0]+a[1])-(b[0]+b[1])||Math.hypot(a[2]-view.w/2,a[3]-view.h/2)-Math.hypot(b[2]-view.w/2,b[3]-view.h/2));
  let missing=0;
  for(const [cx,cy,sx,sy,b]of list){const cv=chunk(cx,cy,budget);if(cv===undefined){missing++;continue;}if(cv)ctx.drawImage(cv,sx,sy,b.w*view.scale,b.h*view.scale);}
  return missing;
 }
 function warm(view){const v=visibleTiles(view,CH),budget={n:999};for(let cy=Math.floor(v.r0/CH);cy<=Math.floor(v.r1/CH);cy++)for(let cx=Math.floor(v.c0/CH);cx<=Math.floor(v.c1/CH);cx++)chunk(cx,cy,budget);}

 // ---------- props ----------
 const sprites=new Map();
 function sprite(kind,zone,variant){const key=kind+zone+'.'+variant;if(sprites.has(key))return sprites.get(key);const S=1.3,W=130,H=190,cv=canvas(W*S,H*S),g=cv.getContext('2d');g.scale(S,S);g.translate(W/2,H-14);drawProp(g,kind,STAR_ZONES[zone]||STAR_ZONES[0],variant);const sp={cv,W,H,ax:W/2,ay:H-14};sprites.set(key,sp);return sp;}
 // Atlas order from the prompt: 0-2 trees/plants, 3-4 rocks, 5-6 small structures, 7 glowing landmark.
 // Structures and landmarks only stand inside dense prop clusters so they never overhang paths.
 const ROCKY=new Set(['rock','meteor','wreck']);
 function paintedProp(k,c,r,h){
  let dense=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const j=at(c+dc,r+dr);if(j>=0&&(scene.prop[j]||!scene.walk[j]))dense++;}
  if(dense===9&&hash(c,r,131)<.22)return 5+Math.floor(hash(c,r,132)*3);
  return ROCKY.has(k)?3+Math.floor(h*2):Math.floor(h*3);
 }
 function props(view,out,g){
  const v=visibleTiles(view,1);
  for(let r=v.r0;r<=v.r1;r++)for(let c=v.c0;c<=v.c1;c++){const i=r*N+c,k=scene.prop[i];if(!k)continue;const x=(c+.5)*T,y=(r+.5)*T,[X,Y]=iso(x,y),sx=view.ox+X*view.scale,sy=view.oy+Y*view.scale;if(sx<-90*view.scale||sx>view.w+90*view.scale||sy<-20||sy>view.h+200*view.scale)continue;
   const h=hash(c,r,123),flip=hash(c,r,125)>.5,z=scene.zone[i],atlas=art[z]?.props,aim=atlas&&images.get(atlas.file);
   if(aim){const [cw,ch]=atlas.cell,base=atlas.base,n=paintedProp(k,c,r,h),target=n<3?205:n<5?120:n<7?230:190,sc=target/atlas.heights[n]*(.85+hash(c,r,124)*.3)*view.scale,sx0=n%4*cw,sy0=Math.floor(n/4)*ch;
    out.push({sort:x+y,fn:flip&&n<5?()=>{g.save();g.translate(sx,sy);g.scale(-1,1);g.drawImage(aim,sx0,sy0,cw,ch,-cw/2*sc,-base*sc,cw*sc,ch*sc);g.restore();}:()=>g.drawImage(aim,sx0,sy0,cw,ch,sx-cw/2*sc,sy-base*sc,cw*sc,ch*sc)});continue;}
   const sp=sprite(k,scene.zone[i],Math.floor(h*3)),sc=(.82+hash(c,r,124)*.32)*view.scale;
   out.push({sort:x+y,fn:flip?()=>{g.save();g.translate(sx,sy);g.scale(-1,1);g.drawImage(sp.cv,-sp.ax*sc,-sp.ay*sc,sp.W*sc,sp.H*sc);g.restore();}:()=>g.drawImage(sp.cv,sx-sp.ax*sc,sy-sp.ay*sc,sp.W*sc,sp.H*sc)});}
 }
 return {drawGround,warm,props,visibleTiles,chunkCount:()=>chunks.size};
}

// ---------- prop art ----------
function glow(g,x,y,r,color){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
function shadow(g,w=30,h=10){g.fillStyle='rgba(10,20,25,.32)';g.beginPath();g.ellipse(0,0,w,h,0,0,7);g.fill();}
function blob(g,x,y,r,c1,c2){const gr=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,7);g.fill();}
function drawProp(g,kind,Z,v){
 const leaf=hexRgb(Z.ground[0]),cr=hexRgb(Z.crystal||'#8fe9ff');
 const L=(f,a=1)=>rgb(shade(leaf,f),a),Cc=(f,a=1)=>rgb(shade(cr,f),a);
 const s=1+v*.12;
 switch(kind){
 case 'bulbtree':{shadow(g,34,11);g.strokeStyle='#5a4636';g.lineWidth=7;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-8,-40,4*s,-78*s);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(1,-42);g.quadraticCurveTo(16,-55,22,-70*s);g.stroke();
  for(const [x,y,r]of [[-18,-88,26],[16,-92,24],[0,-110,26],[-4,-80,22],[24,-74,16]])blob(g,x,y*s,r,L(1.35),L(.62));
  for(let n=0;n<5;n++){const x=-24+n*12,y=(-70-((n*37)%40))*s;glow(g,x,y,10,'rgba(255,240,150,.55)');g.fillStyle='#fff3a8';g.beginPath();g.arc(x,y,3,0,7);g.fill();}break;}
 case 'mushroom':{shadow(g,30,10);const cap=['#4fd1c5','#7aa8ff','#c68cff'][v];g.fillStyle='#e9e2cf';g.beginPath();g.moveTo(-7,0);g.quadraticCurveTo(-10,-40,-4,-62*s);g.lineTo(5,-62*s);g.quadraticCurveTo(10,-40,8,0);g.fill();
  glow(g,0,-66*s,48,'rgba(120,255,230,.30)');g.fillStyle=cap;g.beginPath();g.ellipse(0,-66*s,40,20,0,Math.PI,0);g.quadraticCurveTo(20,-58*s,0,-56*s);g.quadraticCurveTo(-20,-58*s,-40,-66*s);g.fill();
  g.fillStyle='rgba(255,255,255,.75)';for(const [x,y]of [[-18,-74],[6,-80],[22,-70],[-4,-68]]){g.beginPath();g.arc(x,y*s,3.4,0,7);g.fill();}
  g.fillStyle='#d8cdb2';g.beginPath();g.ellipse(18,-6,9,5,0,Math.PI,0);g.fill();g.fillStyle=cap;g.beginPath();g.ellipse(18,-12,12,7,0,Math.PI,0);g.fill();break;}
 case 'crystal':{shadow(g,28,9);glow(g,0,-36,52,Cc(1,.35));const shards=[[-14,-50,9,-.25],[2,-72,11,0],[16,-44,8,.3],[-2,-34,7,-.1]];for(const [x,y,w,a]of shards){g.save();g.rotate(a);g.fillStyle=Cc(.75);g.beginPath();g.moveTo(x-w,0);g.lineTo(x-w,y*.55);g.lineTo(x,y*s);g.lineTo(x,0);g.fill();g.fillStyle=Cc(1.25);g.beginPath();g.moveTo(x,0);g.lineTo(x,y*s);g.lineTo(x+w,y*.55);g.lineTo(x+w,0);g.fill();g.strokeStyle=Cc(1.6,.8);g.lineWidth=1;g.beginPath();g.moveTo(x,y*s);g.lineTo(x,0);g.stroke();g.restore();}break;}
 case 'crystaltree':{shadow(g,32,10);g.strokeStyle='#4b5d58';g.lineWidth=6;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.lineTo(-2,-60*s);g.moveTo(-1,-36);g.lineTo(-18,-58);g.moveTo(-1,-44);g.lineTo(16,-66);g.stroke();
  glow(g,0,-82*s,60,Cc(1,.3));for(const [x,y,w,hh]of [[-20,-70,10,30],[14,-82,12,36],[-2,-96,13,40],[0,-64,8,22]]){g.fillStyle=Cc(.8);g.beginPath();g.moveTo(x,y*s-hh);g.lineTo(x+w,y*s);g.lineTo(x,y*s+hh*.4);g.lineTo(x-w,y*s);g.closePath();g.fill();g.fillStyle=Cc(1.3,.9);g.beginPath();g.moveTo(x,y*s-hh);g.lineTo(x+w,y*s);g.lineTo(x,y*s+hh*.4);g.closePath();g.fill();}break;}
 case 'rock':{shadow(g,34,11);g.fillStyle='#6f7476';g.beginPath();g.moveTo(-30,0);g.lineTo(-26,-24*s);g.lineTo(-8,-38*s);g.lineTo(14,-34*s);g.lineTo(30,-14);g.lineTo(26,0);g.closePath();g.fill();g.fillStyle='#8d9294';g.beginPath();g.moveTo(-26,-24*s);g.lineTo(-8,-38*s);g.lineTo(14,-34*s);g.lineTo(4,-20);g.lineTo(-14,-16);g.closePath();g.fill();g.fillStyle=L(1.05,.85);g.beginPath();g.ellipse(-8,-33*s,12,4,-.2,0,7);g.fill();break;}
 case 'meteor':{shadow(g,32,11);g.fillStyle='#3b3436';g.beginPath();g.moveTo(-26,0);g.quadraticCurveTo(-30,-30,-6,-40*s);g.quadraticCurveTo(24,-38,28,-12);g.lineTo(22,0);g.closePath();g.fill();g.fillStyle='#544a4c';g.beginPath();g.ellipse(-4,-28*s,16,9,-.3,0,7);g.fill();
  g.strokeStyle=v===1?'#8fe9ff':'#ff9b4a';g.lineWidth=2;glow(g,0,-20,30,v===1?'rgba(120,220,255,.35)':'rgba(255,140,60,.35)');g.beginPath();g.moveTo(-18,-8);g.lineTo(-6,-20);g.lineTo(4,-12);g.lineTo(16,-26);g.stroke();break;}
 case 'pine':{shadow(g,26,9);g.fillStyle='#4a3a2e';g.fillRect(-4,-26,8,26);for(let n=0;n<4;n++){const y=(-22-n*24)*s,w=34-n*7;g.fillStyle=L(.58+n*.12);g.beginPath();g.moveTo(-w,y);g.lineTo(0,y-38);g.lineTo(w,y);g.quadraticCurveTo(0,y+6,-w,y);g.fill();}g.fillStyle='rgba(240,250,255,.55)';g.beginPath();g.moveTo(-8,-110*s);g.lineTo(0,-122*s);g.lineTo(8,-110*s);g.fill();break;}
 case 'reed':{shadow(g,24,8);g.lineCap='round';for(let n=0;n<7;n++){const x=-16+n*5.5,hh=(36+((n*13)%20))*s;g.strokeStyle=L(.7+(n%3)*.15);g.lineWidth=2;g.beginPath();g.moveTo(x,0);g.quadraticCurveTo(x+4,-hh/2,x+(n%2?5:-3),-hh);g.stroke();if(n%2){g.fillStyle='#6b4a32';g.beginPath();g.ellipse(x+5,-hh-4,2.6,7,0,0,7);g.fill();}}glow(g,8,-50,12,'rgba(200,255,160,.5)');break;}
 case 'lantern':{shadow(g,20,7);g.fillStyle='#7b7f86';g.fillRect(-5,-54,10,54);g.fillRect(-14,-6,28,6);g.fillStyle='#5d6168';g.beginPath();g.moveTo(-18,-60);g.lineTo(0,-74);g.lineTo(18,-60);g.closePath();g.fill();glow(g,0,-50,30,'rgba(150,230,255,.55)');g.fillStyle='#d9f6ff';g.fillRect(-7,-56,14,12);break;}
 case 'tombUnused':{shadow(g,26,8);g.fillStyle='#8c8894';g.beginPath();g.moveTo(-16,0);g.lineTo(-16,-40*s);g.quadraticCurveTo(0,-54*s,16,-40*s);g.lineTo(16,0);g.fill();g.fillStyle='#a6a2ae';g.fillRect(-16,-40*s,5,40*s);g.strokeStyle='#5c5866';g.lineWidth=2;g.beginPath();g.moveTo(0,-36*s);g.lineTo(0,-14);g.moveTo(-7,-28*s);g.lineTo(7,-28*s);g.stroke();
  g.fillStyle='#d64a3c';g.fillRect(6,-30*s,5,16);g.fillStyle=L(.9,.8);g.beginPath();g.ellipse(-6,-2,10,4,0,0,7);g.fill();break;}
 case 'deadtree':{shadow(g,26,8);g.strokeStyle='#4a3f45';g.lineCap='round';g.lineWidth=7;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(6,-40,-4,-80*s);g.stroke();g.lineWidth=3.5;g.beginPath();g.moveTo(2,-40);g.quadraticCurveTo(20,-50,28,-72*s);g.moveTo(-2,-58*s);g.quadraticCurveTo(-22,-62,-26,-84*s);g.moveTo(-4,-80*s);g.lineTo(6,-98*s);g.stroke();break;}
 case 'pillar':{shadow(g,26,9);const hh=(v===2?40:78)*s;g.fillStyle='#4c5168';g.fillRect(-14,-hh,28,hh);g.fillStyle='#656c88';g.fillRect(-14,-hh,9,hh);g.fillStyle='#ff5fd2';for(let n=1;n<4;n++)g.fillRect(-14,-hh*n/4,28,1.5);g.fillStyle='#7a809c';g.fillRect(-19,-hh-8,38,8);g.fillRect(-19,-6,38,6);if(v===2){g.fillStyle='#3e4256';g.beginPath();g.ellipse(24,-4,12,5,0,0,7);g.fill();}break;}
 case 'obelisk':{shadow(g,24,8);g.fillStyle='#4c5470';g.beginPath();g.moveTo(-14,0);g.lineTo(-9,-96*s);g.lineTo(0,-110*s);g.lineTo(9,-96*s);g.lineTo(14,0);g.fill();g.fillStyle='#66708f';g.beginPath();g.moveTo(-14,0);g.lineTo(-9,-96*s);g.lineTo(0,-110*s);g.lineTo(0,0);g.fill();glow(g,0,-60,34,'rgba(120,200,255,.45)');g.fillStyle='#bdf0ff';for(let n=0;n<4;n++)g.fillRect(-3,-82*s+n*16,6,6);break;}
 case 'mound':{shadow(g,34,11);g.fillStyle='#9a6440';g.beginPath();g.moveTo(-30,0);g.quadraticCurveTo(-26,-50,-8,-96*s);g.quadraticCurveTo(0,-108*s,8,-96*s);g.quadraticCurveTo(24,-50,30,0);g.closePath();g.fill();g.fillStyle='#b97d55';g.beginPath();g.moveTo(-30,0);g.quadraticCurveTo(-26,-50,-8,-96*s);g.quadraticCurveTo(-6,-40,-4,0);g.closePath();g.fill();
  g.fillStyle='#4a2c1c';for(const [x,y]of [[-10,-30],[8,-52],[-4,-74],[14,-20]]){g.beginPath();g.ellipse(x,y*s,4,6,0,0,7);g.fill();}g.fillStyle='rgba(255,200,120,.55)';g.beginPath();g.ellipse(-10,-30*s,2,3,0,0,7);g.fill();break;}
 case 'wreck':{shadow(g,40,12);g.fillStyle='#5f666e';g.beginPath();g.moveTo(-34,0);g.lineTo(-28,-26);g.lineTo(-6,-34*s);g.lineTo(18,-28);g.lineTo(34,-6);g.lineTo(28,0);g.closePath();g.fill();g.fillStyle='#7d858e';g.beginPath();g.moveTo(-28,-26);g.lineTo(-6,-34*s);g.lineTo(4,-20);g.lineTo(-18,-14);g.closePath();g.fill();
  g.strokeStyle='#3c4248';g.lineWidth=5;g.lineCap='round';g.beginPath();g.moveTo(10,-24);g.lineTo(24,-58*s);g.lineTo(40,-64*s);g.stroke();g.fillStyle='#b22f2f';g.fillRect(-20,-22,14,6);glow(g,-2,-26,16,v===1?'rgba(255,80,60,.6)':'rgba(90,220,255,.6)');g.fillStyle=v===1?'#ff6a4a':'#8ff0ff';g.beginPath();g.arc(-2,-26,3.5,0,7);g.fill();break;}
 case 'hive':{shadow(g,34,11);const hex=(x,y,r,f,st)=>{g.beginPath();for(let k=0;k<6;k++){const a=Math.PI/3*k+Math.PI/6;g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}g.closePath();g.fillStyle=f;g.fill();g.strokeStyle=st;g.lineWidth=2;g.stroke();};
  const cells=[[-14,-16],[14,-16],[0,-40],[-28,-40],[28,-40],[-14,-64],[14,-64],[0,-88]];for(const [x,y]of cells)hex(x,y*s,14,'#7a6a52','#3f3428');glow(g,0,-52,40,'rgba(255,190,60,.35)');for(const [x,y]of cells.slice(0,5))hex(x,y*s,7,'#f2b230','#a8741a');break;}
 case 'pylon':{shadow(g,22,8);g.fillStyle='#d9dde4';g.beginPath();g.moveTo(-12,0);g.lineTo(-6,-84*s);g.lineTo(6,-84*s);g.lineTo(12,0);g.fill();g.fillStyle='#aeb5c0';g.beginPath();g.moveTo(-12,0);g.lineTo(-6,-84*s);g.lineTo(0,-84*s);g.lineTo(0,0);g.fill();
  g.fillStyle='#c9a24a';g.fillRect(-14,-30,28,5);g.fillRect(-10,-62*s,20,4);glow(g,0,-92*s,26,Cc(1,.55));g.fillStyle=Cc(1.4);g.beginPath();g.arc(0,-92*s,6,0,7);g.fill();g.fillStyle='#3cd6ff';g.fillRect(-2,-78*s,4,40);break;}
 case 'spire':{shadow(g,26,9);glow(g,0,-10,40,'rgba(255,110,40,.4)');g.fillStyle='#2b2224';g.beginPath();g.moveTo(-18,0);g.lineTo(-4,-92*s);g.lineTo(4,-70*s);g.lineTo(10,-100*s);g.lineTo(20,0);g.fill();g.fillStyle='#3d3134';g.beginPath();g.moveTo(-18,0);g.lineTo(-4,-92*s);g.lineTo(0,0);g.fill();g.strokeStyle='#ff8a3c';g.lineWidth=2;g.beginPath();g.moveTo(6,-8);g.lineTo(2,-36);g.lineTo(8,-58*s);g.stroke();break;}
 }
}

// ---------- warp gates ----------
export function drawGate(g,sx,sy,scale,time,{town=false,locked=false}={}){
 const col=town?[255,214,120]:locked?[150,150,165]:[110,225,255];
 g.save();g.translate(sx,sy);g.scale(scale,scale);
 g.strokeStyle=rgb(col,.7);g.lineWidth=2;g.beginPath();g.ellipse(0,0,62,26,0,0,7);g.stroke();
 g.save();g.scale(1,.42);g.rotate(time*.4);g.strokeStyle=rgb(col,.45);g.setLineDash([10,14]);g.lineWidth=3;g.beginPath();g.arc(0,0,74,0,7);g.stroke();g.restore();
 for(const x of [-40,40]){g.fillStyle='#5d6472';g.fillRect(x-7,-92,14,92);g.fillStyle='#7c8494';g.fillRect(x-7,-92,5,92);g.fillStyle='#4a505c';g.fillRect(x-11,-100,22,10);glow(g,x,-104,14,rgb(col,.6));}
 const pulse=.75+Math.sin(time*3)*.15;
 g.save();g.translate(0,-62);g.fillStyle=rgb(col,.16*pulse);g.beginPath();g.ellipse(0,0,30,46,0,0,7);g.fill();g.strokeStyle=rgb(col,.9);g.lineWidth=4;g.beginPath();g.ellipse(0,0,30,46,0,0,7);g.stroke();
 g.rotate(time*1.2);for(let n=0;n<6;n++){const a=n*Math.PI/3;g.fillStyle=rgb(col,.9);g.beginPath();g.arc(Math.cos(a)*30,Math.sin(a)*46,2.6,0,7);g.fill();}g.restore();
 if(!locked)for(let n=0;n<5;n++){const t=(time*.6+n/5)%1;g.fillStyle=rgb(col,1-t);g.beginPath();g.arc(Math.sin(n*2.1)*24,-20-t*90,2,0,7);g.fill();}
 g.restore();
}

// ---------- minimap ----------
export function buildMinimap(scene,art={}){
 const {N,rows}=scene,cv=canvas(N+rows,(N+rows)/2),g=cv.getContext('2d');
 for(let r=0;r<rows;r++)for(let c=0;c<N;c++){const i=r*N+c,k=scene.kind[i];if(HOLE.has(k))continue;const Z=STAR_ZONES[Math.max(0,scene.zone[i])];
  const avg=art[scene.zone[i]]?.ground?.avg;let col=k==='ground'?hexRgb(avg&&!scene.variant[i]?avg:avg?shade(hexRgb(avg),.9).map(Math.round).reduce((s,v)=>s+v.toString(16).padStart(2,'0'),'#'):Z.ground[scene.variant[i]]):k==='road'||k==='bridge'?[226,206,150]:k==='plaza'?[245,245,240]:hexRgb(scene.color[i]||Z.liquid.color);if(scene.prop[i])col=shade(col,.72);
  g.fillStyle=rgb(col);g.fillRect(c-r+rows-1,(c+r)/2,2,1.2);}
 return cv;
}
export function minimapPoint(scene,x,y){const c=x/scene.T,r=y/scene.T;return {x:c-r+scene.rows,y:(c+r)/2};}
