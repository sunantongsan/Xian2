// Original COCKRO room campaign. No network or native dependencies.
export const SAVE_KEY='cockro-room-campaign-v1';
export const W=420,H=620;
export const POWERS=[
 {id:'power',icon:'✦',th:'พลังเกราะ',en:'Armor power',desc:'โจมตีแรงขึ้น 25%',detail:'25% more damage'},
 {id:'speed',icon:'»',th:'ชีพจรเร่ง',en:'Rapid pulse',desc:'โจมตีเร็วขึ้น 18%',detail:'18% faster attacks'},
 {id:'spread',icon:'⋔',th:'เข็มสามแฉก',en:'Triple sting',desc:'ยิงเพิ่มออกด้านข้าง 2 นัด',detail:'Two extra diagonal shots'},
 {id:'pierce',icon:'➶',th:'เจาะเกราะ',en:'Piercing sting',desc:'กระสุนทะลุศัตรูได้อีก 1 ตัว',detail:'Shots pierce one more enemy'},
 {id:'heal',icon:'♥',th:'น้ำค้างฟื้นฟู',en:'Healing dew',desc:'ฟื้นพลังชีวิต 30%',detail:'Restore 30% health'},
 {id:'vital',icon:'✚',th:'เกราะชีวภาพ',en:'Living armor',desc:'พลังชีวิตสูงสุดเพิ่ม 20%',detail:'20% more maximum health'},
 {id:'leech',icon:'❧',th:'เก็บเกี่ยวชีวิต',en:'Life harvest',desc:'ปราบศัตรูแล้วฟื้น HP 3 หน่วย',detail:'Heal 3 HP with each defeat'},
 {id:'shield',icon:'◈',th:'เปลือกพิทักษ์',en:'Guardian shell',desc:'รับความเสียหายน้อยลง 15%',detail:'Take 15% less damage'}
];
export const CHAPTERS=[['ทุ่งกุลาที่เงียบงัน','The silent fields'],['ร่องรอยคาราวาน','Caravan trail'],['แสงใต้ซากเมือง','Light in the ruins'],['รังปีกแก้ว','Crystalwing nest'],['ผู้เฝ้าโอเอซิส','Oasis guardians'],['ประตูสมบัติ COCKRO','The COCKRO vault']];
export function freshProfile(){return {version:1,gold:0,upgrade:0,cleared:0,language:'th',sound:true,run:null};}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function readProfile(raw){try{const v=JSON.parse(raw);if(v?.version!==1)throw Error();return {...freshProfile(),gold:clamp(Math.floor(Number(v.gold)||0),0,1e8),upgrade:clamp(Math.floor(Number(v.upgrade)||0),0,100),cleared:clamp(Math.floor(Number(v.cleared)||0),0,30),language:v.language==='en'?'en':'th',sound:v.sound!==false,run:validRun(v.run)};}catch{return freshProfile();}}
export function validRun(r){if(!r||!Number.isInteger(r.stage)||r.stage<1||r.stage>30||!Number.isInteger(r.room)||r.room<1||r.room>5||!Number.isFinite(r.hp)||r.hp<=0)return null;return {pendingPick:r.pendingPick===true,stage:r.stage,room:r.room,hp:clamp(r.hp,1,10000),powers:Array.isArray(r.powers)?r.powers.filter(id=>POWERS.some(p=>p.id===id)).slice(0,4):[],claimedRooms:Array.isArray(r.claimedRooms)?[...new Set(r.claimedRooms.filter(n=>Number.isInteger(n)&&n>=1&&n<r.room))]:[]};}
export function newRun(stage){return {stage,room:1,hp:160,powers:[],claimedRooms:[]};}
export function stats(profile,run){const count=id=>run.powers.filter(x=>x===id).length;return {hp:Math.round((160+profile.upgrade*12)*(1+.2*count('vital'))),damage:(22+profile.upgrade*4)*(1+.25*count('power')),interval:.65/Math.pow(1.18,count('speed')),spread:count('spread'),pierce:count('pierce'),leech:count('leech')*3,guard:Math.pow(.85,count('shield'))};}
export function offerPowers(run,rng=Math.random){const choices=POWERS.filter(p=>!['spread','pierce','leech'].includes(p.id)||!run.powers.includes(p.id)).map(x=>({...x,roll:rng()})).sort((a,b)=>a.roll-b.roll);return choices.slice(0,3);}
export function upgrade(profile){const cost=120+profile.upgrade*80;if(profile.gold<cost||profile.upgrade>=100)return false;profile.gold-=cost;profile.upgrade++;return true;}
export function claimRoom(profile,run){if(run.claimedRooms.includes(run.room))return 0;const amount=20+run.stage*5+(run.room===5?100:0);run.claimedRooms.push(run.room);profile.gold+=amount;if(run.room===5)profile.cleared=Math.max(profile.cleared,run.stage);return amount;}
export function layout(stage,room){
 const boss=room===5,blocks=boss?[]:room===1?[]:room%2?[{x:90,y:270,w:70,h:36},{x:260,y:270,w:70,h:36}]:[{x:180,y:240,w:60,h:64}];
 const count=boss?1:Math.min(7,2+room+Math.floor((stage-1)/10));
 const foes=Array.from({length:count},(_,i)=>{const level=stage*2-(i%2?0:1),hp=(38+stage*9+room*4)*(boss?7:1);return {id:i,x:boss?210:70+(i%3)*140,y:boss?160:110+Math.floor(i/3)*96,hp,maxHp:hp,level,boss,species:boss?18+(Math.floor((stage-1)/5)%2):(stage+room+i)%18,kind:boss?'boss':i%3===0?'chase':'shooter',clock:1.3+i*.4,wind:0,flash:0,walkDistance:0};});
 return {blocks,foes};
}
export function blocked(x,y,blocks,r=13){return x<25+r||x>W-25-r||y<60+r||y>H-26-r||blocks.some(b=>x>b.x-r&&x<b.x+b.w+r&&y>b.y-r&&y<b.y+b.h+r);}
export function clearLine(a,b,blocks){const d=Math.hypot(b.x-a.x,b.y-a.y),n=Math.ceil(d/4);for(let i=1;i<n;i++){const t=i/n;if(blocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,blocks,4))return false;}return true;}
export function makeBattle(profile,run){const st=stats(profile,run);return {run,stats:st,...layout(run.stage,run.room),hero:{x:210,y:540,hp:Math.min(st.hp,run.hp),anim:'idle',animTime:0,walkDistance:0,dx:0,dy:1,inv:0},bullets:[],effects:[],events:[],shot:0,windup:null,time:0,cleared:false,dead:false,paused:false,shotsFired:0};}
function emit(b,x,y,a,speed,damage,owner,pierce=0){b.bullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage,owner,life:4,pierce,hit:[]});}
function move(a,dx,dy,dt,speed,blocks){const n=Math.hypot(dx,dy);if(!n)return false;const ox=a.x,oy=a.y;const nx=a.x+dx/n*speed*dt,ny=a.y+dy/n*speed*dt;if(!blocked(nx,a.y,blocks))a.x=nx;if(!blocked(a.x,ny,blocks))a.y=ny;const dist=Math.hypot(a.x-ox,a.y-oy);a.walkDistance+=dist;return dist>.01;}
function hurt(b,damage){const h=b.hero;if(h.inv>0||b.dead||b.cleared)return;h.hp=Math.max(0,h.hp-damage*b.stats.guard);h.inv=.7;b.events.push('hurt');b.effects.push({x:h.x,y:h.y-45,text:'−'+Math.round(damage*b.stats.guard),color:'#ffb9a2',life:.8});if(h.hp<=0){b.dead=true;h.anim='dead';h.animTime=0;b.events.push('dead');}}
export function step(b,dt,input={x:0,y:0}){
 if(b.paused||b.dead)return;dt=clamp(dt,0,.05);b.time+=dt;b.hero.animTime+=dt;b.hero.inv=Math.max(0,b.hero.inv-dt);b.shot=Math.max(0,b.shot-dt);b.effects=b.effects.filter(f=>(f.life-=dt)>0);
 const h=b.hero,moving=Math.hypot(input.x,input.y)>.1;
 if(moving){b.windup=null;h.dx=input.x;h.dy=input.y;h.anim=move(h,input.x,input.y,dt,150,b.blocks)?'walk':'idle';}
 else if(!b.cleared){
  const target=b.foes.filter(e=>e.hp>0&&clearLine(h,e,b.blocks)).sort((a,c)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(c.x-h.x,c.y-h.y))[0];
  if(!b.windup&&b.shot<=0&&target){b.windup={left:.16,target};h.anim='attack';h.animTime=0;h.dx=target.x-h.x;h.dy=target.y-h.y;b.shot=b.stats.interval;}
  if(b.windup){b.windup.left-=dt;if(b.windup.left<=0){const e=b.windup.target;b.windup=null;if(e.hp>0&&clearLine(h,e,b.blocks)){const a=Math.atan2(e.y-h.y,e.x-h.x);for(const offset of b.stats.spread?[-.22,0,.22]:[0])emit(b,h.x,h.y,a+offset,390,b.stats.damage,'hero',b.stats.pierce);b.shotsFired++;b.events.push('shot');}}}
  if(h.animTime>.34)h.anim='idle';
 }else h.anim='idle';
 if(!b.cleared)for(const e of b.foes){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.clock-=dt;
  if(e.wind>0){e.wind-=dt;if(e.wind<=0){const damage=9+b.run.stage*1.5;if(e.kind==='boss'){for(let i=-2;i<=2;i++)emit(b,e.x,e.y,e.aim+i*.22,120+b.run.stage,damage,'enemy');}else emit(b,e.x,e.y,e.aim,105+b.run.stage,damage,'enemy');e.clock=e.boss?1.9:2.3;} }
  else if(e.kind==='chase'){move(e,h.x-e.x,h.y-e.y,dt,38+b.run.stage*.5,b.blocks);if(Math.hypot(e.x-h.x,e.y-h.y)<27)hurt(b,8+b.run.stage);}
  else if(e.clock<=0){e.wind=e.boss?.85:.7;e.aim=Math.atan2(h.y-e.y,h.x-e.x);}
 }
 for(const q of b.bullets){const distance=Math.hypot(q.vx,q.vy)*dt,n=Math.max(1,Math.ceil(distance/5));for(let k=0;k<n&&q.life>0;k++){q.x+=q.vx*dt/n;q.y+=q.vy*dt/n;if(blocked(q.x,q.y,b.blocks,2)){q.life=0;break;}if(q.owner==='hero'){for(const e of b.foes){if(e.hp<=0||q.hit.includes(e.id)||Math.hypot(q.x-e.x,q.y-e.y)>(e.boss?30:20))continue;q.hit.push(e.id);e.hp=Math.max(0,e.hp-q.damage);e.flash=.12;b.events.push('hit');b.effects.push({x:e.x,y:e.y-50,text:String(Math.round(q.damage)),color:'#fff2a1',life:.6});if(e.hp===0){h.hp=Math.min(b.stats.hp,h.hp+b.stats.leech);b.events.push('kill');}if(q.pierce--<=0){q.life=0;break;}}}else if(Math.hypot(q.x-h.x,q.y-h.y)<13){hurt(b,q.damage);q.life=0;}}
  q.life-=dt;
 }b.bullets=b.bullets.filter(q=>q.life>0);
 if(!b.dead&&!b.cleared&&b.foes.every(e=>e.hp<=0)){b.cleared=true;b.bullets=[];b.windup=null;b.events.push('clear');}
}
