import {t,ui} from './i18n.js';
export function rewardAdBlockReason({supported,state={},online,enabled,testRewards,pending,item}){
 if(pending)return t('กำลังรอโฆษณาหรือยืนยันรางวัล กรุณารอสักครู่');
 if(!supported)return t('แอปรุ่นนี้ยังเชื่อมต่อโฆษณาไม่ได้ กรุณาอัปเดตแอปจาก Play Store แล้วเปิดใหม่');
 if(!online)return t('การเชื่อมต่อออนไลน์ขาด กรุณารอเชื่อมต่อใหม่');
 if(state.test&&(item==='dailyCheckin'||item==='dailyCheckinTriple'))return t('โฆษณาทดสอบใช้รับรางวัลเช็กอินไม่ได้ ต้องใช้แอปรุ่นโฆษณาจริง');
 if(state.test?!testRewards:!enabled)return t('เซิร์ฟเวอร์ยังไม่เปิดรับรางวัลโฆษณา กรุณาลองใหม่ภายหลัง');
 if(!state.ready)return state.diagnostic||t('ระบบโฆษณาในแอปยังไม่พร้อม กำลังตรวจสถานะ กรุณาลองอีกครั้ง');
 return '';
}
