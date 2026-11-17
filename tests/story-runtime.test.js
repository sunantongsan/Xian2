import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{children:[],remove(){},append(){},style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},events:{},addEventListener(type,fn){this.events[type]=fn},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}},appendChild(){},setAttribute(){},querySelectorAll(){return []},hasAttribute(){return false},querySelector(){return element('child'+id)},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}})})},toDataURL(){return 'data:image/png;base64,'},showModal(){this.open=true},close(){this.open=false},hidden:false});return elements.get(id);}
globalThis.Audio=class{constructor(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
globalThis.innerWidth=844;globalThis.innerHeight=390;globalThis.devicePixelRatio=1;
globalThis.cancelAnimationFrame=()=>{};globalThis.requestAnimationFrame=()=>0;globalThis.NodeFilter={SHOW_TEXT:4};globalThis.document={documentElement:{lang:"th",classList:{remove(){},add(){},toggle(){}},style:{setProperty(){}}},createTreeWalker(){return {nextNode(){return null}}},body:{appendChild(){},classList:{add(){},remove(){},toggle(){}}},getElementById:element,createElement:()=>element('portrait-canvas'),querySelectorAll:()=>[],addEventListener(){},hidden:false};globalThis.addEventListener=()=>{};globalThis.window=globalThis;globalThis.localStorage={setItem(){}};

window.COCKRO_STORY_TEST=true;
const storage=new Map([['cockro-online-device-token-v1','unchanged-account'],['cockro-save','unchanged-legacy']]);
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.Image=class{width=1024;height=1024;set src(v){assert(fs.existsSync(new URL('../web/'+v,import.meta.url)),v);queueMicrotask(()=>this.onload());}};
globalThis.WebSocket=class{constructor(){throw Error('Offline trial must not connect');}};
let source=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../web/'+path.slice(2),import.meta.url).href}'`).replace('boot();','');
source+='\n//# sourceURL=story-runtime-game.js\nexport const probe={startStory,storyGuide,storyShop,storyMenu,storyTitle,goHome,storyJournal,storyTrainingForge,net,hitEnemy,update,toggleStoryAuto,stopStoryAuto,updateStory,drawStoryPath,close,forge,get(){return {s,p,scene,town,enemies,state:storyState,busy:travelBusy,auto:storyAuto,autoStatus:storyAutoStatus,move,route}},reset(){stopStoryAuto();s=null;p=null;}};';
const {probe}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {language}=await import('../web/i18n.js');language.choose('th');
const {STAGES,STORY_SAVE_KEY}=await import('../web/story-stage.js');
const {toWorld}=await import('../web/maps.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('real runtime enters town, buys supplies, clears hunt and fetch stages, claims, resumes and preserves account',async()=>{
 await probe.startStory();assert.equal(probe.get().town,true);assert.equal(probe.get().s.level,1);probe.get().state.tutorial=6;
 probe.storyGuide();assert.match(element('modalContent').innerHTML,/ไกด์แสงดาว/);
 probe.storyShop();const before=probe.get().s.potions;element('storyBuyHP').onclick();assert.equal(probe.get().s.potions,before+5);
 for(const stage of STAGES.slice(0,2)){
  await probe.startStory(stage.id);let v=probe.get();assert.equal(v.scene.id,'story-'+stage.id);assert.equal(v.enemies.length,stage.encounters.length);probe.drawStoryPath();
  for(const e of v.enemies)probe.hitEnemy(e,1e9);assert.equal(v.state.active.defeated.length,stage.encounters.length);
  Object.assign(v.p,toWorld(stage.exit,v.scene));probe.updateStory();if(stage.objects.length)assert.equal(probe.get().town,false);
  for(const o of stage.objects){Object.assign(v.p,toWorld(o.uv,v.scene));probe.updateStory();}
  Object.assign(v.p,toWorld(stage.exit,v.scene));probe.updateStory();await tick();v=probe.get();assert.equal(v.town,true);assert.equal(v.state.active.complete,true);
  assert.match(element('modalContent').innerHTML,/รับรางวัล/);const claim=element('storyClaim').onclick;claim();const gold=v.s.gold;claim();assert.equal(v.s.gold,gold);assert.equal(v.state.unlocked,stage.id+1);
 }
 probe.forge();assert.match(element('modalContent').innerHTML,/อัปเกรด|เสริม|เซรุ่ม/);
 await probe.startStory(3);probe.hitEnemy(probe.get().enemies[0],1e9);await probe.goHome();probe.reset();await probe.startStory();assert.equal(probe.get().town,true);
 await probe.startStory(3);assert.equal(probe.get().enemies.length,STAGES[2].encounters.length-1);
 assert(storage.has(STORY_SAVE_KEY));assert.equal(storage.get('cockro-online-device-token-v1'),'unchanged-account');assert.equal(storage.get('cockro-save'),'unchanged-legacy');
});

test('new player completes action-based teaching before stage 2 and never connects to bot population',async()=>{
 storage.delete(STORY_SAVE_KEY);probe.reset();probe.net.players=[{id:'simulated-player'}];await probe.startStory();let v=probe.get();assert.equal(v.scene.id,'story-town');assert.equal(probe.net.players.length,0);
 await probe.startStory(1);assert.equal(probe.get().town,true);probe.close();v.p.x+=100;probe.updateStory();assert.equal(v.state.tutorial,1);probe.storyGuide();assert.match(element('modalContent').innerHTML,/รับเควส/);element('storyAccept').onclick();assert.equal(v.state.tutorial,2);
 await probe.startStory(1);v=probe.get();for(const e of v.enemies)probe.hitEnemy(e,1e9);Object.assign(v.p,toWorld(STAGES[0].exit,v.scene));probe.updateStory();await tick();v=probe.get();assert.equal(v.state.tutorial,3);element('storyClaim').onclick();assert.equal(v.state.tutorial,4);
 await probe.startStory(2);assert.equal(probe.get().town,true);probe.storyTrainingForge();const oldG=v.s.gold;element('storyTrainUpgrade').onclick();assert.equal(v.s.equip.weapon.plus,1);assert.equal(v.s.gold,oldG-500);assert.equal(v.state.tutorial,5);
 await probe.startStory(2);v=probe.get();Object.assign(v.p,toWorld(STAGES[1].objects[0].uv,v.scene));probe.updateStory();assert.equal(v.state.tutorial,6);probe.storyJournal();assert.match(element('modalContent').innerHTML,/บันทึกการเดินทาง/);
});


test('one mission tap walks, fights real enemies, returns and claims; second tap upgrades and fetches',async()=>{
 storage.delete(STORY_SAVE_KEY);probe.reset();await probe.startStory();probe.toggleStoryAuto();
 async function runUntil(done,limit=24000){for(let i=0;i<limit;i++){if(done())return;if(probe.get().busy)await tick();else probe.update(.05);}const v=probe.get();assert.fail(JSON.stringify({town:v.town,dead:v.p.dead,hp:v.p.hp,position:[v.p.x,v.p.y],auto:v.auto,status:v.autoStatus,tutorial:v.state.tutorial,defeated:v.state.active?.defeated,found:v.state.active?.found,move:v.move}));}
 await runUntil(()=>probe.get().state.cleared.includes(1));let v=probe.get();assert.equal(v.town,true);assert.equal(v.auto,false);assert.equal(v.state.tutorial,4);assert.equal(v.state.active,null);
 probe.toggleStoryAuto();await runUntil(()=>probe.get().state.cleared.includes(2));v=probe.get();assert.equal(v.s.equip.weapon.plus,1);assert.equal(v.state.tutorial,6);assert.equal(v.auto,false);assert.equal(v.state.active,null);
 probe.toggleStoryAuto();element('joystick').events.pointerdown({pointerId:1,preventDefault(){},clientX:50,clientY:50});const pos={x:v.p.x,y:v.p.y};for(let i=0;i<30;i++)probe.update(.05);assert.equal(v.p.x,pos.x);assert.equal(v.p.y,pos.y);assert.equal(v.s.autoAttack,false);
});
