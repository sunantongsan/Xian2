import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync,readdirSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join} from 'node:path';
import {COIN_CAP} from '../web/chain-economy.js';
import {validSave} from '../web/core.js';
export const LEGACY_SLOTS=['main','slot2','slot3','slot4'];
export const legacyId=(account,slot)=>slot==='main'?account:createHash('sha256').update(account+':'+slot).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8'));
function durableWrite(p,value){writeFileSync(p+'.tmp',JSON.stringify(value),{mode:0o600});let fd=openSync(p+'.tmp','r');try{fsyncSync(fd);}finally{closeSync(fd);}renameSync(p+'.tmp',p);}
function syncDirectory(p){const fd=openSync(p,'r');try{fsyncSync(fd);}finally{closeSync(fd);}}
export function migrationReceipt(directory,account){const p=join(directory,'single-character-v1',account,'receipt.json');return existsSync(p)?read(p):null;}
export function migrateAccount(directory,account,{afterStep=()=>{}}={}){
 if(!/^[a-f0-9]{64}$/.test(account))throw Error('invalid_account');
 const root=join(directory,'single-character-v1',account),receiptPath=join(root,'receipt.json');
 if(existsSync(receiptPath)&&read(receiptPath).done)return read(receiptPath);
 mkdirSync(root,{recursive:true,mode:0o700});
 const pending=join(root,'pending.json');let tx;
 if(existsSync(pending))tx=read(pending);else{
  const rows=LEGACY_SLOTS.flatMap(slot=>{const id=legacyId(account,slot),p=join(directory,id+'.json');if(!existsSync(p))return [];const raw=read(p);if(!validSave(raw)||!Number.isSafeInteger(raw.stones)||raw.stones<0||raw.stones>COIN_CAP)throw Error('invalid_migration_save');return [{slot,id,raw}];});
  if(!rows.length)return null;
  rows.sort((a,b)=>b.raw.level-a.raw.level||LEGACY_SLOTS.indexOf(a.slot)-LEGACY_SLOTS.indexOf(b.slot));
  const winner=rows[0],removed=rows.slice(1),credit=removed.reduce((n,r)=>n+r.raw.stones+1000,0);
  if(!Number.isSafeInteger(credit)||winner.raw.stones+credit>COIN_CAP)throw Error('migration_wallet_full');
  const state=structuredClone(winner.raw);state.hero='sword-cockro';state.jobBranch=null;state.stones+=credit;
  state.accountRewardReceipts=[...new Set(rows.flatMap(r=>r.raw.accountRewardReceipts||[]))];
  state.playReceipts=[...new Set(rows.flatMap(r=>r.raw.playReceipts||[]))];
  tx={account,winner:winner.id,slot:winner.slot,state,originals:rows,credit,removed:removed.map(r=>({id:r.id,slot:r.slot,coins:r.raw.stones,compensation:1000})),createdAt:new Date().toISOString()};
  durableWrite(pending,tx);syncDirectory(root);afterStep('prepared');
 }
 // Replay before listening. Originals are retained even if activation is interrupted.
 for(const row of tx.originals){const p=join(root,row.id+'.original.json');if(!existsSync(p))durableWrite(p,row.raw);}
 syncDirectory(root);afterStep('backed_up');
 durableWrite(join(directory,tx.winner+'.json'),tx.state);syncDirectory(directory);afterStep('credited');
 for(const row of tx.removed){const src=join(directory,row.id+'.json'),dest=join(root,row.id+'.retired.json');if(existsSync(src))renameSync(src,dest);}
 syncDirectory(directory);syncDirectory(root);afterStep('retired');
 // Market listings belong to the account; retain the items and retarget their owner.
 const ledgerPath=join(directory,'commerce.json');if(existsSync(ledgerPath)){const ledger=read(ledgerPath),shop=ledger.shops?.[account];if(shop&&tx.removed.some(r=>r.id===shop.character)){shop.character=tx.winner;shop.name=tx.state.name;ledger.revision=(ledger.revision||0)+1;durableWrite(ledgerPath,ledger);syncDirectory(directory);}}
 const receipt={account,slot:tx.slot,winner:tx.winner,credit:tx.credit,removed:tx.removed,createdAt:tx.createdAt,done:true};durableWrite(receiptPath,receipt);syncDirectory(root);afterStep('completed');return receipt;
}
// Must run after commerce WAL recovery, before any sockets or actors are created.
export function migrateAllCharacters(directory){
 const pendingRoot=join(directory,'single-character-v1');if(existsSync(pendingRoot))for(const id of readdirSync(pendingRoot))if(/^[a-f0-9]{64}$/.test(id))migrateAccount(directory,id);
 const ids=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).map(n=>n.slice(0,-5));
 const known=new Set(),accounts=join(directory,'accounts');
 if(existsSync(accounts))for(const n of readdirSync(accounts).filter(n=>/^(session|google)-.*\.json$/.test(n))){const a=read(join(accounts,n)).account;if(/^[a-f0-9]{64}$/.test(a||''))known.add(a);}
 const donors=new Set([...ids,...known].flatMap(id=>LEGACY_SLOTS.slice(1).map(slot=>legacyId(id,slot))));
 const owners=new Set([...known,...ids.filter(id=>!donors.has(id))]);
 // Recorded winners in non-main slots must not be mistaken for new legacy accounts.
 if(existsSync(pendingRoot))for(const id of readdirSync(pendingRoot)){const r=migrationReceipt(directory,id);if(r){owners.delete(r.winner);owners.add(r.account);}}
 return [...owners].map(a=>migrateAccount(directory,a)).filter(Boolean);
}
