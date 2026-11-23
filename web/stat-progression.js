export const STAT_PROGRESSION_VERSION=2;
export const STAT_POINTS_PER_LEVEL=4;
// The old game awarded ten points. Preserve the six-point difference for every
// level already earned when a server-owned save is first migrated.
export function statProgression(source,level){
 const earned=Math.max(0,Math.floor(level)-1);
 const legacy=source.statProgressionVersion===STAT_PROGRESSION_VERSION
  ? Math.max(0,Math.min(earned,Number.isSafeInteger(source.legacyStatLevels)?source.legacyStatLevels:0))
  : Math.min(209,earned);
 return {statProgressionVersion:STAT_PROGRESSION_VERSION,legacyStatLevels:legacy,
  budget:earned*STAT_POINTS_PER_LEVEL+legacy*6};
}
