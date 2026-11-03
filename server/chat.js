import {randomUUID} from 'node:crypto';

// Messages are transient; identity, channel membership and routing are server-owned.
export function createChat({connections,send,clock=Date.now}){
 const limits=new Map();
 function handle(player,data){
  const fail=message=>{throw Error(message);};
  if(!['world','map','whisper'].includes(data.channel))fail('invalid_channel');
  if(typeof data.text!=='string'||data.text.length>1000)fail('invalid_text');
  const text=data.text.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,' ').replace(/\s+/gu,' ').trim();
  if(!text||Array.from(text).length>200)fail('invalid_text');
  const now=clock(),key=player.account||player.id;
  for(const [id,v] of limits)if(now-v.at>60000)limits.delete(id);
  const rate=limits.get(key)||{at:0,times:[]};
  rate.times=rate.times.filter(t=>now-t<10000);
  if(rate.times.length>=5||rate.times.length&&now-rate.at<700)fail('chat_rate_limit');
  rate.at=now;rate.times.push(now);limits.set(key,rate);
  const peers=[...connections].filter(ws=>ws.readyState===1&&ws.player?.());
  let recipient=null;
  if(data.channel==='whisper'){
   const matches=peers.map(ws=>ws.player()).filter(p=>data.to?p.id===data.to:p.s.name===data.toName);
   if(matches.length!==1)fail(matches.length>1?'ambiguous_name':'player_offline');
   recipient=matches[0];if(recipient.id===player.id)fail('self_whisper');
  }
  const packet={type:'chat',id:randomUUID(),channel:data.channel,text,at:now,from:player.id,name:player.s.name,to:recipient?.id,toName:recipient?.s.name};
  for(const ws of peers){const p=ws.player();if(data.channel==='world'||data.channel==='map'&&p.map===player.map||data.channel==='whisper'&&(p.id===player.id||p.id===recipient.id))send(ws,packet);}
  return packet;
 }
 return {handle};
}
