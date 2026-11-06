import {t,ui} from './i18n.js';
import {jobFor} from './job-progression.js';
// Gameplay IDs remain stable so existing local saves retain their progression.
export const HERO_CLASSES=Object.freeze([
 {id:'sword-cockro',get name(){return t('แมงสาบแมน');},icon:12,color:'#ee654f',playable:true,get description(){return t('ฮีโร่ดาบพลังงาน • แนวหน้าปกป้องเมือง');}},
 {id:'demon-scorpion',get name(){return t('แมงป่องแมน');},icon:13,color:'#b78aff',playable:true,get description(){return t('นักฆ่าพิษ • มีดนาโนและสนามชีวพิษวงกว้าง');}},
 {id:'sword-dragonfly',get name(){return t('แมลงปอเกิล');},icon:14,color:'#5eddeb',playable:true,get description(){return t('นักธนูปีกแสง • โจมตีระยะไกล ธนูเรลกันและศรโฟตอน');}},
 {id:'sword-cricket',get name(){return t('จิ้งหรีดแมน');},icon:15,color:'#a2df68',playable:true,get description(){return t('นักรบค้อนคลื่นเสียง • ทนทาน ตีวงกว้าง');}}
]);
export function heroIdentity(id,level=1,stage){const base=HERO_CLASSES.find(h=>h.id===id)||{get name(){return t('ฮีโร่รุ่นเดิม');},icon:5};return {...base,job:jobFor(id,level,stage)};}
export function uiArt(index,extra=''){if(!Number.isInteger(index)||index<0||index>15)throw new RangeError('Invalid UI tile');return `<span class="ui-art ${extra}" aria-hidden="true" style="background-position:${index%4/3*100}% ${Math.floor(index/4)/3*100}%"></span>`;}
export function menuTile(id,label,index){return `<button class="menu-tile" id="${id}">${uiArt(index)}<span>${label}</span></button>`;}


