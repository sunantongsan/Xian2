// Supabase owns identity; this server owns game saves and account-to-character links.
import {createHash,randomBytes,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync,existsSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {CHARACTER_SLOTS,characterId,characterRoster,readCharacter} from './characters.js';
import {characterName} from '../web/character-name.js';
const scrypt=promisify(derive),hash=v=>createHash('sha256').update(v).digest('hex');
export const AUTH_URL='https://kfohckvypopaoogmnjuy.supabase.co';
export const AUTH_KEY='sb_publishable_t64SUKWO3J2UGkhsqnrgsQ_VljJquXA';
export const AUTH_REDIRECT='cockronetwork://auth/callback';
export function createAccounts(directory,{fetcher=fetch}={}){
 const root=join(directory,'accounts');const flows=new Map(),attempts=new Map(),busy=new Set();
 const path=(kind,key)=>join(root,kind+'-'+hash(key)+'.json');
 const read=(kind,key)=>{const p=path(kind,key);return existsSync(p)?JSON.parse(readFileSync(p,'utf8')):null;};
 const write=(kind,key,data)=>{mkdirSync(root,{recursive:true,mode:0o700});const p=path(kind,key);writeFileSync(p+'.tmp',JSON.stringify(data),{mode:0o600});renameSync(p+'.tmp',p);};
 function resolve(token){if(typeof token!=='string'||!/^\w{64}$/.test(token))throw Error('invalid_token');const session=read('session',token);if(session){if(session.expires<Date.now())throw Error('login_required');return session.account;}const account=hash(token);if(read('profile',account)?.uid)throw Error('login_required');if(!read('profile',account)&&!characterRoster(directory,account).length)throw Error('account_missing');return account;}
 const exists=account=>!!read('profile',account)||characterRoster(directory,account).length>0;
 const meta=account=>read('profile',account)||{};
 function throttle(account){const now=Date.now(),q=(attempts.get(account)||[]).filter(t=>t>now-600000);if(q.length>=5)throw Error('password_locked');q.push(now);attempts.set(account,q);}
 async function verifyPassword(account,password){throttle(account);const m=meta(account);if(!m.password||typeof password!=='string'||password.length>128)throw Error('wrong_password');const key=await scrypt(password,m.salt,32);if(!timingSafeEqual(key,Buffer.from(m.password,'hex')))throw Error('wrong_password');attempts.delete(account);return m;}
 async function manageUnlocked(token,d){const account=resolve(token);if(d.action==='status')return {hasPassword:!!meta(account).password,google:!!meta(account).uid};
 if(d.action==='rename'){const state=readCharacter(directory,account,d.character);if(!state)throw Error('character_missing');if(state.name)throw Error('already_named');const name=characterName(d.name);if(!name)throw Error('invalid_name');state.name=name;const p=join(directory,characterId(account,d.character)+'.json');writeFileSync(p+'.tmp',JSON.stringify(state),{mode:0o600});renameSync(p+'.tmp',p);return {characters:characterRoster(directory,account)};}
 if(d.action==='setPassword'){const m=meta(account);if(m.password)await verifyPassword(account,d.oldPassword);if(typeof d.password!=='string'||d.password.length<8||d.password.length>128)throw Error('weak_password');const salt=randomBytes(16).toString('hex'),key=await scrypt(d.password,salt,32);write('profile',account,{...meta(account),salt,password:key.toString('hex')});return {hasPassword:true};}
 if(d.action==='delete'){await verifyPassword(account,d.password);if(!CHARACTER_SLOTS.includes(d.character))throw Error('character_missing');const state=readCharacter(directory,account,d.character);if(!state)throw Error('character_missing');if(d.confirmName!==(state.name||'กรุณาตั้งชื่อ'))throw Error('name_mismatch');write('profile',account,meta(account));const trash=join(directory,'deleted-characters');mkdirSync(trash,{recursive:true,mode:0o700});renameSync(join(directory,characterId(account,d.character)+'.json'),join(trash,characterId(account,d.character)+'-'+Date.now()+'.json'));return {characters:characterRoster(directory,account)};}
 throw Error('invalid_request');}
 async function authStart(token){let account=null;if(token){try{account=resolve(token);}catch(e){if(e.message!=='login_required')throw e;}}for(const [id,f]of flows)if(f.until<Date.now())flows.delete(id);if(flows.size>=100)throw Error('auth_busy');const flow=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url');flows.set(flow,{account,verifier,until:Date.now()+300000});const u=new URL(AUTH_URL+'/auth/v1/authorize');u.search=new URLSearchParams({provider:'google',redirect_to:AUTH_REDIRECT,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'s256',prompt:'select_account'}).toString();return {flow,url:u.href};}
 async function authFinish(flow,code){const f=flows.get(flow);if(!f||f.until<Date.now()||typeof code!=='string'||code.length>2048)throw Error('auth_expired');flows.delete(flow);
 const response=await fetcher(AUTH_URL+'/auth/v1/token?grant_type=pkce',{method:'POST',headers:{apikey:AUTH_KEY,'Content-Type':'application/json'},body:JSON.stringify({auth_code:code,code_verifier:f.verifier}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('auth_failed');const session=await response.json();
 const check=await fetcher(AUTH_URL+'/auth/v1/user',{headers:{apikey:AUTH_KEY,Authorization:'Bearer '+session.access_token},signal:AbortSignal.timeout(15000)});if(!check.ok)throw Error('auth_failed');const user=await check.json();if(typeof user.id!=='string'||!user.identities?.some(i=>i.provider==='google'))throw Error('auth_failed');
 const existing=read('google',user.id);let account=existing?.account;
 if(!account){account=f.account||hash(randomBytes(32));const profile=meta(account);if(profile.uid&&profile.uid!==user.id)throw Error('account_linked');write('profile',account,{...profile,uid:user.id});write('google',user.id,{account});}
 // A known Google account is loaded, never overwritten by an unrelated guest save.
 const token=randomBytes(32).toString('hex');write('session',token,{account,expires:Date.now()+30*86400000});return {token,google:true,characters:characterRoster(directory,account),loadedExisting:!!existing&&f.account!==account};}
 async function manage(token,d){const account=resolve(token);if(busy.has(account))throw Error('account_busy');busy.add(account);try{return await manageUnlocked(token,d);}finally{busy.delete(account);}}
 return {resolve,exists,meta,manage,authStart,authFinish,busy};
}
