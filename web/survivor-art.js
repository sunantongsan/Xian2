export const files={hero:'heroes/insect-suits/cockroach-male.webp',side:'heroes/insect-suits/cockroach-male-side-walk.webp',enemy:'sprites/alien-forest.webp',pet:'heroes/insect-suits/dragonfly-female.webp'};
function sprite(c,im,col,row,cols,rows,x,y,w,h,flip=false){
 const sw=im.width/cols,sh=im.height/rows;c.save();c.translate(x,y);if(flip)c.scale(-1,1);c.drawImage(im,col*sw,row*sh,sw,sh,-w/2,-h,w,h);c.restore();
}
function oval(c,x,y,a,b,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,a,b,0,0,Math.PI*2);c.fill();}
function ring(c,x,y,rad,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,rad,0,Math.PI*2);c.stroke();}
function gem(c,x,y,size,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-size);c.lineTo(x+size*.72,y);c.lineTo(x,y+size);c.lineTo(x-size*.72,y);c.closePath();c.fill();c.fillStyle='#ffffff95';c.beginPath();c.moveTo(x,y-size);c.lineTo(x,y+size*.4);c.lineTo(x-size*.72,y);c.fill();}
export function paint(c,r,img,w,h){
 const z=Math.max(w/1080,h/1080,Math.min(w,h)/365),vw=w/z,vh=h/z;
 const camX=Math.max(0,Math.min(1080-vw,r.h.x-vw*.5)),camY=Math.max(0,Math.min(1080-vh,r.h.y-vh*.58));
 c.save();c.scale(z,z);c.translate(-camX,-camY);c.drawImage(img.ground,0,0,1080,1080);
 const t=r.t,H=r.h;
 for(const j of r.gems){oval(c,j.x,j.y+2,6,2,'#193a343d');gem(c,j.x,j.y-3,5.5,'#39eaee');}
 if(r.egg){const e=r.egg;ring(c,e.x,e.y,18+2*Math.sin(t*4),'#ffeb91');oval(c,e.x,e.y-9,9,12,'#f5c968');gem(c,e.x,e.y-9,5,'#75ecdb');}
 for(const e of r.enemies)if(e.phase==='warn'){oval(c,e.tx,e.ty,e.radius,e.radius,'#ff482d44');ring(c,e.tx,e.ty,e.radius,'#ff7b60');ring(c,e.tx,e.ty,Math.max(1,e.radius*(1-e.wait/.95)),'#fff2a5');}
 for(const a of [...r.enemies,H].sort((a,b)=>a.y-b.y)){
 if(a===H){const swinging=r.swing>0,dx=swinging?Math.cos(r.swingAngle):a.dx,dy=swinging?Math.sin(r.swingAngle):a.dy,side=Math.abs(dx)>Math.abs(dy),row=side?(dx<0?2:3):dy<0?1:0;
 oval(c,a.x,a.y,14,5,'#1b302b66');if(r.guard>0)c.globalAlpha=.67;
 if(!swinging&&a.moving&&side)sprite(c,img.side,Math.floor(a.walk/12)%8,dx<0?1:0,8,2,a.x,a.y+7,53,64);
 else sprite(c,img.hero,swinging?4+Math.min(2,Math.floor((.27-r.swing)*12)):a.moving?Math.floor(a.walk/15)%4:6,row,13,4,a.x,a.y+5,56,56);
 c.globalAlpha=1;if(swinging){const q=1-r.swing/.27;for(const [width,color] of [[6,'#f7b643a0'],[2,'#fff8cc']]){c.lineWidth=width;c.strokeStyle=color;c.beginPath();c.arc(a.x,a.y-12,42+r.skills.blade*3,r.swingAngle-1.6+q*.5,r.swingAngle-.9+q*2.5);c.stroke();}}
 }else{const e=a,s=e.boss?84:31+e.kind*3;oval(c,e.x,e.y,s*.27,s*.09,'#21302d59');if(e.flash>0)c.globalAlpha=.65;sprite(c,img.enemy,e.kind,e.phase==='warn'?3:1+Math.floor(e.life*5)%2,3,4,e.x,e.y+3,s*1.3,s,Math.cos(e.angle)<0);c.globalAlpha=1;if(e.freeze>0)ring(c,e.x,e.y-8,11,'#98eaff');}
 }
 if(r.pet){const x=H.x+22*Math.cos(t*2),y=H.y-26+Math.sin(t*2)*10;oval(c,x-5,y,6,3,'#cbfcff');oval(c,x+5,y,6,3,'#cbfcff');oval(c,x,y,4,6,'#ecc559');}
 for(let i=0;i<Math.min(5,r.skills.orbit+1)&&r.skills.orbit;i++){const a=t*3+i*6.28/Math.min(5,r.skills.orbit+1);gem(c,H.x+Math.cos(a)*54,H.y+Math.sin(a)*48,7,'#97ffb3');}
 for(const s of r.shots)gem(c,s.x,s.y,s.id==='ice'?8:4,s.id==='ice'?'#8de7ff':'#ffe280');
 for(const f of r.fx){c.globalAlpha=f.left/f.max;if(f.kind==='bolt'){c.strokeStyle=f.color;c.lineWidth=3;c.beginPath();c.moveTo(f.x,f.y);c.lineTo(f.tx-6,f.ty-32);c.lineTo(f.tx+5,f.ty-34);c.lineTo(f.tx,f.ty);c.stroke();}else ring(c,f.x,f.y,Math.max(1,f.tx*(1-f.left/f.max)),f.color,3);}c.globalAlpha=1;
 const mark=r.egg||r.enemies.find(e=>e.boss);if(mark&&Math.hypot(mark.x-H.x,mark.y-H.y)>110){const a=Math.atan2(mark.y-H.y,mark.x-H.x);c.save();c.translate(H.x+Math.cos(a)*42,H.y+Math.sin(a)*42);c.rotate(a);c.fillStyle=r.egg?'#ffe493':'#ff866e';c.beginPath();c.moveTo(8,0);c.lineTo(-4,-5);c.lineTo(-4,5);c.fill();c.restore();}
 c.restore();
}
