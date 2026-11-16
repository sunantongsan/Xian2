import {t,ui,language} from './i18n.js';
import {JOBS} from './jobs.js';
import {INSECT_JOBS,isInsectJob} from './insect-professions.js';
// Identity is derived from the existing species ID and level; never replace save IDs.
export const JOB_LEVELS=Object.freeze([1,20,60]);
export const JOB_PATHS=Object.freeze(Object.fromEntries(Object.keys(JOBS).map(id=>[id,['คนธรรมดา','อาชีพแมลง','อาชีพแมลงขั้นสูง']])));
export function jobFor(hero,level=1,completedStage=0,branch){
 const earned=level>=60?2:level>=20?1:0;
 const stage=isInsectJob(branch)?Math.max(0,Math.min(earned,completedStage||0)):0;
 return {id:`${branch||'human'}:${stage}`,species:branch||'human',stage,get name(){const en=language.current==='en';if(!stage)return en?'Human Adventurer':'คนธรรมดา';const j=INSECT_JOBS[branch];return (stage===2?(en?'Awakened ':'ขั้นสูง • '):'')+(en?j.en:j.name);},nextLevel:JOB_LEVELS[stage+1]??null};
}

// Derived at read time: never persist or stack mutation bonuses in player saves.
export function mutationGrowth(hero,level,completedStage){
 const stage=Math.max(0,Math.min(level>=60?2:level>=20?1:0,completedStage||0));
 return [1,1.2,1.45][stage];
}

