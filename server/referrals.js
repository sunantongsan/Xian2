import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {normalizeInviteCode,WELCOME,INVITED,INVITER} from '../web/invite-rules.js';

const hash = value => createHash('sha256').update(value).digest('hex');

export function createReferrals(directory){
 const path=join(directory,'referrals.json');
 const read=()=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{members:{},claims:{},awards:{}};
 function write(ledger){
  mkdirSync(directory,{recursive:true});
  writeFileSync(path+'.tmp',JSON.stringify(ledger),{mode:0o600});
  renameSync(path+'.tmp',path);
 }
 function status(account,uid){
  const {members,awards}=read();
  const code=uid?Object.keys(members).find(key=>members[key].account===account):null;
  return {code:code||null,canCreate:!!uid&&!code,pending:Object.values(awards)
   .filter(a=>a.account===account&&!a.delivered).reduce((sum,a)=>sum+a.amount,0)};
 }
 function createCode(account,uid,input){
  if(!uid)throw Error('google_required');
  const code=normalizeInviteCode(input);
  if(!code)throw Error('referral_format');
  const ledger=read();
  const current=Object.keys(ledger.members).find(key=>ledger.members[key].account===account);
  if(current)return {code:current};
  if(Object.hasOwn(ledger.members,code))throw Error('referral_taken');
  ledger.members[code]={account,identity:hash(uid)};
  write(ledger);
  return {code};
 }
 // Called at the first character registration, after identity and name validation.
 // Persist both entitlements together. The cumulative total lets the economy recover
 // a crash between saving this ledger and reserving the matching supply.
 function register(account,uid,input,available,googleSubject){
  const ledger=read(),identity=hash(uid||'guest:'+account),welcomeId=hash('welcome:'+account);
  const googleKey=googleSubject?hash('google:'+googleSubject):null;
  if(ledger.claims[identity]||(googleKey&&ledger.claims[googleKey])||ledger.awards[welcomeId])return null;
  let inviter=null;
  if(input!==undefined && input!==''){
   if(!uid)throw Error('google_required');
   const code=normalizeInviteCode(input);
   if(!code||!Object.hasOwn(ledger.members,code))throw Error('referral_invalid');
   inviter=ledger.members[code];
   if(inviter.account===account||inviter.identity===identity)throw Error('referral_self');
  }
  const total=(ledger.issued||0)+(inviter?INVITER+INVITED:WELCOME);
  if(total>available)throw Error('reward_budget_unavailable');
  const award=(owner,amount)=>({account:owner,amount,reserved:true,delivered:false});
  ledger.claims[identity]=true;
  if(googleKey)ledger.claims[googleKey]=true;
  ledger.awards[welcomeId]=award(account,inviter?INVITED:WELCOME);
  if(inviter)ledger.awards[hash('referral:'+identity)]=award(inviter.account,INVITER);
  ledger.issued=total;
  write(ledger);
  return inviter?.account||null;
 }
 function deliver(account,character,state,persist){
  const ledger=read();
  let legacyCredit=0;
  state.accountRewardReceipts??=[];
  for(const [id,a] of Object.entries(ledger.awards)){
   if(a.account!==account||a.delivered||(a.character&&a.character!==character))continue;
   const credited=state.accountRewardReceipts.includes(id);
   if(!credited&&state.stones+a.amount>1e12)continue;
   a.character=character;
   write(ledger);
   if(!credited){
    const next={...state,stones:state.stones+a.amount,accountRewardReceipts:[...state.accountRewardReceipts,id]};
    persist(next);
    Object.assign(state,next);
    if(!a.reserved)legacyCredit+=a.amount;
   }
   a.delivered=true;
   write(ledger);
  }
  return legacyCredit;
 }
 function remove(account){
  const ledger=read();
  for(const [code,member] of Object.entries(ledger.members))if(member.account===account)delete ledger.members[code];
  for(const [id,a] of Object.entries(ledger.awards))if(a.account===account)delete ledger.awards[id];
  write(ledger);
 }
 return {status,createCode,register,deliver,issued:()=>read().issued||0,remove};
}
