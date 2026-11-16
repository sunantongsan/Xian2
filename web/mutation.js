import {jobFor} from './job-progression.js';
import {isInsectJob,suitProfession,profession} from './insect-professions.js';
import {makeItem,BAG_SIZE} from './gear.js';
export const MUTATION_VERSION=2;
export const DOCTOR_UV=Object.freeze([.80,.495]);
export const MUTATION_LEVELS=Object.freeze([20,60]);
export function mutationStage(s){
 if(s?.mutationVersion!==MUTATION_VERSION||!isInsectJob(s.jobBranch))return 0;
 const earned=s.level>=60?2:s.level>=20?1:0;
 return Math.max(0,Math.min(earned,Number.isInteger(s.mutationStage)?s.mutationStage:0));
}
export function normalizeMutation(s,source=s){const stage=mutationStage(source);s.mutationVersion=MUTATION_VERSION;s.mutationStage=stage;s.jobBranch=stage?source.jobBranch:null;s.starterWeaponGranted=source.mutationVersion===2&&source.starterWeaponGranted===true;}
export function pendingMutation(s){
 const stage=mutationStage(s),level=MUTATION_LEVELS[stage];if(!level||s.level<level)return null;
 const species=stage?profession(s):suitProfession(s.equip?.armor);
 return {stage:stage+1,level,species,name:species?jobFor(s.hero,s.level,stage+1,species).name:'สวมชุดแมลงเพื่อเลือกอาชีพ / Equip an insect suit'};
}
export function mutationVisualLevel(s){const stage=mutationStage(s);return stage===0?Math.min(s.level||1,19):stage===1?Math.min(s.level||20,59):s.level;}
export function mutationError(s){const pending=pendingMutation(s);if(!pending)return 'ยังไม่ถึงเวลาเปลี่ยนอาชีพ / Not ready';if(!pending.species)return 'กรุณาสวมชุดแมลงที่ต้องการก่อน / Equip your chosen insect suit';if(pending.stage===1&&!s.starterWeaponGranted&&s.bag.length>=BAG_SIZE)return 'เว้นช่องกระเป๋า 1 ช่องเพื่อรับอาวุธ / Leave one bag slot for your weapon';return null;}
export function completeMutation(s){
 if(mutationError(s))return false;
 const pending=pendingMutation(s);
 if(pending.stage===1){s.jobBranch=pending.species;if(!s.starterWeaponGranted){s.bag.push({...makeItem('weapon',2,0),weaponKind:pending.species});s.starterWeaponGranted=true;}s.equipped=Array.from({length:5},(_,i)=>`insect-${pending.species}-${i+1}`);s.skillRanks={};s.skillPoints=(s.level-1)*10;}
 s.mutationVersion=MUTATION_VERSION;s.mutationStage=pending.stage;s.xp=0;
 s.statPoints=(s.statPoints||0)+Object.values(s.attributes||{}).reduce((n,v)=>n+v,0);s.attributes={vit:0,str:0,int:0,agi:0};return true;
}
