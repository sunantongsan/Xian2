// Shared, deterministic skill rules: UI and combat consume the same definitions.
export const FORMS={wave:{name:'คลื่นพลัง',range:320,radius:36,power:1.8,mp:18,cd:5,desc:'แนวตรงตามทิศเป้าหมาย'},circle:{name:'กวาดรอบตัว',range:155,radius:155,power:1.4,mp:22,cd:7,desc:'โจมตีศัตรูรอบตัว'},bolt:{name:'ลูกพลัง',range:400,radius:0,power:2.3,mp:16,cd:4,desc:'โจมตีเป้าหมายเดียวระยะไกล'},dash:{name:'พุ่งแทง',range:230,radius:45,power:1.7,mp:24,cd:8,desc:'พุ่งผ่านศัตรูในแนวตรง'},field:{name:'ค่ายกล',range:300,radius:120,power:.65,mp:32,cd:12,desc:'สร้างพื้นที่โจมตี 4 ครั้งใน 3 วินาที'}};
export const ELEMENTS={wind:{name:'ลม',color:'#a6f3dd',desc:'ผลักศัตรูออก 45 หน่วย'},fire:{name:'ไฟ',color:'#ff9a50',desc:'เผาไหม้ 3 วินาที รวม 45% พลังโจมตี'},ice:{name:'น้ำแข็ง',color:'#81ddff',desc:'ลดความเร็ว 35% นาน 3 วินาที'},lightning:{name:'สายฟ้า',color:'#d8b4ff',desc:'เพิ่มความเสียหายทันที 20%'},poison:{name:'พิษ',color:'#a8dc64',desc:'พิษ 6 วินาที รวม 60% พลังโจมตี'}};
export const MODS={none:{name:'ไม่มี',desc:'ไม่เพิ่มค่าปราณ'},pierce:{name:'ทะลวง',desc:'ลูกพลังทะลุได้สูงสุด 3 เป้าหมาย / รูปแบบอื่นเพิ่มแรง 15%'},drain:{name:'ดูดเลือด',desc:'ฟื้น 8% ของความเสียหายจริง สูงสุด 8% เลือดต่อการร่าย'},wide:{name:'ขยาย',desc:'เพิ่มระยะและพื้นที่ 25%'},force:{name:'อัดพลัง',desc:'เพิ่มความแรง 25%'},quick:{name:'ฉับไว',desc:'ลดคูลดาวน์ 20% แต่ลดแรง 15%'},lasting:{name:'ยืดผล',desc:'เพิ่มเวลาผลธาตุ 50%'}};
export const SCHOOL=[
{id:'s1',sect:'sword',name:'กระบี่ทะลวงเมฆ',level:1,form:'wave',element:'wind',mods:[]},
{id:'s2',sect:'sword',name:'ก้าวกระบี่สายฟ้า',level:20,form:'dash',element:'lightning',mods:[]},
{id:'s3',sect:'sword',name:'วงกระบี่เหมันต์',level:40,form:'circle',element:'ice',mods:[]},
{id:'s4',sect:'sword',name:'กระบี่เพลิงไล่ดาว',level:60,form:'bolt',element:'fire',mods:['pierce']},
{id:'s5',sect:'sword',name:'ค่ายกลหมื่นกระบี่',level:120,form:'field',element:'lightning',mods:['wide']},
{id:'d1',sect:'demon',name:'กรงเล็บโลหิต',level:1,form:'circle',element:'poison',mods:['drain']},
{id:'d2',sect:'demon',name:'เพลิงมารติดตาม',level:20,form:'bolt',element:'fire',mods:[]},
{id:'d3',sect:'demon',name:'เงามารเยือกแข็ง',level:40,form:'dash',element:'ice',mods:[]},
{id:'d4',sect:'demon',name:'คลื่นพิษกลืนปราณ',level:60,form:'wave',element:'poison',mods:['wide']},
{id:'d5',sect:'demon',name:'ค่ายกลบัวโลหิต',level:120,form:'field',element:'fire',mods:['drain']}
];
export function compileSkill(r){if(!r||!FORMS[r.form]||!ELEMENTS[r.element])return null;const mods=[...new Set(r.mods||[])].filter(m=>m!=='none'&&MODS[m]);const f={...FORMS[r.form],...(r.combat||{})};return {...r,mods,range:f.range*(mods.includes('wide')?1.25:1),radius:f.radius*(mods.includes('wide')?1.25:1),power:f.power*(mods.includes('force')?1.25:1)*(mods.includes('quick')?.85:1)*(mods.includes('pierce')&&r.form!=='bolt'?1.15:1),mp:f.mp+mods.length*4,cd:Math.max(1.5,f.cd*.8)*(mods.includes('quick')?.8:1),color:ELEMENTS[r.element].color};}
export const COCKRO_SKILLS=[
{id:'s1',name:'คลื่นดาบพลังงาน',level:1,form:'wave',element:'wind',mods:['wide'],combat:{range:480,radius:150,mp:10,cd:3.2,power:1.9}},
{id:'s2',name:'พายุหมุนดาบ',level:5,form:'circle',element:'fire',mods:['wide'],combat:{range:185,radius:185,mp:14,cd:5,power:1.8}},
{id:'s3',name:'สนามดาบสายฟ้า',level:12,form:'field',element:'lightning',mods:['wide'],combat:{range:420,radius:180,mp:22,cd:9,power:.7}},
{id:'s4',name:'ดาบพุ่งทะลวง',level:25,form:'dash',element:'wind',mods:['wide']},
{id:'s5',name:'ฝนดาบพิทักษ์ดาว',level:40,form:'field',element:'lightning',mods:['wide','force']},
{id:'s6',name:'วงดาบสะเทือนฟ้า',level:55,form:'circle',element:'lightning',mods:['wide','force']}
];
// Scorpion Man: poison assassin. Uses demon-sheet ids so painted VFX and save slots stay compatible.
export const SCORPION_SKILLS=[
{id:'d1',name:'มีดพิษพุ่งทะยาน',level:1,form:'wave',element:'poison',mods:['wide'],combat:{range:460,radius:140,mp:10,cd:3.2,power:1.8}},
{id:'d2',name:'หางแมงป่องกวาดวง',level:5,form:'circle',element:'poison',mods:['wide'],combat:{range:185,radius:185,mp:14,cd:5,power:1.75}},
{id:'d3',name:'หมอกพิษมรณะ',level:12,form:'field',element:'poison',mods:['wide'],combat:{range:420,radius:180,mp:22,cd:9,power:.7}},
{id:'d4',name:'เงาแมงป่องพุ่งแทง',level:25,form:'dash',element:'poison',mods:['wide']},
{id:'d5',name:'ลูกพิษระเบิดสายฟ้า',level:40,form:'bolt',element:'lightning',mods:['force','pierce']},
{id:'d6',name:'หางยักษ์ฟาดพสุธา',level:55,form:'field',element:'poison',mods:['wide','force']}
];
// Dragonfly: ranged archer (wind / lightning). Cricket: hammer and sound waves (wind / lightning, gold).
export const DRAGONFLY_SKILLS=[
{id:'s1',name:'ศรแสงพุ่งทะลวง',level:1,form:'bolt',element:'lightning',mods:['pierce'],combat:{range:520,radius:0,mp:9,cd:2.6,power:2.1}},
{id:'s2',name:'ศรพัดห้าดอก',level:5,form:'wave',element:'wind',mods:['wide'],combat:{range:420,radius:170,mp:14,cd:4.5,power:1.7}},
{id:'s3',name:'พายุปีกแมลงปอ',level:12,form:'circle',element:'wind',mods:['wide'],combat:{range:190,radius:190,mp:20,cd:7,power:1.6}},
{id:'s4',name:'ฝนศรดวงดาว',level:25,form:'field',element:'lightning',mods:['wide'],combat:{range:460,radius:190,mp:26,cd:10,power:.75}},
{id:'s5',name:'ศรสายฟ้าเจาะฟ้า',level:40,form:'bolt',element:'lightning',mods:['pierce','force']},
{id:'s6',name:'ปีกแสงพิพากษา',level:55,form:'wave',element:'lightning',mods:['wide','force']}
];
export const CRICKET_SKILLS=[
{id:'s1',name:'ค้อนทุบแผ่นดินแยก',level:1,form:'wave',element:'wind',mods:['wide'],combat:{range:400,radius:150,mp:10,cd:3.4,power:2}},
{id:'s2',name:'วงคลื่นเสียงจิ้งหรีด',level:5,form:'circle',element:'lightning',mods:['wide'],combat:{range:190,radius:190,mp:14,cd:5,power:1.8}},
{id:'s3',name:'กระโดดกระแทกพสุธา',level:12,form:'dash',element:'wind',mods:['wide','force'],combat:{range:260,radius:70,mp:18,cd:7,power:2}},
{id:'s4',name:'สนามคลื่นสั่นสะเทือน',level:25,form:'field',element:'lightning',mods:['wide'],combat:{range:380,radius:190,mp:26,cd:10,power:.8}},
{id:'s5',name:'ค้อนพายุหมุน',level:40,form:'circle',element:'wind',mods:['wide','force']},
{id:'s6',name:'โดมคลื่นเสียงทองคำ',level:55,form:'field',element:'lightning',mods:['wide','force'],combat:{range:200,radius:230,mp:40,cd:14,power:.9}}
];
function classSkills(s){if(s.hero==='sword-dragonfly')return [...DRAGONFLY_SKILLS,...SCHOOL.filter(r=>r.sect==='sword'&&Number(r.id.slice(1))>=7)];if(s.hero==='sword-cricket')return [...CRICKET_SKILLS,...SCHOOL.filter(r=>r.sect==='sword'&&Number(r.id.slice(1))>=7)];if(s.hero==='demon-scorpion')return [...SCORPION_SKILLS,...SCHOOL.filter(r=>r.sect==='demon'&&Number(r.id.slice(1))>=7)];return s.hero==='sword-cockro'?[...COCKRO_SKILLS,...SCHOOL.filter(r=>r.sect==='sword'&&Number(r.id.slice(1))>=7)]:SCHOOL.filter(r=>r.sect===(s.hero.startsWith('sword')?'sword':'demon'));}
export function normalizeSkills(s,v={}){const sect=s.hero.startsWith('sword')?'sword':'demon';s.recipes=Array.isArray(v.recipes)?v.recipes.slice(0,10).filter(r=>r&&FORMS[r.form]&&ELEMENTS[r.element]&&Array.isArray(r.mods)&&r.mods.length<=2&&r.mods.every(m=>MODS[m]&&m!=='none')).map((r,i)=>({...r,id:'custom'+i,name:String(r.name||'วิชาไร้นาม').slice(0,32),level:r.mods.length>1?120:60})):[];const available=[...classSkills(s),...s.recipes].filter(r=>r.level<=s.level);const used=new Set();s.equipped=Array.isArray(v.equipped)?v.equipped.slice(0,5).map(id=>{if(used.has(id)||!available.some(r=>r.id===id))return null;used.add(id);return id;}):[];if(!s.equipped.some(Boolean))s.equipped=[available[0].id];for(let i=0;i<5;i++){if(s.equipped[i]===undefined)s.equipped[i]=i<3?null:available.find(r=>!s.equipped.includes(r.id))?.id||null;}s.materials={};for(const k of ['ink','core',...Object.keys(ELEMENTS)])s.materials[k]=Math.min(99999,Math.max(0,Math.floor(Number(v.materials?.[k])||0)));}
export function knownSkills(s){return [...classSkills(s),...s.recipes];}
export function craft(s,r){if(s.level<60)return 'ต้องถึงเลเวล 60';if(s.recipes.length>=10)return 'บันทึกได้สูงสุด 10 วิชา';if(!r||!FORMS[r.form]||!ELEMENTS[r.element]||!Array.isArray(r.mods)||new Set(r.mods).size!==r.mods.length||r.mods.some(m=>!MODS[m]||m==='none'))return 'สูตรไม่ถูกต้อง';if(r.mods.length>(s.level>=120?2:1))return 'สองคุณสมบัติต้องเลเวล 120';const advanced=r.mods.length===2,cost=advanced?12000:3000;if(s.gold<cost||s.materials.ink<1||s.materials[r.element]<3||(advanced&&s.materials.core<2))return 'เงินหรือวัตถุดิบไม่พอ';s.gold-=cost;s.materials.ink--;s.materials[r.element]-=3;if(advanced)s.materials.core-=2;s.recipes.push({id:'custom'+s.recipes.length,name:String(r.name||'วิชาไร้นาม').trim().slice(0,32)||'วิชาไร้นาม',form:r.form,element:r.element,mods:r.mods,level:advanced?120:60});return null;}
export function skillTargets(skill,origin,aim,enemies){const dx=aim.x-origin.x,dy=aim.y-origin.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;const live=enemies.filter(e=>e.hp>0);if(skill.form==='circle')return live.filter(e=>Math.hypot(e.x-origin.x,e.y-origin.y)<=skill.radius);if(skill.form==='field')return live.filter(e=>Math.hypot(e.x-aim.x,e.y-aim.y)<=skill.radius);const line=live.filter(e=>{const x=e.x-origin.x,y=e.y-origin.y,along=x*ux+y*uy;return along>=0&&along<=skill.range&&Math.abs(x*uy-y*ux)<=(skill.radius||40)}).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));return skill.form==='bolt'?line.slice(0,skill.mods.includes('pierce')?3:1):line;}

SCHOOL.push(
{id:'s6',sect:'sword',name:'กระบี่วายุหยก',level:80,form:'circle',element:'wind',mods:['wide']},
{id:'s7',sect:'sword',name:'บัวกระบี่เหมันต์',level:100,form:'field',element:'ice',mods:['lasting']},
{id:'s8',sect:'sword',name:'เจ็ดกระบี่พิพากษา',level:140,form:'wave',element:'lightning',mods:['pierce','force']},
{id:'s9',sect:'sword',name:'มังกรครามทะลวงฟ้า',level:160,form:'wave',element:'ice',mods:['wide','force']},
{id:'s10',sect:'sword',name:'ฝนกระบี่ประตูสวรรค์',level:180,form:'field',element:'lightning',mods:['wide','force']},
{id:'d6',sect:'demon',name:'โซ่วิญญาณวนสูญ',level:80,form:'circle',element:'ice',mods:['drain']},
{id:'d7',sect:'demon',name:'ปีกมารสะบั้นจันทร์',level:100,form:'wave',element:'fire',mods:['force']},
{id:'d8',sect:'demon',name:'อสรพิษกลืนวิญญาณ',level:140,form:'bolt',element:'poison',mods:['pierce','lasting']},
{id:'d9',sect:'demon',name:'คราสโลหิตเก้าผนึก',level:160,form:'circle',element:'fire',mods:['wide','drain']},
{id:'d10',sect:'demon',name:'พายุเก้าบัวอเวจี',level:180,form:'field',element:'poison',mods:['wide','force']}
);



