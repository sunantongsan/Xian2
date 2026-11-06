import {t,ui} from './i18n.js';
// Promotional catalog; the checkout price is always supplied by Google Play.
export const GOLD_PRODUCTS=[
 {id:'cockro_gold_5000',gold:5000,thb:30,get title(){return t('เริ่มต้นฮีโร่');}},
 {id:'cockro_gold_20000',gold:20000,thb:100,get title(){return t('เสริมพลัง');}},
 {id:'cockro_gold_150000',gold:150000,thb:500,get title(){return t('ยอดนักรบ');}},
 {id:'cockro_gold_500000',gold:500000,thb:1000,get title(){return t('พลังระดับเทพ');}}
];
