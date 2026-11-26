// Rewarded-ad boosts (7.6.0). Unlimited views; each view adds its duration on top of the
// time left. Rewards never grant COCKRO directly.
import {t} from './i18n.js';
export const AD_BOOSTS=Object.freeze({
 hunterBoost:{key:'hunterBoostUntil',minutes:30,get name(){return t('บัฟนักรบ');},get desc(){return t('โจมตีและป้องกัน ×2');}},
 divineTrial:{key:'divineTrialUntil',minutes:30,get name(){return t('อาวุธเทพชั่วคราว');},get desc(){return t('ใช้อาวุธเทพตามขั้นเลเวลของคุณ');}},
 skillTrial:{key:'skillTrialUntil',minutes:20,get name(){return t('ทดลองสกิลทุกวิชา');},get desc(){return t('ใช้หนังสือสกิลทั้ง 8 เล่มได้');}},
 expTrial:{key:'adExpUntil',minutes:30,get name(){return t('EXP ×5');},get desc(){return t('ค่าประสบการณ์จากมอนสเตอร์ ×5');}}
});
export const isAdBoost=item=>Object.hasOwn(AD_BOOSTS,item);
export const boostActive=(s,item,now=Date.now())=>(s?.[AD_BOOSTS[item].key]||0)>now;
export function grantAdBoost(s,item,now=Date.now()){
 const b=AD_BOOSTS[item];if(!b)return false;
 s[b.key]=Math.min(Math.max(s[b.key]||0,now)+b.minutes*60000,now+24*3600000);return true;
}
