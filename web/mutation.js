import {branchFor, validBranch} from './jobs.js';
import {jobFor} from './job-progression.js';
export const MUTATION_VERSION=1;
export const DOCTOR_UV=Object.freeze([.80,.495]);

// Legacy save fields carry level-based combat bonuses and existing skill IDs.
export function mutationStage(s){return jobFor(s?.hero,s?.level)?.stage || 0;}
export function normalizeMutation(s,source=s){
 const stage=mutationStage(s);
 s.mutationVersion=MUTATION_VERSION;
 s.mutationStage=stage;
 s.jobBranch=stage ? (validBranch(s.hero,source.jobBranch)?source.jobBranch:branchFor(s)) : null;
}
export function mutationVisualLevel(s){return s.level || 1;}
