import {UPGRADE_ITEMS} from '../web/upgrade-items.js';
import {restoreTarget,restoreSpecial} from '../web/enhancement.js';
export function rewardTarget(s,item){
 if(typeof item==='string'&&item.startsWith('restore:')){const target=restoreTarget(s,item.slice(8));if(!target)throw Error('invalid_reward');return target;}
 if(!Object.hasOwn(UPGRADE_ITEMS,item)||(s.upgradeItems?.[item]||0)>=99999)throw Error('invalid_reward');return null;
}
export function deliverReward(s,t){
 if(t.item.startsWith('restore:')){if(!restoreSpecial(s,t.restore))throw Error('restore_expired');return;}
 if(!Object.hasOwn(UPGRADE_ITEMS,t.item)||(s.upgradeItems[t.item]||0)>=99999)throw Error('inventory_full');s.upgradeItems[t.item]=(s.upgradeItems[t.item]||0)+1;
}
