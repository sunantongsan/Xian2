import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
const hash=s=>createHash('sha256').update(s).digest('hex');
// One atomic ledger transaction accepts a referral and creates its reward.
// Delivery is assigned to one character before saving; save receipts make retries idempotent.
export function createReferrals(directory){
 const path=join(directory,'referrals.json');
 const read=()=>existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{members:{},claims:{},awards:{}};
 const write=d=>{mkdirSync(directory,{recursive:true});writeFileSync(path+'.tmp',JSON.stringify(d),{mode:0o600});renameSync(path+'.tmp',path);};
 const code=account=>hash('cockro-referral:'+account).slice(0,12).toUpperCase();
 function status(account,uid){const d=read(),c=code(account);if(uid){d.members[c]={account,identity:hash(uid)};write(d);}return {code:uid?c:null,used:!!(uid&&d.claims[hash(uid)]),pending:Object.values(d.awards).filter(a=>a.account===account&&!a.delivered).reduce((n,a)=>n+a.amount,0)};}
 function redeem(account,uid,input){
  if(!uid)throw Error('google_required');if(typeof input!=='string'||!/^[A-F0-9]{12}$/.test(input.trim().toUpperCase()))throw Error('referral_invalid');
  const d=read(),identity=hash(uid),member=d.members[input.trim().toUpperCase()];
  if(!member)throw Error('referral_invalid');if(member.account===account||member.identity===identity)throw Error('referral_self');if(d.claims[identity])throw Error('referral_used');
  const id=hash('referral:'+identity);d.claims[identity]=true;d.awards[id]={account:member.account,amount:500,delivered:false};write(d);return {accepted:true,reward:500};
 }
 function deliver(account,character,s,persist,{welcome=false}={}){
  const d=read(),welcomeId=hash('welcome:'+account);
  if(welcome&&!d.awards[welcomeId])d.awards[welcomeId]={account,amount:500,delivered:false};
  s.accountRewardReceipts??=[];
  for(const [id,a]of Object.entries(d.awards)){
   if(a.account!==account||a.delivered||(a.character&&a.character!==character))continue;
   if(!s.accountRewardReceipts.includes(id)&&s.stones+a.amount>1e7)continue;
   a.character=character;write(d);
   if(!s.accountRewardReceipts.includes(id)){s.stones+=a.amount;s.accountRewardReceipts.push(id);persist(s);}
   a.delivered=true;write(d);
  }
 }
 function remove(account){const d=read();delete d.members[code(account)];for(const [id,a]of Object.entries(d.awards))if(a.account===account)delete d.awards[id];write(d);}
 return {status,redeem,deliver,remove};
}
