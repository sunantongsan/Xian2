import {checkinStatus,claimCheckin} from '../web/checkin.js';
import {UPGRADE_ITEMS} from '../web/upgrade-items.js';
import {restoreTarget,restoreSpecial} from '../web/enhancement.js';
export function rewardTarget(s,item,now=Date.now()){
 if(item==='protectionTicket'){if((s.protectionTickets||0)>=5)throw Error('inventory_full');return null;}
 if(item==='dailyCheckin'){const status=checkinStatus(s,now);if(status.claimed)throw Error('already_claimed');return {day:status.today};}
 if(typeof item==='string'&&item.startsWith('restore:')){const target=restoreTarget(s,item.slice(8));if(!target)throw Error('invalid_reward');return target;}
 if(!Object.hasOwn(UPGRADE_ITEMS,item)||(s.upgradeItems?.[item]||0)>=99999)throw Error('invalid_reward');return null;
}
export function deliverReward(s,t,now=Date.now()){
 if(t.item==='protectionTicket'){if((s.protectionTickets||0)>=5)throw Error('inventory_full');s.protectionTickets=(s.protectionTickets||0)+1;return;}
 if(t.item==='dailyCheckin'){const day=t.restore?.day;if(!Number.isSafeInteger(day))throw Error('invalid_reward');if(s.checkin?.lastDay>=day)return;const amount=claimCheckin(s,day*86400000-7*3600000);if(!amount)throw Error('checkin_unavailable');return;}
 if(t.item.startsWith('restore:')){if(!restoreSpecial(s,t.restore))throw Error('restore_expired');return;}
 if(!Object.hasOwn(UPGRADE_ITEMS,t.item)||(s.upgradeItems[t.item]||0)>=99999)throw Error('inventory_full');s.upgradeItems[t.item]=(s.upgradeItems[t.item]||0)+1;
}

