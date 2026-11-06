const PACKAGE='com.sunantongsan.networkcokcro';
const PRODUCTS=new Set(['cockro_gold_5000','cockro_gold_20000','cockro_gold_150000','cockro_gold_500000']);
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const encoder=new TextEncoder();
async function hash(text){return new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)));}
async function equal(a,b){const [x,y]=await Promise.all([hash(a),hash(b)]);let difference=0;for(let i=0;i<x.length;i++)difference|=x[i]^y[i];return difference===0;}
export function createRelayHandler({secret,secretHash,accessToken,fetcher=fetch}){
 return async req=>{
  if(req.method!=='POST')return json({error:'method_not_allowed'},405);
  if(!/^[a-f0-9]{64}$/.test(secretHash||secret||''))return json({error:'not_configured'},503);
  const auth=req.headers.get('Authorization')||'';
  if(!/^Bearer [a-f0-9]{64}$/.test(auth))return json({error:'unauthorized'},401);
  const provided=auth.slice(7);
  const digest=secretHash?[...await hash(provided)].map(x=>x.toString(16).padStart(2,'0')).join(''):provided;
  if(!await equal(digest,secretHash||secret))return json({error:'unauthorized'},401);
  try{
   if(Number(req.headers.get('Content-Length')||0)>8192)return json({error:'too_large'},413);
   const raw=await req.text();if(raw.length>8192)return json({error:'too_large'},413);
   let input;try{input=JSON.parse(raw);}catch{return json({error:'invalid_request'},400);}
   if(!input||!['verify','consume','probe'].includes(input.action)||!PRODUCTS.has(input.product))return json({error:'invalid_request'},400);
   const headers={Authorization:'Bearer '+await accessToken()};
   if(input.action==='probe'){
    const r=await fetcher(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/inappproducts/${input.product}`,{headers,signal:AbortSignal.timeout(15000)});
    if(!r.ok)return json({error:'publisher_unavailable',status:r.status},503);
    const p=await r.json();return json({ready:p.packageName===PACKAGE&&p.sku===input.product&&p.status==='active'});
   }
   if(typeof input.token!=='string'||input.token.length<10||input.token.length>2048)return json({error:'invalid_request'},400);
   const url=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/products/${input.product}/tokens/${encodeURIComponent(input.token)}`;
   const r=await fetcher(url+(input.action==='consume'?':consume':''),{method:input.action==='consume'?'POST':'GET',headers,signal:AbortSignal.timeout(15000)});
   if(!r.ok)return json({error:r.status>=500?'verification_unavailable':'purchase_not_verified'},r.status>=500?503:400);
   if(input.action==='consume')return json({consumed:true});
   const purchase=await r.json();
   // Send only receipt fields used by the authoritative game server. No keys or access tokens.
   return json({purchase:Object.fromEntries(['purchaseState','consumptionState','quantity','obfuscatedExternalAccountId','obfuscatedExternalProfileId','orderId','purchaseTimeMillis','purchaseType'].filter(k=>purchase[k]!==undefined).map(k=>[k,purchase[k]]))});
  }catch{return json({error:'verification_unavailable'},503);}
 };
}
