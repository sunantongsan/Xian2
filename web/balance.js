// Shared deterministic tuning for offline and authoritative online combat.
export const BALANCE_VERSION=3;
export const normalXP=level=>20+level*8;
const previousKills=level=>Math.round(8+1.2*level+.006*level*level);
export const previousLevelXP=level=>normalXP(level)*previousKills(level);
// Exactly +30% over COCKRO v2, rounded up to a whole XP point. Monster XP is
// intentionally unchanged so raising rewards cannot cancel the new requirement.
export const levelXP=level=>Math.ceil(previousLevelXP(level)*13/10);
export const killsPerLevel=level=>Math.ceil(levelXP(level)/normalXP(level));
export function migrateXP(xp,level,version){
 if(version===BALANCE_VERSION)return xp;
 const oldNeed=version===2?previousLevelXP(level):45+level*level*4;
 // Preserve earned progress, including overflow. Re-loading v3 is a no-op.
 return Math.floor(xp*levelXP(level)/oldNeed);
}
export const PLAYER_GROWTH=Object.freeze({hp:26,attack:5,mp:4,defense:.4});
export const manaRegen=s=>6.5+Math.min(6,(s.attributes?.int||0)*.02);
export function monsterStats(level,{boss=false,elite=false,toughness=1}={}){
 // More encounters per level, shorter individual fights. Rank and species
 // toughness still matter; bosses retain seven times normal health.
 const hp=(110+level*65+level*level*.25)*(1+2*(1-Math.exp(-(level-1)/10)));
 return {hp:Math.round(hp*toughness*(boss?7:elite?2.6:1)),damage:Math.round((12+level*5+level*level*.09)*.9*(boss?1.65:elite?1.2:1)),xp:normalXP(level)*(boss?10:elite?3:1),gold:Math.round((10+level*3)*(boss?8:elite?3:1))};
}


