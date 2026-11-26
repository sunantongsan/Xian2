import {thb} from './token-economy.js';
import {t,ui} from './i18n.js';
export const EXP_DURATION=3600000;
export const EXP_TICKETS=Object.freeze({
 x2:{get name(){return t('ตั๋ว EXP ×2');},multiplier:2,price:thb(2)},
 x5:{get name(){return t('ตั๋ว EXP ×5');},multiplier:5,price:thb(5)},
 x10:{get name(){return t('ตั๋ว EXP ×10');},multiplier:10,price:thb(10)}
});
// 7.8.4: EXP tickets are retired; only the ad EXP x5 boost remains. Unused tickets are
// refunded at their shop price (returns the refund; callers book it as minted coins).
export function normalizeExpTickets(s,v=s,now=Date.now()){
 let refund=0;for(const [id,it] of Object.entries(EXP_TICKETS)){const n=Number.isSafeInteger(v.expTickets?.[id])?Math.max(0,Math.min(99999,v.expTickets[id])):0;refund+=n*it.price;}
 s.expTickets={};s.expBoost=null;return refund;
}
export function expBoostUntil(s,now=Date.now()){return s.adExpUntil>now?s.adExpUntil:0;}
export function expMultiplier(s,now=Date.now()){return s.adExpUntil>now?5:1;}
export function buyExpTicket(){return false;}
export function useExpTicket(){return false;}
