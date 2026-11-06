import {EN} from './locales/en.js';
import {createLanguage} from './language.js';
export const language = createLanguage({
  storage: typeof localStorage === 'undefined' ? undefined : localStorage,
  deviceLocale: typeof window === 'undefined' ? 'th' : navigator.language,
  onChange(value) { if (typeof document !== 'undefined') document.documentElement.lang = value; }
});
export const messages = {
 'ตั้งค่า':'Settings', 'ภาษา':'Language', 'กลับ':'Back', 'บันทึก':'Save', 'ยกเลิก':'Cancel',
 'เสียง: เปิด':'Sound: On', 'เสียง: ปิด':'Sound: Off', 'ภาพ: ประหยัดเครื่อง':'Graphics: Low', 'ภาพ: อัตโนมัติ':'Graphics: Auto',
 'เปลี่ยนตัวละคร':'Switch character', 'จัดการบัญชี / ประวัติเติมเงิน':'Account / Purchase history', 'ความเป็นส่วนตัว':'Privacy',
 'กำลังบันทึกภาษา…':'Saving language…', 'บันทึกภาษาแล้ว':'Language saved', 'บันทึกภาษาบนบัญชีไม่สำเร็จ กรุณาลองใหม่':'Could not save account language. Please retry.',
 'กลับไปเลือกตัวละคร':'Back to character selection', 'เลือกตัวละคร':'Choose character', 'สร้างตัวละคร':'Create character', 'ลบตัวละคร':'Delete character',
 'จัดการบัญชี':'Account', 'เล่น':'Play', 'ลองใหม่':'Retry', 'ลองอีกครั้ง':'Retry', 'เข้าสู่ระบบ / เชื่อมบัญชี Google':'Sign in / Link Google account',
 'กรุณาตั้งชื่อ':'Choose a name', 'ชื่อตัวละคร':'Character name', 'ยืนยันชื่อ':'Confirm name', 'ตั้งชื่อ 2–20 ตัวอักษร':'Enter a name (2–20 characters)',
 'กรุณาตั้งชื่อ 2–20 ตัวอักษร':'Please enter a name (2–20 characters)', 'ออนไลน์':'Online', 'ออฟไลน์':'Offline',
 'ศูนย์บัญชาการฮีโร่':'Hero command center', 'ฮีโร่และอุปกรณ์':'Hero and equipment', 'กระเป๋าแฟชั่น':'Wardrobe', 'แผนที่ภารกิจ':'World map',
 'ข้อมูลศัตรู':'Bestiary', 'ร้านเสบียง':'Supplies', 'คลังร่วม':'Shared vault', 'ร้านผู้เล่น':'Player shops', 'อัปเกรดอาวุธ':'Upgrade equipment',
 'ทักษะและพลัง':'Skills', 'ประวัติการต่อสู้':'Battle history', 'คู่มือฮีโร่':'Hero guide', 'กลับเข้าสนาม':'Resume',
 'ของขวัญ':'Gifts', 'เช็กอิน':'Check-in', 'สโตร์':'Store', 'กระเป๋า':'Inventory', 'คลัง':'Vault', 'แผนที่':'Map', 'สถานะ':'Stats', 'วิชา':'Skill',
 'ออกจากเกม':'Exit game', 'ล็อกเอาต์':'Log out', 'เมนู':'Menu', 'แชท':'Chat', 'กลับยาน':'Return to ship',
 'ออโต้: ปิด':'Auto: Off', 'ออโต้: เปิด':'Auto: On', 'โจมตี':'Attack', 'ป้องกัน':'Defense', 'คริติคอล':'Critical', 'ความเร็ว':'Speed',
 'รับรางวัล':'Claim reward', 'รับแล้ว':'Claimed', 'สวมใส่':'Equip', 'ถอดออก':'Unequip', 'ทั้งหมด':'All', 'อุปกรณ์':'Equipment',
 'วัตถุดิบ':'Materials', 'ยา':'Potions', 'แฟชั่น':'Fashion', 'พลังงาน':'Energy', 'หมวก':'Hat', 'ชุด':'Outfit',
 'อาวุธ':'Weapon', 'หมวกเกราะ':'Helmet', 'เกราะอก':'Armor', 'ถุงมือ':'Gloves', 'รองเท้า':'Boots', 'ปีกพลังงาน':'Energy wings', 'แหวน':'Ring', 'สร้อยพลัง':'Necklace',
 'แมงสาบแมน':'COCKRO MAN', 'แมงป่องแมน':'SCORPION MAN', 'แมลงปอเกิล':'DRAGONFLY GIRL', 'จิ้งหรีดแมน':'CRICKET MAN',
 'กำลังเชื่อมต่อ…':'Connecting…', 'เชื่อมต่อขัดข้อง':'Connection error', 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ':'Could not connect to server',
 'กรุณาเข้าสู่ระบบ Google อีกครั้ง':'Please sign in with Google again', 'ห้องเต็ม กรุณาลองใหม่':'Server full. Please retry.',
 'การเชื่อมต่อขาด กรุณาลองใหม่':'Connection lost. Please retry.', 'ขาดการเชื่อมต่อ • กำลังลองใหม่':'Disconnected • Reconnecting',
 'กรุณาเปิดเกมใหม่เพื่อรับอัปเดตล่าสุด':'Restart the game to get the latest update', 'เงินไม่พอ':'Not enough money', 'กระเป๋าเต็ม':'Inventory full',
 'MP ไม่พอ':'Not enough MP', 'สกิลกำลังคูลดาวน์':'Skill is cooling down', 'กลับเมืองเพื่อใช้คลังและร้านค้า':'Return to town to use the vault and shops',
 'กำลังเตรียมดาวออโรรา…':'Preparing Aurora…', 'กำเนิดฮีโร่แมลง':'Rise of the Insect Heroes',
 'ลากจอยเพื่อเดิน • แตะศัตรูเพื่อล็อกเป้า':'Drag the joystick to move • Tap an enemy to target',
 'ต่อสู้ผู้เล่นได้ทุกพื้นที่ • ออฟไลน์แล้วตัวละครยังอยู่และใช้ยาป้องกันตัว':'PvP is enabled in all areas. Your character stays online and uses potions for defense while you are away.',
 'ประกาศ • ฝากไอเทมผ่านคลังร่วม เพื่อส่งให้ตัวละครอื่นในบัญชีเดียวกัน':'Notice • Use the shared vault to transfer items between characters on your account',
 'พื้นที่เกม':'Game area', 'จัดการตัวละคร':'Manage characters', 'ข้อมูลพื้นที่':'Area information', 'เปิดเมนูทางลัด':'Open shortcuts',
 'ของขวัญ เช็กอิน และแพ็กเกจ COCKRO':'Gifts, daily check-in and COCKRO packages', 'เช็กอินรับCOCKRO coin':'Check in for COCKRO coins',
 'เปิดกระเป๋า':'Open inventory', 'เปิดคลังร่วม':'Open shared vault', 'ซูมออก':'Zoom out', 'ซูมเข้า':'Zoom in', 'เปิดแชทในเกม':'Open chat',
 'บัฟหุ่นยนต์ AURA-01':'AURA-01 buff', 'จอยเดิน':'Movement joystick', 'ใช้ยา MP':'Use MP potion', 'ปิดหน้าต่าง':'Close window'
};
export const THAI_RUN = /[\u0e00-\u0e7f]+(?:[ \t]+[\u0e00-\u0e7f]+)*/g;
export const missingTranslations = new Set();
export function t(text) {
  if (typeof text !== 'string' || language.current !== 'en') return text;
  if (Object.hasOwn(messages,text)) return messages[text];
  return text.replace(THAI_RUN, (part,offset,whole) => {
    const translated = EN[part];
    if (translated === undefined) { missingTranslations.add(part); return part; }
    const before = offset > 0 && /[A-Za-z0-9]/.test(whole[offset-1]) ? ' ' : '';
    const after = /[A-Za-z0-9]/.test(whole[offset+part.length] || '') ? ' ' : '';
    return before + translated + after;
  });
}
// Only authored segments are translated; interpolated player data is untouched.
export function ui(parts,...values) {
  return parts.map((part,i)=>t(part)+(i<values.length?values[i]:'')).join('');
}
export const translateSegment=t;
export const formatLocale=()=>language.current==='th'?'th-TH':'en-US';
export function localizeStatic(root) {
  if (!root) return;
  const visit = node => {
    if (node.nodeType === 3) node.textContent = translateSegment(node.textContent);
    else if (node.nodeType === 1 && !['SCRIPT','STYLE'].includes(node.tagName)) {
      for (const attr of ['aria-label','title','placeholder']) if (node.hasAttribute(attr)) node.setAttribute(attr, translateSegment(node.getAttribute(attr)));
      for (const child of node.childNodes) visit(child);
    }
  };
  visit(root);
}

// These protocol messages contain server-authored notices only. Never process chat.
export function localizeNotice(packet) {
 if (['opResult','commerceResult','billingResult','adError'].includes(packet?.type) && typeof packet.message === 'string') return {...packet,message:t(packet.message)};
 return packet;
}
