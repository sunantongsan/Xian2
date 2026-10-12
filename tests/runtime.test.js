import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{style:{},dataset:{},classList:{add(){},remove(){}},addEventListener(){},setAttribute(){},querySelector(){return element('child'+id)},getContext(){return new Proxy({},{get:()=>()=>{}})},toDataURL(){return 'data:image/png;base64,'},showModal(){this.open=true},close(){this.open=false},hidden:false});return elements.get(id);}
globalThis.innerWidth=844;globalThis.innerHeight=390;globalThis.devicePixelRatio=1;
globalThis.document={getElementById:element,createElement:()=>element('portrait-canvas'),querySelectorAll:()=>[],addEventListener(){},hidden:false};globalThis.addEventListener=()=>{};globalThis.window=globalThis;globalThis.localStorage={setItem(){}};
let source=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../web/'+path.slice(2),import.meta.url).href}'`).replace('boot();','');
source+='\nexport const probe={set(v){s=v.s;p=v.p;enemies=v.enemies;town=false;scene=null;paused=false;target=null;move=null;route=[];},get(){return {s,p,enemies,target}},update,enemyAI};';
const {probe}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {fresh}=await import('../web/core.js');
function fixture(){const s=fresh('sword-male');s.sound=false;return {s,p:{x:0,y:0,hp:140,mp:83,face:1,anim:'idle',animTime:1,walkDistance:0,gaitBlend:0,inv:0,dead:false},enemies:[{def:{id:0,slot:0,hp:1000,speed:0,attack:'melee',cooldown:1,damage:1,level:1},x:70,y:0,hp:1000,state:'idle',clock:100,face:1,flash:0}]};}
test('auto off does no attacks, enabled finds and attacks, disabled stops and persists',()=>{const v=fixture();probe.set(v);probe.update(.05);assert.equal(v.enemies[0].hp,1000);element('autoBtn').onclick();probe.update(.05);assert(v.enemies[0].hp<1000);const hp=v.enemies[0].hp;element('autoBtn').onclick();for(let i=0;i<20;i++)probe.update(.05);assert.equal(v.enemies[0].hp,hp);assert.equal(v.s.autoAttack,false);assert.equal(probe.get().target,null);});
test('idle monster patrol moves at distance without pulling aggro',()=>{const v=fixture();v.enemies[0].x=600;v.enemies[0].def.speed=70;v.enemies[0].roamClock=0;probe.set(v);probe.enemyAI(v.enemies[0],.05);assert(v.enemies[0].roamGoal);const before={x:v.enemies[0].x,y:v.enemies[0].y};for(let i=0;i<20;i++)probe.enemyAI(v.enemies[0],.05);assert(Math.hypot(v.enemies[0].x-before.x,v.enemies[0].y-before.y)>1);assert.equal(v.enemies[0].state,'idle');});
