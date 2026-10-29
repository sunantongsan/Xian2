import {drawCombatEffect} from './combat-vfx.js';
import {makePopulation,updateRespawns} from './alien-population.js';
import {HERO_CLASSES,uiArt,menuTile,heroIdentity} from './hero-ui.js';
import {MAPS,REGIONS,regionAt,mapSize,MAP_W,MAP_H,toWorld,toUV,walkable,traceStep,routeTo} from './maps.js';
import {parseTiled,zoneAt} from './tilemap.js';
import {createStarRenderer,drawGate,buildMinimap,minimapPoint} from './star-render.js';
import {STAR_ZONES,starMonster} from './star-data.js';
import {drawHero,CLASS_SHEETS} from './hero-animation.js';
import {FORMS,ELEMENTS,MODS,compileSkill,knownSkills,craft,skillTargets} from './skills.js';
import {ZONES,MONSTERS,HEROES} from './catalog.js';
import {allocateStat,trainSkill,combatStats,reputationTitle,fresh,maxHP,damage,reward,xpNeed,buyPotion,upgrade,upgradeCost,unlocked,validSave,inCone} from './core.js';
const $=id=>document.getElementById(id), cv=$('game'),ctx=cv.getContext('2d',{alpha:false}),modal=$('modal');
const images=new Map(), pendingImages=new Map();
let travelBusy=false, bookRequest=0,scene=null,route=[],pendingPoi=null;
let mapZoom=.8;
// ดาวฮีโร่ open world: parsed tile map, renderer, camps (spawn points) and minimap.
let star=null,starRender=null,starMini=null,starZone=-1,starCamps=[],starClock=0;
const isStar=()=>scene?.type==='tiles';
const SAVE='road-to-immortality-v1';
let s=null,p=null,zone=0,town=true,enemies=[],effects=[],projectiles=[],drops=[],target=null,move=null,keys=new Set(),time=0,last=0,saveClock=0,spawnClock=0,toastClock=0,attackHeld=false,screenW=0,screenH=0,scale=1,paused=false,audio=null;
let attackPointer=null;
const stick={id:null,x:0,y:0};
function resetControls(){stick.id=null;stick.x=stick.y=0;attackPointer=null;attackHeld=false;keys.clear();$('joystickThumb').style.transform='translate(-50%,-50%)';$('joystick').classList.remove('active');}
let cooldown={attack:0,skill:0,dash:0,potion:0};
const palette=[['#669b78','#acd4a3'],['#658e96','#b5cebf'],['#7a7c83','#a7a999'],['#bb9563','#efd49b'],['#785c55','#b68464'],['#8cb4c3','#d6ebeb'],['#597e62','#a5ba76'],['#675564','#a38a88'],['#8bb5b8','#d5e4d6'],['#928fb1','#e6dbc4']];
function toast(text){$('toast').textContent=text;$('toast').style.opacity=1;toastClock=3;}
function resize(){screenW=innerWidth;screenH=innerHeight;const d=Math.min(devicePixelRatio||1,s?.quality==='low'?1:1.5);cv.width=screenW*d;cv.height=screenH*d;ctx.setTransform(d,0,0,d,0,0);scale=Math.min(screenW/900,screenH/600);scale=Math.max(.55,Math.min(1.4,scale))*(scene?mapZoom:1);if(scene&&!isStar())scale=Math.max(scale,screenW/mapSize(scene).width,screenH/mapSize(scene).height);}
addEventListener('resize',resize);resize();
function loadImage(url){
 if(images.has(url))return Promise.resolve(images.get(url));
 if(pendingImages.has(url))return pendingImages.get(url);
 const task=new Promise((ok,no)=>{const im=new Image();im.onload=()=>{images.set(url,im);ok(im)};im.onerror=()=>no(new Error('โหลดภาพไม่สำเร็จ: '+url));im.src=url;}).finally(()=>pendingImages.delete(url));
 pendingImages.set(url,task);return task;
}
async function loadZone(){await loadImage('sprites/alien-forest.webp');}
function save(){if(!s)return;try{localStorage.setItem(SAVE,JSON.stringify(s));return true}catch{toast('บันทึกไม่สำเร็จ กรุณาตรวจพื้นที่เครื่อง');return false}}
function readSave(){try{return validSave(JSON.parse(localStorage.getItem(SAVE)))}catch{return null}}
function beep(freq=440,dur=.07){if(!s?.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=freq;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.start();o.stop(audio.currentTime+dur)}catch{}}
function show(html){paused=true;resetControls();move=null;target=null;route=[];pendingPoi=null;$('modalContent').innerHTML=html;$('windowClose').hidden=!p||travelBusy;if(!modal.open)modal.showModal();}
function close(){bookRequest++;modal.close();paused=travelBusy||document.hidden;}
modal.addEventListener('cancel',e=>{if(!p||travelBusy){e.preventDefault();return}bookRequest++;paused=document.hidden});
const button=(id,text)=>`<button id="${id}">${text}</button>`;
function atlas(g,im,col,row,cols,rows,x,y,w,h,flip=false){if(!im)return;const cw=im.width/cols,ch=im.height/rows;g.save();g.translate(x,y);if(flip)g.scale(-1,1);g.drawImage(im,col*cw,row*ch,cw,ch,-w/2,-h,w,h);g.restore();}
function previewHeroes(){HEROES.forEach(h=>{const c=$('preview-'+h.id);if(c)drawHero(c.getContext('2d'),images,h.id,{face:1,anim:'idle',walkDX:1,walkDY:0},c.width/2,c.height-5,118);});}
function title(){const saved=readSave();show(`<p class="sub">ภารกิจแรกบนดาวออโรรา</p>${uiArt(12,"title-emblem")}<h1>COCKRO</h1><h2>กำเนิดฮีโร่แมลง</h2><p>สำรวจป่าชีวะแสงจากฐานฮีโร่บนดาวต่างแดน<br>ต่อสู้กับฝูงสิ่งมีชีวิตต่างดาว ตั้งแต่เลเวล 1–60</p>${saved?button('continue','เล่นต่อ • เลเวล '+saved.level):''}${button('choose','เริ่มการเดินทาง')}${button('privacy','ความเป็นส่วนตัว')}<p class="sub">COCKRO 4.6.0 • รุ่นทดสอบ 2.5D • เล่นออฟไลน์ • เซฟในเครื่อง</p>`);if(saved)$('continue').onclick=()=>start(saved);$('choose').onclick=()=>choose(!!saved);$('privacy').onclick=privacy;}
function choose(warn=false){show(`<p class="eyebrow">COCKRO • HERO ROSTER</p><h2>เลือกอาชีพฮีโร่</h2><p class="sub">สี่พลัง หนึ่งภารกิจ — ปกป้องเมืองจากภัยกลายพันธุ์</p>${warn?'<p>เริ่มใหม่จะแทนที่เซฟเดิมเมื่อคุณยืนยัน</p>':''}<div class="grid hero-grid">${HERO_CLASSES.map(h=>`<article class="card hero-card" style="--hero-accent:${h.color}">${uiArt(h.icon,'hero-art')}<b>${h.name}</b><p class="sub">${h.description}</p><button id="pick-${h.id}" ${h.playable?'':'disabled'}>${h.playable?'เริ่มภารกิจ':'กำลังพัฒนาตัวละคร'}</button></article>`).join('')}</div><p class="sub">เล่นได้แล้ว: แมงสาบแมน และแมงป่องแมน • แมลงปอเกิลกับจิ้งหรีดแมนกำลังพัฒนา</p>${button('back','กลับ')}`);HERO_CLASSES.filter(h=>h.playable).forEach(h=>$('pick-'+h.id).onclick=()=>{if(warn){show(`<h2>เริ่มตัวละครใหม่?</h2><p>เซฟเดิมในเครื่องจะถูกแทนที่</p>${button('confirmNew','ยืนยันเริ่มใหม่')}${button('cancelNew','กลับ')}`);$('confirmNew').onclick=()=>start(fresh(h.id));$('cancelNew').onclick=()=>choose(true)}else start(fresh(h.id));});$('back').onclick=title;}
async function start(data){if(CLASS_SHEETS.includes(data.hero)){try{await loadImage('heroes/'+data.hero+'.webp');}catch{toast('โหลดตัวละครไม่ได้');return;}}else if(data.hero!=='sword-cockro'){try{await Promise.all(['walk','actions'].map(state=>loadImage('heroes/'+data.hero+'-'+state+'.webp')));}catch{toast('โหลดตัวละครเดิมไม่ได้');return;}}s=data;p={x:0,y:0,hp:maxHP(s),face:1,anim:'idle',animTime:0,walkDistance:0,walkDX:.707,walkDY:.707,back:false,inv:0,dead:false};cooldown={attack:0,skill:0,dash:0,potion:0};skillTimers={};p.mp=maxMP();close();$('hud').hidden=false;$('controls').hidden=false;$('hint').hidden=false;resize();if(await travel(s.zone,true)){save();toast('ยินดีต้อนรับสู่สถานีออโรรา');}}
async function travel(z,toTown=false,regionId=0){
 z=0;
 if(travelBusy||!s||!p)return false;
 if(!Number.isInteger(z)||!ZONES[z]||(!toTown&&!unlocked(s,z))){toast('ต้องถึงระดับพื้นที่และกำจัดบอสเขตก่อนหน้า');return false;}
 travelBusy=true;paused=true;bookRequest++;keys.clear();attackHeld=false;
 show(`<h2>กำลังเดินทาง…</h2><p>กำลังเตรียม ${toTown?'สถานีออโรรา':ZONES[z].name}</p>`);
 try{
  const nextScene=toTown?MAPS.town:MAPS.forest;await Promise.all([loadZone(z),nextScene?loadImage(nextScene.image):Promise.resolve()]);scene=nextScene;starRender=null;resize();$('zoomControls').hidden=!scene;route=[];pendingPoi=null;
  fields=[];zone=z;s.zone=z;town=toTown;p.mp=maxMP();p.x=0;p.y=0;p.hp=maxHP(s);p.dead=false;p.anim='idle';p.animTime=0;p.action=null;if(scene)Object.assign(p,toWorld(toTown?scene.spawn:(REGIONS[regionId]?.entry||scene.spawn),scene));
  enemies=[];effects=[];projectiles=[];drops=[];target=null;move=null;spawnClock=0;
  if(!town)spawn();for(const key of [...images.keys()])if(key.startsWith('maps/')&&key!==scene.image)images.delete(key);travelBusy=false;close();save();toast(town?'เมืองปลอดภัย • แตะป้ายเพื่อเดินไปใช้งาน':scene?.name||ZONES[z].name);return true;
 }catch(e){
  travelBusy=false;
  show(`<h2>เดินทางไม่สำเร็จ</h2><p>โหลดภาพพื้นที่ไม่ได้ ลองอีกครั้งหรือกลับสู่พื้นที่เดิม</p>${button('tryTravel','ลองอีกครั้ง')}${button('backTravel','กลับ')}`);
  $('tryTravel').onclick=()=>travel(z,toTown);$('backTravel').onclick=close;return false;
 }
}
function spawn(){enemies=makePopulation();}
function camera(){let x=.8*((p?.x||0)-(p?.y||0)),y=.4*((p?.x||0)+(p?.y||0));if(scene&&!isStar()){const {width:MAP_W,height:MAP_H}=mapSize(scene);x=Math.max(-MAP_W*.5+screenW/2/scale,Math.min(MAP_W*.5-screenW/2/scale,x));y=Math.max(-MAP_H*.6+screenH*.55/scale,Math.min(MAP_H*.4-screenH*.45/scale,y));}return{x,y};}
function project(x,y){const c=camera();return{x:screenW/2+(.8*(x-y)-c.x)*scale,y:screenH*.55+(.4*(x+y)-c.y)*scale};}
function unproject(x,y){const c=camera(),a=((x-screenW/2)/scale+c.x)/.8,b=((y-screenH*.55)/scale+c.y)/.4;return{x:(a+b)/2,y:(b-a)/2};}
function safeMove(actor,x,y){const old={x:actor.x,y:actor.y};let next=traceStep(scene,old,{x,y});if(Math.hypot(next.x-old.x,next.y-old.y)<.01){const a=traceStep(scene,old,{x,y:old.y}),b=traceStep(scene,old,{x:old.x,y});next=Math.hypot(a.x-old.x,a.y-old.y)>Math.hypot(b.x-old.x,b.y-old.y)?a:b;}Object.assign(actor,next);}
function setDestination(point,poi=null){route=routeTo(scene,p,point);move=route.shift()||null;pendingPoi=poi;target=null;if(!move)toast('ไม่มีทางเดินไปยังจุดนี้');}
function chasePoint(actor,goal){if(!scene)return goal;if(time>=(actor.navAt||0)||!actor.navPath?.length){actor.navPath=routeTo(scene,actor,goal,isStar()?1200:undefined);actor.navAt=time+.6;}while(actor.navPath?.length&&Math.hypot(actor.navPath[0].x-actor.x,actor.navPath[0].y-actor.y)<18)actor.navPath.shift();return actor.navPath?.[0]||actor;}
function usePoi(poi){if(poi.action==='warp')warpMenu();else if(poi.action==='star')travelStar(0);else if(poi.action==='forest')travel(0);else if(poi.action==='town')travel(0,true);else if(poi.action==='waypoint')map();else ({shop,forge,skills:skillMenu}[poi.action])?.();}
function drawSceneMarkers(){if(!scene)return;
 if(scene.tiled){for(let row=0;row<scene.rows;row++)for(let col=0;col<scene.cols;col++){
 const signs=[];if(col<scene.cols-1)signs.push([.86,.48,'ลานล่าถัดไป →']);if(col>0)signs.push([.14,.48,'← ลานล่าถัดไป']);if(row>0)signs.push([.49,.14,'↑ เส้นทางป่า']);if(row<scene.rows-1)signs.push([.49,.85,'↓ เส้นทางป่า']);
 for(const [u,v,label] of signs){const w=toWorld([(col+u)/scene.cols,(row+v)/scene.rows],scene),q=project(w.x,w.y);if(q.x<0||q.x>screenW||q.y<0||q.y>screenH)continue;ctx.save();ctx.font='11px GameThai, sans-serif';ctx.textAlign='center';ctx.fillStyle='#102538d9';ctx.fillRect(q.x-53,q.y-13,106,22);ctx.fillStyle='#efce87';ctx.fillText(label,q.x,q.y+2);ctx.restore();}
 }}for(const poi of scene.pois){const w=poi.world||toWorld(poi.uv,scene),q=project(w.x,w.y),lift=(poi.world?165:44)*scale;if(poi.world&&(q.x<-200||q.x>screenW+200||q.y<-60||q.y>screenH+250))continue;ctx.save();ctx.textAlign='center';ctx.font=`${Math.max(11,13*scale)}px GameThai, sans-serif`;const label=poi.action==='warp'&&s.level<STAR_ZONES[poi.zone].min?poi.name+' • Lv.'+STAR_ZONES[poi.zone].min:poi.name;const width=ctx.measureText(label).width+24;ctx.fillStyle='#193b46dc';ctx.strokeStyle='#ebcd87';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(q.x-width/2,q.y-lift,width,28,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff0c8';ctx.fillText(label,q.x,q.y-lift+19);ctx.strokeStyle='#f1d48d';ctx.beginPath();ctx.ellipse(q.x,q.y,15*scale,7*scale,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}

function movePlayer(dx,dy,dt,limit=Infinity,strength=1){
 const len=Math.hypot(dx,dy);if(len<.01)return false;
 // Root motion and gait share the same distance, including analog input and world bounds.
 if(actionLocked())return false;
 const speed=(s.hero.startsWith('sword')?110:105)+combatStats(s).speed,step=Math.min(limit,speed*dt*strength),ox=p.x,oy=p.y;
 safeMove(p,p.x+dx/len*step,p.y+dy/len*step);
 const distance=Math.hypot(p.x-ox,p.y-oy);if(distance<.001)return false;
 p.walkDistance=(p.walkDistance||0)+distance;if(Math.abs(dx-dy)>.05)p.face=dx-dy>=0?1:-1;
 p.walkDX=dx/len;p.walkDY=dy/len;p.back=dx+dy<0;p.anim='walk';return true;
}
function floating(x,y,text,color='#fff'){effects.push({type:'text',x,y,text,color,life:1,max:1});}
function hitEnemy(e,amount,quiet=false){if(e.hp<=0)return;e.aggroUntil=time+5;e.roamGoal=null;e.hp=Math.max(0,e.hp-amount);e.flash=.15;if(!quiet)floating(e.x,e.y,Math.round(amount),'#ffe6a1');if(e.hp===0){e.state='dead';e.clock=1;e.respawn=e.def.boss?25:7;const old=s.level,stone=reward(s,e.def);drops.push({x:e.x,y:e.y,life:1.8,stone});floating(e.x,e.y-30,'+'+e.def.xp+' EXP','#b0f5d1');if(stone)toast('ได้รับผลึกพลังงาน');if(s.level>old){for(const learned of knownSkills(s).filter(k=>k.level>old&&k.level<=s.level)){const slot=[0,1,2].find(i=>!s.equipped[i]);if(slot!==undefined)s.equipped[slot]=learned.id;}p.hp=maxHP(s);toast('เลเวล '+s.level+' • ตรวจทักษะใหม่ที่ศูนย์ฝึก');beep(880,.3)}if(e.def.boss){toast('พิชิต '+e.def.name+' • ได้รับรางวัลบอส');}save();}}
function hurt(amount){if(p.dead||p.inv>0)return;amount=Math.max(1,amount*100/(100+combatStats(s).defense));p.hp=Math.max(0,p.hp-amount);p.inv=.35;p.action=null;p.animDuration=.26;p.anim='hurt';p.animTime=0;floating(p.x,p.y,Math.round(amount),'#ff9191');beep(150);if(!p.hp){p.dead=true;p.anim='dead';p.animTime=0;move=null;target=null;setTimeout(()=>{if(!p.dead)return;show(`<h2>พลังงานแตกสลาย</h2><p>พักฟื้นที่เมืองแล้วกลับมาฝึกใหม่ได้<br>เลเวลและสิ่งของที่สะสมยังอยู่</p>${button('revive','เกิดที่เมือง')}`);$('revive').onclick=()=>travel(zone,true);},800)}}
function actionLocked(){return !!p?.action||(p?.anim==='hurt'&&p.animTime<.26);}
function beginAction(kind,duration,resolve){
 p.anim=kind;p.animTime=0;p.animDuration=duration;p.action={kind,elapsed:0,duration,impactAt:duration*.5,resolved:false,resolve};
}
function advanceAction(dt){
 const a=p?.action;if(!a||p.dead||paused)return;
 a.elapsed+=dt;
 if(!a.resolved&&a.elapsed>=a.impactAt){a.resolved=true;a.resolve();}
 if(p.action===a&&a.elapsed>=a.duration)p.action=null;
}
function attack(){
 if(!p||p.dead||town||cooldown.attack>0||paused||actionLocked())return;
 const live=enemies.filter(e=>e.hp>0),e=target?.hp>0?target:live.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 if(e&&Math.hypot(e.x-p.x,e.y-p.y)>=120){target=e;toast('เข้าใกล้ศัตรูเพื่อฟัน');return;}
 if(e){p.face=e.x-e.y-p.x+p.y>=0?1:-1;p.back=false;}
 const duration=.58*(1-combatStats(s).haste);cooldown.attack=duration;
 const origin={x:p.x,y:p.y};
 beginAction('attack',duration,()=>{
  effects.push({type:'slash',x:p.x,y:p.y,color:'#a1eaff',life:.22,max:.22});beep(460);
  if(e?.hp>0&&enemies.includes(e)&&Math.hypot(e.x-p.x,e.y-p.y)<120){
   const critical=Math.random()<combatStats(s).crit;hitEnemy(e,damage(s)*(critical?1.5:1));
   const dx=e.x-origin.x,dy=e.y-origin.y,n=Math.hypot(dx,dy)||1;e.recoilX=dx/n*9;e.recoilY=dy/n*9;
   effects.push({type:'impact',x:e.x,y:e.y,color:critical?'#ffe49b':'#b5f7ff',life:.24,max:.24,radius:critical?45:30});beep(critical?190:240,.06);
  }
 });
}
let skillTimers={}, fields=[];
function maxMP(){return combatStats(s).mp;}
function skill(slot=0){
 if(!p||p.dead||town||paused||actionLocked())return;
 const r=knownSkills(s).find(r=>r.id===s.equipped[slot]&&r.level<=s.level);if(!r)return;
 const k=compileSkill(r);k.power*=combatStats(s).spell*(1+(s.skillRanks[r.id]||0)*.06);if((skillTimers[r.id]||0)>0)return;
 if(p.mp<k.mp){toast('พลังงานไม่พอ');return;}
 const origin={x:p.x,y:p.y};const nearest=target?.hp>0?target:enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
 let aim=nearest?{x:nearest.x,y:nearest.y}:{x:p.x+p.face*150,y:p.y-p.face*150};const d=Math.hypot(aim.x-p.x,aim.y-p.y);if(d>k.range){aim={x:p.x+(aim.x-p.x)/d*k.range,y:p.y+(aim.y-p.y)/d*k.range};}
 p.mp-=k.mp;skillTimers[r.id]=k.cd;if(nearest)p.face=nearest.x-nearest.y-p.x+p.y>=0?1:-1;p.back=false;
 beginAction('skill',.6,()=>{
 const cast={k,origin,aim,drained:0};
 if(k.form==='field')fields.push({...cast,ticks:4,clock:0});else applyCast(cast);
 if(k.form==='dash'){safeMove(p,aim.x,aim.y);}
 effects.push({type:'technique',hero:s.hero,skillId:k.id,form:k.form,x:origin.x,y:origin.y,aim,color:k.color,radius:k.radius,range:k.range,life:.85,max:.85});beep(600,.15);
 });
}
function applyCast(cast){const {k,origin,aim}=cast;for(const e of skillTargets(k,origin,aim,enemies)){
 const before=e.hp;hitEnemy(e,damage(s)*k.power*(k.element==='lightning'?1.2:1));const dealt=before-e.hp;
 if(k.mods.includes('drain')){const heal=Math.min(dealt*.08,maxHP(s)*.08-cast.drained);cast.drained+=heal;p.hp=Math.min(maxHP(s),p.hp+heal);}
 if(e.hp<=0)continue;const mult=k.mods.includes('lasting')?1.5:1;
 if(k.element==='fire'||k.element==='poison'){e.dots??={};e.dots[k.element]={left:(k.element==='fire'?3:6)*mult,dps:damage(s)*(k.element==='fire'?.15:.1)};}
 if(k.element==='ice')e.slow=3*mult;
 if(k.element==='wind'){const d=Math.hypot(e.x-origin.x,e.y-origin.y)||1;safeMove(e,e.x+(e.x-origin.x)/d*45,e.y+(e.y-origin.y)/d*45);}
}}
function updateSkills(dt){if(!p||paused||p.dead)return;p.mp=Math.min(maxMP(),(p.mp??maxMP())+dt*5);for(const id in skillTimers)skillTimers[id]=Math.max(0,skillTimers[id]-dt);for(const e of enemies){e.slow=Math.max(0,(e.slow||0)-dt);for(const dot of Object.values(e.dots||{})){if(dot.left>0&&e.hp>0){const t=Math.min(dt,dot.left);dot.left-=t;hitEnemy(e,dot.dps*t,true);}}}for(const f of fields){f.clock-=dt;if(f.clock<=0&&f.ticks>0){applyCast(f);f.ticks--;f.clock+=1;effects.push({type:'technique',hero:s.hero,skillId:f.k.id,form:'field',x:f.aim.x,y:f.aim.y,aim:f.aim,color:f.k.color,radius:f.k.radius,range:f.k.range,life:.8,max:.8});}}fields=fields.filter(f=>f.ticks>0);}

function dash(){if(!p||p.dead||paused||cooldown.dash>0||actionLocked())return;cooldown.dash=2;let dx=move?move.x-p.x:p.face,dy=move?move.y-p.y:-p.face;const n=Math.hypot(dx,dy)||1;safeMove(p,p.x+dx/n*150,p.y+dy/n*150);p.inv=.6;effects.push({type:'skill',x:p.x,y:p.y,color:'#d5f3df',life:.25,max:.25,radius:60});}
function potion(){if(!p||p.dead||paused||cooldown.potion>0)return;if(s.potions<1){toast('ยาหมด ซื้อเพิ่มได้ที่เมือง');return}if(p.hp>=maxHP(s)){toast('พลังชีวิตเต็มแล้ว');return}s.potions--;p.hp=Math.min(maxHP(s),p.hp+maxHP(s)*.5);cooldown.potion=4;floating(p.x,p.y,'ฟื้นฟู','#8fffc2');save();}
function enemyAI(e,dt){e.moving=false;e.flash=Math.max(0,e.flash-dt);e.recoilX=(e.recoilX||0)*Math.exp(-dt*18);e.recoilY=(e.recoilY||0)*Math.exp(-dt*18);e.clock-=dt;if(e.hp<=0)return;const dist=Math.hypot(e.x-p.x,e.y-p.y);if(p.dead)return;if(e.homeX===undefined){e.homeX=e.x;e.homeY=e.y;}if((scene===MAPS.forest||isStar())&&Math.hypot(e.x-e.homeX,e.y-e.homeY)>(isStar()?650:520))e.returning=true;if(e.returning){e.state='idle';e.clock=Math.max(e.clock,1);e.aggroUntil=0;const home={x:e.homeX,y:e.homeY},nav=chasePoint(e,home),d=Math.hypot(nav.x-e.x,nav.y-e.y)||1;safeMove(e,e.x+(nav.x-e.x)/d*e.def.speed*dt,e.y+(nav.y-e.y)/d*e.def.speed*dt);if(Math.hypot(e.x-e.homeX,e.y-e.homeY)<50){e.hp=e.def.hp;e.returning=false;}return;}if(e.state==='idle'&&time>(e.aggroUntil||0)&&dist>(e.def.boss?260:230)){roam(e,dt);return;}const ranged=['projectile','cone','burst'].includes(e.def.attack),range=ranged?230:65;
 if(e.state==='windup'){if(e.clock<=0){e.state='attack';e.clock=.4;const d=e.def.damage;if(e.def.attack==='projectile'){projectiles.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*220,vy:Math.sin(e.angle)*220,life:2.5,damage:d,color:'#f7b65b'});}else if(e.def.attack==='dash'){projectiles.push({x:e.x,y:e.y,vx:Math.cos(e.angle)*330,vy:Math.sin(e.angle)*330,life:.65,damage:d*1.2,color:'#ed7d63',dash:true});}else if(e.def.attack==='burst'){if(Math.hypot(p.x-e.aimX,p.y-e.aimY)<95)hurt(d);effects.push({type:'skill',x:e.aimX,y:e.aimY,color:'#f38c68',life:.4,max:.4,radius:95});}else if(inCone(p.x,p.y,e.x,e.y,e.angle,e.def.attack==='cone'?235:100,e.def.attack==='cone'?1.1:2))hurt(d);}}
 else if(e.state==='attack'){if(e.clock<=0){e.state='idle';e.clock=e.def.cooldown;}}
 else if(dist<range&&e.clock<=0){e.state='windup';e.clock=e.def.boss?1.1:.75;e.angle=Math.atan2(p.y-e.y,p.x-e.x);e.aimX=p.x;e.aimY=p.y;}
 else if(dist<480&&dist>range*.8){const speed=e.def.speed*(e.slow>0?.65:1);const nav=chasePoint(e,p),nd=Math.hypot(nav.x-e.x,nav.y-e.y)||1,step=Math.min(nd,Math.max(0,dist-range*.8),speed*dt),ox=e.x,oy=e.y;safeMove(e,e.x+(nav.x-e.x)/nd*step,e.y+(nav.y-e.y)/nd*step);const screenDX=(e.x-ox)-(e.y-oy);e.moving=Math.hypot(e.x-ox,e.y-oy)>.01;if(Math.abs(screenDX)>.05)e.face=screenDX>=0?1:-1;}
}
function update(dt){time+=dt;if(toastClock>0){toastClock-=dt;if(toastClock<=0)$('toast').style.opacity=0;}if(!p||paused)return;updateSkills(dt);p.animTime+=dt;advanceAction(dt);p.inv=Math.max(0,p.inv-dt);Object.keys(cooldown).forEach(k=>cooldown[k]=Math.max(0,cooldown[k]-dt));if(!p.dead){let dx=0,dy=0;if(keys.has('w')||keys.has('arrowup')){dx--;dy--}if(keys.has('s')||keys.has('arrowdown')){dx++;dy++}if(keys.has('a')||keys.has('arrowleft')){dx--;dy++}if(keys.has('d')||keys.has('arrowright')){dx++;dy--}if(stick.id!==null){dx=stick.x+stick.y*2;dy=stick.y*2-stick.x;}let moving=false;if(dx||dy){move=null;target=null;route=[];pendingPoi=null;moving=movePlayer(dx,dy,dt,Infinity,stick.id!==null?Math.min(1,Math.hypot(stick.x,stick.y)):1)}else{if(s.autoAttack&&!town&&!move&&!(target?.hp>0)){target=enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<420).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||null;}if(target?.hp>0&&(s.autoAttack||attackHeld)){const dist=Math.hypot(target.x-p.x,target.y-p.y);if(dist>90){const n=chasePoint(p,target);moving=movePlayer(n.x-p.x,n.y-p.y,dt,Math.min(dist-90,Math.hypot(n.x-p.x,n.y-p.y)));}else if(s.autoAttack||attackHeld)attack();}else if(move){const d=Math.hypot(move.x-p.x,move.y-p.y);if(d>.5)moving=movePlayer(move.x-p.x,move.y-p.y,dt,d);else move=route.shift()||null;}}if(pendingPoi&&!move){const w=pendingPoi.world||toWorld(pendingPoi.uv,scene);if(Math.hypot(p.x-w.x,p.y-w.y)<100){const poi=pendingPoi;pendingPoi=null;usePoi(poi);}}if(!actionLocked()&&(p.animTime>(p.animDuration||.7)||['idle','walk'].includes(p.anim))){p.anim=moving?'walk':'idle';}if(attackHeld||keys.has(' '))attack();if(town)p.hp=Math.min(maxHP(s),p.hp+dt*maxHP(s)*.1);}
 if(!town){enemies.forEach(e=>{if(e.hp<=0){e.clock-=dt;return;}if(Math.hypot(e.x-p.x,e.y-p.y)>1100){e.moving=false;return;}const x=e.x,y=e.y;enemyAI(e,dt);const moved=Math.hypot(e.x-x,e.y-y);e.moving=moved>.01;e.walkDistance=(e.walkDistance||0)+moved;});if(scene===MAPS.forest)updateRespawns(enemies,p,dt);else if(isStar())starTick(dt);}

 for(const b of projectiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(!p.dead&&Math.hypot(b.x-p.x,b.y-p.y)<30){hurt(b.damage);b.life=0;}}projectiles=projectiles.filter(b=>b.life>0);effects.forEach(e=>e.life-=dt);effects=effects.filter(e=>e.life>0);drops.forEach(d=>d.life-=dt);drops=drops.filter(d=>d.life>0);saveClock+=dt;if(saveClock>5){saveClock=0;save();}hud();}
function hud(){const auto=$('autoBtn');auto.textContent='ออโต้: '+(s.autoAttack?'เปิด':'ปิด');auto.setAttribute('aria-pressed',String(s.autoAttack));const h=heroIdentity(s.hero);if($('portrait').dataset.hero!==s.hero){const pc=document.createElement('canvas');pc.width=96;pc.height=112;drawHero(pc.getContext('2d'),images,s.hero,{face:1,anim:'idle',walkDX:1,walkDY:0},48,114,116);$('portrait').style.backgroundImage=`url(${pc.toDataURL()})`;$('portrait').style.backgroundSize='100% 100%';$('portrait').dataset.hero=s.hero;}$('heroName').textContent=h.name+' +'+s.upgrade;$('level').textContent='เลเวล '+s.level+' • '+realm(s.level);$('hp').style.width=(p.hp/maxHP(s)*100)+'%';$('hpText').textContent=Math.ceil(p.hp)+' / '+maxHP(s);$('xp').style.width=(s.xp/xpNeed(s.level)*100)+'%';$('zoneName').textContent=isStar()?starLabel():town?MAPS.town.name:regionAt(p).name+' • Lv.'+regionAt(p).min+'–'+regionAt(p).max;$('money').textContent=s.gold.toLocaleString()+' G • หิน '+s.stones;$('potionBtn').textContent=cooldown.potion>0?Math.ceil(cooldown.potion)+'s':'ยา '+s.potions;for(let i=0;i<3;i++){const r=knownSkills(s).find(r=>r.id===s.equipped[i]);const b=$(i===0?'skillBtn':'skillBtn'+i);b.disabled=!r;if(b.dataset.skill!==(r?.id||'empty')){b.dataset.skill=r?.id||'empty';b.innerHTML='<span class="skill-art"></span><span class="skill-label"></span><span class="skill-cooldown" hidden></span>';b.querySelector('.skill-label').textContent=r?.name||'ว่าง';b.setAttribute('aria-label',r?.name||'ช่องวิชาว่าง');if(r&&/^[sd](?:[1-9]|10)$/.test(r.id)){const n=Number(r.id.slice(1))-1,art=b.querySelector('.skill-art');art.style.backgroundImage=`url(vfx/${r.id[0]==='s'?'sword':'demon'}.webp)`;art.style.backgroundPosition=`${((n%2)*4+1)/7*100}% ${Math.floor(n/2)/4*100}%`;}}const left=r?(skillTimers[r.id]||0):0,cd=b.querySelector('.skill-cooldown');cd.hidden=left<=0;cd.textContent=left>0?Math.ceil(left)+'s':'';} $('mp').style.width=((p.mp??0)/maxMP()*100)+'%';$('mpText').textContent='พลังงาน '+Math.floor(p.mp??0)+' / '+maxMP();$('dashBtn').textContent=cooldown.dash>0?Math.ceil(cooldown.dash)+'s':'หลบ';}
function realm(l){return l<=15?'ฮีโร่ฝึกหัด':l<=30?'ผู้พิทักษ์ชุมชน':l<=60?'ผู้พิทักษ์เมือง':l<=90?'หัวหน้าหน่วย':l<=120?'ฮีโร่ชั้นนำ':l<=150?'วีรบุรุษ':l<=180?'ผู้พิทักษ์โลก':l<=200?'ตำนานฮีโร่':'สุดยอดฮีโร่';}
const buildings=[{x:-230,y:-140,name:'ร้านเสบียง',kind:'shop'},{x:180,y:-220,name:'ช่างตีอาวุธ',kind:'forge'},{x:330,y:100,name:'ประตูเดินทาง',kind:'map'}];
function poly(points,fill,stroke){ctx.beginPath();points.forEach((v,i)=>{const q=project(v[0],v[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function drawGround(){if(isStar()){starRender.drawGround(ctx,view());return;}ctx.fillStyle='#071421';ctx.fillRect(0,0,screenW,screenH);if(!scene)return;const im=images.get(scene.image);if(!im)return;const {width,height}=mapSize(scene),q=project(0,0),left=q.x-width*.5*scale,top=q.y-height*.6*scale;
 const cols=scene.tiled?scene.cols:1,rows=scene.tiled?scene.rows:1,w=width*scale/cols,h=height*scale/rows;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const l=left+col*w,t=top+row*h,x=Math.max(0,l),y=Math.max(0,t),right=Math.min(screenW,l+w),bottom=Math.min(screenH,t+h);if(right>x&&bottom>y)ctx.drawImage(im,(x-l)/w*im.width,(y-t)/h*im.height,(right-x)/w*im.width,(bottom-y)/h*im.height,x,y,right-x,bottom-y);}}

function building(b){const q=project(b.x,b.y),u=scale;ctx.save();ctx.translate(q.x,q.y);ctx.scale(u,u);ctx.fillStyle='#142b3640';ctx.beginPath();ctx.ellipse(0,0,90,28,0,0,7);ctx.fill();ctx.fillStyle='#e2cfad';ctx.fillRect(-62,-100,124,95);ctx.fillStyle='#ad9b80';ctx.beginPath();ctx.moveTo(62,-100);ctx.lineTo(95,-80);ctx.lineTo(95,8);ctx.lineTo(62,-5);ctx.fill();ctx.fillStyle='#254c59';ctx.beginPath();ctx.moveTo(-90,-96);ctx.lineTo(-68,-113);ctx.lineTo(0,-154);ctx.lineTo(85,-110);ctx.lineTo(106,-96);ctx.lineTo(74,-91);ctx.lineTo(0,-129);ctx.lineTo(-68,-91);ctx.closePath();ctx.fill();ctx.strokeStyle='#e7c66a';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#456267';ctx.fillRect(-18,-60,36,55);ctx.fillStyle='#d8b060';ctx.fillRect(-49,-65,19,25);ctx.fillRect(30,-65,19,25);ctx.fillStyle='#bc6151';ctx.beginPath();ctx.ellipse(-67,-63,9,15,0,0,7);ctx.fill();ctx.fillStyle='#fff5d2';ctx.font='14px GameThai, sans-serif';ctx.textAlign='center';ctx.fillText(b.name,0,25);ctx.restore();}
function tree(x,y,n){const q=project(x,y),u=scale;ctx.save();ctx.translate(q.x,q.y);ctx.scale(u,u);ctx.fillStyle='#17312b33';ctx.beginPath();ctx.ellipse(0,0,30,10,0,0,7);ctx.fill();ctx.strokeStyle='#507757';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-5,-95);ctx.moveTo(11,0);ctx.lineTo(17,-75);ctx.stroke();ctx.fillStyle=town||zone<2?'#315f52':zone===5?'#e2f2ec':'#355c55';for(let i=0;i<5;i++){ctx.save();ctx.translate((i%2?1:-1)*10,-35-i*12);ctx.rotate((i%2?1:-1)*.6);ctx.beginPath();ctx.ellipse(10,0,28,7,0,0,7);ctx.fill();ctx.restore();}ctx.restore();}
function alienFrame(e){return e.state==='attack'||e.state==='windup'?3:e.moving?1+Math.floor((e.walkDistance||0)/35)%2:0;}
function drawAlien(g,im,e,x,y,size){g.save();g.translate(x,y);const hover=e.def.slot===2?Math.sin(time*2+e.def.id)*3*scale:0;g.shadowColor='#080a13';g.shadowBlur=3;const bob=e.moving?-Math.abs(Math.sin((e.walkDistance||0)/30))*2*scale:hover;atlas(g,im,e.def.slot,alienFrame(e),3,4,0,bob,size*4/3,size,e.face<0);g.restore();}
function visibleActor(e){const q=project(e.x,e.y);return q.x>-170&&q.x<screenW+170&&q.y>-40&&q.y<screenH+190;}
function actor(e,isHero=false){if(!isHero&&(e.hp<=0&&e.clock<=0||!visibleActor(e)))return;const q=project(e.x+(e.recoilX||0),e.y+(e.recoilY||0)),size=(isHero?110:e.def.boss?165:e.def.elite?130:100)*scale;ctx.save();ctx.globalAlpha=!isHero&&e.hp<=0?Math.max(0,e.clock):1;ctx.fillStyle='#05081799';ctx.beginPath();ctx.ellipse(q.x,q.y-2*scale,size*.27,size*.09,0,0,7);ctx.fill();if(isHero){if(e.inv>0&&Math.floor(time*20)%2)ctx.globalAlpha=.6;drawHero(ctx,images,s.hero,e,q.x,q.y,size);}else{if(e.hp>0){ctx.strokeStyle=e===target?'#fff3a4':'#ffb05b';ctx.lineWidth=e===target?3:1.5;ctx.beginPath();ctx.ellipse(q.x,q.y,27*scale,12*scale,0,0,7);ctx.stroke();}if(e.flash>.07)ctx.globalAlpha=.65;drawAlien(ctx,images.get('sprites/alien-forest.webp'),e,q.x,q.y,size);ctx.globalAlpha=1;if(e.hp>0){ctx.font=`bold ${Math.max(10,11*scale)}px GameThai, sans-serif`;ctx.textAlign='center';ctx.fillStyle=e.def.boss?'#ffcf70':e.def.elite?'#ffc4f0':'#fff7d5';ctx.strokeStyle='#080c18';ctx.lineWidth=3;const name=(e.def.boss||e.def.elite||e===target?e.def.name+' ':'')+'Lv.'+e.def.level;ctx.strokeText(name,q.x,q.y-size);ctx.fillText(name,q.x,q.y-size);ctx.fillStyle='#080d1d';ctx.fillRect(q.x-25*scale,q.y-size+4,50*scale,5);ctx.fillStyle=e.def.boss?'#ffb743':'#ff7657';ctx.fillRect(q.x-25*scale,q.y-size+4,50*scale*e.hp/e.def.hp,5);}}ctx.restore();}
function telegraph(e){if(e.state!=='windup'||!visibleActor(e))return;const burst=e.def.attack==='burst',q=project(burst?e.aimX:e.x,burst?e.aimY:e.y),r=(burst?95:e.def.attack==='cone'?200:e.def.attack==='dash'?160:75)*scale;ctx.save();ctx.strokeStyle='#ffdb9b';ctx.fillStyle='#d73f4544';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y,r*.9,r*.45,0,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 20px GameThai, sans-serif';ctx.textAlign='center';ctx.fillText('!',q.x,q.y-22);ctx.restore();}
function drawWorld(){drawGround();if(!p)return;if(move){const q=project(move.x,move.y);ctx.strokeStyle='#fff4aa';ctx.beginPath();ctx.ellipse(q.x,q.y,10,5,0,0,7);ctx.stroke();}enemies.forEach(telegraph);const render=[{sort:p.x+p.y,fn:()=>actor(p,true)}];for(const e of enemies)if(visibleActor(e)&&(e.hp>0||e.clock>0))render.push({sort:e.x+e.y,fn:()=>actor(e)});if(town&&!scene)for(const b of buildings)render.push({sort:b.x+b.y,fn:()=>building(b)});for(let i=0;i<(scene?0:22);i++){const a=i*2.399,r=town?560:800,x=Math.cos(a)*r,y=Math.sin(a)*r;render.push({sort:x+y,fn:()=>tree(x,y,i)});}if(isStar()){starRender.props(view(),render,ctx);for(const g of scene.pois){const q=project(g.world.x,g.world.y);if(q.x<-150||q.x>screenW+150||q.y<-40||q.y>screenH+260)continue;render.push({sort:g.world.x+g.world.y-30,fn:()=>drawGate(ctx,q.x,q.y,scale,time,{town:g.action==='town',locked:g.action==='warp'&&s.level<STAR_ZONES[g.zone].min})});}}render.sort((a,b)=>a.sort-b.sort).forEach(o=>o.fn());drawSceneMarkers();for(const b of projectiles){const q=project(b.x,b.y);ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(q.x,q.y-25,7*scale,0,7);ctx.fill();}for(const d of drops){const q=project(d.x,d.y);ctx.fillStyle=d.stone?'#78f3d8':'#f2cf70';ctx.beginPath();ctx.ellipse(q.x,q.y-10,6,9,Math.PI/4,0,7);ctx.fill();}for(const e of effects){const q=project(e.x,e.y);ctx.save();ctx.globalAlpha=Math.max(0,e.life/e.max);ctx.fillStyle=e.color;ctx.strokeStyle=e.color;if(e.type==='impact'){const u=1-e.life/e.max;ctx.globalCompositeOperation='lighter';ctx.lineWidth=2.5*scale;for(let i=0;i<8;i++){const a=i*Math.PI/4,r=(e.radius||30)*scale;ctx.beginPath();ctx.moveTo(q.x+Math.cos(a)*r*u*.35,q.y-35*scale+Math.sin(a)*r*u*.35);ctx.lineTo(q.x+Math.cos(a)*r*u,q.y-35*scale+Math.sin(a)*r*u);ctx.stroke();}}else if(e.type==='technique'&&drawSkillArt(e)){/* textured animation */}else if(e.type==='technique'){const a=project(e.aim.x,e.aim.y);ctx.lineWidth=6*scale;ctx.beginPath();if(e.form==='circle'){ctx.ellipse(q.x,q.y,e.radius*scale,e.radius*.5*scale,0,0,7);}else if(e.form==='field'){ctx.ellipse(a.x,a.y,e.radius*scale,e.radius*.5*scale,0,0,7);}else{ctx.moveTo(q.x,q.y-25*scale);ctx.lineTo(a.x,a.y-25*scale);}ctx.stroke();}else if(e.type==='text'){ctx.font='bold 16px GameThai, sans-serif';ctx.textAlign='center';ctx.fillText(e.text,q.x,q.y-60-(1-e.life)*35)}else{const prog=1-e.life/e.max,r=(e.radius||75)*scale*(.3+prog*.7);ctx.lineWidth=e.type==='slash'?6:3;ctx.beginPath();ctx.ellipse(q.x,q.y-25*scale,r,r*.5,-.2,e.type==='slash'?-.9:0,e.type==='slash'?1.6:7);ctx.stroke();if(e.type==='skill')for(let n=0;n<7;n++){const a=n*6.28/7+prog;ctx.beginPath();ctx.moveTo(q.x+Math.cos(a)*r*.3,q.y+Math.sin(a)*r*.15-25);ctx.lineTo(q.x+Math.cos(a)*r,q.y+Math.sin(a)*r*.5-25);ctx.stroke();}}ctx.restore();}}
function loop(t){const dt=Math.min((t-last)/1000||0,.05);last=t;if(!document.hidden){update(dt);draw();}requestAnimationFrame(loop)}
function miniMapBounds(){return !town&&scene&&screenW>=650?{x:screenW/2-60,y:58,w:120,h:80}:null;}
function draw(){drawWorld();const box=miniMapBounds();if(!box)return;if(isStar()){drawStarMini(ctx,box.x-30,box.y-4,box.w+60,box.h+8,false);return;}
 ctx.save();ctx.fillStyle='#061522d9';ctx.fillRect(box.x-4,box.y-4,box.w+8,box.h+8);
 ctx.fillStyle='#567587';for(const polygon of scene.walk){ctx.beginPath();polygon.forEach(([u,v],i)=>{const x=box.x+u*box.w,y=box.y+v*box.h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();}
 ctx.font='9px GameThai, sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffe7a0';for(const r of REGIONS)ctx.fillText(r.min+'–'+r.max,box.x+r.center[0]*box.w,box.y+r.center[1]*box.h-8);
 const [u,v]=toUV(p,scene);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(box.x+u*box.w,box.y+v*box.h,3,0,7);ctx.fill();
 ctx.strokeStyle='#f3cf79';ctx.strokeRect(box.x,box.y,box.w,box.h);ctx.restore();
}


// ---------- ดาวฮีโร่ ----------
function view(){const c=camera();return {scale,ox:screenW/2-c.x*scale,oy:screenH*.55-c.y*scale,w:screenW,h:screenH,camX:c.x,camY:c.y};}
async function loadStar(){if(star)return star;const r=await fetch('maps/hero-star.json');if(!r.ok)throw new Error('map');star=parseTiled(await r.json());starMini=buildMinimap(star);return star;}
function starLabel(){const Z=STAR_ZONES[zoneAt(scene,p)];return Z?`ดาวฮีโร่ • ${Z.name} • Lv.${Z.min}–${Z.max}`:'ดาวฮีโร่';}
async function travelStar(gate=0){
 if(travelBusy||!s||!p)return false;
 const Z=STAR_ZONES[gate];if(!Z)return false;if(s.level<Z.min){toast(`ต้องเลเวล ${Z.min} ขึ้นไปจึงวาร์ปไป${Z.name}ได้`);return false;}
 if(isStar()&&enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<400&&time<(e.aggroUntil||0))){toast('ออกจากระยะต่อสู้ก่อนวาร์ป');return false;}
 travelBusy=true;paused=true;bookRequest++;keys.clear();attackHeld=false;
 show(`<h2>กำลังเดินทาง…</h2><p>มุ่งสู่ดาวฮีโร่ • ${Z.name}</p>`);
 try{
  await loadStar();await loadZone();
  scene=star;starRender=createStarRenderer(star,{quality:s.quality});resize();$('zoomControls').hidden=false;route=[];pendingPoi=null;fields=[];town=false;
  p.mp=maxMP();p.hp=maxHP(s);p.dead=false;p.anim='idle';p.animTime=0;p.action=null;const g=star.pois.find(q=>q.action==='warp'&&q.zone===gate);Object.assign(p,{x:g.world.x+40,y:g.world.y+70});
  enemies=[];effects=[];projectiles=[];drops=[];target=null;move=null;spawnClock=0;starZone=zoneAt(star,p);
  starCamps=star.spawns.map(c=>({...c,members:[],respawn:0}));starClock=0;populateStar();starRender.warm(view());
  for(const key of [...images.keys()])if(key.startsWith('maps/'))images.delete(key);
  travelBusy=false;close();save();toast(`ดาวฮีโร่ • เขต ${gate+1} ${Z.name} Lv.${Z.min}–${Z.max}`);return true;
 }catch(e){
  travelBusy=false;show(`<h2>เดินทางไม่สำเร็จ</h2><p>โหลดแผนที่ดาวฮีโร่ไม่ได้</p>${button('tryTravel','ลองอีกครั้ง')}${button('backTravel','กลับ')}`);
  $('tryTravel').onclick=()=>travelStar(gate);$('backTravel').onclick=close;return false;
 }
}
// Camps near the hero are simulated; distant ones sleep. Cleared camps respawn after a delay so levelling continues.
const ACTIVE=1500;
function populateStar(){
 enemies=enemies.filter(e=>e.hp>0||e.clock>0);
 for(const c of starCamps){
  c.members=c.members.filter(e=>enemies.includes(e));
  const d=Math.hypot(c.x-p.x,c.y-p.y);
  if(c.members.length&&c.members.every(e=>e.hp<=0)&&!c.respawn)c.respawn=time+(c.elite?40:8+Math.random()*5);
  if(d<ACTIVE&&!c.members.length&&time>=c.respawn&&d>220){
   c.respawn=0;const Z=STAR_ZONES[c.zone];
   for(let k=0;k<c.count;k++){
    const level=k?Math.max(Z.min,Math.min(Z.max,c.level+Math.round(Math.random()*2-1))):c.level;
    const def=starMonster(level,{slot:c.species,elite:c.elite&&!c.boss,boss:c.boss});
    const a=k*2.4+c.id,off=k?48:0;let pos={x:c.x+Math.cos(a)*off,y:c.y+Math.sin(a)*off};if(!walkable(scene,pos))pos={x:c.x,y:c.y};
    const e={def,...pos,hp:def.hp,state:'idle',clock:1+Math.random()*2,angle:0,face:Math.random()<.5?1:-1,flash:0,homeX:pos.x,homeY:pos.y,camp:c};
    c.members.push(e);enemies.push(e);
   }
  }else if(d>ACTIVE+500&&c.members.length&&c.members.every(e=>e.hp>0&&!e.returning&&time>(e.aggroUntil||0))){
   enemies=enemies.filter(e=>!c.members.includes(e));if(c.members.includes(target))target=null;c.members=[];
  }
 }
}
function starTick(dt){
 starClock+=dt;if(starClock>.5){starClock=0;populateStar();}
 const z=zoneAt(scene,p);if(z>=0&&z!==starZone){starZone=z;const Z=STAR_ZONES[z];toast(`เขต ${z+1}: ${Z.name} • Lv.${Z.min}–${Z.max}${s.level<Z.min-2?' • อันตราย!':''}`);}
}
function drawStarMini(g,X,Y,W,H,big){
 if(!starMini||!star)return;g.save();g.fillStyle='#061522d9';if(!big){g.beginPath();g.roundRect(X-4,Y-4,W+8,H+8,8);g.fill();}
 const k=Math.min(W/starMini.width,H/starMini.height),ox=X+(W-starMini.width*k)/2,oy=Y+(H-starMini.height*k)/2;g.drawImage(starMini,ox,oy,starMini.width*k,starMini.height*k);
 const dot=(x,y,r,col)=>{const m=minimapPoint(star,x,y);g.fillStyle=col;g.beginPath();g.arc(ox+m.x*k,oy+m.y*k,r,0,7);g.fill();};
 for(const q of star.pois)dot(q.world.x,q.world.y,big?5:2.5,q.action==='town'?'#ffd77a':s.level>=STAR_ZONES[q.zone].min?'#7fe9ff':'#8a8f9c');
 if(big){g.font='bold 13px GameThai, sans-serif';g.textAlign='center';for(const q of star.pois)if(q.action==='warp'){const m=minimapPoint(star,q.world.x,q.world.y);g.lineWidth=3;g.strokeStyle='#0b1a24';g.strokeText(String(q.zone+1),ox+m.x*k,oy+m.y*k-8);g.fillStyle='#fff3cf';g.fillText(String(q.zone+1),ox+m.x*k,oy+m.y*k-8);}}
 if(isStar()){for(const e of enemies)if(e.hp>0&&e.def.elite)dot(e.x,e.y,big?4:2,'#ff6b8a');dot(p.x,p.y,big?6:3.5,'#ffffff');dot(p.x,p.y,big?3:1.8,'#ff4d4d');}
 if(!big){g.strokeStyle='#f3cf79';g.lineWidth=1;g.beginPath();g.roundRect(X-4,Y-4,W+8,H+8,8);g.stroke();}g.restore();
}
async function warpMenu(){
 if(!s||!p||travelBusy)return;
 show(`<h2>ดาวฮีโร่ • ประตูวาร์ป</h2><p class="sub">โลกเปิด 12 เขต เลเวล 1–60 • ประตูเปิดเมื่อเลเวลถึงขั้นต่ำของเขต • บอสต่างดาวอยู่ในเขต 2, 4, 6, 8, 10, 12</p><canvas id="starMap" class="star-map" width="760" height="380"></canvas><div class="grid warp-grid">${STAR_ZONES.map((Z,i)=>`<button id="warp-${i}" ${s.level>=Z.min?'':'disabled'}>${i+1}. ${Z.name}<br><small>Lv.${Z.min}–${Z.max}${s.level>=Z.min?'':' • ล็อก'}</small></button>`).join('')}</div>${isStar()?button('warpTown','กลับสถานีออโรรา'):''}${button('return','กลับ')}`);
 STAR_ZONES.forEach((Z,i)=>$('warp-'+i).onclick=()=>travelStar(i));$('return').onclick=close;if(isStar())$('warpTown').onclick=()=>travel(0,true);
 try{await loadStar();const c=$('starMap');drawStarMini(c.getContext('2d'),0,0,c.width,c.height,true);}catch{}
}
function menu(){if(!s||!p||travelBusy)return;show(`<h2>ศูนย์บัญชาการฮีโร่</h2><p>${realm(s.level)} • เลเวล ${s.level}<br>ปราบศัตรู ${s.kills} ตัว • พบ ${s.seen.filter(id=>id>=1000).length}/66 รายการ</p><div class="hq-menu">${menuTile('stats','สถานะฮีโร่',5)}${menuTile('map','แผนที่ภารกิจ',4)}${menuTile('book','ข้อมูลศัตรู',8)}${menuTile('shop','ร้านเสบียง',2)}${menuTile('forge','อัปเกรดอาวุธ',7)}${menuTile('skills','ทักษะและพลัง',6)}${menuTile('settings','ตั้งค่า',11)}${menuTile('help','คู่มือฮีโร่',8)}${menuTile('resume','กลับเข้าสนาม',0)}</div>`);$('stats').onclick=statMenu;$('map').onclick=map;$('book').onclick=()=>bestiary(zone);$('shop').onclick=()=>town?shop():toast('กลับเมืองเพื่อซื้อของ');$('forge').onclick=()=>town?forge():toast('กลับเมืองเพื่อเสริมอาวุธ');$('skills').onclick=skillMenu;$('settings').onclick=settings;$('help').onclick=help;$('resume').onclick=close;}
function map(){show(`<h2>ดาวออโรรา • ป่าชีวะแสง</h2><button id="paintedStar" class="star-entry"><span class="star-preview">✦</span><b>ดาวฮีโร่</b> • โลกเปิด 12 เขต • มอนสเตอร์ Lv.1–60 • ประตูวาร์ปทุกเขต</button><div class="grid"><button id="paintedTown"><img class="map-preview" src="${MAPS.town.image}" alt="หมู่บ้านฮีโร่">สถานีออโรรา • เขตปลอดภัย</button><button id="paintedForest"><div class="world-overview" aria-label="แผนที่ป่าชีวะแสง">${REGIONS.map(r=>`<span style="left:${r.center[0]*100}%;top:${r.center[1]*100}%">${r.min}–${r.max}</span>`).join('')}${!town?`<i style="left:${toUV(p,MAPS.forest)[0]*100}%;top:${toUV(p,MAPS.forest)[1]*100}%" title="คุณอยู่ที่นี่"></i>`:''}</div>แผนที่ใหญ่ • มอนสเตอร์ Lv.1–60</button></div><p class="sub">พื้นที่ทั้งหมดเชื่อมถึงกัน เดินสำรวจได้ • จุดส่งตัวปลดล็อกตามเลเวล • ใช้จุดส่งตัวเมื่ออยู่ฐานหรือพ้นระยะต่อสู้</p><div class="grid">${REGIONS.map(r=>`<button id="region-${r.id}" ${s.level>=r.min?'':'disabled'}>${r.name}<br><small>Lv.${r.min}–${r.max} • ฝูงมอนสเตอร์และบอส</small></button>`).join('')}</div>${button('return','กลับ')}`);$('paintedStar').onclick=warpMenu;$('paintedTown').onclick=()=>travel(0,true);$('paintedForest').onclick=()=>travel(0);REGIONS.forEach(r=>$('region-'+r.id).onclick=()=>{if(!town&&enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<400)){toast('ออกจากระยะต่อสู้ก่อนส่งตัว');return;}travel(0,false,r.id);});$('return').onclick=menu;}
async function bestiary(region=0){const request=++bookRequest;try{await loadZone();if(request!==bookRequest)return;const r=REGIONS[region]||REGIONS[0],list=MONSTERS.filter(m=>m.region===r.id);show(`<h2>สิ่งมีชีวิตต่างดาว • ${r.name}</h2><div class="bar">${button('prevBook','‹')}${button('nextBook','›')}<b>Lv.${r.min}–${r.max}</b></div><div class="grid">${list.map(m=>`<div class="card monster-card"><canvas id="m-${m.id}" width="140" height="110"></canvas><b>${m.name}</b><p class="sub">Lv.${m.level} ${m.boss?'• บอส':''}<br>${s.seen.includes(m.id)?'พิชิตแล้ว':'ยังไม่พิชิต'}</p></div>`).join('')}</div>${button('return','กลับ')}`);list.forEach(m=>{const c=$('m-'+m.id);drawAlien(c.getContext('2d'),images.get('sprites/alien-forest.webp'),{def:m,state:'idle',face:1},70,105,100);});$('prevBook').onclick=()=>bestiary((region+5)%6);$('nextBook').onclick=()=>bestiary((region+1)%6);$('return').onclick=menu;}catch{toast('โหลดข้อมูลศัตรูไม่ได้');}}
function shop(){show(`<h2>ร้านเสบียงฮีโร่</h2><p>เงิน ${s.gold.toLocaleString()} G • ยา ${s.potions} ขวด<br>ยา 1 ขวดฟื้นพลังชีวิต 50%</p><div class="grid shop-grid"><article class="card">${uiArt(2)}<h3>ชุดฟื้นฟูพลังชีวิต</h3><p>ฟื้น HP 50% • มี ${s.potions} ชิ้น</p>${button('buy','ซื้อ • 50 G')}</article><article class="card">${uiArt(3)}<h3>ผลึกพลังงาน</h3><p>มี ${s.stones} ชิ้น • แลกเป็นเงิน</p>${button('sell','ขาย 1 ชิ้น • 1,000 G')}</article></div>${button('return','กลับ')}`);$('buy').disabled=s.gold<50;$('sell').disabled=s.stones<1;$('buy').onclick=()=>{if(!buyPotion(s))toast('เงินไม่พอ');save();shop();};$('sell').onclick=()=>{if(s.stones<1){toast('ไม่มีผลึกพลังงาน');return}s.stones--;s.gold+=1000;save();shop();};$('return').onclick=menu;}
function forge(){show(`<h2>โรงงานอุปกรณ์ฮีโร่</h2>${uiArt(0,"weapon-art")}<p>อาวุธ +${s.upgrade} / 20<br>พลังโจมตี ${damage(s)} • เงิน ${s.gold.toLocaleString()} G</p>${button('upgrade','เสริมพลัง • '+upgradeCost(s)+' G')}${button('return','กลับ')}`);$('upgrade').disabled=s.upgrade>=20;$('upgrade').onclick=()=>{if(!upgrade(s))toast('เงินไม่พอ');else beep(800);save();forge();};$('return').onclick=menu;}
function settings(){show(`<h2>ตั้งค่า</h2>${button('sound','เสียง: '+(s.sound?'เปิด':'ปิด'))}${button('quality','ภาพ: '+(s.quality==='low'?'ประหยัด':'อัตโนมัติ'))}${button('privacy','ความเป็นส่วนตัว')}${button('title','หน้าหลัก')}${button('return','กลับ')}`);$('sound').onclick=()=>{s.sound=!s.sound;save();settings();};$('quality').onclick=()=>{s.quality=s.quality==='low'?'auto':'low';resize();save();settings();};$('privacy').onclick=privacy;$('title').onclick=()=>{save();p=null;$('hud').hidden=true;$('controls').hidden=true;$('hint').hidden=true;title();};$('return').onclick=menu;}
function help(){show(`<h2>วิธีเล่น</h2><p>ลากจอยซ้ายหรือแตะพื้นเพื่อเดิน • แตะศัตรูเพื่อล็อกเป้า • กดโจมตีค้างเพื่อเข้าต่อสู้<br>ปุ่มออโต้ เปิด: ค้นหาและโจมตีศัตรูใกล้ตัว • ปิด: ควบคุมการโจมตีเอง<br>ปุ่มโจมตีอยู่ขวาล่าง • วิชา 3 ช่องเรียงรอบปุ่มโจมตี<br>เห็นเครื่องหมาย ! ให้หลบออกจากพื้นที่เตือน<br>ยาฟื้นพลังชีวิต 50% • กลับเมืองเพื่อพักฟื้น ซื้อยา และเสริมอาวุธ<br>ป่าชีวะแสงมี 6 เขต Lv.1–60 • จุดส่งตัวปลดล็อกตามเลเวล<br>คอมพิวเตอร์: WASD / ลูกศรเดิน • Space ฟัน • Q สกิล • E หลบ • R ยา<br>เกมบันทึกในเครื่องอัตโนมัติ การล้างข้อมูลหรือลบแอปทำให้เซฟหาย</p>${button('return','กลับ')}`);$('return').onclick=menu;}
function privacy(){show(`<h2>ความเป็นส่วนตัว</h2><p>รุ่นนี้เล่นออฟไลน์ ไม่เก็บชื่อ อีเมล ตำแหน่ง หรือข้อมูลเพื่อโฆษณา ไม่มีระบบวิเคราะห์การใช้งานและไม่มีโฆษณา<br>ความคืบหน้าและการตั้งค่าเก็บเฉพาะในเครื่อง ไม่มีการส่งเซฟไปเซิร์ฟเวอร์<br>ลบข้อมูลได้ด้วยการล้างข้อมูลแอปจากการตั้งค่า Android การลบดังกล่าวกู้คืนไม่ได้<br>ติดต่อผู้พัฒนา: sunan.tongsan@gmail.com</p>${button('return','กลับ')}`);$('return').onclick=()=>p?settings():title();}
cv.addEventListener('pointerdown',e=>{if(!p||paused||p.dead)return;beep(320,.015);const mini=miniMapBounds();if(mini&&e.clientX>=mini.x&&e.clientX<=mini.x+mini.w&&e.clientY>=mini.y&&e.clientY<=mini.y+mini.h){isStar()?warpMenu():map();return;}const point=unproject(e.clientX,e.clientY);if(scene){for(const poi of scene.pois){const w=poi.world||toWorld(poi.uv,scene),q=project(w.x,w.y);if(Math.abs(e.clientX-q.x)<75&&e.clientY>q.y-(poi.world?185*scale:55)&&e.clientY<q.y+18){setDestination(w,poi);return;}}}if(town&&!scene){for(const b of buildings){const q=project(b.x,b.y);if(Math.abs(e.clientX-q.x)<90*scale&&e.clientY<q.y+30*scale&&e.clientY>q.y-170*scale){({shop,forge,map}[b.kind])();return}}}const found=enemies.filter(x=>x.hp>0).sort((a,b)=>(b.x+b.y)-(a.x+a.y)).find(x=>{const q=project(x.x,x.y);return Math.abs(e.clientX-q.x)<55*scale&&e.clientY<q.y+10&&e.clientY>q.y-130*scale});pendingPoi=null;route=[];target=found||null;if(found){move=null;p.navAt=0;}else setDestination(point);});
const joy=$('joystick');
function moveStick(e){const r=joy.getBoundingClientRect(),radius=r.width*.34,dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),strength=Math.min(1,Math.max(0,(d/radius-.12)/.88));stick.x=d?dx/d*strength:0;stick.y=d?dy/d*strength:0;$('joystickThumb').style.transform=`translate(calc(-50% + ${stick.x*radius}px),calc(-50% + ${stick.y*radius}px))`;}
joy.addEventListener('pointerdown',e=>{if(!p||paused||p.dead||stick.id!==null)return;e.preventDefault();stick.id=e.pointerId;joy.setPointerCapture(e.pointerId);joy.classList.add('active');move=null;target=null;route=[];pendingPoi=null;moveStick(e);});
joy.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e);});
function releaseStick(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;joy.classList.remove('active');$('joystickThumb').style.transform='translate(-50%,-50%)';}
for(const type of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(type,releaseStick);
$('autoBtn').onclick=()=>{if(!p||paused||p.dead)return;s.autoAttack=!s.autoAttack;target=null;move=null;route=[];p.navPath=[];save();hud();toast(s.autoAttack?'เปิดโจมตีอัตโนมัติ':'ปิดโจมตีอัตโนมัติ');};
$('statsShortcut').onclick=()=>{if(p&&!travelBusy)statMenu();};
$('attackBtn').addEventListener('pointerdown',e=>{if(!p||paused||p.dead||attackPointer!==null)return;e.preventDefault();attackPointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);attackHeld=true;attack();});
function releaseAttack(e){if(e.pointerId===attackPointer){attackHeld=false;attackPointer=null;}}
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('attackBtn').addEventListener(type,releaseAttack);
$('zoomIn').onclick=()=>{mapZoom=Math.min(1.15,mapZoom+.1);resize();};$('zoomOut').onclick=()=>{mapZoom=Math.max(.55,mapZoom-.1);resize();};$('windowClose').onclick=()=>{if(p&&!travelBusy)close();};$('mapShortcut').onclick=map;$('skillsShortcut').onclick=skillMenu;$('bagShortcut').onclick=()=>{menu();};
$('skillBtn').onclick=()=>skill(0);$('skillBtn1').onclick=()=>skill(1);$('skillBtn2').onclick=()=>skill(2);$('dashBtn').onclick=dash;$('potionBtn').onclick=potion;$('menuBtn').onclick=menu;$('townBtn').onclick=()=>travel(zone,true);
addEventListener('keydown',e=>{if(modal.open||!p)return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k);if(k===' ')attack();if(k==='q')skill(0);if(k==='1')skill(0);if(k==='2')skill(1);if(k==='3')skill(2);if(k==='e')dash();if(k==='r')potion();if(k==='escape')menu();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{resetControls();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetControls();save();paused=true}else if(!modal.open&&!travelBusy)paused=false;});
window.addEventListener('pagehide',save);
async function boot(){try{await document.fonts.load('16px GameThai');await loadImage('heroes/cockro-combat-v2.webp');await loadZone(0);$('progress').value=9;await loadImage('vfx/sword.webp');$('progress').value=10;await loadImage('vfx/demon.webp');$('progress').value=11;$('loading').hidden=true;title();requestAnimationFrame(loop);}catch(e){$('loadText').textContent='โหลดทรัพยากรไม่สำเร็จ กรุณาลองอีกครั้ง';$('retry').hidden=false;$('retry').onclick=()=>location.reload();console.error(e);}}
boot();

const escapeHTML=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function skillInfo(r){const k=compileSkill(r);k.power*=combatStats(s).spell*(1+(s.skillRanks[r.id]||0)*.06);return `${FORMS[r.form].name} • ${ELEMENTS[r.element].name}<br>${FORMS[r.form].desc}<br>${ELEMENTS[r.element].desc}<br>${r.mods.map(m=>MODS[m].name+': '+MODS[m].desc).join('<br>')}<br>พลัง ×${k.power.toFixed(2)} • พลังงาน ${k.mp} • คูลดาวน์ ${k.cd.toFixed(1)} วินาที`;}
function skillMenu(){show(`<h2>วิชาของฮีโร่</h2><p>แต้มวิชา ${s.skillPoints} • ติดตั้งได้ 3 วิชา • พลังงานฟื้น 5/วินาที • ปุ่ม Q หรือ 1 / 2 / 3</p><div class="grid">${knownSkills(s).map(r=>`<div class="card"><b>${escapeHTML(r.name)}</b><p>ปลดล็อก Lv.${r.level} • ระดับวิชา ${(s.skillRanks[r.id]||0)+1}/20</p><button data-train="${r.id}" ${s.level<r.level||s.skillPoints<1||(s.skillRanks[r.id]||0)>=19?'disabled':''}>ฝึกวิชา • 1 แต้ม</button><p class="sub">${skillInfo(r)}</p>${[0,1,2].map(i=>`<button data-equip="${r.id}" data-slot="${i}" ${s.level<r.level?'disabled':''}>${s.equipped[i]===r.id?'✓ ':''}ช่อง ${i+1}</button>`).join('')}</div>`).join('')}</div>${button('workshop','ประกอบวิชา • Lv.60 / 120')}${button('materials','ร้านวัตถุดิบ')}${button('return','กลับ')}`);document.querySelectorAll('[data-train]').forEach(b=>b.onclick=()=>{const r=knownSkills(s).find(r=>r.id===b.dataset.train);if(r&&s.level>=r.level&&trainSkill(s,r.id)){save();skillMenu();}});document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{const id=b.dataset.equip,slot=Number(b.dataset.slot),previous=s.equipped.indexOf(id);if(previous>=0)s.equipped[previous]=null;s.equipped[slot]=id;save();skillMenu();});$('workshop').onclick=workshop;$('materials').onclick=materialShop;$('return').onclick=menu;}
function materialShop(){if(!town){toast('ซื้อวัตถุดิบได้ที่เมือง');return;}const goods={ink:{name:'หมึกคัมภีร์',price:500},core:{name:'แก่นวิชาขั้นสูง',price:5000},...Object.fromEntries(Object.entries(ELEMENTS).map(([id,v])=>[id,{name:'ผลึก'+v.name,price:300}]))};show(`<h2>ร้านวัตถุดิบวิชา</h2><p>${s.gold.toLocaleString()} G</p><div class="grid">${Object.entries(goods).map(([id,v])=>`<button id="buy-${id}" ${id==='core'&&s.level<120?'disabled':''}>${v.name} • ${v.price} G<br>มี ${s.materials[id]} ${id==='core'?'• Lv.120':''}</button>`).join('')}</div>${button('return','กลับ')}`);for(const [id,v]of Object.entries(goods))$('buy-'+id).onclick=()=>{if(s.gold<v.price){toast('เงินไม่พอ');return;}s.gold-=v.price;s.materials[id]++;save();materialShop();};$('return').onclick=skillMenu;}
function workshop(){if(s.level<60){toast('เลเวล 60 ปลดล็อกสร้างวิชาขั้นต้น • 120 ขั้นสูง');return;}if(!town){toast('สร้างวิชาได้ที่เมือง');return;}const opts=o=>Object.entries(o).map(([id,v])=>`<option value="${id}">${v.name}</option>`).join('');show(`<h2>หอคิดค้นวิชา</h2><label>ชื่อวิชา <input id="recipeName" maxlength="32" placeholder="วิชาประจำตัว"></label><label>รูปแบบ <select id="form">${opts(FORMS)}</select></label><label>ธาตุ <select id="element">${opts(ELEMENTS)}</select></label><label>คุณสมบัติ 1 <select id="mod1">${opts(MODS)}</select></label><label>คุณสมบัติ 2 • Lv.120 <select id="mod2" ${s.level<120?'disabled':''}>${opts(MODS)}</select></label><p id="recipePreview"></p><p>ขั้นต้น: 3,000 G + หมึก 1 + ผลึกธาตุที่เลือก 3<br>ขั้นสูง (2 คุณสมบัติ): 12,000 G + หมึก 1 + ผลึก 3 + แก่นขั้นสูง 2</p>${button('craft','ยืนยันสร้าง')}${button('return','กลับ')}`);const recipe=()=>({name:$('recipeName').value,form:$('form').value,element:$('element').value,mods:[$('mod1').value,s.level>=120?$('mod2').value:'none'].filter(m=>m!=='none')});for(const id of ['form','element','mod1','mod2'])$(id).onchange=()=>{$('recipePreview').innerHTML=skillInfo(recipe());};$('form').onchange();$('craft').onclick=()=>{const error=craft(s,recipe());if(error){toast(error);return;}save();toast('สร้างวิชาสำเร็จ เลือกช่องเพื่อติดตั้ง');skillMenu();};$('return').onclick=skillMenu;}

function drawSkillArt(e){
 drawCombatEffect(ctx,e,project,scale,s.quality);
 if(!/^[sd](?:[1-9]|10)$/.test(e.skillId||''))return false;
 const index=e.hero==='sword-cockro'?({s1:0,s2:2,s3:4,s4:1,s5:4,s6:2}[e.skillId]??Number(e.skillId.slice(1))-1):e.hero==='demon-scorpion'?({d1:0,d2:4,d3:3,d4:7,d5:1,d6:9}[e.skillId]??Number(e.skillId.slice(1))-1):Number(e.skillId.slice(1))-1,im=images.get('vfx/'+(e.skillId[0]==='s'?'sword':'demon')+'.webp');if(!im)return false;
 const progress=Math.min(.999,Math.max(0,1-e.life/e.max)),frame=progress*3,first=Math.floor(frame),mix=frame-first;
 let world={x:e.x,y:e.y};if(e.form==='field')world=e.aim;else if(e.form!=='circle')world={x:e.x+(e.aim.x-e.x)*progress,y:e.y+(e.aim.y-e.y)*progress};
 const q=project(world.x,world.y),size=(e.form==='field'||e.form==='circle'?Math.max(140,e.radius*2):150)*scale;
 if(q.x+size<0||q.x-size>screenW||q.y+size<0||q.y-size>screenH)return true;
 const cw=im.width/8,ch=im.height/5,row=Math.floor(index/2),base=(index%2)*4;
 const render=(f,alpha)=>{if(alpha<=0)return;ctx.globalAlpha=alpha*Math.min(1,e.life/.12);ctx.drawImage(im,(base+f)*cw,row*ch,cw,ch,q.x-size/2,q.y-size*.77,size,size);};
 // Two source frames cross-fade. Low quality draws just one; no runtime blur.
 ctx.save();ctx.globalCompositeOperation='source-over';if(s.quality==='low')render(Math.round(frame),1);else{render(first,1-mix);render(Math.min(3,first+1),mix);}ctx.restore();return true;
}


function statMenu(){const c=combatStats(s),names={vit:'กายา • HP +12 / ป้องกัน +0.6',str:'กำลัง • โจมตี +2',int:'จิตวิญญาณ • พลังงาน +8 / พลังวิชา +0.8%',agi:'ว่องไว • เพิ่มคริติคอลและความเร็ว'};show(`<h2>ค่าสถานะฮีโร่</h2><p>${realm(s.level)} • Lv.${s.level} • EXP ${s.xp}/${xpNeed(s.level)}<br>ชื่อเสียง ${s.reputation} • ${reputationTitle(s)}<br>แต้มสถานะ ${s.statPoints} • แต้มวิชา ${s.skillPoints}<br>เลเวลเพิ่ม: ได้สถานะ 10 แต้ม และวิชา 10 แต้ม</p><div class="grid">${Object.entries(names).map(([key,name])=>`<button data-stat="${key}" ${s.statPoints<1?'disabled':''}>${name}<br>${s.attributes[key]} <b>＋</b></button>`).join('')}</div><p>HP ${Math.ceil(p.hp)} / ${maxHP(s)} • พลังงาน ${Math.floor(p.mp)} / ${c.mp}<br>โจมตี ${damage(s)} • ป้องกัน ${c.defense.toFixed(1)}<br>คริติคอล ${(c.crit*100).toFixed(1)}% • พลังวิชา ×${c.spell.toFixed(2)}<br>ความเร็วเดิน ${((s.hero.startsWith('sword')?110:105)+c.speed).toFixed(1)} • ความเร็วโจมตี +${(c.haste*100).toFixed(1)}%<br>เงิน ${s.gold.toLocaleString()} G • ผลึกพลังงาน ${s.stones}<br>ปราบศัตรู ${s.kills} • บอส ${s.bosses.filter(id=>id>=1060).length}/6</p>${button('return','กลับ')}`);document.querySelectorAll('[data-stat]').forEach(b=>b.onclick=()=>{if(allocateStat(s,b.dataset.stat)){save();statMenu();hud();}});$('return').onclick=menu;}

function roam(e,dt){
 e.roamClock=(e.roamClock??(1+e.def.id%4))-dt;
 if(e.roamGoal){const dx=e.roamGoal.x-e.x,dy=e.roamGoal.y-e.y,d=Math.hypot(dx,dy);if(d<5||e.roamClock<0){e.roamGoal=null;e.roamClock=1.5+Math.random()*3;return;}const step=Math.min(d,e.def.speed*.28*dt),x=e.x,y=e.y;safeMove(e,e.x+dx/d*step,e.y+dy/d*step);e.moving=Math.hypot(e.x-x,e.y-y)>.01;if(Math.abs((e.x-x)-(e.y-y))>.05)e.face=dx-dy>=0?1:-1;return;}
 if(e.roamClock<=0){const angle=Math.random()*Math.PI*2,r=25+Math.random()*55;e.roamGoal=traceStep(scene,e,{x:e.homeX+Math.cos(angle)*r,y:e.homeY+Math.sin(angle)*r});e.roamClock=4;}
}



