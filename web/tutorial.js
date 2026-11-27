// First-time guided tutorial (7.9.2). Each step watches the game state and advances by itself;
// a floating card shows the instruction and a ring highlights the control to use.
import {t} from './i18n.js';

export const TUTORIAL_STEPS=Object.freeze([
 {id:'move',target:'#joystick',get text(){return t('ลากจอยซ้ายล่างเพื่อเดิน (หรือแตะพื้น)');},done:(g,b)=>g.dist(b)>80},
 {id:'field',get text(){return t('เดินไปที่ป้าย "ทุ่งกุลา 1–60" ด้านล่างเมือง เพื่อออกล่ามอน');},done:g=>g.map==='forest'},
 {id:'attack',target:'#attackBtn',get text(){return t('แตะมอนเพื่อล็อกเป้า แล้วกดปุ่มโจมตี');},done:(g,b)=>g.kills>b.kills},
 {id:'coins',get text(){return t('เดินไปเก็บ COCKRO ที่มอนดรอป');},done:(g,b)=>g.stones>b.stones},
 {id:'auto',target:'#autoBtn',get text(){return t('กดปุ่ม "ออโต้" ให้ตัวละครตีมอนรอบตัวเอง (ต้องแตะจอบ้าง ไม่งั้นระบบจะตัดเพราะคิดว่าเป็นบอท)');},done:g=>g.auto},
 {id:'home',target:'#townBtn',get text(){return t('กด "กลับเมือง" เพื่อกลับไปพักและซื้อของ');},done:g=>g.map==='town'},
 {id:'shop',get text(){return t('แตะพ่อค้าทุ่งกุลาเพื่อเปิดร้านค้า');},done:g=>g.opened.has('shop')},
 {id:'buff',get text(){return t('ในร้านมีปุ่ม ⚡ บัพฟรี ดูโฆษณาแล้วเก่งขึ้นชั่วคราว ลองกดดู');},done:g=>g.opened.has('buff')},
 {id:'forge',get text(){return t('แตะช่างตีเหล็กเพื่อตีบวกอาวุธ ขั้น +1 สำเร็จ 100% และตีบวกฟรี');},done:g=>g.opened.has('forge')},
 {id:'skills',get text(){return t('สะสม COCKRO แล้วซื้อ "หนังสือสกิล" ที่ร้านค้า อ่านแล้วได้วิชาดาบทันที');},manual:true}
]);

export function createTutorial({key,state,onReward,onChange}={}){
 let data={step:0,done:false},base=null,timer=0,card=null,ring=null;
 const opened=new Set();
 try{const saved=JSON.parse(globalThis.localStorage?.getItem(key()));if(saved&&Number.isInteger(saved.step))data=saved;}catch{}
 const save=()=>{try{globalThis.localStorage?.setItem(key(),JSON.stringify(data));}catch{}};
 const snapshot=()=>{const g=state();if(!g)return null;return {...g,opened,dist:b=>Math.hypot(g.x-b.x,g.y-b.y)};};
 function ui(){
  if(!globalThis.document?.body?.append)return;
  if(!card){card=globalThis.document.createElement('aside');card.id='tutorialCard';card.setAttribute('role','status');globalThis.document.body.append(card);}
  const st=TUTORIAL_STEPS[data.step];
  if(data.done||!st){card.hidden=true;highlight(null);return;}
  card.hidden=false;
  card.innerHTML=`<div class="tut-head"><b>${t('สอนเล่น')} ${data.step+1}/${TUTORIAL_STEPS.length}</b><button data-tut="skipAll">${t('ข้ามทั้งหมด')}</button></div><p>${st.text}</p><div class="tut-actions">${st.manual?`<button data-tut="next" class="tut-primary">${t('เข้าใจแล้ว')}</button>`:`<button data-tut="next">${t('ข้ามขั้นนี้')}</button>`}</div>`;
  card.querySelector('[data-tut="next"]').onclick=()=>advance();
  card.querySelector('[data-tut="skipAll"]').onclick=()=>finish(false);
  highlight(st.target);
 }
 function highlight(selector){
  globalThis.document?.querySelectorAll?.('.tut-target').forEach(el=>el.classList.remove('tut-target'));
  const el=selector&&globalThis.document?.querySelector?.(selector);if(el)el.classList.add('tut-target');
 }
 function advance(){data.step++;base=snapshot();if(data.step>=TUTORIAL_STEPS.length){finish(true);return;}save();ui();onChange?.(data);}
 function finish(completed){data={step:TUTORIAL_STEPS.length,done:true};save();ui();clearInterval(timer);timer=0;if(completed)onReward?.();onChange?.(data);}
 function tick(){
  if(data.done)return;const g=snapshot();if(!g)return;if(!base)base=g;
  const st=TUTORIAL_STEPS[data.step];if(st&&!st.manual&&st.done(g,base))advance();
 }
 return {
  get step(){return data.step;},get done(){return data.done;},
  start({restart=false}={}){if(restart)data={step:0,done:false};if(data.done)return;base=null;opened.clear();save();ui();if(!timer)timer=setInterval(tick,400);timer?.unref?.();},
  note(what){opened.add(what);},
  hide(){if(card)card.hidden=true;highlight(null);},
  refresh:ui
 };
}
