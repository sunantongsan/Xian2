import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},setAttribute(){},querySelector(){return element('child'+id)},getContext(){return new Proxy({},{get:()=>()=>{}})},toDataURL(){return 'data:image/png;base64,'},showModal(){this.open=true},close(){this.open=false},hidden:false});return elements.get(id);}
globalThis.innerWidth=844;globalThis.innerHeight=390;globalThis.devicePixelRatio=1;
globalThis.document={body:{appendChild(){},classList:{add(){},remove(){},toggle(){}}},getElementById:element,createElement:()=>element('portrait-canvas'),querySelectorAll:()=>[],addEventListener(){},hidden:false};globalThis.addEventListener=()=>{};globalThis.window=globalThis;globalThis.localStorage={setItem(){}};
let source=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../web/'+path.slice(2),import.meta.url).href}'`).replace('boot();','');
source+='\nexport const probe={set(v){s=v.s;p=v.p;enemies=v.enemies;town=false;scene=null;paused=false;target=null;move=null;route=[];cooldown={attack:0,skill:0,dash:0,potion:0};skillTimers={};fields=[];effects=[];attackHeld=false;keys.clear();},get(){return {s,p,enemies,target}},update,enemyAI,attack,hurt,skill,title,net,isOnline:()=>onlineMode};';
const {probe}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {fresh}=await import('../web/core.js');
function fixture(){const s=fresh('sword-male');s.sound=false;return {s,p:{x:0,y:0,hp:140,mp:83,face:1,anim:'idle',animTime:1,walkDistance:0,gaitBlend:0,inv:0,dead:false},enemies:[{def:{id:0,slot:0,hp:1000,speed:0,attack:'melee',cooldown:1,damage:1,level:1},x:70,y:0,hp:1000,state:'idle',clock:100,face:1,flash:0}]};}
test('auto off does no attacks, enabled finds and attacks, disabled stops and persists',()=>{const v=fixture();probe.set(v);probe.update(.05);assert.equal(v.enemies[0].hp,1000);element('autoBtn').onclick();probe.update(.05);assert.equal(v.enemies[0].hp,1000);for(let i=0;i<6;i++)probe.update(.05);assert(v.enemies[0].hp<1000);const hp=v.enemies[0].hp;element('autoBtn').onclick();for(let i=0;i<20;i++)probe.update(.05);assert.equal(v.enemies[0].hp,hp);assert.equal(v.s.autoAttack,false);assert.equal(probe.get().target,null);});
test('idle monster patrol moves at distance without pulling aggro',()=>{const v=fixture();v.enemies[0].x=600;v.enemies[0].def.speed=70;v.enemies[0].roamClock=0;probe.set(v);probe.enemyAI(v.enemies[0],.05);assert(v.enemies[0].roamGoal);const before={x:v.enemies[0].x,y:v.enemies[0].y};for(let i=0;i<20;i++)probe.enemyAI(v.enemies[0],.05);assert(Math.hypot(v.enemies[0].x-before.x,v.enemies[0].y-before.y)>1);assert.equal(v.enemies[0].state,'idle');});


test('chasing monster clamps movement at melee stopping distance',()=>{const v=fixture();const e=v.enemies[0];e.x=70;e.def.speed=1000;probe.set(v);probe.enemyAI(e,.1);assert(e.x>=52);assert(e.x<70);const x=e.x;probe.enemyAI(e,.1);assert.equal(e.x,x);});

test('melee deals damage once at impact, not on input',()=>{const v=fixture();probe.set(v);probe.attack();assert.equal(v.enemies[0].hp,1000);probe.update(.14);assert.equal(v.enemies[0].hp,1000);probe.update(.16);assert(v.enemies[0].hp<1000);const hp=v.enemies[0].hp;for(let i=0;i<12;i++)probe.update(.05);assert.equal(v.enemies[0].hp,hp);});
test('hurt interrupts windup before it can damage an enemy',()=>{const v=fixture();probe.set(v);probe.attack();probe.update(.1);probe.hurt(1);for(let i=0;i<12;i++)probe.update(.05);assert.equal(v.enemies[0].hp,1000);});
test('enemy leaving reach before impact is not hit remotely',()=>{const v=fixture();probe.set(v);probe.attack();v.enemies[0].x=400;for(let i=0;i<12;i++)probe.update(.05);assert.equal(v.enemies[0].hp,1000);});
test('skill damage waits for casting release and cannot cancel an attack',()=>{const v=fixture();probe.set(v);probe.attack();const mp=v.p.mp;probe.skill(0);assert.equal(v.p.mp,mp);probe.hurt(1);for(let i=0;i<7;i++)probe.update(.05);probe.skill(0);assert(v.p.mp<mp);assert.equal(v.enemies[0].hp,1000);for(let i=0;i<7;i++)probe.update(.05);assert(v.enemies[0].hp<1000);});
test('dead caster never releases queued melee damage',()=>{const v=fixture();probe.set(v);probe.attack();v.p.dead=true;for(let i=0;i<12;i++)probe.update(.05);assert.equal(v.enemies[0].hp,1000);});




test('welcome loads owned hero and enters online only when Play is pressed',async()=>{
 const originalRoster=probe.net.roster,originalConnect=probe.net.connect;let connected;
 probe.net.roster=async()=>[{id:'main',hero:'sword-cricket',level:37}];probe.net.connect=hero=>{connected=hero;return new Promise(()=>{});};
 try{await probe.title();const html=element('modalContent').innerHTML;assert.match(html,/เลือกตัวละครของคุณ/);assert.match(html,/เลเวล 37/);assert.match(html,/จิ้งหรีดแมน/);assert.doesNotMatch(html,/เริ่มออฟไลน์|เล่นออนไลน์ • เซิร์ฟเวอร์ไทย/);assert.equal(connected,undefined);element('choose').onclick();assert.equal(connected,'sword-cricket');assert.equal(probe.isOnline(),true);}finally{probe.net.roster=originalRoster;probe.net.connect=originalConnect;}
});
