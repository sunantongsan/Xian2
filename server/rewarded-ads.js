import {rewardTarget,deliverReward} from './reward-target.js';
import {randomBytes,verify} from 'node:crypto';
import {UPGRADE_ITEMS} from '../web/upgrade-items.js';
const TTL=3600000, RETENTION=86400000;
// Only Google-signed callbacks can consume these server-created tickets.
export function issueRewardTicket(s,item,now=Date.now(),checkinDivisor=1){
 const restore=rewardTarget(s,item,now,checkinDivisor);
 const tickets=(s.adTickets||[]).filter(t=>t.created>now-RETENTION);
 // A failed load has no SSV callback. Pending tickets must not impose a retry cooldown.
 // Each attempt has a unique nonce; signed transaction verification below prevents duplicate grants.
 if(tickets.length>=100)throw Error('ad_limit');
 const ticket={nonce:randomBytes(24).toString('hex'),item,restore,created:now};
 s.adTickets=[...tickets,ticket];return ticket;
}
export function applyVerifiedReward(s,params,now=Date.now()){
 const ticket=s.adTickets?.find(t=>t.nonce===params.custom_data);
 if(!ticket||ticket.kind==='demo')throw Error('unknown_ticket');
 if(ticket.transaction){if(ticket.transaction===params.transaction_id)return false;throw Error('used_ticket');}
 const stamp=Number(params.timestamp);
 if(!Number.isFinite(stamp)||stamp<ticket.created-60000||stamp>ticket.created+TTL||stamp>now+60000||now-stamp>RETENTION)throw Error('expired_reward');
 if(!/^[\w.-]{1,200}$/.test(params.transaction_id||'')||s.adTickets.some(t=>t.transaction===params.transaction_id))throw Error('duplicate_transaction');
 deliverReward(s,ticket,now);
 ticket.transaction=params.transaction_id;return true;
}
export function createSSVVerifier({fetchKeys=()=>fetch('https://www.gstatic.com/admob/reward/verifier-keys.json',{signal:AbortSignal.timeout(5000)}),unit}={}){
 let cache=new Map(),fetched=0,inflight;
 async function refresh(){if(!inflight)inflight=(async()=>{const r=await fetchKeys();if(!r.ok)throw Error('keys_unavailable');const json=await r.json();const next=new Map(json.keys.map(k=>[String(k.keyId),k.pem]));if(!next.size)throw Error('keys_unavailable');cache=next;fetched=Date.now();})().finally(()=>inflight=null);return inflight;}
 return async raw=>{
  if(!unit||unit.includes('3940256099942544'))throw Error('ads_disabled');
  if(raw.length>4096)throw Error('invalid_callback');
  const match=/^(.+)&signature=([A-Za-z0-9_%=-]+)&key_id=(\d+)$/.exec(raw);
  if(!match)throw Error('invalid_signature');
  const [,content,signature,keyId]=match,params=new URLSearchParams(content),seen=new Set();
  for(const [key] of params){if(seen.has(key)||['signature','key_id'].includes(key))throw Error('duplicate_parameter');seen.add(key);}
  if(Date.now()-fetched>RETENTION||!cache.has(keyId)&&Date.now()-fetched>60000)await refresh();
  const key=cache.get(keyId);if(!key||!verify('sha256',Buffer.from(content),key,Buffer.from(decodeURIComponent(signature),'base64url')))throw Error('invalid_signature');
  const p=Object.fromEntries(params);
  // Console probes only verify the signed callback; they never enter the reward path.
  if(p.user_id==='0'.repeat(64)&&p.custom_data==='0'.repeat(48))return p;
  if(p.ad_unit!==unit.split('/').at(-1)&&p.ad_unit!==unit)throw Error('wrong_ad_unit');
  if(p.reward_amount!=='1'||p.reward_item!=='item')throw Error('wrong_reward');
  if(!/^[a-f0-9]{64}$/.test(p.user_id||'')||!/^[a-f0-9]{48}$/.test(p.custom_data||''))throw Error('invalid_reward_identity');
  return p;
 };
}


