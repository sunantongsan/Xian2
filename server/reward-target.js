import {isAdBoost,grantAdBoost} from '../web/ad-rewards.js';
import {SKILL_BOOKS} from '../web/skills.js';
import {checkinStatus,claimCheckin,claimVerifiedTripleCheckin} from '../web/checkin.js';
import {UPGRADE_ITEMS} from '../web/upgrade-items.js';
import {restoreTarget,restoreSpecial} from '../web/enhancement.js';
import {HUNTER_BOOST_MINUTES} from '../web/core.js';
export function rewardTarget(s,item,now=Date.now(),divisor=1){
 if(isAdBoost(item))return null;
 if(item==='protectionTicket'){if((s.protectionTickets||0)>=5)throw Error('inventory_full');return null;}
 if(item==='dailyCheckinTriple'){
  const status=checkinStatus(s,now);if(status.claimed)throw Error('already_claimed');
  return {day:status.today,streak:status.day,divisor};
 }
 if(item==='dailyCheckin'){const status=checkinStatus(s,now);if(status.claimed)throw Error('already_claimed');return {day:status.today,divisor};}
 if(typeof item==='string'&&item.startsWith('restore:')){const target=restoreTarget(s,item.slice(8));if(!target)throw Error('invalid_reward');return target;}
 if(!Object.hasOwn(UPGRADE_ITEMS,item)||(s.upgradeItems?.[item]||0)>=99999)throw Error('invalid_reward');return null;
}
export function deliverReward(s,t,now=Date.now()){
 if(isAdBoost(t.item)){grantAdBoost(s,t.item,now);if(t.item==='skillTrial')fillTrialSkills(s);return;}
 if(t.item==='protectionTicket'){if((s.protectionTickets||0)>=5)throw Error('inventory_full');s.protectionTickets=(s.protectionTickets||0)+1;return;}
 if(t.item==='dailyCheckinTriple'){claimVerifiedTripleCheckin(s,t.restore);return;}
 if(t.item==='dailyCheckin'){const day=t.restore?.day;if(!Number.isSafeInteger(day))throw Error('invalid_reward');if(s.checkin?.lastDay>=day)return;const amount=claimCheckin(s,day*86400000-7*3600000,t.restore.divisor??1);if(!amount)throw Error('checkin_unavailable');return;}
 if(t.item.startsWith('restore:')){if(!restoreSpecial(s,t.restore))throw Error('restore_expired');return;}
 if(!Object.hasOwn(UPGRADE_ITEMS,t.item)||(s.upgradeItems[t.item]||0)>=99999)throw Error('inventory_full');s.upgradeItems[t.item]=(s.upgradeItems[t.item]||0)+1;
}


// Trial skills go into empty slots so they can be cast at once.
function fillTrialSkills(s){if(!Array.isArray(s.equipped))return;for(const b of SKILL_BOOKS){if(s.equipped.includes(b.id))continue;const i=s.equipped.findIndex(x=>!x);if(i<0)break;s.equipped[i]=b.id;}}
