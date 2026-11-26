import {thb} from './token-economy.js';
import {t,ui} from './i18n.js';
// Promotional catalog; the checkout price is always supplied by Google Play.
// `gold` is the launch-step amount (100,000 COCKRO per baht); the server credits the current presale step.
export const GOLD_PRODUCTS=[
 {id:'cockro_gold_5000',gold:thb(30),thb:30,get title(){return t('เริ่มต้นฮีโร่');}},
 {id:'cockro_gold_20000',gold:thb(100),thb:100,get title(){return t('เสริมพลัง');}},
 {id:'cockro_gold_150000',gold:thb(500),thb:500,get title(){return t('ยอดนักรบ');}},
 {id:'cockro_gold_500000',gold:thb(1000),thb:1000,get title(){return t('พลังระดับเทพ');}}
];
