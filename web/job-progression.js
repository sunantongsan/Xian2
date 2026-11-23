import {t,ui,language} from './i18n.js';
import {JOBS,BRANCHES} from './jobs.js';
// Identity is derived from the existing species ID and level; never replace save IDs.
export const JOB_LEVELS=Object.freeze([1,20,60]);
export const JOB_PATHS=Object.freeze(Object.fromEntries(Object.entries(JOBS).map(([id,j])=>[id,[j.name,BRANCHES[j.branches[0]].name,'ปรมาจารย์']])));
export function jobFor(hero,level=1,completedStage,branch){
 const path=JOB_PATHS[hero];if(!path)return null;
 const n=Number.isFinite(level)?Math.max(1,Math.floor(level)):1;
 const earned=n>=60?2:n>=20?1:0;
 const stage=Number.isInteger(completedStage)?Math.max(0,Math.min(earned,completedStage)):earned;
 return {id:hero,species:hero,stage,get name(){const j=JOBS[hero];return language.current==='en'?j.en:j.name;},nextLevel:null};
}

// Derived at read time: never persist or stack mutation bonuses in player saves.
export function mutationGrowth(hero,level,completedStage){
 const stage=jobFor(hero,level,completedStage)?.stage||0;
 return [1,1.2,1.45][stage];
}
