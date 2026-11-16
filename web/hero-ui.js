import {JOBS,BRANCHES} from './jobs.js';
import {t,ui,language} from './i18n.js';
import {jobFor} from './job-progression.js';
// Gameplay IDs remain stable so existing local saves retain their progression.
export const HERO_CLASSES=Object.freeze(Object.entries(JOBS).map(([id,j])=>({id,get name(){return language.current==='en'?'Human Adventurer':'คนธรรมดา';},icon:j.icon,color:j.color,playable:id==='sword-cockro',get description(){return language.current==='en'?'Hunt for insect suits • Choose your career at level 20':'ล่ามอนสเตอร์หาชุดแมลง • เปลี่ยนอาชีพเลเวล 20';}})));
export function heroIdentity(id,level=1,stage,branch){const base=HERO_CLASSES.find(h=>h.id===id)||{get name(){return t('ฮีโร่รุ่นเดิม');},icon:5};return {...base,job:jobFor(id,level,stage,branch)};}
export function uiArt(index,extra=''){if(!Number.isInteger(index)||index<0||index>15)throw new RangeError('Invalid UI tile');return `<span class="ui-art ${extra}" aria-hidden="true" style="background-position:${index%4/3*100}% ${Math.floor(index/4)/3*100}%"></span>`;}
export function menuTile(id,label,index){return `<button class="menu-tile" id="${id}">${uiArt(index)}<span>${label}</span></button>`;}



