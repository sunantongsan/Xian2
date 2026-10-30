// World-space effects share the hit geometry. Bounded geometry, no per-frame textures.
export function drawCombatEffect(ctx,e,project,scale,quality='auto'){
 if(!['wave','circle','field','dash'].includes(e.form))return false;
 const t=Math.max(0,Math.min(1,1-e.life/e.max)),fade=Math.min(1,(1-t)*4),low=quality==='low';
 const origin={x:e.x,y:e.y},dx=e.aim.x-e.x,dy=e.aim.y-e.y,len=Math.hypot(dx,dy)||1;
 const ux=dx/len,uy=dy/len,r=e.radius||120;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade;
 ctx.lineCap='round';ctx.lineJoin='round';
 const line=(points,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width*scale;ctx.beginPath();points.forEach((p,i)=>{const q=project(p.x,p.y);i?ctx.lineTo(q.x,q.y-(p.z||0)*scale):ctx.moveTo(q.x,q.y-(p.z||0)*scale);});ctx.stroke();};
 const arc=(center,radius,start,end,color,width)=>{const points=[];for(let i=0;i<=24;i++){const a=start+(end-start)*i/24;points.push({x:center.x+Math.cos(a)*radius,y:center.y+Math.sin(a)*radius,z:8});}line(points,color,width);};
 const blade=(x,y,z,angle,length)=>{
  const q=project(x,y);ctx.save();ctx.translate(q.x,q.y-z*scale);ctx.rotate(angle);ctx.fillStyle=e.color;
  ctx.beginPath();ctx.moveTo(0,-length*scale);ctx.lineTo(6*scale,-12*scale);ctx.lineTo(0,0);ctx.lineTo(-6*scale,-12*scale);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#fff7da';ctx.lineWidth=1.5*scale;ctx.beginPath();ctx.moveTo(0,-length*scale);ctx.lineTo(0,-8*scale);ctx.stroke();ctx.restore();
 };
 if(e.form==='circle'){
  // Three sweeping crescents rotate through the actual damage radius.
  for(let ring=0;ring<(low?2:3);ring++){
   const angle=t*Math.PI*3+ring*Math.PI*2/3;
   arc(origin,r*(.82+ring*.08),angle,angle+2.2,e.color,10-ring*2);
   arc(origin,r*(.82+ring*.08),angle+.2,angle+2.0,'#fff3ca',2);
  }
  arc(origin,r*(.4+t*.6),0,Math.PI*2,e.color,2*(1-t));
 }else if(e.form==='field'){
  const center=e.aim;
  arc(center,r,0,Math.PI*2,e.color,2);
  arc(center,r*.87,t*2,t*2+Math.PI*1.65,'#fff0b5',1.5);
  const count=low?6:12;
  for(let i=0;i<count;i++){
   const phase=(t+i/count)%1,a=i*2.399,rad=r*Math.sqrt((i+.5)/count)*.88;
   const x=center.x+Math.cos(a)*rad,y=center.y+Math.sin(a)*rad,z=(1-phase)*180;
   blade(x,y,z,-.3,65);
   if(phase>.7)arc({x,y},(phase-.7)*85,0,Math.PI*2,e.color,2);
  }
 }else{
  const reach=e.range||len,travel=reach*Math.min(1,t*1.5),center={x:e.x+ux*travel,y:e.y+uy*travel};
  const points=[];
  for(let i=0;i<=20;i++){const n=i/10-1,curve=(1-n*n)*35;points.push({x:center.x-uy*n*r+ux*curve,y:center.y+ux*n*r+uy*curve,z:30});}
  line(points,e.color,12);line(points,'#e8ffff',3);
  for(let i=0;i<(low?4:10);i++){
   const side=Math.sin(i*9.1)*r,trail=40+(i%4)*30;
   line([{x:center.x-uy*side-ux*trail,y:center.y+ux*side-uy*trail,z:30},{x:center.x-uy*side,y:center.y+ux*side,z:30}],e.color,1.5);
  }
 }
 ctx.restore();return true;
}

