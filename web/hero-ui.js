import {JOBS} from './jobs.js';
import {t} from './i18n.js';
const HERO_NAMES={
 'sword-cockro':'แมงสาบแมน','demon-scorpion':'แมงป่องแมน',
 'sword-dragonfly':'แมลงปอเกิล','sword-cricket':'จิ้งหรีดแมน',
 'sword-mage':'ฮีโร่คทาเวท','sword-acolyte':'ฮีโร่คทาแสง'
};
export const HERO_CLASSES=Object.freeze(Object.entries(JOBS).map(([id,hero])=>({
 id,get name(){return t(HERO_NAMES[id]);},icon:hero.icon,color:hero.color,playable:true
})));
export function heroIdentity(id){return HERO_CLASSES.find(hero=>hero.id===id)||{get name(){return t('ฮีโร่รุ่นเดิม');},icon:5};}
export function uiArt(index,extra=''){if(!Number.isInteger(index)||index<0||index>15)throw new RangeError('Invalid UI tile');return `<span class="ui-art ${extra}" aria-hidden="true" style="background-position:${index%4/3*100}% ${Math.floor(index/4)/3*100}%"></span>`;}
export function menuTile(id,label,index){return `<button class="menu-tile" id="${id}">${uiArt(index)}<span>${label}</span></button>`;}


