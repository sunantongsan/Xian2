import {readFileSync} from 'node:fs';
import {GOLD_PRODUCTS} from '../web/gold-products.js';
const ENDPOINT='https://uzinxxeadejmzxqmqqtx.supabase.co/functions/v1/cockro-play-relay';
export function createPlayRelay({configPath=process.env.COCKRO_PLAY_RELAY_CONFIG,fetcher=fetch}={}){
 let config;try{config=JSON.parse(readFileSync(configPath,'utf8'));}catch{}
 const enabled=!!(config?.url===ENDPOINT&&/^[a-f0-9]{64}$/.test(config?.token));
 async function request(action,product,token){
  if(!enabled)throw Error('billing_unavailable');
  if(!GOLD_PRODUCTS.some(p=>p.id===product)||typeof token!=='string'||token.length<10||token.length>2048)throw Error('invalid_purchase');
  const r=await fetcher(ENDPOINT,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.token},body:JSON.stringify({action,product,token}),signal:AbortSignal.timeout(35000)});
  if(!r.ok)throw Error(r.status>=500?'verification_unavailable':'purchase_not_verified');
  const data=await r.json();if(action==='consume'){if(data.consumed!==true)throw Error('verification_unavailable');return;}
  if(!data.purchase||typeof data.purchase!=='object')throw Error('verification_unavailable');return data.purchase;
 }
 return {enabled,verify:(product,token)=>request('verify',product,token),consume:(product,token)=>request('consume',product,token)};
}
