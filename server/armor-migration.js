import {readdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {isRetiredArmor} from '../web/insect-armor.js';

// Called only after the release backup succeeds, before the server starts accepting players.
export function migrateArmorSaves(directory){
 let characters=0,items=0;
 for(const name of readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){
  const path=join(directory,name),s=JSON.parse(readFileSync(path,'utf8'));let removed=0;
  for(const [slot,it] of Object.entries(s.equip||{}))if(isRetiredArmor(it)){s.equip[slot]=null;removed++;}
  if(Array.isArray(s.bag)){const n=s.bag.length;s.bag=s.bag.filter(it=>!isRetiredArmor(it));removed+=n-s.bag.length;}
  if(removed){writeFileSync(path+'.full-suits.tmp',JSON.stringify(s),{mode:0o600});renameSync(path+'.full-suits.tmp',path);characters++;items+=removed;}
 }
 console.log('Full-suit migration:',characters,'characters,',items,'retired items removed');
 return {characters,items};
}
