export const lands=[
 {name:'ทุ่งปีกแก้ว',boss:'ราชาเขี้ยวมรกต',field:'lagoon.webp',color:'#83ffba'},
 {name:'หุบผาเกล็ดน้ำแข็ง',boss:'จอมเขี้ยวเหมันต์',field:'surv-ground-0.webp',color:'#9eeaff'},
 {name:'ปากปล่องเพลิง',boss:'อสูรเถ้าถ่าน',field:'surv-ground-1.webp',color:'#ff9274'}
];
export const skills={
 blade:['คมดาบจันทร์','เพิ่มระยะและแรงฟัน','☾','#ffd37e'],
 ice:['หอกน้ำแข็ง','ปล่อยหอกติดตามและแช่แข็ง','❄','#91e9ff'],
 storm:['สายฟ้ารังไหม','ฟ้าผ่าศัตรูใกล้ตัวหลายตัว','ϟ','#c9adff'],
 orbit:['วงแหวนหนาม','หนามหมุนรอบตัว โจมตีศัตรู','✧','#b9f49c'],
 vitality:['ชีพจรอำพัน','เพิ่มชีวิตสูงสุดและฟื้นทันที','♥','#ffac9a']
};
const clamp=(x,a,b)=>Math.max(a,Math.min(x,b)),D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function begin(zone=0,random=Math.random){
 const r={zone,random,t:0,state:'play',h:{x:540,y:540,hp:110,max:110,dx:0,dy:1,walk:0,moving:false},enemies:[],gems:[],fx:[],shots:[],skills:{blade:1,ice:0,storm:0,orbit:0,vitality:0},timers:{blade:0,ice:0,storm:0,orbit:0,pet:0},xp:0,need:3,lv:1,kills:0,next:1,wave:0,guard:0,pet:false,egg:null,hatched:false,bossIn:false,uid:0,choices:[]};
 for(let i=0;i<4;i++)spawn(r,false,95+i*25);
 return r;
}
function spawn(r,boss,range){
 const h=r.h,a=r.random()*Math.PI*2,i=++r.uid,d=range??(170+r.random()*68);
 const hp=boss?310+100*r.zone:19+r.zone*7+Math.floor(r.t/18)*3;
 const e={id:i,x:clamp(h.x+Math.cos(a)*d,16,1064),y:clamp(h.y+Math.sin(a)*d,16,1064),hp,max:hp,boss,kind:boss?2:i%3,angle:a,phase:'chase',cd:boss?2:.8,life:0,freeze:0};
 r.enemies.push(e);return e;
}
function spark(r,kind,x,y,tx,ty,color,duration=.35){r.fx.push({kind,x,y,tx,ty,color,left:duration,max:duration});}
function hit(r,e,n){
 if(e.hp<=0)return;e.hp=Math.max(0,e.hp-n);e.flash=.15;
 if(!e.hp){r.kills++;r.gems.push({x:e.x,y:e.y,value:e.boss?5:1});if(e.boss)r.state='won';}
}
function nearest(r,range){let best=null;for(const e of r.enemies){const d=D(r.h,e);if(e.hp>0&&d<range){best=e;range=d;}}return best;}
function offer(r){if(r.xp<r.need)return;r.xp-=r.need;r.lv++;r.need=3+r.lv;r.state='pick';const deck=Object.keys(skills);
 for(let i=deck.length-1;i>0;i--){const j=Math.floor(r.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
 r.choices=deck.slice(0,3);}
export function pick(r,id){if(r.state!=='pick'||!r.choices.includes(id))return false;r.skills[id]++;if(id==='vitality'){r.h.max+=24;r.h.hp=Math.min(r.h.max,r.h.hp+48);}r.state='play';r.choices=[];offer(r);return true;}
function hurt(r,n){if(r.guard>0)return;r.h.hp=Math.max(0,r.h.hp-n);r.guard=.65;if(!r.h.hp)r.state='lost';}
export function step(r,dt,dx,dy){
 if(r.state!=='play')return;
 r.t+=dt;r.guard-=dt;const h=r.h,d=Math.hypot(dx,dy),speed=158;
 const bx=h.x,by=h.y;h.x=clamp(h.x+dx/Math.max(1,d)*speed*dt,20,1060);h.y=clamp(h.y+dy/Math.max(1,d)*speed*dt,20,1060);
 h.moving=D(h,{x:bx,y:by})>.05;if(h.moving){h.walk+=Math.hypot(h.x-bx,h.y-by);h.dx=dx/d;h.dy=dy/d;}
 r.next-=dt;if(r.next<=0){r.next=Math.max(.48,1.48-r.t*.011);const size=Math.min(6,2+Math.floor(r.t/17));for(let i=0;i<size&&r.enemies.length<44;i++)spawn(r,false);}
 if(!r.hatched&&r.t>=20){r.hatched=true;r.egg={x:clamp(h.x+65,26,1054),y:clamp(h.y-25,26,1054)};}
 if(r.egg&&D(h,r.egg)<34){r.egg=null;r.pet=true;spark(r,'ring',h.x,h.y,40,0,'#ffd872');}
 if(!r.bossIn&&r.t>=65){r.bossIn=true;spawn(r,true,145);}
 for(const e of r.enemies){e.life+=dt;e.flash=Math.max(0,(e.flash||0)-dt);e.cd-=dt;e.freeze-=dt;const gap=Math.max(1,D(e,h));e.angle=Math.atan2(h.y-e.y,h.x-e.x);
 if(e.phase==='warn'){e.wait-=dt;if(e.wait<=0){spark(r,'ring',e.tx,e.ty,e.radius,0,'#ff936e');if(Math.hypot(h.x-e.tx,h.y-e.ty)<e.radius)hurt(r,17+r.zone*3);e.phase='chase';e.cd=3;}continue;}
 if(e.boss&&gap<142&&e.cd<=0){e.phase='warn';e.wait=.95;e.tx=h.x;e.ty=h.y;e.radius=59+r.zone*7;continue;}
 const v=(e.boss?45:35+e.kind*8+r.zone*3)*(e.freeze>0?.3:1);if(gap>16){e.x+=Math.cos(e.angle)*dt*v;e.y+=Math.sin(e.angle)*dt*v;}
 if(gap<24&&e.cd<=0){hurt(r,e.boss?14:7);e.cd=1;}
 }
 if(r.state!=='play')return;
 for(const id of Object.keys(r.timers))r.timers[id]-=dt;
 const blade=r.skills.blade,reach=68+blade*6,target=nearest(r,reach);
 if(target&&r.timers.blade<=0){const a=Math.atan2(target.y-h.y,target.x-h.x);r.timers.blade=.55;r.swing=.27;r.swingAngle=a;
 for(const e of r.enemies)if(D(h,e)<=reach&&Math.cos(Math.atan2(e.y-h.y,e.x-h.x)-a)>-.15)hit(r,e,17+blade*6);}
 r.swing=Math.max(0,(r.swing||0)-dt);
 for(const id of ['ice','storm','orbit','pet']){
 const rank=id==='pet'?Number(r.pet):r.skills[id];if(!rank||r.timers[id]>0)continue;
 const e=nearest(r,id==='orbit'?66:220);if(!e)continue;
 if(id==='ice'||id==='pet'){r.shots.push({x:h.x+(id==='pet'?21:0),y:h.y-14,e,rank,id});r.timers[id]=id==='ice'?1.15:.92;}
 if(id==='storm'){let n=0;for(const p of [e,...r.enemies.filter(p=>p!==e)])if(p.hp>0&&D(e,p)<100&&n<rank+1){spark(r,'bolt',p.x-17,p.y-65,p.x,p.y,'#e0b5ff');hit(r,p,16+rank*6);n++;}r.timers[id]=1.9;}
 if(id==='orbit'){for(const p of r.enemies)if(D(p,h)<66)hit(r,p,10+rank*7);r.timers[id]=.65;}
 }
 for(const s of r.shots){if(s.e.hp<=0){s.done=true;continue;}const a=Math.atan2(s.e.y-s.y,s.e.x-s.x);s.a=a;const dist=D(s,s.e),v=dt*350;if(dist<v+4){hit(r,s.e,17+s.rank*5);if(s.id==='ice')s.e.freeze=1.4;s.done=true;}else{s.x+=Math.cos(a)*v;s.y+=Math.sin(a)*v;}}
 r.shots=r.shots.filter(s=>!s.done);r.enemies=r.enemies.filter(e=>e.hp>0);
 for(const jewel of r.gems){const gap=D(jewel,h);if(gap<83){const k=Math.min(1,dt*225/Math.max(1,gap));jewel.x+=(h.x-jewel.x)*k;jewel.y+=(h.y-jewel.y)*k;if(D(jewel,h)<12){r.xp+=jewel.value;jewel.gone=true;}}}
 r.gems=r.gems.filter(j=>!j.gone);for(const f of r.fx)f.left-=dt;r.fx=r.fx.filter(f=>f.left>0);if(r.state==='play')offer(r);
}
