import {t,ui} from './i18n.js';
import {mutationStage} from './mutation.js';
import {BRANCHES,branchFor} from './jobs.js';
import {language} from './i18n.js';
import {jobFor} from './job-progression.js';
// Shared, deterministic skill rules: UI and combat consume the same definitions.
export const FORMS={wave:{get name(){return t('คลื่นพลัง');},range:320,radius:36,power:1.8,mp:18,cd:5,get desc(){return t('แนวตรงตามทิศเป้าหมาย');}},circle:{get name(){return t('กวาดรอบตัว');},range:155,radius:155,power:1.4,mp:22,cd:7,get desc(){return t('โจมตีศัตรูรอบตัว');}},bolt:{get name(){return t('กระสุนพลังงาน');},range:400,radius:0,power:2.3,mp:16,cd:4,get desc(){return t('โจมตีเป้าหมายเดียวระยะไกล');}},dash:{get name(){return t('พุ่งแทง');},range:230,radius:45,power:1.7,mp:24,cd:8,get desc(){return t('พุ่งผ่านศัตรูในแนวตรง');}},field:{get name(){return t('สนามพลัง');},range:300,radius:120,power:.65,mp:32,cd:12,get desc(){return t('สร้างพื้นที่โจมตี 4 ครั้งใน 3 วินาที');}}};
export const ELEMENTS={wind:{get name(){return t('ลม');},color:'#a6f3dd',get desc(){return t('ผลักศัตรูออก 45 หน่วย');}},fire:{get name(){return t('ไฟ');},color:'#ff9a50',get desc(){return t('เผาไหม้ 3 วินาที รวม 45% พลังโจมตี');}},ice:{get name(){return t('น้ำแข็ง');},color:'#81ddff',get desc(){return t('ลดความเร็ว 35% นาน 3 วินาที');}},lightning:{get name(){return t('สายฟ้า');},color:'#d8b4ff',get desc(){return t('เพิ่มความเสียหายทันที 20%');}},poison:{get name(){return t('พิษ');},color:'#a8dc64',get desc(){return t('พิษ 6 วินาที รวม 60% พลังโจมตี');}}};
export const MODS={none:{get name(){return t('ไม่มี');},get desc(){return t('ไม่เพิ่มค่าพลังงาน');}},pierce:{get name(){return t('ทะลวง');},get desc(){return t('กระสุนพลังงานทะลุได้สูงสุด 3 เป้าหมาย / รูปแบบอื่นเพิ่มแรง 15%');}},drain:{get name(){return t('ดูดเลือด');},get desc(){return t('ฟื้น 8% ของความเสียหายจริง สูงสุด 8% เลือดต่อการร่าย');}},wide:{get name(){return t('ขยาย');},get desc(){return t('เพิ่มระยะและพื้นที่ 25%');}},force:{get name(){return t('อัดพลัง');},get desc(){return t('เพิ่มความแรง 25%');}},quick:{get name(){return t('ฉับไว');},get desc(){return t('ลดคูลดาวน์ 20% แต่ลดแรง 15%');}},lasting:{get name(){return t('ยืดผล');},get desc(){return t('เพิ่มเวลาผลธาตุ 50%');}}};
export const SCHOOL=[
{id:'s1',sect:'sword',get name(){return t('พลาสมาทะลวงเมฆ');},level:1,form:'wave',element:'wind',mods:[]},
{id:'s2',sect:'sword',get name(){return t('ก้าวพลาสมาสายฟ้า');},level:20,form:'dash',element:'lightning',mods:[]},
{id:'s3',sect:'sword',get name(){return t('วงพลาสมาเหมันต์');},level:40,form:'circle',element:'ice',mods:[]},
{id:'s4',sect:'sword',get name(){return t('พลาสมาเพลิงไล่ดาว');},level:60,form:'bolt',element:'fire',mods:['pierce']},
{id:'s5',sect:'sword',get name(){return t('สนามพลังหมื่นพลาสมา');},level:120,form:'field',element:'lightning',mods:['wide']},
{id:'d1',sect:'demon',get name(){return t('กรงเล็บโลหิต');},level:1,form:'circle',element:'poison',mods:['drain']},
{id:'d2',sect:'demon',get name(){return t('เพลิงมารติดตาม');},level:20,form:'bolt',element:'fire',mods:[]},
{id:'d3',sect:'demon',get name(){return t('เงามารเยือกแข็ง');},level:40,form:'dash',element:'ice',mods:[]},
{id:'d4',sect:'demon',get name(){return t('คลื่นพิษกลืนพลังงาน');},level:60,form:'wave',element:'poison',mods:['wide']},
{id:'d5',sect:'demon',get name(){return t('สนามพลังโหนดโลหิต');},level:120,form:'field',element:'fire',mods:['drain']}
];
export function compileSkill(r){if(!r||!FORMS[r.form]||!ELEMENTS[r.element])return null;const mods=[...new Set(r.mods||[])].filter(m=>m!=='none'&&MODS[m]);const f={...FORMS[r.form],...(r.combat||{})};return {...r,mods,range:f.range*(mods.includes('wide')?1.25:1),radius:f.radius*(mods.includes('wide')?1.25:1),power:f.power*(mods.includes('force')?1.25:1)*(mods.includes('quick')?.85:1)*(mods.includes('pierce')&&r.form!=='bolt'?1.15:1),mp:f.mp+mods.length*4,cd:Math.max(1.5,f.cd*.8)*(mods.includes('quick')?.8:1),color:ELEMENTS[r.element].color};}
export const COCKRO_SKILLS=[
{id:'s1',get name(){return t('คลื่นดาบพลังงาน');},level:1,form:'wave',element:'wind',mods:['wide'],combat:{range:480,radius:150,mp:10,cd:3.2,power:1.9}},
{id:'s2',get name(){return t('โรเตอร์พลาสมา');},level:5,form:'circle',element:'fire',mods:['wide'],combat:{range:185,radius:185,mp:14,cd:5,power:1.8}},
{id:'s3',get name(){return t('สนามไอออน');},level:12,form:'field',element:'lightning',mods:['wide'],combat:{range:420,radius:180,mp:22,cd:9,power:.7}},
{id:'s4',get name(){return t('บูสต์ดาบพลาสมา');},level:25,form:'dash',element:'wind',mods:['wide']},
{id:'s5',get name(){return t('ปืนวงโคจรพิทักษ์ดาว');},level:40,form:'field',element:'lightning',mods:['wide','force']},
{id:'s6',get name(){return t('โอเวอร์โหลดพลาสมา');},level:55,form:'circle',element:'lightning',mods:['wide','force']}
];
// Scorpion Man: poison assassin. Uses demon-sheet ids so painted VFX and save slots stay compatible.
export const SCORPION_SKILLS=[
{id:'d1',get name(){return t('ใบมีดนาโนพุ่งทะยาน');},level:1,form:'wave',element:'poison',mods:['wide'],combat:{range:460,radius:140,mp:10,cd:3.2,power:1.8}},
{id:'d2',get name(){return t('โรเตอร์ชีวพิษ');},level:5,form:'circle',element:'poison',mods:['wide'],combat:{range:185,radius:185,mp:14,cd:5,power:1.75}},
{id:'d3',get name(){return t('สนามนาโนชีวพิษ');},level:12,form:'field',element:'poison',mods:['wide'],combat:{range:420,radius:180,mp:22,cd:9,power:.7}},
{id:'d4',get name(){return t('เจ็ตบูสต์ลอบสังหาร');},level:25,form:'dash',element:'poison',mods:['wide']},
{id:'d5',get name(){return t('กระสุนชีวพิษ EMP');},level:40,form:'bolt',element:'lightning',mods:['force','pierce']},
{id:'d6',get name(){return t('โดรนกระจายชีวพิษ');},level:55,form:'field',element:'poison',mods:['wide','force']}
];
// Dragonfly: ranged archer (wind / lightning). Cricket: hammer and sound waves (wind / lightning, gold).
export const DRAGONFLY_SKILLS=[
{id:'s1',get name(){return t('ศรเรลกันทะลวง');},level:1,form:'bolt',element:'lightning',mods:['pierce'],combat:{range:520,radius:0,mp:9,cd:2.6,power:2.1}},
{id:'s2',get name(){return t('มัลติช็อตเรลกัน');},level:5,form:'wave',element:'wind',mods:['wide'],combat:{range:420,radius:170,mp:14,cd:4.5,power:1.7}},
{id:'s3',get name(){return t('วงแหวนไอออน');},level:12,form:'circle',element:'wind',mods:['wide'],combat:{range:190,radius:190,mp:20,cd:7,power:1.6}},
{id:'s4',get name(){return t('ดาวเทียมยิงศร');},level:25,form:'field',element:'lightning',mods:['wide'],combat:{range:460,radius:190,mp:26,cd:10,power:.75}},
{id:'s5',get name(){return t('ศรเรลกันโอเวอร์ชาร์จ');},level:40,form:'bolt',element:'lightning',mods:['pierce','force']},
{id:'s6',get name(){return t('ฝูงศรโฟตอน');},level:55,form:'wave',element:'lightning',mods:['wide','force']}
];
export const CRICKET_SKILLS=[
{id:'s1',get name(){return t('ค้อนโซนิกกระแทก');},level:1,form:'wave',element:'wind',mods:['wide'],combat:{range:400,radius:150,mp:10,cd:3.4,power:2}},
{id:'s2',get name(){return t('โซนิกพัลส์');},level:5,form:'circle',element:'lightning',mods:['wide'],combat:{range:190,radius:190,mp:14,cd:5,power:1.8}},
{id:'s3',get name(){return t('เจ็ตบูสต์กระแทก');},level:12,form:'dash',element:'wind',mods:['wide','force'],combat:{range:260,radius:70,mp:18,cd:7,power:2}},
{id:'s4',get name(){return t('สนามเรโซแนนซ์');},level:25,form:'field',element:'lightning',mods:['wide'],combat:{range:380,radius:190,mp:26,cd:10,power:.8}},
{id:'s5',get name(){return t('โรเตอร์ค้อนโซนิก');},level:40,form:'circle',element:'wind',mods:['wide','force']},
{id:'s6',get name(){return t('โดมเรโซแนนซ์');},level:55,form:'field',element:'lightning',mods:['wide','force'],combat:{range:200,radius:230,mp:40,cd:14,power:.9}}
];
export const MAGE_SKILLS=[
{id:'s1',name:'ลูกไฟ / Fireball',level:1,form:'bolt',element:'fire',mods:[],combat:{range:430,mp:10,cd:3,power:2.1}},
{id:'s2',name:'หอกน้ำแข็ง / Ice Lance',level:5,form:'wave',element:'ice',mods:['pierce']},
{id:'s3',name:'วงเวทสายฟ้า / Thunder Ring',level:12,form:'circle',element:'lightning',mods:['wide']},
{id:'s4',name:'พายุหิมะ / Blizzard',level:25,form:'field',element:'ice',mods:['wide']},
{id:'s5',name:'ดาวตก / Meteor',level:40,form:'field',element:'fire',mods:['force']},
{id:'s6',name:'พายุเวท / Arcane Storm',level:55,form:'wave',element:'lightning',mods:['wide','force']}
];
export const ACOLYTE_SKILLS=[
{id:'s1',name:'แสงศักดิ์สิทธิ์ / Holy Light',level:1,form:'bolt',element:'lightning',mods:[],combat:{range:350,mp:9,cd:3,power:1.8}},
{id:'s2',name:'ฟื้นพลัง / Heal',level:5,form:'circle',element:'wind',mods:[],effect:'heal',combat:{mp:20,cd:12,power:1}},
{id:'s3',name:'วงแสง / Sacred Ring',level:12,form:'circle',element:'lightning',mods:['drain']},
{id:'s4',name:'คทาพิพากษา / Judgment',level:25,form:'wave',element:'lightning',mods:['force']},
{id:'s5',name:'เขตแสง / Sanctuary',level:40,form:'field',element:'lightning',mods:['wide','drain']},
{id:'s6',name:'แสงรุ่งอรุณ / Dawn',level:55,form:'circle',element:'lightning',mods:['wide','force']}
];
function baseClassSkills(s){if(s.hero==='sword-mage')return MAGE_SKILLS;if(s.hero==='sword-acolyte')return ACOLYTE_SKILLS;if(s.hero==='sword-dragonfly')return [...DRAGONFLY_SKILLS,...SCHOOL.filter(r=>r.sect==='sword'&&Number(r.id.slice(1))>=7)];if(s.hero==='sword-cricket')return [...CRICKET_SKILLS,...SCHOOL.filter(r=>r.sect==='sword'&&Number(r.id.slice(1))>=7)];if(s.hero==='demon-scorpion')return [...SCORPION_SKILLS,...SCHOOL.filter(r=>r.sect==='demon'&&Number(r.id.slice(1))>=7)];return s.hero==='sword-cockro'?[...COCKRO_SKILLS,...SCHOOL.filter(r=>r.sect==='sword'&&Number(r.id.slice(1))>=7)]:SCHOOL.filter(r=>r.sect===(s.hero.startsWith('sword')?'sword':'demon'));}
export function normalizeSkills(s,v={}){const sect=s.hero.startsWith('sword')?'sword':'demon';s.recipes=Array.isArray(v.recipes)?v.recipes.slice(0,10).filter(r=>r&&FORMS[r.form]&&ELEMENTS[r.element]&&Array.isArray(r.mods)&&r.mods.length<=2&&r.mods.every(m=>MODS[m]&&m!=='none')).map((r,i)=>({...r,id:'custom'+i,get name(){return String(r.name||t('วิชาไร้นาม')).slice(0,32);},level:r.mods.length>1?120:60})):[];const available=[...classSkills(s),...s.recipes].filter(r=>r.level<=s.level);const used=new Set();s.equipped=Array.isArray(v.equipped)?v.equipped.slice(0,5).map(id=>{if(used.has(id)||!available.some(r=>r.id===id))return null;used.add(id);return id;}):[];if(!s.equipped.some(Boolean))s.equipped=[available[0].id];for(let i=0;i<5;i++){if(s.equipped[i]===undefined)s.equipped[i]=i<3?null:available.find(r=>!s.equipped.includes(r.id))?.id||null;}s.materials={};for(const k of ['ink','core',...Object.keys(ELEMENTS)])s.materials[k]=Math.min(99999,Math.max(0,Math.floor(Number(v.materials?.[k])||0)));}
export function knownSkills(s){return [...classSkills(s),...s.recipes];}
export function craft(s,r){if(s.level<60)return t('ต้องถึงเลเวล 60');if(s.recipes.length>=10)return t('บันทึกได้สูงสุด 10 วิชา');if(!r||!FORMS[r.form]||!ELEMENTS[r.element]||!Array.isArray(r.mods)||new Set(r.mods).size!==r.mods.length||r.mods.some(m=>!MODS[m]||m==='none'))return t('สูตรไม่ถูกต้อง');if(r.mods.length>(s.level>=120?2:1))return t('สองคุณสมบัติต้องเลเวล 120');const advanced=r.mods.length===2,cost=advanced?12000:3000;if(s.gold<cost||s.materials.ink<1||s.materials[r.element]<3||(advanced&&s.materials.core<2))return t('เงินหรือวัตถุดิบไม่พอ');s.gold-=cost;s.materials.ink--;s.materials[r.element]-=3;if(advanced)s.materials.core-=2;s.recipes.push({id:'custom'+s.recipes.length,get name(){return String(r.name||t('วิชาไร้นาม')).trim().slice(0,32)||t('วิชาไร้นาม');},form:r.form,element:r.element,mods:r.mods,level:advanced?120:60});return null;}
export function skillTargets(skill,origin,aim,enemies){const dx=aim.x-origin.x,dy=aim.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;const live=enemies.filter(e=>e.hp>0);if(skill.form==='circle')return live.filter(e=>Math.hypot(e.x-origin.x,e.y-origin.y)<=skill.radius);if(skill.form==='field')return live.filter(e=>Math.hypot(e.x-aim.x,e.y-aim.y)<=skill.radius);const line=live.filter(e=>{const x=e.x-origin.x,y=e.y-origin.y,along=x*ux+y*uy;return along>=0&&along<=skill.range&&Math.abs(x*uy-y*ux)<=(skill.radius||40)}).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));return skill.form==='bolt'?line.slice(0,skill.mods.includes('pierce')?3:1):line;}

SCHOOL.push(
{id:'s6',sect:'sword',get name(){return t('พลาสมาวายุหยก');},level:80,form:'circle',element:'wind',mods:['wide']},
{id:'s7',sect:'sword',get name(){return t('โหนดพลาสมาเหมันต์');},level:100,form:'field',element:'ice',mods:['lasting']},
{id:'s8',sect:'sword',get name(){return t('เจ็ดพลาสมาพิพากษา');},level:140,form:'wave',element:'lightning',mods:['pierce','force']},
{id:'s9',sect:'sword',get name(){return t('ปืนไอออนทะลวง');},level:160,form:'wave',element:'ice',mods:['wide','force']},
{id:'s10',sect:'sword',get name(){return t('ฝนพลาสมาวงโคจร');},level:180,form:'field',element:'lightning',mods:['wide','force']},
{id:'d6',sect:'demon',get name(){return t('โซ่นาโนวนสูญ');},level:80,form:'circle',element:'ice',mods:['drain']},
{id:'d7',sect:'demon',get name(){return t('ปีกเจ็ตตัดวงโคจร');},level:100,form:'wave',element:'fire',mods:['force']},
{id:'d8',sect:'demon',get name(){return t('ตอร์ปิโดชีวพิษ');},level:140,form:'bolt',element:'poison',mods:['pierce','lasting']},
{id:'d9',sect:'demon',get name(){return t('EMP เก้าโหนด');},level:160,form:'circle',element:'fire',mods:['wide','drain']},
{id:'d10',sect:'demon',get name(){return t('ฝูงโดรนนาโน');},level:180,form:'field',element:'poison',mods:['wide','force']}
);





// Keep IDs, ranks and equipped slots; derive the current job's cast definition.
const FANTASY_NAMES={
 'sword-cockro':['คลื่นดาบ / Sword Wave','ดาบหมุน / Whirlwind','วงเวทดาบ / Blade Circle','พุ่งแทง / Lunge','เขตพิทักษ์ / Guardian Field','ดาบพิพากษา / Judgment'],
 'demon-scorpion':['มีดพิษ / Venom Blade','วงมีด / Blade Dance','หมอกพิษ / Poison Mist','เงาสังหาร / Shadow Strike','มีดทะลวง / Piercing Dagger','ฝนพิษ / Venom Rain'],
 'sword-dragonfly':['ศรทะลวง / Piercing Arrow','ศรกระจาย / Multishot','ศรวายุ / Wind Arrow','ฝนธนู / Arrow Rain','ศรพิฆาต / Deadly Arrow','พายุศร / Arrow Storm'],
 'sword-cricket':['ค้อนกระแทก / Hammer Strike','ค้อนหมุน / Hammer Spin','พุ่งทุบ / Hammer Rush','วงแร่เวท / Ore Field','ค้อนพายุ / Hammer Storm','เตาหลอมเวท / Magic Forge']
};
function classSkills(s){
 const stage=mutationStage(s)||0;
 const list=baseClassSkills(s).map((r,i)=>({...r,name:(stage?(language.current==='en'?(stage===2?'Master ':'Advanced '):(stage===2?'ขั้นสูง • ':'ขั้นสอง • ')):'')+(FANTASY_NAMES[s.hero]?.[i]||r.name),combat:{...FORMS[r.form],...(r.combat||{}),power:(r.combat?.power??FORMS[r.form].power)*(stage===2?1.2:stage===1?1.1:1)}}));
 const b=BRANCHES[branchFor(s)];
 if(stage&&b)list.push({id:'job-'+branchFor(s),name:(language.current==='en'?b.en:b.name)+' • '+(b.effect==='heal'?'พรฟื้นพลัง / Renewal':'วิชาประจำสาย / Signature'),level:20,form:b.form,element:b.element,mods:b.mods,effect:b.effect,combat:{mp:28,cd:10,power:2.4,range:380,radius:b.form==='circle'?170:110}});
 return list;
}
