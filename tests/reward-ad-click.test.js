import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {rewardAdBlockReason} from '../web/reward-ad-status.js';
const source=readFileSync(new URL('../web/game.js',import.meta.url),'utf8');
function screen({supported=true,ready=true,item='crystal'}={}){
 const button={dataset:{rewardItem:item}},messages=[],sent=[],labels=[];let refreshed=0;
 const context={rewardAdBlockReason,adPending:false,adTimeout:null,adMessage:'',onlineMode:true,modal:{open:true},
  document:{getElementById:()=>labels[0],createElement:()=>({setAttribute(){}}),querySelectorAll:()=>[button]},
  $:()=>({prepend:label=>labels.push(label)}),toast:message=>messages.push(message),
  ads:{supported,state:{ready},refresh:()=>refreshed++},net:{ready:true,adsEnabled:true,send:data=>{sent.push(data);return true;}},
  clearTimeout(){},setTimeout(){return 1;}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function adNotice('),source.indexOf('\nconst ads='))+source.slice(source.indexOf('function bindRewardAds('),source.indexOf('\nsetTimeout(()=>ads.refresh()',source.indexOf('function bindRewardAds('))),context);
 context.bindRewardAds();return{button,context,messages,sent,labels,get refreshed(){return refreshed;}};
}
test('unavailable ad tap creates visible feedback inside the active dialog and refreshes status',()=>{const s=screen({ready:false});s.button.onclick();assert.equal(s.sent.length,0);assert.equal(s.refreshed,1);assert.ok(s.labels[0].textContent.includes('ยังไม่พร้อม'));});
test('unsupported native bridge explains app update instead of doing nothing',()=>{const s=screen({supported:false});s.button.onclick();assert.ok(s.labels[0].textContent.includes('Play Store'));assert.equal(s.sent.length,0);});
test('ready ad tap requests exactly one ticket; second tap gives waiting feedback',()=>{const s=screen();s.button.onclick();s.button.onclick();assert.equal(s.sent.length,1);assert.equal(s.sent[0].type,'adTicket');assert.equal(s.sent[0].item,'crystal');assert.ok(s.labels[0].textContent.includes('กรุณารอ'));});

