import {roster,maps,battle,place,wave,cast,tick,locate} from './ward-run.js';
const $=id=>document.getElementById(id),map=$('map'),g=map.getContext('2d'),arena=$('arena');
const saveKey='cockro-crystal-guard-v1';
let save={chapter:0,stars:[0,0,0],ranks:[0,0,0],gems:0,taught:false};
try{const v=JSON.parse(localStorage.getItem(saveKey));if(v&&Array.isArray(v.ranks)&&Array.isArray(v.stars)){const clamp=(x,max)=>Math.max(0,Math.min(max,Math.floor(Number(x)||0)));save={chapter:clamp(v.chapter,2),gems:clamp(v.gems,99999),ranks:roster.map((_,i)=>clamp(v.ranks[i],5)),stars:maps.map((_,i)=>clamp(v.stars[i],3)),taught:!!v.taught};}}catch{}
function persist(){try{localStorage.setItem(saveKey,JSON.stringify(save));}catch{}}
let r,paused=false,pad=null,aim=null,drag=null,reticle=null,clock=0,last=0,w=0,h=0,back=null,sx,sy,msg='',until=0,audio,seenPhase,loadFailed=false;
const images={},cards=[];
function sound(f){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state!=='running'){audio.resume().catch(()=>{});return;}const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.6,t+.13);v.gain.setValueAtTime(.045,t);v.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(v);v.connect(audio.destination);o.start();o.stop(t+.14);}catch{}}
function tell(s){msg=s;until=clock+2.3;}
function show(tag,title,desc,items){paused=true;drag=reticle=null;$('veil').hidden=false;$('tag').textContent=tag;$('headline').textContent=title;$('summary').textContent=desc;$('actions').replaceChildren(...items.map(([name,fn])=>{const b=document.createElement('button');b.textContent=name;b.onclick=fn;return b;}));}
function resume(){paused=false;$('veil').hidden=true;}
function start(i){r=battle(i,save.ranks,i===0&&!save.taught);pad=aim=reticle=null;seenPhase='';msg='';until=0;resume();terrain();sync();}
function chapters(){show('แผนที่การรบ','ชายฝั่งทุ่งกุลา','เลือกพื้นที่ที่จะปกป้อง',maps.map((m,i)=>[i>save.chapter?'🔒 '+m.name:m.name+' '+('★'.repeat(save.stars[i])),()=>{if(i<=save.chapter)start(i);}]).concat([['กลับ',menu]]));}
function squad(){show('หน่วยพิทักษ์','เสริมพลังฮีโร่','ผลึก '+save.gems+' ✦ · อัปเกรดเพิ่มพลังโจมตีในศึกถัดไป',roster.map((c,i)=>{const cost=8+save.ranks[i]*4;return [c.short+' '+save.ranks[i]+'★ · '+(save.ranks[i]===5?'เต็ม':cost+' ✦'),()=>{if(save.ranks[i]<5&&save.gems>=cost){save.gems-=cost;save.ranks[i]++;persist();sound(760);squad();}else $('summary').textContent=save.ranks[i]===5?'ถึงระดับสูงสุดแล้ว':'ต้องใช้ '+cost+' ผลึก · มี '+save.gems+' ผลึก';}];}).concat([['กลับ',menu]]));}
function menu(){if(!r||loadFailed)return;if(['won','lost'].includes(r.phase)){result(false);return;}show('COCKRO MAN',maps[r.index].name,'คุ้มกันผลึกปลายทางจนจบระลอกสุดท้าย',[['สู้ต่อ',resume],['ฮีโร่',squad],['แผนที่',chapters],['ฝึกด่านแรกใหม่',()=>{start(0);r.guide='pad';}]]);}
$('menuBtn').onclick=menu;
function result(credit){const won=r.phase==='won',stars=r.hp>=9?3:r.hp>=5?2:1,prize=4+stars+r.index*3;
 if(won&&credit){save.gems+=prize;save.stars[r.index]=Math.max(save.stars[r.index],stars);save.chapter=Math.max(save.chapter,Math.min(2,r.index+1));persist();sound(880);}
 show(won?'★'.repeat(stars):'หน่วยพิทักษ์',won?'ปกป้องผลึกสำเร็จ':'แนวป้องกันแตก',won?'ได้รับ '+prize+' ผลึก · คงเหลือ '+r.hp+' ชีวิต':'วางนักธนูตรงโค้งเพื่อให้ยิงได้นานขึ้น',[[won&&r.index<2?'ไปพื้นที่ถัดไป':'สู้ใหม่',()=>start(won?Math.min(2,r.index+1):r.index)],['เสริมพลัง',squad],['แผนที่',chapters]]);
}
function point(e){const b=arena.getBoundingClientRect();const rotated=matchMedia('(orientation:portrait)').matches;
 return rotated?{x:(e.clientY-b.top)/sx,y:(b.right-e.clientX)/sy}:{x:(e.clientX-b.left)/sx,y:(e.clientY-b.top)/sy};}
function use(id,x,y){if(cast(r,id,x,y)){aim=reticle=null;if(!r.guide&&!save.taught){save.taught=true;persist();}sound(620);}else tell('เล็งวงสกิลให้โดนศัตรู');}
function choose(id){if(paused)return;const u=r.units.find(v=>v.id===id);
 if(u){if(r.phase!=='fight'){tell('ใช้ '+roster[id].skill+' ระหว่างต่อสู้');return;}if(u.energy<99.99){tell('กำลังสะสมพลัง');return;}aim=aim===id?null:id;pad=null;return;}
 if(pad===null){tell('แตะแท่นว่างบนสนามก่อน');return;}
 if(place(r,pad,id)){pad=null;aim=null;sound(500);}else tell(r.guide==='pad'?'เลือกองครักษ์แมงสาบ':'ต้องใช้ 25 เหรียญ');
}
function tap(p){if(paused)return;if(aim!==null){use(aim,p.x,p.y);return;}
 const i=maps[r.index].pads.findIndex(([x,y])=>Math.hypot((p.x-x),p.y-y)<32);
 if(i<0)return;if(r.guide==='pad'&&i!==0){tell('เลือกแท่นที่มือชี้');return;}
 const unit=r.units.find(u=>u.pad===i);if(unit){choose(unit.id);return;}
 pad=pad===i?null:i;aim=null;
}
map.onpointerdown=e=>{sound(240);tap(point(e));};
$('go').onclick=()=>{if(!paused&&wave(r)){aim=pad=null;sound(400);}};
function makeCards(){roster.forEach((c,id)=>{const b=document.createElement('button');b.className='hero';b.style.setProperty('--glow',c.color);b.setAttribute('aria-label',c.name+' '+c.skill);
 const img=document.createElement('img');img.src='ward-face-'+id+'.webp';img.alt='';const label=document.createElement('b'),bar=document.createElement('i');b.append(img,label,bar);$('heroes').append(b);cards.push({b,label,bar});
 b.onpointerdown=e=>{if(paused)return;b.setPointerCapture(e.pointerId);drag={id,pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};};
 b.onpointermove=e=>{if(!drag||drag.pointer!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>9){drag.moved=true;reticle=point(e);}};
 b.onpointerup=e=>{if(!drag||drag.pointer!==e.pointerId)return;const moving=drag.moved;drag=reticle=null;if(moving){const p=point(e);if(r.units.some(u=>u.id===id))use(id,p.x,p.y);else{tap(p);choose(id);}}else choose(id);};
 b.onpointercancel=()=>{drag=reticle=null;};b.onclick=e=>{if(!e.detail)choose(id);};
 });}
function sync(){const stage=maps[r.index];$('stage').textContent=stage.name;$('coin').textContent='🪙 '+r.coins;$('life').textContent='♥ '+r.hp;$('waveNo').textContent='ระลอก '+r.wave+' / '+stage.waves;
 $('go').disabled=r.phase==='fight';$('go').textContent=r.phase==='fight'?'⚔ กำลังสู้':'เริ่มระลอก ▶';$('go').classList.toggle('guided',r.guide==='wave');
 const text=clock<until?msg:r.guide==='pad'?(pad===null?'☞ แตะแท่นสีทอง เพื่อป้องกันผลึก':'☞ แตะรูปองครักษ์เพื่อลงสนาม'):r.guide==='wave'?'☞ แตะเริ่มระลอก · ฮีโร่จะต่อสู้เอง':r.guide==='aim'?(aim===null?'☞ แตะรูปองครักษ์ที่เรืองแสง':'☞ แตะกลุ่มศัตรูเพื่อฟันดาบสะเทือน'):aim!==null?'แตะจุดที่จะใช้ '+roster[aim].skill:pad!==null?'เลือกฮีโร่เพื่อลงสนาม · 25 เหรียญ':r.phase==='break'?'เตรียมทีม แล้วเริ่มระลอกถัดไป':stage.squad&&r.phase==='setup'?'วางฮีโร่จัดทีม แล้วเริ่มศึก · องครักษ์เข้าประชิด นักธนูคุ้มกันด้านหลัง':'';
 $('tip').textContent=text;
 for(const [i,c] of cards.entries()){const u=r.units.find(q=>q.id===i);c.b.classList.toggle('active',aim===i);c.b.classList.toggle('guided',i===0&&(r.guide==='aim'&&aim===null||r.guide==='pad'&&pad===0));c.label.textContent=u?(u.energy>=99.99?roster[i].skill:Math.floor(u.energy)+'%'):roster[i].short+' · 25';c.bar.style.width=(u?u.energy:0)+'%';}
}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function resize(){w=map.clientWidth;h=map.clientHeight;sx=w/800;sy=h/370;const d=Math.min(1.7,devicePixelRatio||1);map.width=Math.round(w*d);map.height=Math.round(h*d);if(r)terrain();}
function terrain(){back=document.createElement('canvas');back.width=1200;back.height=555;const b=back.getContext('2d');b.scale(1.5,1.5);b.drawImage(images.land,0,0,800,370);
 if(maps[r.index].squad){b.drawImage(images.teamLand,0,0,800,370);return;}
 const road=()=>{b.beginPath();r.path.forEach((p,i)=>i?b.lineTo(p.x,p.y):b.moveTo(p.x,p.y));};
 b.lineJoin=b.lineCap='round';for(const [width,color] of [[35,'#73825a'],[32,'#c8b180'],[26,'#e5d09a']]){road();b.lineWidth=width;b.strokeStyle=color;b.stroke();}
 for(let d=0;d<r.total;d+=7){const p=locate(r,d);ellipse(b,p.x+Math.sin(d*2)*7,p.y+Math.sin(d)*9,2+d%3,1.4,'#aa976b6b');}
 for(const [x,y] of maps[r.index].pads){ellipse(b,x,y+3,22,12,'#516451');ellipse(b,x,y,22,12,'#e1d5a4');ellipse(b,x,y-1,17,8,'#a9b29a');}
}
function ring(x,y,rad,color,flat=.56){g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.ellipse(x,y,rad,rad*flat,0,0,Math.PI*2);g.stroke();}
function art(im,col,row,cols,rows,x,y,ww,hh,flip=false){const sw=im.width/cols,sh=im.height/rows;g.save();g.translate(x,y);if(flip)g.scale(-1,1);g.drawImage(im,col*sw,row*sh,sw,sh,-ww/2,-hh,ww,hh);g.restore();}
function label(s,x,y,color,size=14){g.fillStyle=color;g.textAlign='center';g.font='bold '+size+'px system-ui';g.fillText(s,x,y);}
function crystal(){const p=r.path.at(-1),x=772,y=p.y+9;ring(x,y,19,'#8cffe9');g.save();g.translate(x,y-18+Math.sin(clock*3)*2);g.shadowColor='#60efff';g.shadowBlur=12;for(const [sign,color] of [[-1,'#b4ffff'],[1,'#41b7e3']]){g.fillStyle=color;g.beginPath();g.moveTo(0,-22);g.lineTo(sign*12,3);g.lineTo(0,17);g.fill();}g.restore();}
function draw(){g.setTransform(map.width/800,0,0,map.height/370,0,0);g.drawImage(back,0,0,800,370);if(!maps[r.index].squad)crystal();
 const pads=maps[r.index].pads;
 pads.forEach(([x,y],i)=>{if(!(maps[r.index].squad&&r.phase==='fight')&&!r.units.some(u=>u.pad===i)){label('+',x,y+4,'#527367',15);if(pad===i||r.guide==='pad'&&i===0){ring(x,y,24+Math.sin(clock*5)*2,'#fff296');if(pad===null)label('☛',x-22,y-6+Math.sin(clock*5)*3,'#ffe56b',26);}}});
 const actors=[...r.units.map(u=>({u,y:u.y})),...r.foes.map(e=>({e,y:e.y}))].sort((a,b)=>a.y-b.y);
 for(const {u,e} of actors){if(u){if(u.hp===0&&r.phase==='fight')continue;const c=roster[u.id];ellipse(g,u.x,u.y+2,19,7,'#344c4670');ring(u.x,u.y,17,c.color);
 const frame=u.attack>0?4+Math.min(2,Math.floor((.24-u.attack)*12)):6;
 if(maps[r.index].squad&&r.phase==='fight'){g.fillStyle='#214837';g.fillRect(u.x-15,u.y-58,30,3);g.fillStyle='#91f281';g.fillRect(u.x-15,u.y-58,30*u.hp/u.maxHp,3);}
 art(images[c.file],Math.max(4,frame),u.face<0?2:3,13,4,u.x,u.y+6,59,59);
 }else{const s=e.boss?66:37;ellipse(g,e.x,e.y,12+(e.boss?7:0),5,'#32463866');if(e.flash>0)g.globalAlpha=.72;art(images.enemy,e.type,1+Math.floor(e.d/12)%2,3,4,e.x,e.y+3,s*1.19,s,e.face<0);g.globalAlpha=1;
 if(e.boss||e.hp<e.max){g.fillStyle='#503a32';g.fillRect(e.x-13,e.y-s,26,3);g.fillStyle=e.boss?'#ffc46c':'#ff8c73';g.fillRect(e.x-13,e.y-s,26*e.hp/e.max,3);}
 }}
 for(const f of r.effects){const t=1-f.t/f.max,c=roster[f.id].color;g.save();g.globalAlpha=Math.max(.05,1-t);g.strokeStyle=c;
 if(f.kind==='nova'){const rad=roster[f.id].area;g.shadowColor=c;g.shadowBlur=12;
 if(f.id===1){for(let j=0;j<8;j++){const ox=Math.sin(j*12.3)*rad*.7,oy=Math.cos(j*5)*rad*.4;g.strokeStyle='#f6fffb';g.lineWidth=2.5;g.beginPath();g.moveTo(f.x+ox-17*(1-t),f.y+oy-85*(1-t));g.lineTo(f.x+ox+2,f.y+oy-55*(1-t));g.stroke();}}
 if(f.id===0){g.strokeStyle='#fff4b2';g.lineWidth=7*(1-t)+1;g.beginPath();g.arc(f.x,f.y-9,30+rad*t*.5,-2.5+t,-1.5+t*3);g.stroke();}
 if(f.id===2){for(let j=0;j<7;j++){ellipse(g,f.x+Math.cos(j)*rad*t*.8,f.y+Math.sin(j)*rad*t*.45-26*t,9*(1-t)+1,12*(1-t)+1,'#c78cea99');}}
 ellipse(g,f.x,f.y,rad*t+1,rad*t*.7+1,c+'55');ring(f.x,f.y,rad*t+1,c,.7);for(let i=0;i<6;i++){const a=i*Math.PI/3;ellipse(g,f.x+Math.cos(a)*rad*t,f.y+Math.sin(a)*rad*t*.7-15*Math.sin(t*Math.PI),3,5,'#fff6b5');}}
 else{g.lineWidth=f.id===0?4:2;g.beginPath();g.moveTo(f.x,f.y);g.quadraticCurveTo((f.x+f.tx)/2,(f.y+f.ty)/2-(f.id===0?27:6),f.tx,f.ty);g.stroke();ellipse(g,f.tx,f.ty,5,5,c);}g.restore();}
 if(r.guide==='aim'&&r.foes.length){const e=r.foes[0];ring(e.x,e.y,23+Math.sin(clock*5)*4,'#fff299');}
 if(reticle&&drag&&r.units.some(u=>u.id===drag.id))ring(reticle.x,reticle.y,roster[drag.id].area,roster[drag.id].color,1);
}
function frame(now){const dt=Math.min(.06,(now-last)/1000||0);last=now;clock+=dt;if(!paused){tick(r,dt);if(['won','lost'].includes(r.phase)&&seenPhase!==r.phase){seenPhase=r.phase;result(true);}}draw();sync();requestAnimationFrame(frame);}
window.addEventListener('resize',resize);window.addEventListener('pagehide',()=>{if(r&&!paused)menu();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&r&&!paused)menu();});
async function boot(){try{const files={land:'lagoon.webp',teamLand:'maps/thung-kula-fields.webp',enemy:'sprites/alien-forest.webp',...Object.fromEntries(roster.map(c=>[c.file,'heroes/insect-suits/'+c.file+'.webp']))};
 await Promise.all(Object.entries(files).map(([id,path])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[id]=im;resolve();};im.onerror=reject;im.src=path;})));makeCards();resize();start(save.chapter);window.cockroBootReady=true;requestAnimationFrame(frame);
 }catch{loadFailed=true;show('COCKRO MAN','โหลดสนามรบไม่ครบ','เปิดเกมอีกครั้งเพื่อโหลดภาพสนาม',[['ลองใหม่',()=>location.reload()]]);}}
boot();
