export function cleanupHandler({publicKey,url,adminKey,fetcher=fetch,now=Date.now}){
 const bytes=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 return async request=>{
  if(request.method!=='POST')return reply(405,{error:'method'});
  if(!publicKey||!url||!adminKey)return reply(503,{error:'unavailable'});
  try{
   const text=await request.text();if(text.length>1024)return reply(413,{error:'size'});
   const signature=request.headers.get('X-Cockro-Signature')||'';if(signature.length!==88)return reply(401,{error:'unauthorized'});
   const key=await crypto.subtle.importKey('spki',bytes(publicKey),{name:'Ed25519'},false,['verify']);
   if(!await crypto.subtle.verify('Ed25519',key,bytes(signature),new TextEncoder().encode(text)))return reply(401,{error:'unauthorized'});
   const data=JSON.parse(text);if(!Number.isSafeInteger(data.timestamp)||Math.abs(now()-data.timestamp)>120000||typeof data.uid!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(data.uid))return reply(400,{error:'invalid_request'});
   const r=await fetcher(url+'/auth/v1/admin/users/'+data.uid,{method:'DELETE',headers:{apikey:adminKey,Authorization:'Bearer '+adminKey},signal:AbortSignal.timeout(10000)});
   return r.ok||r.status===404?reply(200,{deleted:true}):reply(503,{error:'cleanup_pending'});
  }catch{return reply(503,{error:'cleanup_pending'});}
 };
}
