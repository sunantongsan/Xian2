export const ONLINE_URL='wss://game.guardscan.xyz/online/world';
const KEY='cockro-online-device-token-v1';
export class OnlineClient {
 constructor(onState,onStatus){this.onState=onState;this.onStatus=onStatus;this.socket=null;this.ready=false;this.sequence=0;this.lastSend=0;this.events=0;this.players=[];this.active=false;this.retries=0;}
 connect(hero){this.hero=hero;this.active=true;return new Promise((resolve,reject)=>{let token;try{token=localStorage.getItem(KEY);}catch{reject(Error('ไม่สามารถเก็บบัญชีบนเครื่องนี้ได้'));return;}const ws=new WebSocket(ONLINE_URL);this.socket=ws;this.onStatus('กำลังเชื่อมต่อ…');const timeout=setTimeout(()=>{ws.close();reject(Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ'));},10000);
  ws.onopen=()=>ws.send(JSON.stringify({type:'hello',version:'cockro-online-1',token,create:!token,hero}));
  ws.onmessage=e=>{let d;try{d=JSON.parse(e.data);}catch{return;}if(d.type==='welcome'){try{if(d.token)localStorage.setItem(KEY,d.token);}catch{ws.close();clearTimeout(timeout);reject(Error('บันทึกบัญชีไม่สำเร็จ'));return;}this.ready=true;this.retries=0;clearTimeout(timeout);resolve(d.save);}else if(d.type==='state'){this.ready=true;this.players=d.players;this.onStatus(`ออนไลน์ ${d.online}/12 คน`);this.onState(d);}else if(d.type==='error'){const messages={already_online:'บัญชีนี้เปิดออนไลน์อยู่อีกหน้าต่างแล้ว',room_full:'ห้องเต็ม กรุณาลองใหม่',account_missing:'ไม่พบบัญชีออนไลน์ กรุณาติดต่อผู้ดูแล',save_unavailable:'เซิร์ฟเวอร์บันทึกไม่ได้ กรุณาลองใหม่'};this.onStatus(messages[d.message]||'เชื่อมต่อขัดข้อง');if(!this.ready){clearTimeout(timeout);this.active=false;reject(Error(messages[d.message]||'เชื่อมต่อขัดข้อง'));}}};
  ws.onerror=()=>{};ws.onclose=()=>{clearTimeout(timeout);const wasReady=this.ready;this.ready=false;this.players=[];if(this.active){this.onStatus('ขาดการเชื่อมต่อ • กำลังลองใหม่');if(wasReady||this.retries>0){const delay=Math.min(15000,1000*2**this.retries++);this.timer=setTimeout(()=>this.connect(this.hero).then(()=>this.onReconnect?.()).catch(()=>{}),delay);}else reject(Error('เชื่อมต่อออนไลน์ไม่ได้ กรุณาลองใหม่'));}};
 });}
 send(data){if(this.ready&&this.socket?.readyState===1&&this.socket.bufferedAmount<65536)this.socket.send(JSON.stringify(data));}
 move(p){const now=performance.now();if(now-this.lastSend<100)return;this.lastSend=now;this.send({type:'move',x:p.x,y:p.y,seq:++this.sequence});}
 disconnect(){this.active=false;this.ready=false;clearTimeout(this.timer);this.socket?.close();this.players=[];}
}
