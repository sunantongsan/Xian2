// Shared temperament: bosses and every third species hunt on sight; others retaliate only.
export const aggressiveMonster=def=>def.aggressive??(!!def.boss||def.id%3===0);
export const monsterNameColor=def=>aggressiveMonster(def)?'#ff6b68':'#ffe16b';
