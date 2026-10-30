import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineClient} from '../web/online.js';
test('ad ticket send reports disconnected, backpressure and transport exceptions',()=>{
 const c=new OnlineClient(()=>{},()=>{});assert.equal(c.send({type:'adTicket'}),false);
 c.ready=true;c.socket={readyState:1,bufferedAmount:65536,send(){throw Error('should not send');}};
 assert.equal(c.send({type:'adTicket'}),false);
 c.socket.bufferedAmount=0;assert.equal(c.send({type:'adTicket'}),false);
 let sent;c.socket.send=data=>sent=JSON.parse(data);assert.equal(c.send({type:'adTicket',item:'ruby'}),true);assert.deepEqual(sent,{type:'adTicket',item:'ruby'});
});
