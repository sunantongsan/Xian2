import {OnlineClient} from './online.js';
import {World,capturePresence} from './solo-world.js';
import {fresh,validSave} from './core.js';
import {t} from './i18n.js';

function openDatabase(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('cockro-device-game',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('characters');
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 });
}

// Compare the revision inside the write transaction so another tab cannot overwrite this hero.
export function characterRecord(db,save,expected=0){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('characters',save?'readwrite':'readonly');
  const store=tx.objectStore('characters'),request=store.get('main');
  let record;
  request.onsuccess=()=>{
   record=request.result;
   if(!save)return;
   if((record?.revision||0)!==expected){tx.abort();return;}
   record={revision:expected+1,save};
   store.put(record,'main');
  };
  tx.oncomplete=()=>resolve(record);
  tx.onabort=()=>reject(tx.error||Error(t('เซฟถูกเปิดจากหน้าต่างอื่น กรุณาเข้าเกมใหม่')));
 });
}

export class DeviceGame extends OnlineClient {
 async startDevice(){
  const db=await openDatabase();
  try{
   const stored=await characterRecord(db);
   const save=stored?validSave(stored.save):fresh('sword-cockro');
   if(!save)throw Error(t('อ่านเซฟบนเครื่องไม่ได้'));
   if(!stored)save.name=t('นักล่า');
   const map=await fetch('maps/hero-star.json');
   if(!map.ok)throw Error(t('โหลดพื้นที่ไม่ได้'));
   const world=new World({mapJSON:await map.json(),maxPlayers:1});
   const player=world.join('device',save);
   const revision=stored?.revision||0;
   this.deviceSession={db,world,player,revision,pending:Promise.resolve(),lastSave:0};
   this.selfId='device';this.character='main';this.ready=true;
   this.billingEnabled=this.adsEnabled=this.chatEnabled=this.testRewards=false;
   this.billingOwner=this.billingProfile=null;this.billingRecipients=[];this.billingNotices=[];
   this.players=[];this.movement.reset();this.sequence=0;this.suspended=false;
   this.publishDevice();
   await this.saveDevice();
   let last=performance.now();
   this.deviceTimer=setInterval(()=>{
    const now=performance.now(),dt=Math.min(.2,(now-last)/1000);last=now;
    if(this.suspended||!this.ready)return;
    world.tick(dt);this.publishDevice();
    if(now-this.deviceSession.lastSave>3000)this.saveDevice().catch(()=>{});
   },100);
   return structuredClone(save);
  }catch(error){this.deviceSession=null;this.ready=false;db.close();throw error;}
 }
 publishDevice(){
  const {world,player}=this.deviceSession;
  this.latestState=structuredClone(world.snapshot(player));
  this.onState(this.latestState);
 }
 saveDevice(){
  const session=this.deviceSession;
  if(!session||session.failed)return Promise.resolve();
  capturePresence(session.player);
  const save=structuredClone(session.player.s);
  session.lastSave=performance.now();
  session.pending=session.pending.then(async()=>{
   const record=await characterRecord(session.db,save,session.revision);
   session.revision=record.revision;
  }).catch(error=>{
   if(!session.failed){session.failed=true;this.ready=false;this.onDeviceError?.(error);}
   throw error;
  });
  return session.pending;
 }
 send(command){
  if(!this.deviceSession)return super.send(command);
  if(!this.ready)return false;
  if(command.type==='language'){this.onLanguageResult?.({ok:true,requestId:command.requestId});return true;}
  if(!['move','enter','revive','attack','skill','potion','mpPotion','dash','op'].includes(command.type))return false;
  const {world,player}=this.deviceSession;
  world.command(player,command);
  if(command.type==='op'){
   this.publishDevice();this.saveDevice().catch(()=>{});
   const result={op:command.op,requestId:command.requestId,...player.opResult};
   queueMicrotask(()=>this.onOpResult?.(result));
  }
  return true;
 }
 setSuspended(value){
  if(!this.deviceSession)return super.setSuspended(value);
  this.suspended=!!value;if(value)this.saveDevice().catch(()=>{});
 }
 async disconnect(){
  const session=this.deviceSession;
  if(!session)return super.disconnect();
  clearInterval(this.deviceTimer);this.ready=false;
  try{await this.saveDevice();}finally{
   session.db.close();this.deviceSession=null;this.latestState=null;this.selfId=null;
  }
 }
}
