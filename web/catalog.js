import {FOREST_SPECIES,forestMonster} from './forest-species.js';
import {monsterStats} from './balance.js';
import {ADVANCED_MONSTERS} from './advanced-monsters.js';
export const ZONES=[{id:0,name:'ป่าชีวะแสง',level:1,maxLevel:60},{id:1,name:'ดาวฮีโร่',level:61,maxLevel:120}];
export const SPECIES=[
 {name:'หยดพลังอำพัน',attack:'melee',slot:0},
 {name:'เกราะผลึกสามขา',attack:'dash',slot:1},
 {name:'บุปผากินพลัง',attack:'projectile',slot:2}
];
export const MONSTERS=Array.from({length:60},(_,i)=>{const level=i+1,sp=SPECIES[i%3];return{id:1000+i,name:sp.name,zone:0,region:Math.floor(i/10),slot:sp.slot,level,boss:false,hp:44+level*6,damage:4+level*1.35,speed:70+(i%3)*8,attack:sp.attack,cooldown:2.2+(i%3)*.2,xp:20+level*8,gold:10+level*3};});
for(let region=0;region<6;region++){const base=MONSTERS[region*10+9];MONSTERS.push({...base,id:1060+region,name:['ราชาหยดพลัง','จ่าฝูงเกราะผลึก','ราชินีบุปผา'][region%3],slot:region%3,boss:true,hp:base.hp*9,damage:base.damage*1.8,attack:['burst','cone','projectile'][region%3],xp:base.xp*8,gold:base.gold*6});}
for(const m of MONSTERS)Object.assign(m,monsterStats(m.level,{boss:m.boss}));
MONSTERS.push(...ADVANCED_MONSTERS,...FOREST_SPECIES.map(sp=>forestMonster(sp.min)));
export const isKnownMonster=id=>Number.isInteger(id)&&((id>=0&&id<100)||(id>=1000&&id<=1065)||(id>=1100&&id<=1119)||(id>=2000&&id<=2065));
export const isKnownBoss=id=>Number.isInteger(id)&&((id>=0&&id<100&&id%10===9)||(id>=1060&&id<=1065)||(id>=2060&&id<=2065));
export const HEROES=[{"id": "sword-male", "name": "กระบี่ • ชาย", "sect": "sword", "gender": "male", "skill": "หมื่นกระบี่เมฆา"}, {"id": "sword-female", "name": "กระบี่ • หญิง", "sect": "sword", "gender": "female", "skill": "หมื่นกระบี่เมฆา"}, {"id": "demon-male", "name": "มาร • ชาย", "sect": "demon", "gender": "male", "skill": "กรงเล็บโลหิต"}, {"id": "demon-female", "name": "มาร • หญิง", "sect": "demon", "gender": "female", "skill": "บัวโลหิต"}];


HEROES.push({id:"sword-cockro",name:"แมงสาบแมน • ทดลอง",sect:"sword",gender:"mascot",skill:"ใช้สกิลกระบี่สำหรับทดสอบ • ภาพชั่วคราว"});




