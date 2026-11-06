import {t,ui} from './i18n.js';
export const EXP_DURATION=3600000;
export const EXP_TICKETS=Object.freeze({
 x2:{get name(){return t('ตั๋ว EXP ×2');},multiplier:2,price:50000},
 x5:{get name(){return t('ตั๋ว EXP ×5');},multiplier:5,price:150000},
 x10:{get name(){return t('ตั๋ว EXP ×10');},multiplier:10,price:350000}
});
export function normalizeExpTickets(s,v=s,now=Date.now()){
 s.expTickets=Object.fromEntries(Object.keys(EXP_TICKETS).map(id=>[id,Number.isSafeInteger(v.expTickets?.[id])?Math.max(0,Math.min(99999,v.expTickets[id])):0]));
 const b=v.expBoost;s.expBoost=b&&Object.hasOwn(EXP_TICKETS,b.id)&&Number.isFinite(b.until)&&b.until>now?{id:b.id,until:Math.min(b.until,now+EXP_DURATION)}:null;
}
export function expMultiplier(s,now=Date.now()){return s.expBoost?.until>now?EXP_TICKETS[s.expBoost.id]?.multiplier||1:1;}
export function buyExpTicket(s,id){
 if(!Object.hasOwn(EXP_TICKETS,id))return false;const it=EXP_TICKETS[id];
 if(!Number.isFinite(s.gold)||s.gold<it.price||(s.expTickets?.[id]||0)>=99999)return false;
 s.expTickets??={};s.gold-=it.price;s.expTickets[id]=(s.expTickets[id]||0)+1;return true;
}
export function useExpTicket(s,id,replaceUntil=0,now=Date.now()){
 if(!Object.hasOwn(EXP_TICKETS,id)||!Number.isSafeInteger(s.expTickets?.[id])||s.expTickets[id]<1)return false;
 // A replacement must confirm the exact active boost; repeated requests cannot burn tickets.
 if(s.expBoost?.until>now&&replaceUntil!==s.expBoost.until)return false;
 s.expTickets[id]--;s.expBoost={id,until:now+EXP_DURATION};return true;
}
