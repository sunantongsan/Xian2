import {EXP_TICKETS} from './exp-tickets.js';
import {UPGRADE_ITEMS} from './upgrade-items.js';
import {potionStacks} from './merchant.js';
export function inventoryEntries(s){
 return [
  ...Object.entries(EXP_TICKETS).filter(([id])=>(s.expTickets?.[id]||0)>0).map(([id,item])=>({key:"ticket:"+id,kind:"ticket",id,item,count:s.expTickets[id]})),
  ...(s.bag||[]).map(it=>({key:'gear:'+it.id,kind:'gear',item:it,count:1})),
  ...Object.entries(UPGRADE_ITEMS).filter(([id])=>(s.upgradeItems?.[id]||0)>0).map(([id,it])=>({key:'material:'+id,kind:'material',id,item:it,count:s.upgradeItems[id]})),
  ...['hp','mp'].flatMap(type=>potionStacks(s,type)).map(x=>({...x,key:'potion:'+x.id,kind:'potion'})),
 ];
}
export const inventoryKey=s=>JSON.stringify([s.bag,s.equip,s.upgradeItems,s.potions,s.mpPotions,s.potionStock,s.gold,s.stones,s.bountyRemainder,s.expTickets,s.expBoost]);

