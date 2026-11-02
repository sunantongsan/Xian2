import {generateKeyPairSync,createPublicKey,sign} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
export function createIdentityCleanup(directory,{authUrl,fetcher=fetch}={}){
 mkdirSync(directory,{recursive:true,mode:0o700});const path=join(directory,'account-cleanup-key.pem');
 if(!existsSync(path)){const {privateKey}=generateKeyPairSync('ed25519');writeFileSync(path+'.tmp',privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600});renameSync(path+'.tmp',path);}
 const key=readFileSync(path,'utf8');const publicKey=createPublicKey(key).export({type:'spki',format:'der'}).toString('base64');
 async function remove(uid){const body=JSON.stringify({uid,timestamp:Date.now()});const signature=sign(null,Buffer.from(body),key).toString('base64');const response=await fetcher(authUrl+'/functions/v1/cockro-account-cleanup',{method:'POST',headers:{'Content-Type':'application/json','X-Cockro-Signature':signature},body,signal:AbortSignal.timeout(15000)});if(!response.ok)return false;const result=await response.json();return result.deleted===true;}
 return {remove,publicKey};
}
