import test from 'node:test';
import assert from 'node:assert/strict';
import {createChat} from '../server/chat.js';
function fixture(){
 let now=10000;const people=['a','b','c'].map((id,i)=>({id,account:id,s:{name:'Player '+id},map:i===2?'forest':'town'}));
 const connections=new Set(people.map(p=>({readyState:1,player:()=>p,messages:[]})));
 const sockets=[...connections],chat=createChat({connections,send:(ws,m)=>ws.messages.push(m),clock:()=>now});
 return {people,sockets,connections,chat,advance:(ms=1000)=>now+=ms,send:(data={})=>chat.handle(people[0],{channel:'world',text:'hello',...data})};
}
test('world chat uses authenticated identity and ignores forged sender/recipient fields',()=>{
 const f=fixture(),m=f.send({from:'c',name:'Admin',at:0,id:'fake',to:'c'});
 assert.equal(m.from,'a');assert.equal(m.name,'Player a');assert.notEqual(m.id,'fake');assert.equal(m.to,undefined);
 assert.deepEqual(f.sockets.map(s=>s.messages.length),[1,1,1]);
});
test('map routing follows current authoritative map and excludes unjoined/closed sockets',()=>{
 const f=fixture();f.connections.add({readyState:1,player:()=>null});f.connections.add({readyState:3,player:()=>f.people[0]});
 f.send({channel:'map',map:'forest'});assert.deepEqual(f.sockets.map(s=>s.messages.length),[1,1,0]);
 f.advance();f.people[0].map='forest';f.send({channel:'map'});assert.deepEqual(f.sockets.map(s=>s.messages.length),[2,1,1]);
});
test('whispers reach only sender and intended recipient across maps',()=>{
 const f=fixture();f.send({channel:'whisper',to:'c',toName:'Player b'});
 assert.deepEqual(f.sockets.map(s=>s.messages.length),[1,0,1]);assert.equal(f.sockets[0].messages[0].toName,'Player c');
 f.advance();f.send({channel:'whisper',toName:'Player b'});assert.deepEqual(f.sockets.map(s=>s.messages.length),[2,1,1]);
});
test('whispers reject missing/offline/self and ambiguous recipients without broadcasting',()=>{
 for(const [data,expected] of [[{to:'missing'},'player_offline'],[{to:'a'},'self_whisper'],[{},'player_offline']]){
  const f=fixture();assert.throws(()=>f.send({channel:'whisper',...data}),new RegExp(expected));assert.ok(f.sockets.every(s=>!s.messages.length));
 }
 const f=fixture();f.people[2].s.name=f.people[1].s.name;assert.throws(()=>f.send({channel:'whisper',toName:'Player b'}),/ambiguous_name/);
 f.advance();f.send({channel:'whisper',to:'b'});assert.equal(f.sockets[2].messages.length,0);
});
test('chat rejects malformed/oversized content and strips control characters',()=>{
 for(const text of ['',null,{},42,' '.repeat(10),'a'.repeat(201),'a'.repeat(1001)])assert.throws(()=>fixture().send({text}),/invalid_text/);
 assert.throws(()=>fixture().send({channel:'admin'}),/invalid_channel/);
 assert.equal(fixture().send({text:'  สวัสดี\nโลก\u202e  '}).text,'สวัสดี โลก');
 assert.equal(Array.from(fixture().send({text:'🐈'.repeat(200)}).text).length,200);
});
test('rate limiting survives character switches/reconnects and recovers after window',()=>{
 const f=fixture();f.send();assert.throws(()=>f.send(),/chat_rate_limit/);
 for(let i=0;i<4;i++){f.advance();f.send();}f.advance();assert.throws(()=>f.send(),/chat_rate_limit/);
 const replacement={...f.people[0],id:'new-character'};assert.throws(()=>f.chat.handle(replacement,{channel:'world',text:'bypass'}),/chat_rate_limit/);
 f.advance(10000);assert.doesNotThrow(()=>f.send());
});
