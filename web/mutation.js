import {jobFor,JOB_PATHS} from './job-progression.js';
export const MUTATION_VERSION=1;
export const DOCTOR_UV=Object.freeze([.69,.59]);
export const MUTATION_LEVELS=Object.freeze([20,60]);
export function mutationStage(s){
 const earned=jobFor(s?.hero,s?.level)?.stage||0;
 if(s?.mutationVersion!==MUTATION_VERSION)return earned;
 return Math.max(0,Math.min(earned,Number.isInteger(s.mutationStage)?s.mutationStage:0));
}
export function normalizeMutation(s,source=s){const stage=mutationStage(source);s.mutationVersion=MUTATION_VERSION;s.mutationStage=stage;}
export function pendingMutation(s){
 if(!JOB_PATHS[s?.hero])return null;
 const stage=mutationStage(s),level=MUTATION_LEVELS[stage];
 return level&&s.level>=level?{stage:stage+1,level,name:JOB_PATHS[s.hero][stage+1]}:null;
}
export function mutationVisualLevel(s){const stage=mutationStage(s);return stage===0?Math.min(s.level||1,19):stage===1?Math.min(s.level||20,59):s.level;}
export function completeMutation(s){const pending=pendingMutation(s);if(!pending)return false;s.mutationVersion=MUTATION_VERSION;s.mutationStage=pending.stage;s.xp=0;const values=Object.values(s.attributes||{});s.statPoints=(s.statPoints||0)+values.reduce((n,v)=>n+v,0);s.attributes={vit:0,str:0,int:0,agi:0};return true;}
