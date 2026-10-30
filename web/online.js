export const ONLINE_URL='wss://game.guardscan.xyz/online/world';
const KEY='cockro-online-device-token-v1';
export class OnlineClient {
 constructor(onState,onStatus){this.onState=onState;this.onStatus=onStatus;this.socket=null;this.ready=false;this.sequence=0;this.lastSend=0;this.events=0;this.players=[];this.active=false;this.retries=0;}
 get hasAccount(){try{return !!localStorage.getItem(KEY);}catch{return false;}}
 async roster(){
  const token=localStorage.getItem(KEY);if(!token)return [];
  return new Promise((resolve,reject)=>{const ws=new WebSocket(ONLINE_URL);let done=false;
   const finish=(error,characters)=>{if(done)return;done=true;clearTimeout(timer);ws.close();error?reject(error):resolve(characters);};
   const timer=setTimeout(()=>finish(Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')),10000);
   ws.onopen=()=>ws.send(JSON.stringify({type:'hello',version:'cockro-online-2',token,preview:true}));
   ws.onmessage=e=>{let d;try{d=JSON.parse(e.data);}catch{return;}
    if(d.type==='roster')finish(null,d.characters);
    else if(d.type==='error')finish(Error(d.message==='account_missing'?'ไม่พบบัญชีเดิม กรุณาติดต่อผู้ดูแล':'โหลดตัวละครไม่สำเร็จ กรุณาลองใหม่'));
   };
   ws.onerror=()=>finish(Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'));
   ws.onclose=()=>{if(!done)finish(Error('การเชื่อมต่อขาด กรุณาลองใหม่'));};
  });
 }
 connect(hero){this.hero=hero;this.active=true;return new Promise((resolve,reject)=>{let token;try{token=localStorage.getItem(KEY);}catch{reject(Error('ไม่สามารถเก็บบัญชีบนเครื่องนี้ได้'));return;}const ws=new WebSocket(ONLINE_URL);this.socket=ws;this.onStatus('กำลังเชื่อมต่อ…');const timeout=setTimeout(()=>{ws.close();reject(Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'));},10000);
  ws.onopen=()=>ws.send(JSON.stringify({type:'hello',version:'cockro-online-2',token,create:!token,hero}));
  ws.onmessage=e=>{let d;try{d=JSON.parse(e.data);}catch{return;}if(d.type==='welcome'){try{if(d.token)localStorage.setItem(KEY,d.token);}catch{ws.close();clearTimeout(timeout);reject(Error('บันทึกบัญชีไม่สำเร็จ'));return;}this.ready=true;this.adsEnabled=d.adsEnabled===true;this.testRewards=d.testRewards===true;this.retries=0;clearTimeout(timeout);resolve(d.save);}else if(d.type==='state'){this.ready=true;this.players=d.players;this.onStatus(`ออนไลน์ ${d.online} คน`);this.onState(d);}else if(d.type==='opResult'){this.onOpResult?.(d);}else if(d.type==='adReward'){this.onAdReward?.(d);}else if(d.type==='adTicket'){this.onAdTicket?.(d);}else if(d.type==='adError'){this.onAdError?.(d.message);}else if(d.type==='error'){const messages={version_mismatch:'กรุณาเปิดเกมใหม่เพื่อรับอัปเดตล่าสุด',already_online:'บัญชีนี้เปิดออนไลน์อยู่อีกหน้าต่างแล้ว',room_full:'ห้องเต็ม กรุณาลองใหม่',account_missing:'ไม่พบบัญชีออนไลน์ กรุณาติดต่อผู้ดูแล',save_unavailable:'เซิร์ฟเวอร์บันทึกไม่ได้ กรุณาลองใหม่'};this.onStatus(messages[d.message]||'เชื่อมต่อขัดข้อง');if(!this.ready){clearTimeout(timeout);this.active=false;reject(Error(messages[d.message]||'เชื่อมต่อขัดข้อง'));}}};
  ws.onerror=()=>{};ws.onclose=()=>{clearTimeout(timeout);const wasReady=this.ready;this.ready=false;this.players=[];if(this.active){this.onStatus('ขาดการเชื่อมต่อ • กำลังลองใหม่');if(wasReady||this.retries>0){const delay=Math.min(15000,1000*2**this.retries++);this.timer=setTimeout(()=>this.connect(this.hero).then(()=>this.onReconnect?.()).catch(()=>{}),delay);}else reject(Error('เชื่อมต่อออนไลน์ไม่ได้ กรุณาลองใหม่'));}};
 });}
 send(data){if(this.ready&&this.socket?.readyState===1&&this.socket.bufferedAmount<65536){try{this.socket.send(JSON.stringify(data));return true;}catch{}}return false;}
 move(p){const now=performance.now();if(now-this.lastSend<100)return;this.lastSend=now;this.send({type:'move',x:p.x,y:p.y,seq:++this.sequence});}
 disconnect(){this.active=false;this.ready=false;clearTimeout(this.timer);this.socket?.close();this.players=[];}
}


