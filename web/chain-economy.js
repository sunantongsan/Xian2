// COCKRO test economy: balances remain server-owned, no blockchain transfers.
export const COSTS=[100,200,350,600,1000,1600,2500,4000,6000,10000,16000,25000];
export const SUCCESS=[100,90,85,80,75,65,55,45,35,25,20,15];
export const PRACTICE=[5,10,20,40,80,120,200,300,450,600,800,1000];
export const COIN_CAP=1e12;
export const trainingPoints=s=>Math.max(0,(Math.floor(s.level||1)-1)*5);
export function normalizeEconomy(s,v=s){s.protectionTickets=Number.isSafeInteger(v.protectionTickets)?Math.max(0,Math.min(5,v.protectionTickets)):0;s.onlineRewardHalf= v.onlineRewardHalf===1?1:0;return s;}
export function enhance(s,it,useProtection=false,rng=Math.random){
 const p=it?.plus||0,cost=COSTS[p];
 if(!it||!Number.isInteger(p)||p<0||p>=12||!Number.isSafeInteger(s.stones)||s.stones<cost||useProtection&&!(s.protectionTickets>0))return false;
 const roll=rng();if(!Number.isFinite(roll)||roll<0||roll>=1)return false;
 const success=roll<(SUCCESS[p]+(useProtection?5:0))/100;
 s.stones-=!success&&useProtection?1:cost;
 if(useProtection)s.protectionTickets--;
 if(success){
  // Conditional position within the successful interval is uniform.
  const fraction=roll/Math.min(1,(SUCCESS[p]+(useProtection?5:0))/100);
  it.plus=p+1;
  it.forgeBonus=(it.forgeBonus||0)+1+Math.floor(fraction*5);
 }
 it.upgradeFails=0;
 return {success,cost:!success&&useProtection?1:cost,protected:useProtection};
}
export const onlineRate=count=>count<100?5:count<1000?2.5:count<100000?1:.5;
// Half-coin remainder avoids losing fractional rewards in legacy integer balances.
export function creditOnlineMinute(s,count){const half=(s.onlineRewardHalf||0)+onlineRate(count)*2,coins=Math.floor(half/2);if(s.stones+coins>COIN_CAP)return false;s.stones+=coins;s.onlineRewardHalf=half%2;return true;}

export const PROTECTION_PRICE=50,PROTECTION_CAP=5;
export function buyProtectionTicket(s,quantity=1){
 const owned=s.protectionTickets??0;
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>PROTECTION_CAP||!Number.isSafeInteger(owned)||owned<0||owned+quantity>PROTECTION_CAP||!Number.isSafeInteger(s.stones)||s.stones<PROTECTION_PRICE*quantity)return false;
 s.stones-=PROTECTION_PRICE*quantity;s.protectionTickets=owned+quantity;return true;
}
