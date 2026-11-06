import {createRelayHandler} from './handler.mjs';
const b64=(b:Uint8Array)=>btoa(String.fromCharCode(...b)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
let cached:{token:string,until:number}|undefined;
async function accessToken(){
 if(cached&&cached.until>Date.now())return cached.token;
 const sa=JSON.parse(Deno.env.get('NOVA_PLAY_SERVICE_ACCOUNT')||'null');
 if(!sa?.client_email||!sa?.private_key)throw Error('not_configured');
 const now=Math.floor(Date.now()/1000),enc=new TextEncoder();
 const unsigned=b64(enc.encode(JSON.stringify({alg:'RS256',typ:'JWT'})))+'.'+b64(enc.encode(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600})));
 const bytes=Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),x=>x.charCodeAt(0));
 const key=await crypto.subtle.importKey('pkcs8',bytes,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const assertion=unsigned+'.'+b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(unsigned))));
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('publisher_unavailable');const d=await r.json();if(typeof d.access_token!=='string'||!d.access_token)throw Error('publisher_unavailable');
 cached={token:d.access_token,until:Date.now()+Math.max(0,Math.min(Number(d.expires_in)||0,3600)-60)*1000};return cached.token;
}
Deno.serve(createRelayHandler({secretHash:'c9faec75082ecb74e2068a1c418452bdd5de188a06746563d5d621b9b25cb4d8',accessToken}));
