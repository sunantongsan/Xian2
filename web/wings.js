import {missions,newRun,step,target,dash} from './wings-run.js';
const $=id=>document.getElementById(id),canvas=$('field'),ctx=canvas.getContext('2d');
const key='cockro-wings-expedition-v1',validPerks=['power','speed','heart'];
function checkpoint(){
 try{const s=JSON.parse(localStorage.getItem(key));if(s&&Number.isInteger(s.stage)&&s.stage>=0&&s.stage<3&&Array.isArray(s.perks)&&s.perks.length===s.stage&&s.perks.every(p=>validPerks.includes(p)))return s;}catch{}
 return {stage:0,perks:[],wins:0};
}
let save=checkpoint(),run,mode='loading',w,h,zoom,cx,cy,last=0,elapsed=0,acc=0,hintUntil=0,stick=null,hud='',sound=null;
const keys=new Set(),vec={x:0,y:0},images=new Map();
function write(){try{localStorage.setItem(key,JSON.stringify(save));}catch{$('hint').textContent='พื้นที่บันทึกเต็ม';}}
function beep(freq,duration=.08){
 if(!sound||sound.state!=='running')return;
 const osc=sound.createOscillator(),gain=sound.createGain(),t=sound.currentTime;
 osc.type='sine';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(freq*.68,t+duration);
 gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
 osc.connect(gain);gain.connect(sound.destination);osc.start(t);osc.stop(t+duration);
}
function unlock(){try{sound??=new (window.AudioContext||window.webkitAudioContext)();if(sound.state==='suspended')sound.resume().catch(()=>{});}catch{}}
function message(text,seconds=3){$('hint').textContent=text;hintUntil=elapsed+seconds;}
function resetInput(){keys.clear();stick=null;vec.x=vec.y=0;$('stick').hidden=true;}
function panel(label,title,detail,buttons){
 resetInput();$('sheet').hidden=false;$('eyebrow').textContent=label;$('title').textContent=title;$('detail').textContent=detail;
 $('choices').replaceChildren(...buttons.map(([label,action])=>{const b=document.createElement('button');b.textContent=label;b.onclick=action;return b;}));
}
function start(){
 run=newRun(save.stage,save.perks);mode='play';$('sheet').hidden=true;hud='';acc=0;message(missions[run.index].intro,4);
}
function pause(){if(mode!=='play')return;mode='pause';panel('COCKRO MAN',missions[run.index].name,'พักการเดินทาง',[['เล่นต่อ',()=>{mode='play';acc=0;$('sheet').hidden=true;}],['เริ่มพื้นที่นี้ใหม่',start]]);}
$('menuBtn').onclick=pause;
function end(){
 mode=run.mode;
 if(mode==='lost'){beep(160,.25);panel('ทีมกู้ภัย', 'ลองบุกอีกครั้ง','พุ่งออกจากวงแดงก่อนศัตรูโจมตี',[['ลองอีกครั้ง',start]]);return;}
 beep(920,.22);
 if(run.index===2){save={stage:0,perks:[],wins:(Number(save.wins)||0)+1};write();panel('ภารกิจสำเร็จ','ฝูงแสงกลับบ้านแล้ว','ช่วยหมู่บ้านสำเร็จ '+save.wins+' ครั้ง',[['ออกเดินทางอีกครั้ง',start]]);return;}
 const options=[['power','คมปีก +6'],['speed','ยิงเร็วขึ้น'],['heart','ชีวิต +30']];
 panel('เลือกพลังติดตัว',run.index===0?'ช่วยหิ่งห้อยครบแล้ว':'หอสัญญาณสว่างแล้ว','พลังที่เลือกจะอยู่กับคุณจนจบการเดินทาง',options.map(([p,label])=>[label,()=>{if(mode!=='won')return;save.stage=run.index+1;save.perks=[...run.perks,p];write();start();}]));
}
function input(){let x=vec.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y=vec.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));return {x,y};}
function evade(){if(mode==='play'){const v=input();if(dash(run,v.x,v.y))beep(430);}}
$('dash').onpointerdown=e=>{e.preventDefault();unlock();evade();};
canvas.onpointerdown=e=>{if(mode!=='play'||stick)return;unlock();stick={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);const el=$('stick');el.style.left=(stick.x-42)+'px';el.style.top=(stick.y-42)+'px';el.firstElementChild.style.transform='';el.hidden=false;};
canvas.onpointermove=e=>{if(e.pointerId!==stick?.id)return;const dx=e.clientX-stick.x,dy=e.clientY-stick.y,k=Math.max(36,Math.hypot(dx,dy));vec.x=dx/k;vec.y=dy/k;$('stick').firstElementChild.style.transform='translate('+vec.x*26+'px,'+vec.y*26+'px)';};
canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(e.pointerId===stick?.id)resetInput();};
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape')pause();if(mode!=='play')return;if(k.startsWith('arrow')||k===' ')e.preventDefault();keys.add(k);if(k===' '&&!e.repeat)evade();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('pagehide',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
function resize(){w=canvas.clientWidth;h=canvas.clientHeight;const ratio=Math.min(1.75,devicePixelRatio||1);canvas.width=w*ratio;canvas.height=h*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);zoom=Math.max(w/830,h/710,Math.min(w/430,h/520));}
window.addEventListener('resize',resize);
function ring(x,y,r,color,weight=2,arc=1){ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.beginPath();ctx.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*arc);ctx.stroke();}
function disk(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
function icon(text,x,y,size,color){ctx.fillStyle=color;ctx.textAlign='center';ctx.font='bold '+size+'px system-ui';ctx.fillText(text,x,y);}
function sprite(img,col,row,cols,rows,x,y,width,height,flip=false){
 const sw=img.width/cols,sh=img.height/rows;ctx.save();ctx.translate(x,y);if(flip)ctx.scale(-1,1);ctx.drawImage(img,col*sw,row*sh,sw,sh,-width/2,-height,width,height);ctx.restore();
}
function shadow(x,y,r){ctx.fillStyle='#153c4155';ctx.beginPath();ctx.ellipse(x,y,r,r*.34,0,0,Math.PI*2);ctx.fill();}
function firefly(x,y,t){
 const sway=Math.sin(t*9)*2;disk(x,y,11,'#fff1a633');disk(x-4,y-2+sway,3,'#f1fff2');disk(x+4,y-2-sway,3,'#f1fff2');disk(x,y,3.5,'#ffe572');
}
function paint(){
 const r=run,hp=r.hero,level=missions[r.index],vw=w/zoom,vh=h/zoom;
 cx=Math.max(0,Math.min(830-vw,hp.x-vw/2));cy=Math.max(0,Math.min(710-vh,hp.y-vh*.58));
 ctx.save();ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
 ctx.drawImage(images.get(level.map),0,0,830,710);
 ctx.fillStyle=['#729d6a24','#477c9e35','#b98f6740'][r.index];ctx.fillRect(0,0,830,710);
 for(const p of r.goals){
  if(p.done&&r.index===0)continue;
  const color=p.done?'#ffe08d':level.color;disk(p.x,p.y,r.index===0?24:45,'#134c4855');ring(p.x,p.y,r.index===0?22:43,color,2);
  if(r.index===0)firefly(p.x,p.y-6,elapsed);else{icon('♜',p.x,p.y+7,34,color);if(p.charge)ring(p.x,p.y,37,'#fff4ae',5,p.charge);}
 }
 if(r.open){disk(r.exit.x,r.exit.y,31,'#063f4080');ring(r.exit.x,r.exit.y,26+3*Math.sin(elapsed*4),'#95ffdf',4);icon('➜',r.exit.x,r.exit.y+8,25,'white');}
 for(const e of r.enemies)if(e.phase==='warn'){const rad=e.reach;disk(e.ax,e.ay,rad,'#ff504c44');ring(e.ax,e.ay,rad,'#ff7763',3);ring(e.ax,e.ay,rad*Math.max(.04,1-e.timer/(e.boss?.98:.65)),'#fff0a4',2);}
 for(const a of [...r.enemies,hp].sort((a,b)=>a.y-b.y)){
  if(a===hp){shadow(a.x,a.y,16);const side=Math.abs(a.dx)>Math.abs(a.dy),row=side?(a.dx<0?2:3):(a.dy<0?1:0);
   if(r.flash>0)ctx.globalAlpha=.65;
   if(a.walking&&side&&r.attackPose<=0)sprite(images.get('side'),Math.floor(a.distance/12)%8,row===2?1:0,8,2,a.x,a.y+9,64,78);
   else{const col=r.attackPose>0?4+Math.min(2,Math.floor((.17-r.attackPose)*18)):a.walking?Math.floor(a.distance/15)%4:6;sprite(images.get('hero'),col,row,13,4,a.x,a.y+6,64,64);}
   ctx.globalAlpha=1;
  }else{const size=a.boss?92:48;shadow(a.x,a.y,size*.32);sprite(images.get('foes'),a.kind,a.phase==='warn'?3:1+Math.floor(a.step)%2,3,4,a.x,a.y+4,size*1.33,size,a.face<0);
   if(a.boss||a.hp<a.maxHp){ctx.fillStyle='#163336';ctx.fillRect(a.x-size*.32,a.y-size,size*.64,4);ctx.fillStyle=a.boss?'#ffb773':'#ff8780';ctx.fillRect(a.x-size*.32,a.y-size,size*.64*a.hp/a.maxHp,4);}
  }
 }
 if(r.index===0)r.goals.forEach((p,i)=>{if(p.done)firefly(hp.x+Math.cos(elapsed*2+i*2)*22,hp.y-25+Math.sin(elapsed*2+i*2)*9,elapsed+i);});
 for(const b of r.bolts){const a=Math.atan2(b.enemy.y-b.y,b.enemy.x-b.x);ctx.strokeStyle='#ffe591';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(b.x-Math.cos(a)*15,b.y-Math.sin(a)*15);ctx.lineTo(b.x,b.y);ctx.stroke();disk(b.x,b.y,3,'#fff9d7');}
 for(const f of r.fx){ctx.globalAlpha=f.life/.35;ring(f.x,f.y,f.radius*(1-f.life/.36),f.color,3);}ctx.globalAlpha=1;
 const t=target(r);if(t&&Math.hypot(t.x-hp.x,t.y-hp.y)>75){const a=Math.atan2(t.y-hp.y,t.x-hp.x);ctx.save();ctx.translate(hp.x+Math.cos(a)*39,hp.y+Math.sin(a)*39);ctx.rotate(a);ctx.fillStyle='#fff5a1';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-4,-5);ctx.lineTo(-1,0);ctx.lineTo(-4,5);ctx.fill();ctx.restore();}
 ctx.restore();$('hp').max=hp.maxHp;$('hp').value=hp.hp;
 const goal=r.open?'กลับประตู ✦':r.index===2?level.goal:level.goal+' '+r.goals.filter(p=>p.done).length+'/'+r.goals.length;
 if(goal!==hud){if(hud)beep(670);hud=goal;$('goal').textContent=goal;}
 $('dash').disabled=mode!=='play'||r.dash>0;$('dash').lastElementChild.textContent=r.dash>0?r.dash.toFixed(1):'พุ่ง';
}
function loop(now){
 const dt=Math.min(.1,(now-last)/1000||0);last=now;elapsed+=dt;
 if(mode==='play'){acc+=dt;while(acc>=1/60&&run.mode==='play'){step(run,1/60,input());acc-=1/60;}if(run.mode!=='play')end();}
 if(run)paint();if(hintUntil&&elapsed>hintUntil){$('hint').textContent='';hintUntil=0;}requestAnimationFrame(loop);
}
async function boot(){
 const files={hero:'heroes/insect-suits/cockroach-male.webp',side:'heroes/insect-suits/cockroach-male-side-walk.webp',foes:'sprites/alien-forest.webp',...Object.fromEntries(missions.map(m=>[m.map,'maps/'+m.map+'.webp']))};
 try{await Promise.all(Object.entries(files).map(([id,url])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images.set(id,im);resolve();};im.onerror=reject;im.src=url;})));
 resize();start();window.cockroBootReady=true;requestAnimationFrame(loop);
 }catch{panel('COCKRO MAN','โหลดภาพไม่ครบ','ลองเปิดอีกครั้ง',[['ลองใหม่',()=>location.reload()]]);}
}
boot();
