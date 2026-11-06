import {knownSkills,compileSkill} from './skills.js';

// Round-robin prevents short-cooldown skills in the first slots starving the rest.
export function readyPvpSkill(save,cooldowns,mp,distance,start=0){
 const known=knownSkills(save);
 for(let n=0;n<5;n++){
  const slot=(start+n)%5;
  const recipe=known.find(r=>r.id===save.equipped[slot]&&r.level<=save.level);
  if(!recipe||(cooldowns[recipe.id]||0)>0)continue;
  const skill=compileSkill(recipe);
  if(mp>=skill.mp&&distance<=(skill.form==='circle'?skill.radius:skill.range))return {slot,skill};
 }
 return null;
}
