import {insectSpriteRevision} from './insect-sprites.js';
import {mutationStage} from './mutation.js';
// Visual data only: does not change item IDs, saves, damage or requirements.
export const WEAPON_LOOKS=Object.freeze({
 'sword-cockro':['laser-sword','compact-energy-axe'],
 'sword-dragonfly':['single-emitter','twin-emitter'],
 'demon-scorpion':['round','hex']
});
export function equippedWeaponLook(state){
 const choices=WEAPON_LOOKS[state?.hero];if(!choices)return undefined;
 const item=state.equip?.weapon;if(!item)return 'none';
 return choices[0];
}
export function heroAppearance(state){return {spriteDetail:'full',spriteRevision:insectSpriteRevision(),level:state?.level||1,mutationVersion:state?.mutationVersion,mutationStage:mutationStage(state),insectArmor:state?.equip?.armor?.insect||null,weaponLook:equippedWeaponLook(state)};}
