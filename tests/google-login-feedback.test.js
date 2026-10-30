import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {OnlineClient} from '../web/online.js';

function loginHarness(bridge,account=async()=>({flow:'flow',url:'https://example.invalid'})){
 const elements={googleLogin:{disabled:false},modalContent:{appendChild(e){elements[e.id]=e;}}};
 const context=vm.createContext({window:bridge?{CockroAuth:bridge}:{},document:{createElement(){return {setAttribute(){},scrollIntoView(){}};}},$:id=>elements[id],net:{account},localStorage:{setItem(){}},accountError:()=> 'login error'});
 const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8');
 vm.runInContext(source.slice(source.indexOf('function googleStatus('),source.indexOf('let googleFinishing=false;')),context);
 return {context,elements,run:()=>vm.runInContext('googleLogin()',context)};
}
test('missing native bridge displays explanation inside active dialog',async()=>{
 const h=loginHarness(null);await h.run();assert.match(h.elements.googleStatus.textContent,/103/);assert.equal(h.elements.googleLogin.disabled,false);
});
test('progress is visible while waiting and failed login can be retried',async()=>{
 let reject;const h=loginHarness({postMessage(){}},()=>new Promise((_,r)=>reject=r));const pending=h.run();
 assert.match(h.elements.googleStatus.textContent,/กำลังเชื่อมต่อ/);assert.equal(h.elements.googleLogin.disabled,true);
 reject(Error('network_error'));await pending;assert.match(h.elements.googleStatus.textContent,/เชื่อมต่อเซิร์ฟเวอร์ไม่ได้/);assert.equal(h.elements.googleLogin.disabled,false);
});
test('browser launch does not permanently disable login button',async()=>{
 let opened=false;const h=loginHarness({postMessage(){opened=true;}});await h.run();assert.equal(opened,true);assert.equal(h.elements.googleLogin.disabled,false);
});
test('account request rejects promptly on closed socket and malformed response',async()=>{
 const oldSocket=globalThis.WebSocket,oldStorage=globalThis.localStorage;
 let socket;globalThis.localStorage={getItem:()=>null};globalThis.WebSocket=class {constructor(){socket=this;}close(){}send(){}};
 try{const client=new OnlineClient();let pending=client.account('authStart');socket.onclose();await assert.rejects(pending,/connection_closed/);
 pending=client.account('authStart');socket.onmessage({data:'not json'});await assert.rejects(pending,/invalid_response/);
 }finally{globalThis.WebSocket=oldSocket;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});
