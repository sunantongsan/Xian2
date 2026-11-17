// Campaign narrative, compact hub and action-based onboarding; no server state.
export const GUIDE_UV=[.50,.405];
export const STORY_TOWN={id:'story-town',name:'หมู่บ้านแสงดาว',image:'maps/thung-kula-town.webp',width:1600,height:1066,spawn:[.50,.60],walk:[[[.30,.355],[.70,.355],[.70,.70],[.30,.70]]],pois:[
 {uv:GUIDE_UV,name:'แสงดาว • เควส / วาร์ป',action:'mutation'},
 {uv:[.35,.51],name:'พ่อค้า • ยาและเสบียง',action:'shop'},
 {uv:[.65,.51],name:'ช่างตีอาวุธ • อัปเกรด',action:'forge'}]};
const chapters=[
 ['รอยแสงที่ตกจากฟ้า','เมื่อคืนแสงสีทองตกลงเหนือทุ่งกุลา คาราวานของเราหายไปพร้อมแผนที่สมบัติ COCKRO ช่วยเปิดเส้นทางและหาเสบียงให้หมู่บ้านก่อน','เราเปิดทางออกจากหมู่บ้านได้แล้ว รอยล้อคาราวานพาไปยังทุ่งถัดไป','#4dbea0'],
 ['ตามรอยคาราวาน','เครื่องนำทางของคาราวานแตกกระจาย มอนสเตอร์กำลังเฝ้าชิ้นส่วนอยู่ รวบรวมมันแล้วเราจะรู้ว่าคนเดินทางไปทางไหน','เครื่องนำทางชี้ไปยังเกราะโบราณ บางอย่างกำลังปกป้องมัน','#e5af51'],
 ['ความลับเกราะแมลง','ช่างพบว่าเกราะแมลงตอบสนองต่อผลึกในทุ่ง ตามหาผลึกและบันทึกเก่าเพื่อไขความลับของพลังนี้','บันทึกเผยว่ามีแผนที่ถูกแบ่งออกหลายส่วน เราต้องตามหาให้ครบ','#77afdf'],
 ['แผนที่ที่หายไป','แผนที่ถูกฉีกและซ่อนไว้ตามเส้นทางที่ถูกลืม กำจัดผู้เฝ้าแล้วนำชิ้นส่วนกลับมาประกอบที่หมู่บ้าน','แผนที่สมบูรณ์แล้ว! แต่เส้นทางสู่ประตูถูกผนึกด้วยแสงปีกแก้ว','#c998cf'],
 ['คำสัญญาของปีกแก้ว','แสงปีกแก้วคือกุญแจสู่ประตูสมบัติ รวบรวมเศษปีกและผลึก แล้วผ่านบททดสอบของราชินี','ราชินียอมเปิดทางให้เรา เหลือเพียงตราประตูและผู้พิทักษ์คนสุดท้าย','#6dcacb'],
 ['ประตู COCKRO','สมบัติอยู่ใกล้แล้ว ตามหาตราประตูทั้งสองชิ้น แล้วพิสูจน์ความกล้าต่อผู้เฝ้าประตู COCKRO','ประตูเปิดออก แสง COCKRO กลับมาสู่หมู่บ้าน ทุกคนจดจำการเดินทางของคุณ! จบบทแรก — ย้อนเล่นด่านเพื่อหาชุดแมลงได้','#efab7e']
];
export function questText(stage){const c=chapters[Math.floor((stage.id-1)/5)];return {chapter:c[0],intro:c[1],outro:stage.id%5===0?c[2]:stage.kind==='collect'?`ได้${stage.item}แล้ว! แสงดาวจะเก็บไว้ใช้ตามรอยคาราวาน`:'เส้นทางนี้ปลอดภัยแล้ว กลับมาเตรียมตัวสำหรับภารกิจต่อไป',color:c[3],objective:stage.kind==='collect'?`ปราบศัตรู ${stage.encounters.length} ตัว และเก็บ${stage.item} ${stage.objects.length} ชิ้น`:stage.kind==='boss'?'ปราบผู้พิทักษ์และมอนสเตอร์ทั้งหมด':`ปราบมอนสเตอร์ขวางทาง ${stage.encounters.length} ตัว`};}
export const tutorialText=[
 ['ก้าวแรกในหมู่บ้าน','แตะข้อความภารกิจด้านบน ตัวละครจะเดินไปหาไกด์และรับเควสให้เอง'],
 ['พบแสงดาว','แตะข้อความภารกิจเพื่อรับเควสและออกเดินทางอัตโนมัติ'],
 ['เปิดเส้นทาง','แตะภารกิจเพื่อเดินและต่อสู้อัตโนมัติ ใช้สกิลและยาที่มีให้เอง'],
 ['กลับมารับรางวัล','แตะภารกิจเพื่อกลับไปส่งเควสและรับรางวัลกับแสงดาว'],
 ['เตรียมอาวุธ','แตะภารกิจเพื่อเดินไปอัปเกรดอาวุธ +1 ใช้ 500 G และโลหะ 1 ชิ้น'],
 ['เรียนรู้การเก็บของ','แตะภารกิจเพื่อเข้าด่าน 2 ตัวละครจะต่อสู้และเก็บสมุนไพรให้เอง']
];
export function tutorialPhase(state){return state.tutorial??(state.cleared.length?6:0);}
export function tutorialEvent(state,event){const p=tutorialPhase(state),expected=['walk','talk','finish','claim','upgrade','collect'];if(p>=6||event!==expected[p])return false;state.tutorial=p+1;return true;}
export function canEnterQuest(state,id){const phase=tutorialPhase(state);return phase>=2&&(id===1||phase>=5);}
export function openTreasure(state,save,stage){const r=state.active;if(!r||r.stage!==stage.id||r.complete||r.treasure)return false;r.treasure=true;save.gold=Math.min(1e10,save.gold+60+stage.id*12);save.potions=Math.min(99999,save.potions+1);return true;}
