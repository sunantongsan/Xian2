import {EXP_TICKETS} from './exp-tickets.js';
import {UPGRADE_ITEMS} from './upgrade-items.js';
import {FASHION_ITEMS} from './fashion.js';
export function inventoryEntries(s){
 return [
  ...Object.entries(EXP_TICKETS).filter(([id])=>(s.expTickets?.[id]||0)>0).map(([id,item])=>({key:"ticket:"+id,kind:"ticket",id,item,count:s.expTickets[id]})),
  ...(s.bag||[]).map(it=>({key:'gear:'+it.id,kind:'gear',item:it,count:1})),
  ...Object.entries(UPGRADE_ITEMS).filter(([id])=>(s.upgradeItems?.[id]||0)>0).map(([id,it])=>({key:'material:'+id,kind:'material',id,item:it,count:s.upgradeItems[id]})),
  ...[{id:'hp',count:s.potions},{id:'mp',count:s.mpPotions}].filter(x=>x.count>0).map(x=>({...x,key:'potion:'+x.id,kind:'potion'})),
  ...FASHION_ITEMS.filter(it=>s.fashion?.owned?.includes(it.id)).map(it=>({key:'fashion:'+it.id,kind:'fashion',id:it.id,item:it,count:1}))
 ];
}
export const inventoryKey=s=>JSON.stringify([s.bag,s.equip,s.upgradeItems,s.potions,s.mpPotions,s.fashion,s.gold,s.stones,s.bountyHeads,s.bountyRemainder,s.expTickets,s.expBoost]);

