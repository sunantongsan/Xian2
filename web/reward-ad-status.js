export function rewardAdBlockReason({supported,state={},online,enabled,testRewards,pending,item}){
 if(pending)return 'กำลังรอโฆษณาหรือยืนยันรางวัล กรุณารอสักครู่';
 if(!supported)return 'แอปรุ่นนี้ยังเชื่อมต่อโฆษณาไม่ได้ กรุณาอัปเดตแอปจาก Play Store แล้วเปิดใหม่';
 if(!online)return 'การเชื่อมต่อออนไลน์ขาด กรุณารอเชื่อมต่อใหม่';
 if(state.test&&item==='dailyCheckin')return 'โฆษณาทดสอบใช้รับรางวัลเช็กอินไม่ได้ ต้องใช้แอปรุ่นโฆษณาจริง';
 if(state.test?!testRewards:!enabled)return 'เซิร์ฟเวอร์ยังไม่เปิดรับรางวัลโฆษณา กรุณาลองใหม่ภายหลัง';
 if(!state.ready)return state.diagnostic||'ระบบโฆษณาในแอปยังไม่พร้อม กำลังตรวจสถานะ กรุณาลองอีกครั้ง';
 return '';
}
