import {thb} from './token-economy.js';
import {t,ui} from './i18n.js';
import {mutationStage} from './mutation.js';
import {language} from './i18n.js';
// Shared, deterministic skill rules: UI and combat consume the same definitions.
export const FORMS={wave:{get name(){return t('คลื่นพลัง');},range:320,radius:36,power:1.8,mp:18,cd:5,get desc(){return t('แนวตรงตามทิศเป้าหมาย');}},circle:{get name(){return t('กวาดรอบตัว');},range:155,radius:155,power:1.4,mp:22,cd:7,get desc(){return t('โจมตีศัตรูรอบตัว');}},bolt:{get name(){return t('กระสุนพลังงาน');},range:400,radius:0,power:2.3,mp:16,cd:4,get desc(){return t('โจมตีเป้าหมายเดียวระยะไกล');}},dash:{get name(){return t('พุ่งแทง');},range:230,radius:45,power:1.7,mp:24,cd:8,get desc(){return t('พุ่งผ่านศัตรูในแนวตรง');}},field:{get name(){return t('สนามพลัง');},range:300,radius:120,power:.65,mp:32,cd:12,get desc(){return t('สร้างพื้นที่โจมตี 4 ครั้งใน 3 วินาที');}}};
export const ELEMENTS={wind:{get name(){return t('ลม');},color:'#a6f3dd',get desc(){return t('ผลักศัตรูออก 45 หน่วย');}},fire:{get name(){return t('ไฟ');},color:'#ff9a50',get desc(){return t('เผาไหม้ 3 วินาที รวม 45% พลังโจมตี');}},ice:{get name(){return t('น้ำแข็ง');},color:'#81ddff',get desc(){return t('ลดความเร็ว 35% นาน 3 วินาที');}},lightning:{get name(){return t('สายฟ้า');},color:'#d8b4ff',get desc(){return t('เพิ่มความเสียหายทันที 20%');}},poison:{get name(){return t('พิษ');},color:'#a8dc64',get desc(){return t('พิษ 6 วินาที รวม 60% พลังโจมตี');}}};
export const MODS={none:{get name(){return t('ไม่มี');},get desc(){return t('ไม่เพิ่มค่าพลังงาน');}},pierce:{get name(){return t('ทะลวง');},get desc(){return t('กระสุนพลังงานทะลุได้สูงสุด 3 เป้าหมาย / รูปแบบอื่นเพิ่มแรง 15%');}},drain:{get name(){return t('ดูดเลือด');},get desc(){return t('ฟื้น 8% ของความเสียหายจริง สูงสุด 8% เลือดต่อการร่าย');}},wide:{get name(){return t('ขยาย');},get desc(){return t('เพิ่มระยะและพื้นที่ 25%');}},force:{get name(){return t('อัดพลัง');},get desc(){return t('เพิ่มความแรง 25%');}},quick:{get name(){return t('ฉับไว');},get desc(){return t('ลดคูลดาวน์ 20% แต่ลดแรง 15%');}},lasting:{get name(){return t('ยืดผล');},get desc(){return t('เพิ่มเวลาผลธาตุ 50%');}}};
export function compileSkill(r){if(!r||!FORMS[r.form]||!ELEMENTS[r.element])return null;const mods=[...new Set(r.mods||[])].filter(m=>m!=='none'&&MODS[m]);const f={...FORMS[r.form],...(r.combat||{})};return {...r,mods,range:f.range*(mods.includes('wide')?1.25:1),radius:f.radius*(mods.includes('wide')?1.25:1),power:f.power*(mods.includes('force')?1.25:1)*(mods.includes('quick')?.85:1)*(mods.includes('pierce')&&r.form!=='bolt'?1.15:1),mp:f.mp+mods.length*4,cd:Math.max(1.5,f.cd*.8)*(mods.includes('quick')?.8:1),color:ELEMENTS[r.element].color};}
// Skills are sword-art books bought with COCKRO (priced in baht, 2 to 30 THB)
// in the shop; buying a book teaches it for good. Price follows power and spectacle.
const book=(id,th,en,price,form,element,mods,combat,fx,life=.85)=>({id,get name(){return language.current==='en'?en:th;},th,en,price,level:1,form,element,mods,combat,fx,life,book:true});
export const SKILL_BOOKS=Object.freeze([
 book('b1','ดาบวายุกรีดฟ้า','Sky-Splitting Gale',thb(2),'wave','wind',[],{range:420,radius:70,mp:12,cd:4,power:1.9},'gale'),
 book('b2','ดาบเพลิงหมุนวน','Blazing Whirl',thb(3),'circle','fire',[],{range:190,radius:190,mp:16,cd:5.5,power:2.3},'whirl'),
 book('b3','เขี้ยวอสรพิษมรกต','Emerald Serpent Fang',thb(5),'wave','poison',['wide'],{range:400,radius:80,mp:18,cd:6,power:2.8},'serpent'),
 book('b4','ดาบสายฟ้าพริบตา','Lightning Flash Step',thb(8),'dash','lightning',[],{range:300,radius:70,mp:24,cd:7,power:3.4},'flash'),
 book('b5','พันดาบหิมะคราม','Thousand Frost Blades',thb(12),'field','ice',[],{range:420,radius:170,mp:30,cd:9,power:3.0},'frost',1.1),
 book('b6','วงดาบจันทราเงิน','Silver Moon Blade Ring',thb(17),'circle','lightning',[],{range:230,radius:230,mp:34,cd:9,power:4.2},'moon',1),
 book('b7','ดาบมังกรเพลิงสวรรค์','Heavenly Dragon Blade',thb(23),'bolt','fire',['pierce'],{range:560,radius:0,mp:40,cd:10,power:5.5},'dragon',1),
 book('b8','หมื่นดาบเทพพิพากษา','Divine Judgment of Ten Thousand Swords',thb(30),'field','lightning',['wide'],{range:400,radius:190,mp:56,cd:16,power:7.5},'judgment',1.5)
]);
export const SKILL_BOOK_BY_ID=new Map(SKILL_BOOKS.map(b=>[b.id,b]));
export const isSkillBook=id=>SKILL_BOOK_BY_ID.has(id);
export function ownsSkillBook(s,id){return Array.isArray(s.skillBooks)&&s.skillBooks.includes(id);}
// Buy with COCKRO. The book is read at once and its skill learned.
export function buySkillBook(s,id){
 const b=SKILL_BOOK_BY_ID.get(id);if(!b||ownsSkillBook(s,id)||!Number.isSafeInteger(s.stones)||s.stones<b.price)return false;
 s.stones-=b.price;s.skillBooks=[...s.skillBooks,id];
 const slot=[0,1,2,3,4].find(i=>!s.equipped[i]);if(slot!==undefined)s.equipped[slot]=id;
 return true;
}
export function normalizeSkills(s,v={}){
 s.skillBooks=Array.isArray(v.skillBooks)?SKILL_BOOKS.map(b=>b.id).filter(id=>v.skillBooks.includes(id)):[];
 s.recipes=[];s.materials={};
 const available=knownSkills(s),used=new Set();
 s.equipped=Array.from({length:5},(_,i)=>{const id=Array.isArray(v.equipped)?v.equipped[i]:null;if(used.has(id)||!available.some(r=>r.id===id))return null;used.add(id);return id;});
}
export function knownSkills(s){
 const stage=mutationStage(s)||0,bonus=stage===2?1.2:stage===1?1.1:1;
 return SKILL_BOOKS.filter(b=>ownsSkillBook(s,b.id)).map(b=>({...b,name:b.name,combat:{...b.combat,power:b.combat.power*bonus}}));
}
export function skillTargets(skill,origin,aim,enemies){const dx=aim.x-origin.x,dy=aim.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;const live=enemies.filter(e=>e.hp>0);if(skill.form==='circle')return live.filter(e=>Math.hypot(e.x-origin.x,e.y-origin.y)<=skill.radius);if(skill.form==='field')return live.filter(e=>Math.hypot(e.x-aim.x,e.y-aim.y)<=skill.radius);const line=live.filter(e=>{const x=e.x-origin.x,y=e.y-origin.y,along=x*ux+y*uy;return along>=0&&along<=skill.range&&Math.abs(x*uy-y*ux)<=(skill.radius||40)}).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));return skill.form==='bolt'?line.slice(0,skill.mods.includes('pierce')?3:1):line;}

