// Identity is derived from the existing species ID and level; never replace save IDs.
export const JOB_LEVELS=Object.freeze([1,20,60]);
export const JOB_PATHS=Object.freeze({
 'sword-cockro':Object.freeze(['นักดาบ','ดาบแสงพิฆาต','ขวานเกราะเหล็ก']),
 'demon-scorpion':Object.freeze(['นักสู้พิษ','หมัดพิษสังหาร','หมัดเกราะทมิฬ']),
 'sword-dragonfly':Object.freeze(['นักธนู','มือปืนโฟตอน','ปืนใหญ่พายุ']),
 'sword-cricket':Object.freeze(['นักรบค้อน','นักวิทยาศาสตร์คลื่นเสียง','วิศวกรชีวภาพ'])
});
export function jobFor(hero,level=1){
 const path=JOB_PATHS[hero];if(!path)return null;
 const n=Number.isFinite(level)?Math.max(1,Math.floor(level)):1;
 const stage=n>=60?2:n>=20?1:0;
 return {id:`${hero}:${stage}`,species:hero,stage,name:path[stage],nextLevel:JOB_LEVELS[stage+1]??null};
}
