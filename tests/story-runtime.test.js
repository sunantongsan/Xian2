import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const elements=new Map();
function element(id){if(!elements.has(id))elements.set(id,{children:[],remove(){},append(){},style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},setAttribute(){},querySelectorAll(){return []},hasAttribute(){return false},querySelector(){return element('child'+id)},getContext(){return new Proxy({},{get:()=>()=>({addColorStop(){}})})},toDataURL(){return 'data:image/png;base64,'},showModal(){this.open=true},close(){this.open=false},hidden:false});return elements.get(id);}
globalThis.Audio=class{constructor(){this.paused=true;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
globalThis.innerWidth=844;globalThis.innerHeight=390;globalThis.devicePixelRatio=1;
globalThis.cancelAnimationFrame=()=>{};globalThis.requestAnimationFrame=()=>0;globalThis.NodeFilter={SHOW_TEXT:4};globalThis.document={documentElement:{lang:"th",classList:{remove(){},add(){},toggle(){}},style:{setProperty(){}}},createTreeWalker(){return {nextNode(){return null}}},body:{appendChild(){},classList:{add(){},remove(){},toggle(){}}},getElementById:element,createElement:()=>element('portrait-canvas'),querySelectorAll:()=>[],addEventListener(){},hidden:false};globalThis.addEventListener=()=>{};globalThis.window=globalThis;globalThis.localStorage={setItem(){}};

window.COCKRO_STORY_TEST=true;
const storage=new Map([['cockro-online-device-token-v1','unchanged-account'],['cockro-save','unchanged-legacy']]);
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.Image=class{width=1024;height=1024;set src(v){assert(fs.existsSync(new URL('../web/'+v,import.meta.url)),v);queueMicrotask(()=>this.onload());}};
globalThis.WebSocket=class{constructor(){throw Error('Offline trial must not connect');}};
let source=fs.readFileSync(new URL('../web/game.js',import.meta.url),'utf8').replace(/from '(\.\/[^']+)'/g,(_,path)=>`from '${new URL('../web/'+path.slice(2),import.meta.url).href}'`).replace('boot();','');
source+='\n//# sourceURL=story-runtime-game.js\nexport const probe={startStory,storyGuide,storyShop,storyMenu,storyTitle,goHome,hitEnemy,updateStory,drawStoryPath,close,forge,get(){return {s,p,scene,town,enemies,state:storyState,busy:travelBusy}},reset(){s=null;p=null;}};';
const {probe}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {language}=await import('../web/i18n.js');language.choose('th');
const {STAGES,STORY_SAVE_KEY}=await import('../web/story-stage.js');
const {toWorld}=await import('../web/maps.js');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('real runtime enters town, buys supplies, clears hunt and fetch stages, claims, resumes and preserves account',async()=>{
 await probe.startStory();assert.equal(probe.get().town,true);assert.equal(probe.get().s.level,1);
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
