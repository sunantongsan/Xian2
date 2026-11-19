import {t,ui} from './i18n.js';
import {reward} from './core.js';
import {rollDrop,rollInsectArmor,itemName,BAG_SIZE} from './gear.js';
import {UPGRADE_ITEMS} from './upgrade-items.js';
export const LOOT_SECONDS=8,LOOT_RADIUS=65;
// XP and kill credit are immediate; all tangible rewards wait on the ground.
export function monsterRewards(s,m,rng=Math.random){
 const gold=s.gold;reward(s,m,rng);
 const rewards=[];if(s.gold>gold)rewards.push({kind:'gold',count:s.gold-gold});
 s.gold=gold;const item=rollDrop(m,rng);if(item)rewards.push({kind:'gear',item,count:1});return rewards;
}
export function lootName(d,hero){return d.kind==='gold'?t('เงิน G'):d.kind==='material'?UPGRADE_ITEMS[d.itemId].name:itemName(d.item,hero);}
export function collectLoot(s,d){
 if(d.kind==='gear'){if(!['weapon','ring','amulet'].includes(d.item?.slot))return false;if(s.bag.length>=BAG_SIZE)return false;s.bag.push(d.item);}
 else if(d.kind==='gold')s.gold=Math.min(1e10,s.gold+d.count);
 else if(d.kind==='material'){if(!Object.hasOwn(UPGRADE_ITEMS,d.itemId))return false;const n=s.upgradeItems[d.itemId]||0;if(n+d.count>99999)return false;s.upgradeItems[d.itemId]=n+d.count;}
 else return false;return true;
}
