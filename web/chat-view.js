const CHANNELS={world:'ตะโกน',map:'พูด',whisper:'กระซิบ'};
const ERRORS={chat_rate_limit:'ส่งเร็วไปนิด รอสักครู่แล้วลองใหม่',invalid_text:'พิมพ์ข้อความ 1–200 ตัวอักษร',player_offline:'ไม่พบผู้เล่นออนไลน์ชื่อนี้',ambiguous_name:'ชื่อนี้ซ้ำกัน กรุณาแตะชื่อจากข้อความหรือแตะตัวละคร',self_whisper:'เลือกผู้เล่นคนอื่นเพื่อกระซิบ',invalid_channel:'กรุณาเลือกช่องแชท'};
export function createChatView({net,show,close,toast}){
 let channel='map',peer=null,unread=0,history=[],draft='',pending=false,pendingText='',timer,mutedOwner;
 const muted=new Set(),bubbles=new Map();
 const $=id=>document.getElementById(id),isOpen=()=>$('chatPanel')?.closest('dialog')?.open;
 function badge(){const b=$('chatUnread');if(b){b.hidden=!unread;b.textContent=unread>99?'99+':String(unread);}}
 function loadMuted(){if(mutedOwner===net.billingOwner)return;mutedOwner=net.billingOwner;muted.clear();try{for(const id of JSON.parse(localStorage.getItem('cockro-muted-'+net.billingOwner)||'[]').slice(0,100))if(typeof id==='string')muted.add(id);}catch{}}
 function saveMuted(){try{localStorage.setItem('cockro-muted-'+net.billingOwner,JSON.stringify([...muted]));}catch{}}
 function status(text){if($('dockStatus'))$('dockStatus').textContent=text;if($('chatStatus'))$('chatStatus').textContent=text;}
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

 function mount(){
  if($('chatDock'))return;
  const dock=document.createElement('section');dock.id='chatDock';dock.setAttribute('aria-label','แถบพูดคุย');
  dock.innerHTML='<button type="button" id="dockToggle" aria-label="เปิดหรือพับช่องพูด" aria-controls="dockForm" aria-expanded="false">💬</button><form id="dockForm"><select id="dockChannel" aria-label="รูปแบบข้อความ"><option value="map">พูด</option><option value="world">ตะโกน</option></select><input id="dockInput" maxlength="400" enterkeyhint="send" autocomplete="off" placeholder="พิมพ์ข้อความ…" aria-label="พิมพ์ข้อความ"><button type="submit" id="dockSend" aria-label="ส่งข้อความ">➤</button><button type="button" id="dockHistory" aria-label="ประวัติแชท">⋯</button></form><small id="dockStatus" role="status">พูดในแผนที่ • ตะโกนถึงทุกแผนที่</small>';
  document.body.append(dock);
  $('dockToggle').onclick=()=>{
   const open=dock.classList.toggle('expanded');
   $('dockToggle').setAttribute('aria-expanded',String(open));
   if(open)$('dockInput').focus();else $('dockInput').blur();
  };
  const input=$('dockInput');input.addEventListener('focus',()=>{document.documentElement.classList.add('chat-typing');window.dispatchEvent(new Event('blur'));});input.addEventListener('blur',()=>document.documentElement.classList.remove('chat-typing'));
  $('dockChannel').onchange=()=>{$('dockChannel').style.color=$('dockChannel').value==='world'?'#ffd477':'#92e5ff';};
  $('dockHistory').onclick=()=>open();
  $('dockForm').onsubmit=e=>{e.preventDefault();if(pending)return;const text=input.value.trim();if(!text||Array.from(text).length>200){status(ERRORS.invalid_text);return;}if(!net.ready||!net.chatEnabled||!net.send({type:'chat',channel:$('dockChannel').value,text})){status('การเชื่อมต่อขาด ข้อความยังไม่ถูกส่ง');return;}pending=true;pendingText=text;$('dockSend').disabled=true;status('กำลังส่ง…');input.blur();timer=setTimeout(()=>{pending=false;if($('dockSend'))$('dockSend').disabled=false;status('ยังไม่ได้รับการยืนยัน ตรวจประวัติก่อนส่งซ้ำ');},8000);};
 }
 function drawBubbles(g,position,now=performance.now()){
  for(const [id,b]of bubbles){if(now>=b.until){bubbles.delete(id);continue;}const q=position(id);if(!q)continue;
   g.save();g.font='bold 13px GameThai, sans-serif';g.textAlign='center';
   const lines=[];let line='';for(const ch of Array.from(b.text)){if(g.measureText(line+ch).width>220){lines.push(line);line='';}line+=ch;}if(line)lines.push(line);
   const shown=lines.slice(0,3);if(lines.length>3)shown[2]=shown[2].slice(0,-2)+'…';
   const width=Math.max(54,...shown.map(x=>g.measureText(x).width))+20,height=shown.length*18+12;
   const x=Math.max(width/2+4,Math.min(innerWidth-width/2-4,q.x)),y=Math.max(height+4,q.y);
   g.globalAlpha=Math.min(1,(b.until-now)/500);g.fillStyle=b.channel==='world'?'#493017ed':'#102f43ed';g.strokeStyle=b.channel==='world'?'#ffcf72':'#7ddfff';g.lineWidth=1;
   g.beginPath();g.roundRect(x-width/2,y-height,width,height,9);g.fill();g.stroke();g.beginPath();g.moveTo(x-5,y);g.lineTo(x,y+6);g.lineTo(x+5,y);g.fill();
   g.fillStyle=b.channel==='world'?'#ffe0a0':'#bcf1ff';shown.forEach((line,i)=>g.fillText(line,x,y-height+20+i*18));g.restore();
  }
 }
 net.onChat=m=>{
  loadMuted();
  if(!CHANNELS[m.channel]||typeof m.text!=='string'||history.some(x=>x.id===m.id))return;
  if(m.from===net.selfId){if($('dockInput')?.value.trim()===pendingText)$('dockInput').value='';if($('dockSend'))$('dockSend').disabled=false;clearTimeout(timer);pending=false;if(draft.trim()===pendingText){draft='';if($('chatInput'))$('chatInput').value='';}if($('chatSend'))$('chatSend').disabled=false;status('ส่งแล้ว');}
  if(muted.has(m.from))return;if(m.channel!=='whisper'){bubbles.set(m.from,{text:m.text,channel:m.channel,until:performance.now()+5500});if(bubbles.size>64)bubbles.delete(bubbles.keys().next().value);}history.push(m);history=history.slice(-120);
  if(!isOpen()&&m.from!==net.selfId){unread++;badge();}render();
 };
 net.onChatError=code=>{if($('dockSend'))$('dockSend').disabled=false;clearTimeout(timer);pending=false;if($('chatSend'))$('chatSend').disabled=false;status(ERRORS[code]||'ส่งข้อความไม่ได้ กรุณาลองใหม่');};
 return {open,mount,drawBubbles,reset(){bubbles.clear();$('chatDock')?.remove?.();document.documentElement?.classList.remove('chat-typing');clearTimeout(timer);history=[];draft='';peer=null;channel='world';pending=false;unread=0;muted.clear();mutedOwner=undefined;if($('chatInput'))$('chatInput').value='';badge();}};
}

