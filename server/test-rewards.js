import {randomBytes} from 'node:crypto';
import {UPGRADE_ITEMS} from '../web/upgrade-items.js';
// Explicit internal-test grants only. These are not Google-verified SSV rewards.
export function issueTestTicket(s,item,now=Date.now()){
 if(!Object.hasOwn(UPGRADE_ITEMS,item))throw Error('invalid_reward');
 s.adTickets=(s.adTickets||[]).filter(t=>t.created>now-86400000);
 const recent=s.adTickets.filter(t=>t.kind==='demo');
 const pending=recent.find(t=>!t.transaction&&t.item===item&&now-t.created<3600000);
 if(pending)return pending;
 if(recent.length>=20)throw Error('test_limit');
 const t={kind:'demo',nonce:randomBytes(24).toString('hex'),item,created:now};s.adTickets.push(t);return t;
}
export function completeTestTicket(s,nonce,now=Date.now()){
 const t=s.adTickets?.find(t=>t.kind==='demo'&&t.nonce===nonce);
 if(!t||now-t.created>3600000)throw Error('invalid_test_ticket');
 if(t.transaction)return {item:t.item,duplicate:true};
 if(!Object.hasOwn(UPGRADE_ITEMS,t.item)||(s.upgradeItems[t.item]||0)>=99999)throw Error('inventory_full');
 s.upgradeItems[t.item]=(s.upgradeItems[t.item]||0)+1;t.transaction='demo:'+nonce;
 return {item:t.item,duplicate:false};
}
