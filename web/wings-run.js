export const missions=[
 {name:'ฝูงแสงหายตัว',goal:'ช่วยหิ่งห้อย',map:'thung-kula-fields',points:[[205,245],[570,140],[665,465]],color:'#76f4cb',intro:'ลากเพื่อเดิน · ตามแสงไปช่วยหิ่งห้อย'},
 {name:'จุดไฟที่หอสัญญาณ',goal:'จุดหอสัญญาณ',map:'aurora-outpost',points:[[240,230],[630,300]],color:'#8fd8ff',intro:'ยืนในวงหอจนไฟติด ให้ฝูงแสงหาทางกลับ'},
 {name:'ศึกหน้าประตูเมือง',goal:'โค่นราชาด้วง',map:'thung-kula-town',points:[],color:'#ffd37e',intro:'หลบวงแดงก่อนราชาด้วงกระแทกพื้น'}
];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function approach(a,b,step){
 const d=dist(a,b);if(d<.01)return;
 a.x+=(b.x-a.x)*Math.min(1,step/d);a.y+=(b.y-a.y)*Math.min(1,step/d);
}
export function newRun(index=0,perks=[]){
 const level=missions[index],maxHp=100+perks.filter(p=>p==='heart').length*30;
 const run={index,perks:[...perks],mode:'play',time:0,hero:{x:415,y:570,hp:maxHp,maxHp,dx:0,dy:-1,distance:0,walking:false},goals:level.points.map(([x,y])=>({x,y,charge:0,done:false})),exit:{x:415,y:80},open:false,enemies:[],bolts:[],fx:[],shot:0,next:3,dash:0,burst:0,guard:0,flash:0,serial:0};
 for(const [x,y] of [[260,340],[590,400],[390,200]])spawn(run,x,y,false);
 if(index===2)spawn(run,415,180,true);
 return run;
}
function spawn(r,x,y,boss){
 const id=++r.serial,hp=boss?300:30+r.index*6;
 r.enemies.push({x,y,hp,maxHp:hp,boss,id,kind:boss?2:id%3,phase:'walk',timer:0,cd:1+id%3*.3,step:0,face:1,enraged:false});
}
export function dash(r,x=0,y=0){
 if(r.mode!=='play'||r.dash>0)return false;
 const h=r.hero,d=Math.hypot(x,y);r.dashX=d>.1?x/d:h.dx;r.dashY=d>.1?y/d:h.dy;
 r.burst=.21;r.guard=.34;r.dash=2.6;return true;
}
export function target(r){return r.open?r.exit:r.index===2?r.enemies.find(e=>e.boss):r.goals.filter(p=>!p.done).sort((a,b)=>dist(a,r.hero)-dist(b,r.hero))[0];}
function effect(r,x,y,color,radius){r.fx.push({x,y,color,radius,life:.35});}
export function step(r,dt,input){
 if(r.mode!=='play')return;
 const h=r.hero,m=Math.hypot(input.x,input.y);r.time+=dt;r.guard-=dt;r.flash-=dt;r.dash=Math.max(0,r.dash-dt);
 let vx=m>.1?input.x/Math.max(1,m):0,vy=m>.1?input.y/Math.max(1,m):0,speed=156;
 if(r.burst>0){r.burst-=dt;vx=r.dashX;vy=r.dashY;speed=560;effect(r,h.x,h.y,'#abfff1',10);}
 const px=h.x,py=h.y;h.x=clamp(h.x+vx*speed*dt,35,795);h.y=clamp(h.y+vy*speed*dt,52,657);
 const moved=Math.hypot(h.x-px,h.y-py);h.walking=moved>.05;
 if(h.walking){h.dx=(h.x-px)/moved;h.dy=(h.y-py)/moved;h.distance+=moved;}
 for(const e of r.enemies){
  if(e.boss&&e.hp<=e.maxHp*.5&&!e.enraged){
   e.enraged=true;effect(r,e.x,e.y,'#ffb173',85);
   spawn(r,140,180,false);spawn(r,685,180,false);
  }
  const reach=e.boss?(e.enraged?110:93):38;e.reach=reach;e.cd-=dt;e.timer-=dt;
  if(e.phase==='warn'&&e.timer<=0){
   effect(r,e.ax,e.ay,'#ff846e',reach);
   if(Math.hypot(h.x-e.ax,h.y-e.ay)<reach+8&&r.guard<=0){h.hp=Math.max(0,h.hp-(e.boss?24:8));r.guard=.55;r.flash=.18;}
   e.phase='rest';e.timer=e.boss?1.3:.65;
  }else if(e.phase==='rest'&&e.timer<=0)e.phase='walk';
  if(e.phase==='walk'){
   if(dist(e,h)<reach+10&&e.cd<=0){e.phase='warn';e.timer=e.boss?.98:.65;e.ax=h.x;e.ay=h.y;e.cd=e.boss?(e.enraged?1.6:2.2):1.6;}
   else if(dist(e,h)>20){e.face=h.x<e.x?-1:1;approach(e,h,dt*(e.boss?45:49+e.kind*6));e.step+=dt*7;}
  }
 }
 if(h.hp<=0){r.mode='lost';return;}
 r.shot-=dt;
 const nearest=r.enemies.reduce((a,e)=>!a||dist(e,h)<dist(a,h)?e:a,null);
 if(nearest&&dist(nearest,h)<245&&r.shot<=0){
  r.shot=.49-.09*r.perks.filter(p=>p==='speed').length;
  r.bolts.push({x:h.x,y:h.y-9,enemy:nearest});r.attackPose=.17;
 }
 r.attackPose=Math.max(0,(r.attackPose||0)-dt);
 for(const b of r.bolts){if(b.enemy.hp<=0){b.done=true;continue;}approach(b,b.enemy,dt*510);if(dist(b,b.enemy)<10){
  b.done=true;b.enemy.hp-=14+6*r.perks.filter(p=>p==='power').length;effect(r,b.enemy.x,b.enemy.y,'#ffe991',18);
 }}
 r.bolts=r.bolts.filter(b=>!b.done);r.enemies=r.enemies.filter(e=>e.hp>0);
 for(const p of r.goals){if(p.done||dist(h,p)>47)continue;p.charge=Math.min(1,p.charge+dt/(r.index===1?2.1:.35));if(p.charge>=1){p.done=true;h.hp=Math.min(h.maxHp,h.hp+10);effect(r,p.x,p.y,'#83ffe1',48);}}
 r.open=r.index===2?!r.enemies.some(e=>e.boss):r.goals.every(p=>p.done);
 if(r.open&&dist(h,r.exit)<38)r.mode='won';
 r.next-=dt;if(!r.open&&r.next<=0&&r.enemies.length<7){const i=r.serial%4;spawn(r,[70,740,720,110][i],[90,140,600,520][i],false);r.next=5.2;}
 for(const f of r.fx)f.life-=dt;r.fx=r.fx.filter(f=>f.life>0);
}
