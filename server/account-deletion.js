import {createReferrals} from './referrals.js';
import {createHash} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {CHARACTER_SLOTS,characterId} from './characters.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
const write=(path,value)=>{writeFileSync(path+'.tmp',JSON.stringify(value),{mode:0o600});renameSync(path+'.tmp',path);};

// Durable deletion journal doubles as a tombstone. Replay it before restoring actors.
// No password, game token or purchase token is retained here.
export function createAccountDeletion(directory,{authUrl,adminKey=process.env.SUPABASE_SERVICE_ROLE_KEY,fetcher=fetch}={}){
 const root=join(directory,'account-deletions');
 const files=()=>existsSync(root)?readdirSync(root):[];
 const deletedIds=new Set();
 const path=account=>join(root,account+'.json');
 const read=account=>existsSync(path(account))?JSON.parse(readFileSync(path(account),'utf8')):null;
 function purge(record){
  const ids=CHARACTER_SLOTS.map(slot=>characterId(record.account,slot));ids.forEach(id=>deletedIds.add(id));
  function clean(base){
   const commerce=join(base,'commerce.json');if(existsSync(commerce)){const data=JSON.parse(readFileSync(commerce,'utf8'));delete data.vaults?.[record.account];delete data.shops?.[record.account];write(commerce,data);}
   if(existsSync(join(base,'referrals.json')))createReferrals(base).remove(record.account);
   for(const id of ids){rmSync(join(base,id+'.json'),{force:true});rmSync(join(base,id+'.json.tmp'),{force:true});}
   const trash=join(base,'deleted-characters');if(existsSync(trash))for(const file of readdirSync(trash))if(ids.some(id=>file.startsWith(id+'-')))rmSync(join(trash,file),{force:true});
   const accounts=join(base,'accounts');if(existsSync(accounts)){
    for(const file of readdirSync(accounts).filter(f=>/^session-.*\.json$/.test(f))){const p=join(accounts,file),s=JSON.parse(readFileSync(p,'utf8'));if(s.account===record.account)rmSync(p);}
    rmSync(join(accounts,'profile-'+hash(record.account)+'.json'),{force:true});
    if(record.uid)rmSync(join(accounts,'google-'+hash(record.uid)+'.json'),{force:true});
   }
   const receipts=join(base,'play-receipts');if(existsSync(receipts))for(const file of readdirSync(receipts).filter(f=>f.endsWith('.json'))){const p=join(receipts,file),r=JSON.parse(readFileSync(p,'utf8'));if(r.owner===record.account)write(p,{product:r.product,gold:r.gold,credited:r.credited,consumed:r.consumed,created:r.created,deleted:true});}
  }
  clean(directory);
  const backups=join(directory,'release-backups');if(existsSync(backups))for(const item of readdirSync(backups,{withFileTypes:true}))if(item.isDirectory())clean(join(backups,item.name));
  record.localComplete=true;write(path(record.account),record);
 }
 function request(account,uid){mkdirSync(root,{recursive:true,mode:0o700});const record=read(account)||{account,uid:uid||null,requestedAt:Date.now(),localComplete:false,identityComplete:!uid};write(path(account),record);CHARACTER_SLOTS.forEach(slot=>deletedIds.add(characterId(account,slot)));purge(record);return {deleted:true,identityCleanupPending:!record.identityComplete};}
 function recover(){for(const file of files().filter(f=>/^[a-f0-9]{64}\.json$/.test(f))){const record=JSON.parse(readFileSync(join(root,file),'utf8'));CHARACTER_SLOTS.forEach(slot=>deletedIds.add(characterId(record.account,slot)));if(!record.localComplete)purge(record);}}
 let processing=false;
 async function processPending(){if(processing)return;recover();if(!adminKey)return;processing=true;try{for(const file of files().filter(f=>f.endsWith('.json'))){const record=JSON.parse(readFileSync(join(root,file),'utf8'));if(!record.localComplete||record.identityComplete||!record.uid)continue;
   try{const response=await fetcher(authUrl+'/auth/v1/admin/users/'+encodeURIComponent(record.uid),{method:'DELETE',headers:{apikey:adminKey,Authorization:'Bearer '+adminKey},signal:AbortSignal.timeout(10000)});if(response.ok||response.status===404){record.identityComplete=true;delete record.uid;write(join(root,file),record);}}catch{/* Keep the request for retry; never report complete after an error. */}
  }}finally{processing=false;}}
 const identityPending=uid=>files().filter(f=>f.endsWith('.json')).some(f=>{const r=JSON.parse(readFileSync(join(root,f),'utf8'));return !r.identityComplete&&r.uid===uid;});
 recover();return {request,isDeleted:account=>!!read(account),isCharacterDeleted:id=>deletedIds.has(id),identityPending,processPending};
}

