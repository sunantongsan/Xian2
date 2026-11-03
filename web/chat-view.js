const CHANNELS={world:'ทั้งหมด',map:'แผนที่',whisper:'กระซิบ'};
const ERRORS={chat_rate_limit:'ส่งเร็วไปนิด รอสักครู่แล้วลองใหม่',invalid_text:'พิมพ์ข้อความ 1–200 ตัวอักษร',player_offline:'ไม่พบผู้เล่นออนไลน์ชื่อนี้',ambiguous_name:'ชื่อนี้ซ้ำกัน กรุณาแตะชื่อจากข้อความหรือแตะตัวละคร',self_whisper:'เลือกผู้เล่นคนอื่นเพื่อกระซิบ',invalid_channel:'กรุณาเลือกช่องแชท'};
export function createChatView({net,show,close,toast}){
 let channel='world',peer=null,unread=0,history=[],draft='',pending=false,pendingText='',timer,mutedOwner;
 const muted=new Set();
 const $=id=>document.getElementById(id),isOpen=()=>$('chatPanel')?.closest('dialog')?.open;
 function badge(){const b=$('chatUnread');if(b){b.hidden=!unread;b.textContent=unread>99?'99+':String(unread);}}
 function loadMuted(){if(mutedOwner===net.billingOwner)return;mutedOwner=net.billingOwner;muted.clear();try{for(const id of JSON.parse(localStorage.getItem('cockro-muted-'+net.billingOwner)||'[]').slice(0,100))if(typeof id==='string')muted.add(id);}catch{}}
 function saveMuted(){try{localStorage.setItem('cockro-muted-'+net.billingOwner,JSON.stringify([...muted]));}catch{}}
 function status(text){if($('chatStatus'))$('chatStatus').textContent=text;}
 function render(){
  const log=$('chatLog');if(!log)return;
  const nearBottom=log.scrollHeight-log.scrollTop-log.clientHeight<70,oldTop=log.scrollTop;
  log.replaceChildren();
  const rows=history.filter(m=>!muted.has(m.from)&&(channel==='world'||m.channel===channel)&&(channel!=='whisper'||!peer||m.from===peer.id||m.to===peer.id));
  if(!rows.length){const empty=document.createElement('p');empty.className='chat-empty';empty.textContent='เริ่มทักทายเพื่อนกันได้เลย';log.append(empty);}
  for(const m of rows){
   const row=document.createElement('div');row.className='chat-row chat-'+m.channel;
   const name=document.createElement('button');name.className='chat-name';name.textContent=(m.from===net.selfId?'คุณ':m.name)+(m.channel==='whisper'?' → '+(m.to===net.selfId?'คุณ':m.toName):'');
   name.onclick=()=>choosePeer(m.from===net.selfId?{id:m.to,name:m.toName}:{id:m.from,name:m.name});
   name.disabled=m.from===net.selfId&&!m.to;
   const label=document.createElement('small');label.textContent='['+CHANNELS[m.channel]+'] ';
   const body=document.createElement('span');body.textContent=m.text;
   row.append(label,name,body);log.append(row);
  }
  log.scrollTop=nearBottom?log.scrollHeight:oldTop;
 }
 function choosePeer(person){if(!person?.id)return;peer=person;channel='whisper';open();}
 function open(person){
  if(!net.ready){toast('รอเชื่อมต่อเกมก่อนเปิดแชท');return;}
  if(!net.chatEnabled){toast('แชทยังไม่พร้อม กรุณาเข้าเกมใหม่หลังอัปเดต');return;}
  if(person){peer=person;channel='whisper';}loadMuted();
  if($('chatInput'))draft=$('chatInput').value;
  show(`<section id="chatPanel" aria-label="แชทในเกม"><header class="chat-heading"><div><small>COCKRO COMMUNITY</small><h2>พูดคุย</h2></div><button id="chatMinimize" aria-label="ย่อแชท">ย่อ −</button></header><nav class="chat-tabs" aria-label="ช่องแชท">${Object.entries(CHANNELS).map(([id,label])=>`<button data-chat-channel="${id}" aria-pressed="${id===channel}">${label}</button>`).join('')}</nav><div id="chatRecipient" ${channel!=='whisper'?'hidden':''}><input id="chatTo" maxlength="20" placeholder="ชื่อตัวละครที่จะกระซิบ" aria-label="ผู้รับข้อความส่วนตัว" autocomplete="off"><button id="chatMute" ${!peer?'hidden':''}>ปิดเสียง</button></div><div id="chatLog" role="log" aria-label="ข้อความแชท" aria-live="polite" aria-relevant="additions"></div><form id="chatForm"><input id="chatInput" maxlength="400" enterkeyhint="send" autocomplete="off" placeholder="พิมพ์ข้อความ…" aria-label="ข้อความแชท"><button id="chatSend" type="submit">ส่ง ➤</button></form><footer class="chat-footer"><span id="chatStatus" role="status">แชทสด • แตะชื่อเพื่อตอบส่วนตัว • เกมยังดำเนินต่อ</span><button id="chatUnmute">เลิกปิดเสียง (${muted.size})</button></footer></section>`);
  unread=0;badge();$('chatInput').value=draft;$('chatSend').disabled=pending;
  if(peer){$('chatTo').value=peer.name;$('chatMute').textContent=muted.has(peer.id)?'เปิดเสียง':'ปิดเสียง';}
  $('chatTo').oninput=()=>{peer=null;$('chatMute').hidden=true;};
  $('chatInput').oninput=()=>draft=$('chatInput').value;
  $('chatMinimize').onclick=()=>{draft=$('chatInput').value;close();};
  document.querySelectorAll('[data-chat-channel]').forEach(b=>b.onclick=()=>{channel=b.dataset.chatChannel;open();});
  $('chatMute').onclick=()=>{if(!peer)return;if(muted.has(peer.id))muted.delete(peer.id);else if(muted.size<100)muted.add(peer.id);saveMuted();open();};
  $('chatUnmute').onclick=()=>{muted.clear();saveMuted();open();};
  $('chatForm').onsubmit=e=>{
   e.preventDefault();if(pending)return;const input=$('chatInput'),text=input.value.trim();
   if(!text||Array.from(text).length>200){status(ERRORS.invalid_text);return;}
   const toName=$('chatTo').value.trim();if(channel==='whisper'&&!toName){status('กรุณาระบุชื่อตัวละครผู้รับ');$('chatTo').focus();return;}
   if(!net.send({type:'chat',channel,text,...(channel==='whisper'?{to:peer?.id,toName}: {})})){status('การเชื่อมต่อขาด ข้อความยังไม่ถูกส่ง');return;}
   pending=true;pendingText=text;$('chatSend').disabled=true;status('กำลังส่ง…');
   timer=setTimeout(()=>{pending=false;if($('chatSend'))$('chatSend').disabled=false;status('ยังไม่ได้รับการยืนยัน ตรวจข้อความก่อนส่งซ้ำ');},8000);
  };render();$('chatLog').scrollTop=$('chatLog').scrollHeight;
 }
 net.onChat=m=>{
  loadMuted();
  if(!CHANNELS[m.channel]||typeof m.text!=='string'||history.some(x=>x.id===m.id))return;
  if(m.from===net.selfId){clearTimeout(timer);pending=false;if(draft.trim()===pendingText){draft='';if($('chatInput'))$('chatInput').value='';}if($('chatSend'))$('chatSend').disabled=false;status('ส่งแล้ว');}
  if(muted.has(m.from))return;history.push(m);history=history.slice(-120);
  if(!isOpen()&&m.from!==net.selfId){unread++;badge();}render();
 };
 net.onChatError=code=>{clearTimeout(timer);pending=false;if($('chatSend'))$('chatSend').disabled=false;status(ERRORS[code]||'ส่งข้อความไม่ได้ กรุณาลองใหม่');};
 return {open,reset(){clearTimeout(timer);history=[];draft='';peer=null;channel='world';pending=false;unread=0;muted.clear();mutedOwner=undefined;if($('chatInput'))$('chatInput').value='';badge();}};
}
