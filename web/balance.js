// Shared deterministic tuning for offline and authoritative online combat.
export const BALANCE_VERSION=3;
export const normalXP=level=>20+level*8;
const previousKills=level=>Math.round(8+1.2*level+.006*level*level);
export const previousLevelXP=level=>normalXP(level)*previousKills(level);
// Exactly +30% over COCKRO v2, rounded up to a whole XP point. Monster XP is
// intentionally unchanged so raising rewards cannot cancel the new requirement.
export const huntXP=level=>normalXP(Math.min(level,210));
export const levelXP=level=>Math.ceil(previousLevelXP(Math.min(level,210))*13/10);
export const killsPerLevel=level=>Math.ceil(levelXP(level)/huntXP(level));
export function migrateXP(xp,level,version){
 if(version===BALANCE_VERSION)return xp;
 const oldNeed=version===2?previousLevelXP(level):45+level*level*4;
 // Preserve earned progress, including overflow. Re-loading v3 is a no-op.
 return Math.floor(xp*levelXP(level)/oldNeed);
}
export const PLAYER_GROWTH=Object.freeze({hp:26,attack:5,mp:4,defense:.4});
export const manaRegen=s=>6.5+Math.min(6,(s.attributes?.int||0)*.02);
// Ease enemy growth over ten levels after each mutation; no sudden wall on unlock.
export const monsterMutationGrowth=level=>1+.10*Math.max(0,Math.min(1,(level-20)/10))+.12*Math.max(0,Math.min(1,(level-60)/10));
// Bosses are long, dangerous fights: about 14 ordinary monsters of HP and 2.6x their hit.
export const BOSS_HP=14,BOSS_DAMAGE=2.6;
export function monsterStats(level,{boss=false,elite=false,toughness=1}={}){
 // Anchor the curve to a same-level fighter with ordinary equipment. HP is
 // fixed at spawn so upgrading a weapon or joining a party keeps its benefit.
 const levelsGained = level - 1;
 const referenceAttack = 30 + 10 * levelsGained;
 const hitsAtLevel = 7 + 11 * levelsGained / (levelsGained + 15);
 const hp = referenceAttack * hitsAtLevel;
 return {hp:Math.round(hp*monsterMutationGrowth(level)*toughness*(boss?BOSS_HP:elite?2.6:1)),damage:Math.round((12+level*5+level*level*.09)*.9*monsterMutationGrowth(level)*(boss?BOSS_DAMAGE:elite?1.2:1)),xp:normalXP(level)*(boss?10:elite?3:1),gold:Math.round((10+level*3)*(boss?8:elite?3:1))};
}


