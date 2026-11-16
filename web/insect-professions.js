import {INSECT_ARMOR} from './insect-armor.js';
export const INSECT_JOBS=Object.freeze({
 cockroach:{name:'นักรบแมงสาบ',en:'Cockroach Warrior',weapon:'ดาบไคติน',weaponEn:'Chitin Sword',range:120,color:'#df9660'},
 ladybug:{name:'ผู้พิทักษ์เต่าทอง',en:'Ladybug Guardian',weapon:'คทาพิทักษ์',weaponEn:'Guardian Mace',range:120,color:'#ff738d'},
 scorpion:{name:'นักฆ่าแมงป่อง',en:'Scorpion Assassin',weapon:'มีดคู่พิษ',weaponEn:'Venom Daggers',range:120,color:'#bd8ef5'},
 beetle:{name:'อัศวินด้วงกว่าง',en:'Beetle Knight',weapon:'ค้อนเขาด้วง',weaponEn:'Horn Hammer',range:120,color:'#e4be65'},
 dragonfly:{name:'มือยิงแมงปอ',en:'Dragonfly Ranger',weapon:'ธนูวายุ',weaponEn:'Gale Bow',range:340,color:'#78dfe9'},
 mantis:{name:'นักดาบตั๊กแตน',en:'Mantis Blademaster',weapon:'เคียวคู่',weaponEn:'Twin Sickles',range:120,color:'#94d977'}
});
export const isInsectJob=id=>typeof id==='string'&&Object.hasOwn(INSECT_JOBS,id);
export function suitProfession(item){if(!item||item.slot!=='armor'||!Object.hasOwn(INSECT_ARMOR,item.insect))return null;const id=item.insect.split('-')[0];return isInsectJob(id)?id:null;}
export const profession=s=>s?.mutationVersion===2&&s.mutationStage>0&&isInsectJob(s.jobBranch)?s.jobBranch:null;
export const professionWeaponFields=it=>it?.slot==='weapon'&&isInsectJob(it.weaponKind)?{weaponKind:it.weaponKind}:{};
