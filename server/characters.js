import {migrationReceipt} from './single-character.js';
import {mutationStage} from '../web/mutation.js';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {validSave} from '../web/core.js';
export const CHARACTER_SLOTS=['main','slot2','slot3','slot4'];
export function characterId(account,slot='main'){
 if(!CHARACTER_SLOTS.includes(slot))throw Error('character_missing');
 return slot==='main'?account:createHash('sha256').update(account+':'+slot).digest('hex');
}
export function readCharacter(directory,account,slot='main'){
 const receipt=migrationReceipt(directory,account);if(receipt&&slot!==receipt.slot)return null;
 const path=join(directory,characterId(account,slot)+'.json');
 if(!existsSync(path))return null;
 const state=validSave(JSON.parse(readFileSync(path,'utf8')));
 if(!state)throw Error('invalid_save');return state;
}
export function characterRoster(directory,account){return CHARACTER_SLOTS.flatMap(id=>{const state=readCharacter(directory,account,id);return state?[{id,hero:state.hero,name:state.name||'',level:state.level,mutationStage:mutationStage(state),...(state.jobBranch?{jobBranch:state.jobBranch}:{})}]:[];});}



