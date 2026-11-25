// Eight sword-art effects for the 7.2.0 skill books. Pure canvas, fixed particle
// budgets (halved on "low" quality) so low-RAM phones stay smooth.
import {SKILL_BOOK_BY_ID} from './skills.js';

export const SWORD_FX={
 gale:{blade:'#9ff7e4',glow:'#3fd6b5',core:'#f2fffb',rank:'ธรรมดา',rankColor:'#e9e4d6'},
 whirl:{blade:'#ffb15c',glow:'#ff5a1f',core:'#fff4d6',rank:'ธรรมดา',rankColor:'#e9e4d6'},
 serpent:{blade:'#b6ff6a',glow:'#3fbf3a',core:'#f4ffe0',rank:'ดีเยี่ยม',rankColor:'#5aa8ff'},
 flash:{blade:'#e2c8ff',glow:'#9b5cff',core:'#ffffff',rank:'ดีเยี่ยม',rankColor:'#5aa8ff'},
 frost:{blade:'#bdf1ff',glow:'#47b8ff',core:'#ffffff',rank:'หายาก',rankColor:'#4ff08a'},
 moon:{blade:'#e8eeff',glow:'#8aa2ff',core:'#ffffff',rank:'หายาก',rankColor:'#4ff08a'},
 dragon:{blade:'#ffd36b',glow:'#ff3d1f',core:'#fff8e0',rank:'ตำนาน',rankColor:'#ffb440'},
 judgment:{blade:'#fff0a8',glow:'#ffc21f',core:'#ffffff',rank:'ระดับเทพ',rankColor:'#d890ff'}
};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=t=>1-(1-t)**3;
// Deterministic pseudo-random so every frame of one cast agrees with itself.
const rand=(seed,i)=>{const x=Math.sin(seed*12.9898+i*78.233)*43758.5453;return x-Math.floor(x);};

// A sword silhouette pointing along +x from (0,0): blade, guard and grip.
function sword(ctx,x,y,angle,len,pal,alpha=1,width=1){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
 const w=len*.075*width;
 ctx.shadowColor=pal.glow;ctx.shadowBlur=len*.35;
 ctx.fillStyle=pal.blade;ctx.beginPath();ctx.moveTo(0,-w);ctx.lineTo(len*.82,-w*.8);ctx.lineTo(len,0);ctx.lineTo(len*.82,w*.8);ctx.lineTo(0,w);ctx.closePath();ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle=pal.core;ctx.beginPath();ctx.moveTo(0,-w*.25);ctx.lineTo(len*.9,0);ctx.lineTo(0,w*.25);ctx.closePath();ctx.fill();
 ctx.fillStyle=pal.glow;ctx.fillRect(-w*.6,-w*2.6,w*1.2,w*5.2);
 ctx.fillStyle='#3a2a1a';ctx.fillRect(-len*.22,-w*.55,len*.22,w*1.1);
 ctx.restore();
}
// A glowing crescent slash centred on (x,y), opening towards angle.
function crescent(ctx,x,y,angle,r,thick,pal,alpha=1,spread=1.25){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
 const g=ctx.createLinearGradient(0,-r,0,r);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,pal.core);g.addColorStop(1,'rgba(255,255,255,0)');
 ctx.shadowColor=pal.glow;ctx.shadowBlur=r*.5;ctx.fillStyle=pal.blade;
 ctx.beginPath();ctx.arc(0,0,r,-spread,spread);ctx.arc(-thick,0,r-thick*.2,spread,-spread,true);ctx.closePath();ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,-spread*.85,spread*.85);ctx.arc(-thick*.45,0,r-thick*.1,spread*.85,-spread*.85,true);ctx.closePath();ctx.fill();
 ctx.restore();
}
function glowDot(ctx,x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
function groundRing(ctx,c,rx,ry,color,width,alpha=1,start=0,end=Math.PI*2){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(c.x,c.y,rx,ry,0,start,end);ctx.stroke();ctx.restore();}
function zigzag(ctx,a,b,seed,color,width,jitter){ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowColor=color;ctx.shadowBlur=width*4;ctx.beginPath();ctx.moveTo(a.x,a.y);const n=8;for(let i=1;i<n;i++){const u=i/n,ox=(rand(seed,i)-.5)*jitter,oy=(rand(seed,i+40)-.5)*jitter;ctx.lineTo(a.x+(b.x-a.x)*u+ox,a.y+(b.y-a.y)*u+oy);}ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}

export function isSwordSkillEffect(e){return !!(e&&SKILL_BOOK_BY_ID.has(e.skillId));}
export function swordSkillLife(id){return SKILL_BOOK_BY_ID.get(id)?.life||.85;}

export function drawSwordSkill(ctx,e,project,scale,quality='auto'){
 const book=SKILL_BOOK_BY_ID.get(e.skillId);if(!book||!e.aim||!(e.max>0))return false;
 const pal=SWORD_FX[book.fx],low=quality==='low',n=k=>low?Math.ceil(k/2):k;
 const t=clamp(1-e.life/e.max),fade=Math.min(1,e.life/(e.max*.25)),seed=Math.round((e.x||0)+(e.y||0)*3)%997;
 const P=(p,z=0)=>{const q=project(p.x,p.y);return {x:q.x,y:q.y-z*scale};};
 const o=P(e,30),a=P(e.aim,30),og=P(e),ag=P(e.aim);
 const ang=Math.atan2(a.y-o.y,a.x-o.x),dist=Math.hypot(a.x-o.x,a.y-o.y)||1,R=(e.radius||120)*scale;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade;ctx.lineCap='round';
 switch(book.fx){
  case 'gale':{ // three wind crescents racing forward, leaves of wind behind
   for(let i=0;i<3;i++){const u=clamp(t*1.4-i*.14);if(u<=0)continue;const x=o.x+Math.cos(ang)*dist*ease(u),y=o.y+Math.sin(ang)*dist*ease(u);glowDot(ctx,x,y,(60-i*10)*scale,pal.glow,.35*(1-u));crescent(ctx,x,y,ang,(62-i*10)*scale,(18-i*4)*scale,pal,1-u*.5);}
   for(let i=0;i<n(14);i++){const u=clamp(t*1.3-rand(seed,i)*.4),d=dist*u,s=(rand(seed,i+9)-.5)*70*scale;ctx.strokeStyle=pal.blade;ctx.globalAlpha=fade*(1-u)*.8;ctx.lineWidth=2*scale;ctx.beginPath();const x=o.x+Math.cos(ang)*d-Math.sin(ang)*s,y=o.y+Math.sin(ang)*d+Math.cos(ang)*s;ctx.moveTo(x,y);ctx.lineTo(x-Math.cos(ang)*22*scale,y-Math.sin(ang)*22*scale);ctx.stroke();}
   break;}
  case 'whirl':{ // spinning ring of fire blades around the hero, embers flung outward
   const spin=t*Math.PI*5,r=R*(.35+.65*ease(clamp(t*2)));
   groundRing(ctx,og,r,r*.5,pal.glow,6*scale,.7*(1-t));
   for(let i=0;i<n(6);i++){const q=spin+i*Math.PI*2/n(6),x=og.x+Math.cos(q)*r,y=og.y-24*scale+Math.sin(q)*r*.5;sword(ctx,x,y,q+Math.PI/2,52*scale,pal,.95);}
   for(let i=0;i<n(24);i++){const q=rand(seed,i)*Math.PI*2,d=r*(.6+t*1.1*rand(seed,i+3));glowDot(ctx,og.x+Math.cos(q)*d,og.y-20*scale+Math.sin(q)*d*.5-t*40*scale*rand(seed,i+5),6*scale,pal.glow,1-t);}
   crescent(ctx,og.x,og.y-24*scale,spin,r*.8,16*scale,pal,.6*(1-t),2.4);
   break;}
  case 'serpent':{ // a venom blade weaving like a snake, dripping toxic motes
   const head=ease(clamp(t*1.3)),pts=[];for(let i=0;i<=24;i++){const u=head*i/24,d=dist*u,w=Math.sin(u*Math.PI*5-t*8)*28*scale*(1-u*.3);pts.push({x:o.x+Math.cos(ang)*d-Math.sin(ang)*w,y:o.y+Math.sin(ang)*d+Math.cos(ang)*w});}
   ctx.shadowColor=pal.glow;ctx.shadowBlur=18*scale;ctx.strokeStyle=pal.glow;ctx.lineWidth=14*scale;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
   ctx.shadowBlur=0;ctx.strokeStyle=pal.core;ctx.lineWidth=3*scale;ctx.stroke();
   const h=pts.at(-1),h2=pts.at(-2);sword(ctx,h.x,h.y,Math.atan2(h.y-h2.y,h.x-h2.x),58*scale,pal);
   for(let i=0;i<n(16);i++){const p=pts[Math.floor(rand(seed,i)*pts.length)];glowDot(ctx,p.x,p.y+t*30*scale*rand(seed,i+7),7*scale,pal.blade,.8*(1-t));}
   break;}
  case 'flash':{ // lightning-quick lunge: after-images, thunder streak, burst at the end
   const u=ease(clamp(t*2));
   for(let i=0;i<n(6);i++){const k=u*(i+1)/n(6);sword(ctx,o.x+(a.x-o.x)*k-Math.cos(ang)*40*scale,o.y+(a.y-o.y)*k-Math.sin(ang)*40*scale,ang,80*scale,pal,.2+.8*(i+1)/n(6),1.4);}glowDot(ctx,o.x+(a.x-o.x)*u,o.y+(a.y-o.y)*u,46*scale,pal.glow,.7);
   zigzag(ctx,o,{x:o.x+(a.x-o.x)*u,y:o.y+(a.y-o.y)*u},seed+Math.floor(t*12),pal.blade,4*scale,26*scale);
   zigzag(ctx,o,{x:o.x+(a.x-o.x)*u,y:o.y+(a.y-o.y)*u},seed+7+Math.floor(t*12),pal.core,1.5*scale,18*scale);
   if(t>.45){const b=clamp((t-.45)/.55);for(let i=0;i<n(10);i++){const q=i*Math.PI*2/n(10)+seed;zigzag(ctx,a,{x:a.x+Math.cos(q)*80*scale*b,y:a.y+Math.sin(q)*55*scale*b},seed+i,pal.blade,2*scale,14*scale);}glowDot(ctx,a.x,a.y,70*scale*(1-b*.4),pal.glow,1-b);}
   break;}
  case 'frost':{ // a ring of ice swords falls from the sky, shattering into shards
   groundRing(ctx,ag,R,R*.5,pal.glow,3*scale,.9);groundRing(ctx,ag,R*.6,R*.3,pal.blade,2*scale,.6);
   const count=n(12);for(let i=0;i<count;i++){const delay=rand(seed,i)*.45,u=clamp((t-delay)/.3),q=i*Math.PI*2/count+rand(seed,i+2),d=R*(.25+.7*rand(seed,i+4)),gx=ag.x+Math.cos(q)*d,gy=ag.y+Math.sin(q)*d*.5;
    if(u<1)sword(ctx,gx,gy-(1-u)*220*scale,Math.PI/2,64*scale,pal,u>0?1:0);
    else{const s=clamp((t-delay-.3)/.4);for(let k=0;k<5;k++){const sa=-Math.PI/2+(k-2)*.5;ctx.strokeStyle=pal.core;ctx.globalAlpha=fade*(1-s);ctx.lineWidth=2*scale;ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+Math.cos(sa)*26*scale*s,gy+Math.sin(sa)*26*scale*s);ctx.stroke();}ctx.globalAlpha=fade;sword(ctx,gx,gy-30*scale,Math.PI/2,40*scale,pal,1-s);}}
   for(let i=0;i<n(18);i++){const q=rand(seed,i+30)*Math.PI*2,d=R*rand(seed,i+31);glowDot(ctx,ag.x+Math.cos(q)*d,ag.y+Math.sin(q)*d*.5-60*scale*((t+rand(seed,i))%1),4*scale,pal.core,.8);}
   break;}
  case 'moon':{ // silver crescent moon above, orbiting swords and a lunar shock ring
   const r=R*(.4+.6*ease(clamp(t*1.6))),spin=t*Math.PI*3;
   glowDot(ctx,og.x,og.y-120*scale,60*scale,pal.glow,.8*(1-t));
   crescent(ctx,og.x,og.y-120*scale,-Math.PI/2+.4,44*scale,22*scale,pal,1-t*.6,1.5);
   for(let i=0;i<n(8);i++){const q=spin+i*Math.PI*2/n(8),x=og.x+Math.cos(q)*r,y=og.y-30*scale+Math.sin(q)*r*.5;sword(ctx,x,y,q+Math.PI,58*scale,pal,.95);}
   groundRing(ctx,og,r*1.05,r*.52,pal.blade,4*scale,1-t);groundRing(ctx,og,r*1.3*t,r*.65*t,pal.core,2*scale,1-t);
   for(let i=0;i<n(16);i++){const q=rand(seed,i)*Math.PI*2;glowDot(ctx,og.x+Math.cos(q)*r,og.y-30*scale+Math.sin(q)*r*.5,5*scale,pal.core,1-t);}
   break;}
  case 'dragon':{ // a giant flaming sword flies out wrapped in a coiling fire dragon
   const u=ease(clamp(t*1.25)),hx=o.x+(a.x-o.x)*u,hy=o.y+(a.y-o.y)*u,trail=[];
   for(let i=0;i<=30;i++){const k=u*i/30,coil=Math.sin(k*Math.PI*4-t*10)*34*scale*(k/(u||1));trail.push({x:o.x+(a.x-o.x)*k-Math.sin(ang)*coil,y:o.y+(a.y-o.y)*k+Math.cos(ang)*coil});}
   const path=()=>{ctx.beginPath();trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));};
   const body=ctx.createLinearGradient(o.x,o.y,hx,hy);body.addColorStop(0,'rgba(255,80,20,0)');body.addColorStop(.5,pal.glow);body.addColorStop(1,pal.blade);
   ctx.shadowColor=pal.glow;ctx.shadowBlur=24*scale;ctx.strokeStyle=body;ctx.lineWidth=22*scale;path();ctx.stroke();ctx.shadowBlur=0;
   ctx.strokeStyle=pal.core;ctx.lineWidth=4*scale;ctx.globalAlpha=fade*.9;path();ctx.stroke();
   for(let i=2;i<trail.length;i+=3){const p=trail[i],q=trail[i-1],sa=Math.atan2(p.y-q.y,p.x-q.x)+Math.PI/2,w=(4+12*i/trail.length)*scale;ctx.strokeStyle=pal.blade;ctx.lineWidth=2*scale;ctx.beginPath();ctx.moveTo(p.x+Math.cos(sa)*w,p.y+Math.sin(sa)*w);ctx.lineTo(p.x-Math.cos(ang)*8*scale,p.y-Math.sin(ang)*8*scale);ctx.lineTo(p.x-Math.cos(sa)*w,p.y-Math.sin(sa)*w);ctx.stroke();}
   ctx.globalAlpha=fade;const h=trail.at(-1);glowDot(ctx,h.x,h.y,40*scale,pal.glow,.9);ctx.fillStyle=pal.core;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(h.x,h.y);ctx.lineTo(h.x-Math.cos(ang+s*.5)*30*scale,h.y-Math.sin(ang+s*.5)*30*scale);ctx.lineTo(h.x-Math.cos(ang+s*.25)*18*scale,h.y-Math.sin(ang+s*.25)*18*scale);ctx.fill();}
   sword(ctx,hx-Math.cos(ang)*70*scale,hy-Math.sin(ang)*70*scale,ang,110*scale,pal,1,1.3);
   for(let i=0;i<n(20);i++){const p=trail[Math.floor(rand(seed,i)*trail.length)];glowDot(ctx,p.x+(rand(seed,i+1)-.5)*30*scale,p.y-t*40*scale*rand(seed,i+2),8*scale,pal.blade,(1-t)*.9);}
   if(t>.75){const b=(t-.75)/.25;glowDot(ctx,a.x,a.y,110*scale*b,pal.glow,1-b);groundRing(ctx,ag,90*scale*b,45*scale*b,pal.blade,6*scale,1-b);}
   break;}
  case 'judgment':{ // the heavens open: pillars of light, sword rain, then one colossal blade
   const open=clamp(t/.25);
   groundRing(ctx,ag,R,R*.5,pal.glow,5*scale,open);groundRing(ctx,ag,R*.72,R*.36,pal.blade,2*scale,open);
   for(let i=0;i<n(12);i++){const q=i*Math.PI/6+t*.6;ctx.strokeStyle=pal.blade;ctx.globalAlpha=fade*open*.7;ctx.lineWidth=2*scale;ctx.beginPath();ctx.moveTo(ag.x+Math.cos(q)*R*.72,ag.y+Math.sin(q)*R*.36);ctx.lineTo(ag.x+Math.cos(q)*R,ag.y+Math.sin(q)*R*.5);ctx.stroke();}
   ctx.globalAlpha=fade;
   for(let i=0;i<n(6);i++){const q=i*Math.PI/3,px=ag.x+Math.cos(q)*R*.85,py=ag.y+Math.sin(q)*R*.42,g=ctx.createLinearGradient(px,py-320*scale,px,py);g.addColorStop(0,'rgba(255,240,170,0)');g.addColorStop(1,pal.glow);ctx.fillStyle=g;ctx.globalAlpha=fade*open*.55;ctx.fillRect(px-9*scale,py-320*scale,18*scale,320*scale);}
   ctx.globalAlpha=fade;
   for(let i=0;i<n(22);i++){const delay=.1+rand(seed,i)*.5,u=clamp((t-delay)/.18),q=rand(seed,i+3)*Math.PI*2,d=R*.9*Math.sqrt(rand(seed,i+4)),gx=ag.x+Math.cos(q)*d,gy=ag.y+Math.sin(q)*d*.5;if(u<=0)continue;if(u<1)sword(ctx,gx,gy-(1-u)*300*scale,Math.PI/2,46*scale,pal);else glowDot(ctx,gx,gy,14*scale,pal.core,1-clamp((t-delay-.18)/.3));}
   const big=clamp((t-.45)/.25),bx=ag.x,by=ag.y-(1-ease(big))*420*scale;
   if(t>.45){sword(ctx,bx,by-40*scale,Math.PI/2,220*scale,pal,1,1.6);}
   if(t>.7){const b=clamp((t-.7)/.3);glowDot(ctx,ag.x,ag.y,R*1.3*b,pal.glow,1-b);groundRing(ctx,ag,R*1.4*b,R*.7*b,pal.core,8*scale,1-b);for(let i=0;i<n(16);i++){const q=i*Math.PI*2/n(16);zigzag(ctx,ag,{x:ag.x+Math.cos(q)*R*1.2*b,y:ag.y+Math.sin(q)*R*.6*b},seed+i,pal.blade,2*scale,16*scale);}}
   break;}
 }
 ctx.restore();return true;
}

// Inline SVG icon for the shop and the skill buttons.
export function skillBookIcon(id,size=40){
 const b=SKILL_BOOK_BY_ID.get(id);if(!b)return '';const p=SWORD_FX[b.fx];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="${p.glow}" stop-opacity=".9"/><stop offset="1" stop-color="#08111b"/></radialGradient></defs><rect width="40" height="40" rx="6" fill="url(#g)"/><g transform="rotate(-45 20 20)"><path d="M19 4 L21 4 L22 28 L18 28 Z" fill="${p.blade}" stroke="${p.core}" stroke-width=".8"/><rect x="14" y="28" width="12" height="2.5" rx="1" fill="${p.glow}"/><rect x="18.8" y="30.5" width="2.4" height="6" fill="#3a2a1a"/></g><circle cx="20" cy="20" r="17" fill="none" stroke="${p.rankColor}" stroke-width="1.5"/></svg>`;
 return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
