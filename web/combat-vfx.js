// Screen-projected sci-fi combat. Fixed particle counts keep low-RAM phones bounded.
const PALETTES={'sword-cockro':['#ff7849','#fff2d9'],'demon-scorpion':['#a0f35f','#f1ffd7'],'sword-dragonfly':['#51dcff','#e6ffff'],'sword-cricket':['#ffbd4c','#fff7da']};
export function drawCombatEffect(ctx,e,project,scale,quality='auto'){
 if(!['bolt','wave','circle','field','dash'].includes(e.form)||!e.aim||!(e.max>0))return false;
 const t=Math.max(0,Math.min(1,1-e.life/e.max)),low=quality==='low';
 const [color,core]=PALETTES[e.hero]||[e.color||'#60eaff','#efffff'];
 const origin={x:e.x,y:e.y},dx=e.aim.x-e.x,dy=e.aim.y-e.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,r=e.radius||120;
 const point=(p,z=28)=>{const q=project(p.x,p.y);return {x:q.x,y:q.y-z*scale};};
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=Math.min(1,(1-t)*5);ctx.lineCap='round';ctx.lineJoin='round';
 const line=(points,c,width)=>{ctx.strokeStyle=c;ctx.lineWidth=Math.max(.5,width*scale);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();};
 const ring=(center,radius,start=0,end=Math.PI*2,width=2,z=5)=>{const points=[];for(let i=0;i<=32;i++){const a=start+(end-start)*i/32;points.push(point({x:center.x+Math.cos(a)*radius,y:center.y+Math.sin(a)*radius},z));}line(points,color,width);};
 const bolt=(from,to,u,arrow=true)=>{const a=point(from),b=point(to),vx=b.x-a.x,vy=b.y-a.y,n=Math.hypot(vx,vy)||1,tx=vx/n,ty=vy/n,head={x:a.x+vx*u,y:a.y+vy*u};
  const tail={x:head.x-tx*Math.min(n*u,75*scale),y:head.y-ty*Math.min(n*u,75*scale)};
  line([tail,head],color,low?6:10);line([tail,head],core,2);
  if(arrow){line([{x:head.x-tx*16*scale-ty*7*scale,y:head.y-ty*16*scale+tx*7*scale},head,{x:head.x-tx*16*scale+ty*7*scale,y:head.y-ty*16*scale-tx*7*scale}],core,2.5);}
  if(!low){for(let i=1;i<4;i++){const d=i*21*scale;line([{x:head.x-tx*d-ty*4*scale,y:head.y-ty*d+tx*4*scale},{x:head.x-tx*(d+8*scale)-ty*4*scale,y:head.y-ty*(d+8*scale)+tx*4*scale}],color,1);}}
 };
 if(e.form==='bolt'){
  bolt(origin,e.aim,Math.min(1,t*1.25),e.hero==='sword-dragonfly');
  if(t<.2)ring(origin,12+t*80,0,Math.PI*2,2,28);
  if(t>.78){const a=point(e.aim);for(let i=0;i<(low?6:10);i++){const angle=i*Math.PI*2/(low?6:10),d=(t-.78)*170*scale;line([{x:a.x+Math.cos(angle)*d*.25,y:a.y+Math.sin(angle)*d*.25},{x:a.x+Math.cos(angle)*d,y:a.y+Math.sin(angle)*d}],color,2);}}
 }else if(e.form==='field'){
  // Segmented targeting lattice; orbital ion strikes / nanite emitters / sonic pulses.
  for(let i=0;i<6;i++)ring(e.aim,r,i*Math.PI/3+.05,i*Math.PI/3+.85,2);
  ring(e.aim,r*.76,t*2,t*2+Math.PI*1.7,1);
  const count=low?4:8;
  for(let i=0;i<count;i++){const phase=(t+i/count)%1,a=i*2.399,rad=r*Math.sqrt((i+.5)/count)*.78,c={x:e.aim.x+Math.cos(a)*rad,y:e.aim.y+Math.sin(a)*rad};
   if(e.hero==='sword-cricket'){ring(c,phase*55,0,Math.PI*2,3);}
   else{const base=point(c,8),top=point(c,8+(1-phase)*150);line([top,base],color,low?3:6);line([top,base],core,1);ring(c,10+phase*24,0,Math.PI*2,1);}
  }
 }else if(e.form==='circle'){
  const count=e.hero==='sword-cricket'?3:2;
  for(let i=0;i<count;i++){const radius=r*(.3+((t+i/count)%1)*.7);if(e.hero==='sword-cricket'){ring(origin,radius,0,Math.PI*2,4-i);}
   else for(let k=0;k<3;k++){const a=t*5+k*Math.PI*2/3+i*.3;ring(origin,radius,a,a+1.4,6-i*2,18);}}
 }else if(e.hero==='sword-dragonfly'){
  for(let i=-2;i<=2;i++){const aim={x:e.aim.x-uy*i*r*.36,y:e.aim.y+ux*i*r*.36};bolt(origin,aim,Math.min(1,t*1.3),true);}
 }else{
  const reach=e.range||len,travel=reach*Math.min(1,t*1.4),center={x:e.x+ux*travel,y:e.y+uy*travel};
  const points=[];for(let i=0;i<=20;i++){const n=i/10-1,curve=(1-n*n)*35;points.push(point({x:center.x-uy*n*r+ux*curve,y:center.y+ux*n*r+uy*curve}));}
  line(points,color,low?7:12);line(points,core,2.5);
  if(e.hero==='sword-cricket')for(let j=1;j<=2;j++)line(points.map(p=>({x:p.x-j*ux*18*scale,y:p.y-j*uy*9*scale})),color,2);
  for(let i=0;i<(low?4:8);i++){const side=Math.sin(i*9.1)*r,trail=30+(i%4)*22;line([point({x:center.x-uy*side-ux*trail,y:center.y+ux*side-uy*trail}),point({x:center.x-uy*side,y:center.y+ux*side})],color,1.5);}
 }
 ctx.restore();return true;
}
