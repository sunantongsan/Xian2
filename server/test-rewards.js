import {rewardTarget,deliverReward} from './reward-target.js';
import {randomBytes} from 'node:crypto';
import {UPGRADE_ITEMS} from '../web/upgrade-items.js';
// Explicit internal-test grants only. These are not Google-verified SSV rewards.
export function issueTestTicket(s,item,now=Date.now()){
 if(item==='dailyCheckin')throw Error('verified_ad_required');
 const restore=rewardTarget(s,item,now);
 s.adTickets=(s.adTickets||[]).filter(t=>t.created>now-86400000);
 const recent=s.adTickets.filter(t=>t.kind==='demo');
 const pending=recent.find(t=>!t.transaction&&t.item===item&&now-t.created<3600000);
 if(pending&&JSON.stringify(pending.restore)===JSON.stringify(restore))return pending;
 if(recent.length>=20)throw Error('test_limit');
 const t={kind:'demo',nonce:randomBytes(24).toString('hex'),item,restore,created:now};s.adTickets.push(t);return t;
}
export function completeTestTicket(s,nonce,now=Date.now()){
 const t=s.adTickets?.find(t=>t.kind==='demo'&&t.nonce===nonce);
 if(!t||now-t.created>3600000)throw Error('invalid_test_ticket');
 if(t.transaction)return {item:t.item,duplicate:true};
 deliverReward(s,t,now);t.transaction='demo:'+nonce;
 return {item:t.item,duplicate:false};
}
