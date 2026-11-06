import {t,ui} from './i18n.js';
import {monsterStats} from './balance.js';
// Twenty new species. Each occupies three consecutive levels on Hero Star.
export const ADVANCED_SPECIES=[
 ['ด้วงเกราะหยก','beetle','melee','#29866f','#b4fcb8',1.25,.85],
 ['ตั๊กแตนเคียวแสง','mantis','dash','#6a9c38','#e2ffa2',.85,1.25],
 ['ผีเสื้อสปอร์ม่วง','moth','projectile','#8960b5','#ffd0fc',.8,1.1],
 ['แมงมุมอำพัน','spider','burst','#a86828','#ffe193',1,1],
 ['หอยเห็ดพิษ','snail','projectile','#6b487c','#e6acff',1.5,.65],
 ['หนอนเจาะเกราะ','worm','dash','#bd7549','#ffe7a5',1.2,.95],
 ['แตนเหล็ก','wasp','projectile','#a58a35','#fff0a0',.8,1.3],
 ['แมงป่องกรด','scorpion','cone','#498f51','#cbff76',1.15,.95],
 ['ปูคริสตัล','crab','melee','#4087a8','#9ffff2',1.4,.75],
 ['แมลงปอสายฟ้า','dragonfly','dash','#4377ba','#c4f6ff',.75,1.4],
 ['คางคกแม่เหล็ก','toad','burst','#607a83','#bef7ec',1.2,.8],
 ['โกเลมเศษเหล็ก','golem','cone','#68677b','#ffa46f',1.6,.65],
 ['แมงกะพรุนพลาสมา','jelly','burst','#805da1','#f9afff',.9,.95],
 ['ค้างคาวคลื่นเสียง','bat','cone','#6c4c88','#e1c5ff',.8,1.3],
 ['อสรพิษนีออน','serpent','projectile','#458f84','#c4ff7e',1,1.15],
 ['เต่าป้อมปราการ','turtle','burst','#8a733e','#ffdd87',1.7,.6],
 ['หม้อข้าวหม้อแกงจักรกล','plant','projectile','#99616c','#ffd398',1.2,.7],
 ['ยักษ์ตาเดียวดาร์กคอร์','cyclops','cone','#725185','#f7a8ec',1.5,.7],
 ['ตะขาบแมกมา','centipede','dash','#a34638','#ffb26d',1.15,1.15],
 ['วิหคเพลิงสุริยะ','phoenix','burst','#bd5b31','#fff1a2',1.1,1.25],
].map(([name,form,attack,color,accent,toughness,pace],species)=>({get name(){return t(name);},form,attack,color,accent,toughness,pace,species,min:61+species*3,max:63+species*3}));
export const advancedSpeciesAt=level=>Math.max(0,Math.min(19,Math.floor((level-61)/3)));
export function advancedMonster(level,{elite=false,boss=false}={}){
 level=Math.max(61,Math.min(120,Math.round(level)));const sp=ADVANCED_SPECIES[advancedSpeciesAt(level)],region=6+Math.floor((level-61)/10);
 return {id:boss?2060+region-6:2000+level-61,get name(){return (boss?t('จ้าว'):elite?t('หัวหน้า'):'')+sp.name;},zone:1,region,slot:sp.species,species:sp.species,art:'advanced',level,boss,elite:elite||boss,hp:Math.round((160+level*10)*sp.toughness*(boss?8:elite?3.5:1)),damage:Math.round((5+level*1.4)*(boss?1.65:elite?1.25:1)),speed:Math.round(85*sp.pace),attack:sp.attack,cooldown:2.4/sp.pace+(boss?.5:0),xp:Math.round((40+level*16)*(boss?10:elite?4:1)),gold:Math.round((20+level*5)*(boss?6:elite?4:1)),...monsterStats(level,{boss,elite,toughness:sp.toughness})};
}
export const ADVANCED_MONSTERS=[...Array.from({length:60},(_,i)=>advancedMonster(61+i)),...Array.from({length:6},(_,i)=>advancedMonster(70+i*10,{boss:true}))];


