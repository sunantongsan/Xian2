// Shared deterministic tuning for offline and authoritative online combat.
export const BALANCE_VERSION=2;
export const normalXP=level=>20+level*8;
export const killsPerLevel=level=>Math.round(8+1.2*level+.006*level*level);
export const levelXP=level=>normalXP(level)*killsPerLevel(level);
export const manaRegen=s=>6.5+Math.min(6,(s.attributes?.int||0)*.02);
export function monsterStats(level,{boss=false,elite=false,toughness=1}={}){
 const hp=(110+level*65+level*level*1.4)*(1+3*(1-Math.exp(-(level-1)/10)));
 return {hp:Math.round(hp*toughness*(boss?7:elite?2.6:1)),damage:Math.round((12+level*5+level*level*.09)*(boss?1.65:elite?1.2:1)),xp:normalXP(level)*(boss?10:elite?3:1),gold:Math.round((10+level*3)*(boss?8:elite?3:1))};
}
