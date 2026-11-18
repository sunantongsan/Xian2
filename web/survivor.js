import {begin,pick,step,skills,lands} from './survivor-run.js';
import {paint,files} from './survivor-art.js';
const $=id=>document.getElementById(id),canvas=$('field'),c=canvas.getContext('2d'),vid=$('film'),key='cockro-survivor-7';
let save={unlocked:0,wins:0,intro:false};try{const v=JSON.parse(localStorage.getItem(key));if(v)save={unlocked:Math.max(0,Math.min(2,Math.floor(v.unlocked)||0)),wins:Math.max(0,Math.floor(v.wins)||0),intro:!!v.intro};}catch{}
function persist(){try{localStorage.setItem(key,JSON.stringify(save));}catch{}}
const img={},keys=new Set(),vec={x:0,y:0};let r,mode='load',stick=null,w,h,last=0,acc=0,tip='',tipEnd=0,videoURL,videoLoad,filmToken=0,returnFilm,loading=0,audio;
function tone(f){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state!=='running'){audio.resume().catch(()=>{});return;}const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.55,t+.15);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(audio.destination);o.start();o.stop(t+.16);}catch{}}
function reset(){keys.clear();stick=null;vec.x=vec.y=0;$('stick').hidden=true;}
function note(s,n=3){tip=s;tipEnd=r.t+n;}
function panel(state,tag,title,copy,actions){
 mode=state;reset();vid.pause();vid.hidden=true;document.body.classList.remove('cinema');filmToken++;
 $('sheet').hidden=false;$('kicker').textContent=tag;$('title').textContent=title;$('copy').textContent=copy;
 $('actions').replaceChildren(...actions.map(([label,fn])=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;return b;}));
}
function resume(){reset();acc=0;mode='play';$('sheet').hidden=true;vid.pause();vid.hidden=true;filmToken++;document.body.classList.remove('cinema');}
function home(){panel('home','COCKRO MAN','ศึกผู้รอดชีวิต','ฝ่าฝูงอสูร เก็บผลึกเสริมสกิล แล้วโค่นบอสประจำแดน',[[save.intro?'เข้าสนาม':'▶ ดูวิดีโอสอนเล่น',save.intro?()=>start(save.unlocked):()=>film(home)], [save.intro?'▶ วิดีโอสอนเล่น':'เริ่มเล่นเลย',save.intro?()=>film(home):()=>start(save.unlocked)],['เลือกดินแดน',atlas]]);}
function atlas(){panel('atlas','COCKRO MAN','เลือกดินแดน','ชนะบอสเพื่อเปิดด่านถัดไป',lands.map((l,i)=>[i<=save.unlocked?l.name:'🔒 '+l.name,()=>{if(i<=save.unlocked)start(i);else $('copy').textContent='ต้องชนะ '+lands[i-1].boss+' ก่อน';}]).concat([['กลับ',home]]));}
function pause(){if(mode!=='play')return;panel('pause','พักการต่อสู้',lands[r.zone].name,'',[['เล่นต่อ',resume],['▶ วิดีโอสอนเล่น',()=>film(pauseMenu)],['ออกจากรอบนี้',home]]);}
function pauseMenu(){mode='play';pause();}
$('menuBtn').onclick=pause;
async function film(back){
 returnFilm=back;panel('film','คู่มือผู้รอดชีวิต','วิธีเล่น','กำลังเปิดวิดีโอ…',[[back===home?'เข้าสนาม':'กลับไปเล่น',()=>back===home?start(save.unlocked):resume()],['กลับ',back]]);
 const token=filmToken;document.body.classList.add('cinema');
 try{if(!videoURL){videoLoad??=fetch('survivor-guide.json').then(res=>{if(!res.ok)throw Error();return res.json();}).then(v=>{const bin=atob(v.mp4),bytes=Uint8Array.from(bin,ch=>ch.charCodeAt(0));return URL.createObjectURL(new Blob([bytes],{type:'video/mp4'}));}).catch(e=>{videoLoad=null;throw e;});videoURL=await videoLoad;}
 if(token!==filmToken)return;vid.hidden=false;vid.src=videoURL;vid.currentTime=0;$('copy').textContent='';vid.play().catch(()=>{if(token===filmToken)$('copy').textContent='แตะ ▶ เพื่อเล่นวิดีโอ';});
 }catch{if(token===filmToken){$('copy').textContent='โหลดวิดีโอไม่สำเร็จ';const b=document.createElement('button');b.textContent='ลองโหลดอีกครั้ง';b.onclick=()=>film(back);$('actions').append(b);}}
}
vid.onended=()=>{save.intro=true;persist();$('copy').textContent='พร้อมแล้ว แตะเข้าสนามหรือดูซ้ำได้';};
function loadImage(path){return new Promise((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=bad;i.src=path;});}
async function start(zone){const id=++loading;panel('load','COCKRO MAN',lands[zone].name,'กำลังเตรียมสนาม…',[]);
 try{img.ground=await loadImage(lands[zone].field);if(id!==loading)return;r=begin(zone);save.intro=true;persist();resume();note('ลากเพื่อเดิน · ดาบฟันเองเมื่อศัตรูเข้าประชิด',5);}catch{panel('load','COCKRO MAN','โหลดสนามไม่ครบ','',[['ลองใหม่',()=>start(zone)],['กลับ',home]]);}}
function choices(){panel('pick','LEVEL '+r.lv,'เลือกสกิลหนึ่งใบ','',[]);tone(790);for(const id of r.choices){const [name,desc,icon,color]=skills[id],b=document.createElement('button');b.className='card';b.style.setProperty('--color',color);const art=document.createElement('b'),n=document.createElement('strong'),info=document.createElement('small');art.textContent=icon;n.textContent=name+' '+(r.skills[id]+1);info.textContent=desc;b.append(art,n,info);b.onclick=()=>{if(pick(r,id)){if(r.state==='pick')choices();else resume();}};$('actions').append(b);}}
function finish(){const won=r.state==='won';if(won){save.wins++;save.unlocked=Math.max(save.unlocked,Math.min(2,r.zone+1));persist();}tone(won?950:180);panel('result',lands[r.zone].name,won?'ผู้รอดชีวิตคนสุดท้าย':'พ่ายฝูงอสูร','Lv. '+r.lv+' · ปราบ '+r.kills+' ตัว · อยู่รอด '+Math.floor(r.t)+' วินาที',[[won&&r.zone<2?'ดินแดนถัดไป':'ลองอีกครั้ง',()=>start(won?Math.min(2,r.zone+1):r.zone)],['กลับค่าย',home]]);}
canvas.onpointerdown=e=>{if(mode!=='play'||stick)return;stick={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);const s=$('stick');s.style.left=(stick.x-37)+'px';s.style.top=(stick.y-37)+'px';s.firstElementChild.style.transform='';s.hidden=false;};
canvas.onpointermove=e=>{if(e.pointerId!==stick?.id)return;const dx=e.clientX-stick.x,dy=e.clientY-stick.y,d=Math.max(32,Math.hypot(dx,dy));vec.x=dx/d;vec.y=dy/d;$('stick').firstElementChild.style.transform='translate('+vec.x*22+'px,'+vec.y*22+'px)';};
canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(e.pointerId===stick?.id)reset();};
window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='escape')pause();if(mode==='play'){if(k.startsWith('arrow'))e.preventDefault();keys.add(k);}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function background(){if(mode==='film')vid.pause();else pause();}
window.addEventListener('pagehide',background);document.addEventListener('visibilitychange',()=>{if(document.hidden)background();});
function resize(){w=canvas.clientWidth;h=canvas.clientHeight;const d=Math.min(1.7,devicePixelRatio||1);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);c.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);}
function frame(now){const dt=Math.min(.09,(now-last)/1000);last=now;
 if(mode==='play'){acc+=dt;const prevEgg=r.hatched,prevPet=r.pet,prevBoss=r.bossIn;
 while(acc>=1/60&&r.state==='play'){step(r,1/60,vec.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),vec.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')));acc-=1/60;}
 if(!prevEgg&&r.hatched)note('พบไข่สีทอง · เดินเข้าใกล้เพื่อรับสัตว์คู่หู');if(!prevPet&&r.pet){note('แมลงแสงเข้าทีมแล้ว');tone(640);}if(!prevBoss&&r.bossIn){note('บอสมาแล้ว · เดินหลบวงแดง');tone(170);}
 if(r.state==='pick')choices();if(r.state==='won'||r.state==='lost')finish();}
 paint(c,r,img,w,h);$('zone').textContent=lands[r.zone].name;$('stats').textContent='Lv. '+r.lv;$('hp').max=r.h.max;$('hp').value=r.h.hp;$('xp').max=r.need;$('xp').value=r.xp;$('timer').textContent=r.bossIn?'⚔ '+r.kills:'บอสใน '+Math.ceil(65-r.t)+' วิ';$('tip').textContent=mode==='play'&&r.t<tipEnd?tip:'';
 const boss=r.enemies.find(e=>e.boss);$('boss').hidden=!boss;if(boss)$('boss').textContent=lands[r.zone].boss+' · '+Math.ceil(100*boss.hp/boss.max)+'%';requestAnimationFrame(frame);}
async function boot(){try{await Promise.all(Object.entries({...files,ground:lands[0].field}).filter(([id])=>id!=='pet').map(async ([id,url])=>img[id]=await loadImage(url)));resize();r=begin(0);home();if(!save.intro)film(home);window.cockroBootReady=true;requestAnimationFrame(frame);}catch{panel('load','COCKRO MAN','โหลดภาพไม่ครบ','',[['ลองใหม่',()=>location.reload()]]);}}
window.addEventListener('resize',resize);boot();
