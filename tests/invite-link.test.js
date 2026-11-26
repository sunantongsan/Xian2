import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {normalizeInviteCode,inviteLink} from '../web/invite-rules.js';
import {prefillInvite,clearInvite} from '../web/invite-ui.js';

test('shared link carries the same invitation into the installed app and Google Play',()=>{
 const doc=readFileSync(new URL('../web/invite.html',import.meta.url),'utf8');
 const script=doc.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/m,'');
 for(const code of ['ROACH42','<script>']){
  const fields={description:{},open:{remove(){this.removed=true;}},install:{},code:{}};
  const href=code==='ROACH42'?inviteLink(code):'https://localhost/?ref='+encodeURIComponent(code);
  runInNewContext(script,{URL,normalizeInviteCode,navigator:{language:'th'},location:{href},document:{getElementById:id=>fields[id]}});
  const play=new URL(fields.install.href);
  assert.equal(play.searchParams.get('id'),'com.sunantongsan.networkcokcro');
  if(code==='ROACH42'){
   assert.equal(fields.open.href,'cockronetwork://invite?ref=ROACH42');
   assert.equal(play.searchParams.get('referrer'),'ref=ROACH42');
   assert.equal(fields.code.textContent,'ROACH42');
  }else{assert.equal(fields.open.removed,true);assert.equal(play.searchParams.has('referrer'),false);}
 }
});
test('late install attribution fills an empty field and respects a manually edited code',t=>{
 const data=new Map();let native='';
 const scope={location:{href:'https://localhost/'},window:new EventTarget(),sessionStorage:{
  getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)
 },CockroInvite:{getCode:()=>native,clearCode:()=>{native='';}}};
 for(const [key,value] of Object.entries(scope)){globalThis[key]=value;t.after(()=>delete globalThis[key]);}
 const field=new EventTarget();field.isConnected=true;
 prefillInvite(field);assert.equal(field.value,'');
 native='Friend';window.dispatchEvent(new Event('cockro-invite'));assert.equal(field.value,'FRIEND');
 field.value='MANUAL';field.dispatchEvent(new Event('input'));
 window.dispatchEvent(new Event('cockro-invite'));assert.equal(field.value,'MANUAL');
 clearInvite();assert.equal(native,'');assert.equal(data.size,0);
});
