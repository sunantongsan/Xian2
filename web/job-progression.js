import {t,ui} from './i18n.js';
// Identity is derived from the existing species ID and level; never replace save IDs.
export const JOB_LEVELS=Object.freeze([1,20,60]);
export const JOB_PATHS=Object.freeze({
 'sword-cockro':Object.freeze(['นักดาบ','ดาบแสงพิฆาต','ผู้พิทักษ์เกราะเหล็ก']),
 'demon-scorpion':Object.freeze(['นักสู้พิษ','หมัดพิษสังหาร','หมัดเกราะทมิฬ']),
 'sword-dragonfly':Object.freeze(['นักธนู','มือปืนโฟตอน','ปืนใหญ่พายุ']),
 'sword-cricket':Object.freeze(['นักรบค้อน','นักวิทยาศาสตร์คลื่นเสียง','วิศวกรชีวภาพ'])
});
export function jobFor(hero,level=1,completedStage){
 const path=JOB_PATHS[hero];if(!path)return null;
 const n=Number.isFinite(level)?Math.max(1,Math.floor(level)):1;
 const earned=n>=60?2:n>=20?1:0;
 const stage=Number.isInteger(completedStage)?Math.max(0,Math.min(earned,completedStage)):earned;
 return {id:`${hero}:${stage}`,species:hero,stage,get name(){return t(path[stage]);},nextLevel:JOB_LEVELS[stage+1]??null};
}

// Derived at read time: never persist or stack mutation bonuses in player saves.
export function mutationGrowth(hero,level,completedStage){
 const stage=jobFor(hero,level,completedStage)?.stage||0;
 return [1,1.2,1.45][stage];
}
