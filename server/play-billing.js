import {createHash,createSign} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,existsSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {GOLD_PRODUCTS} from '../web/gold-products.js';
export function validatePlayPurchase(data,{owner,character}){
 if(data.purchaseState!==0)throw Error('payment_pending');
 if(data.obfuscatedExternalAccountId!==owner||data.obfuscatedExternalProfileId!==character)throw Error('wrong_account');
 if((data.quantity??1)!==1)throw Error('invalid_quantity');
}
export function createPlayVerifier({credentialsPath=process.env.GOOGLE_PLAY_CREDENTIALS,fetcher=fetch}={}){
 let credentials=null;try{if(credentialsPath)credentials=JSON.parse(readFileSync(credentialsPath,'utf8'));}catch{}
 const enabled=!!(credentials?.client_email&&credentials?.private_key);let cached=null;
 async function access(){if(!enabled)throw Error('billing_unavailable');if(cached&&cached.until>Date.now())return cached.token;
 const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const base=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const assertion=base+'.'+createSign('RSA-SHA256').update(base).sign(credentials.private_key,'base64url');
 const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('billing_unavailable');const d=await r.json();if(!d.access_token)throw Error('billing_unavailable');cached={token:d.access_token,until:Date.now()+3000000};return cached.token;}
 async function request(product,token,consume=false){const url=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.sunantongsan.networkcokcro/purchases/products/${encodeURIComponent(product)}/tokens/${encodeURIComponent(token)}${consume?':consume':''}`;
 const r=await fetcher(url,{method:consume?'POST':'GET',headers:{Authorization:'Bearer '+await access()},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(r.status>=500?'verification_unavailable':'purchase_not_verified');return consume?null:r.json();}
 return {enabled,verify:(id,token)=>request(id,token),consume:(id,token)=>request(id,token,true)};
}
export function createBillingService(directory,verifier=createPlayVerifier()){
 const dir=join(directory,'play-receipts');const locks=new Set();
 const write=(path,data)=>{writeFileSync(path+'.tmp',JSON.stringify(data),{mode:0o600});renameSync(path+'.tmp',path);};
 return {enabled:verifier.enabled,history(owner,offset=0){
 if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw Error('invalid_request');
 const records=existsSync(dir)?readdirSync(dir).filter(f=>/^[a-f0-9]{64}\.json$/.test(f)).map(file=>({file,data:JSON.parse(readFileSync(join(dir,file),'utf8'))})).filter(r=>r.data.owner===owner):[];
 records.sort((a,b)=>(b.data.created||0)-(a.data.created||0)||a.file.localeCompare(b.file));
 return {purchases:records.slice(offset,offset+20).map(({file,data:r})=>({reference:file.slice(0,16),product:r.product,gold:r.gold,created:r.created,purchasedAt:r.purchasedAt||null,orderId:r.orderId||null,test:r.test===true,character:r.character,characterName:r.characterName||null,status:r.credited?'credited':'processing'})),nextOffset:offset+20<records.length?offset+20:null};
 },async redeem(p,{productId,token},persist){
 if(!verifier.enabled)throw Error('billing_unavailable');
 mkdirSync(dir,{recursive:true,mode:0o700});
 const product=GOLD_PRODUCTS.find(x=>x.id===productId);if(!product||typeof token!=='string'||token.length<10||token.length>2048)throw Error('invalid_purchase');
 const hash=createHash('sha256').update(token).digest('hex'),path=join(dir,hash+'.json');if(locks.has(hash))throw Error('purchase_busy');locks.add(hash);
 try{
 let record=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):null;
 if(record&&(record.owner!==p.account||record.character!==p.id||record.product!==productId))throw Error('wrong_account');
 if(record?.credited){if(!record.consumed){await verifier.consume(productId,token);record.consumed=true;write(path,record);}return {gold:product.gold,duplicate:true};}
 const verified=await verifier.verify(productId,token);validatePlayPurchase(verified,{owner:p.account,character:p.id});
 if(verified.consumptionState===1&&!record)throw Error('already_consumed');
 if(!record){record={owner:p.account,character:p.id,characterName:p.s.name||null,product:productId,gold:product.gold,credited:false,created:Date.now(),orderId:typeof verified.orderId==='string'?verified.orderId.slice(0,128):null,purchasedAt:Number.isFinite(Number(verified.purchaseTimeMillis))?Number(verified.purchaseTimeMillis):null,test:verified.purchaseType===0};write(path,record);}
 // Receipt marker and balance commit together; retry after a process crash cannot credit twice.
 const already=p.s.playReceipts?.includes(hash);if(!already){
 if(p.s.stones+product.gold>1e7)throw Error('wallet_full');
 const next=structuredClone(p.s);next.stones+=product.gold;next.playReceipts=[...(next.playReceipts||[]),hash];persist({id:p.id,s:next});p.s=next;p.dirty=false;
 }
 record.credited=true;write(path,record);
 try{await verifier.consume(productId,token);record.consumed=true;write(path,record);}catch{return {gold:product.gold,duplicate:!!already,consumePending:true};}
 return {gold:product.gold,duplicate:!!already};
 }finally{locks.delete(hash);}
 }};
}
