// The bridge reports ad UI state only. Inventory is updated by server snapshots.
export class RewardedAdsClient {
 constructor(onChange=()=>{}){this.state={ready:false,test:false,privacy:false};this.onChange=onChange;
  if(typeof window!=='undefined')window.addEventListener('cockro-ad',event=>{this.state={...this.state,...event.detail};this.onChange(this.state);});
 }
 get supported(){return typeof window!=='undefined'&&typeof window.CockroAds?.postMessage==='function';}
 send(data){if(!this.supported)return false;window.CockroAds.postMessage(JSON.stringify(data));return true;}
 refresh(){this.send({type:'status'});}
 show(ticket={}){return this.send({type:'show',nonce:ticket.nonce||'',user:ticket.user||''});}
 privacy(){return this.send({type:'privacy'});}
}
