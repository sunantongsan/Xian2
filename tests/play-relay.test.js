import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRelayHandler} from '../supabase/functions/cockro-play-relay/handler.mjs';
import {createPlayRelay} from '../server/play-relay.js';
import {createPlayVerifier,createBillingService} from '../server/play-billing.js';
const secret='a'.repeat(64),url='https://uzinxxeadejmzxqmqqtx.supabase.co/functions/v1/cockro-play-relay';
const product='cockro_gold_5000',token='test-purchase-token-1234';
function request(input,auth=secret){return new Request(url,{method:'POST',headers:{Authorization:'Bearer '+auth},body:JSON.stringify(input)});}
test('relay rejects missing configuration and unauthorized calls before touching Google',async()=>{
 let calls=0;const accessToken=async()=>{calls++;return 'google';};
 assert.equal((await createRelayHandler({accessToken})(request({}))).status,503);
 const handler=createRelayHandler({secret,accessToken});
 for(const auth of ['',secret.slice(1),'b'.repeat(64)])assert.equal((await handler(request({action:'verify',product,token},auth))).status,401);
 assert.equal(calls,0);
});
test('relay fixes package and restricts products/actions, filters receipt data',async()=>{
 const seen=[];const handler=createRelayHandler({secret,accessToken:async()=>'google',fetcher:async(u,options)=>{seen.push([u,options]);return Response.json({purchaseState:0,quantity:1,orderId:'GPA.123',access_token:'never expose',email:'not needed'});}});
 for(const input of [{action:'refund',product,token},{action:'verify',product:'nova_5000',token},{action:'verify',product:'../orders',token}])assert.equal((await handler(request(input))).status,400);
 assert.equal(seen.length,0);
 const r=await handler(request({action:'verify',product,token,packageName:'com.sunantongsan.novastriker'}));assert.equal(r.status,200);
 assert.match(seen[0][0],/applications\/com\.sunantongsan\.networkcokcro\/purchases\/products\/cockro_gold_5000/);
 assert.deepEqual(await r.json(),{purchase:{purchaseState:0,quantity:1,orderId:'GPA.123'}});
});
test('relay failures cannot become a verified receipt or consumption success',async()=>{
 for(const status of [401,403,404,500]){
  const handler=createRelayHandler({secret,accessToken:async()=>'google',fetcher:async()=>new Response('private upstream error',{status})});
  const r=await handler(request({action:'consume',product,token}));assert.equal(r.status,status>=500?503:400);assert(!JSON.stringify(await r.json()).includes('private'));
 }
});
function config(t,value={url,token:secret}){const dir=mkdtempSync(join(tmpdir(),'play-relay-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const path=join(dir,'config.json');writeFileSync(path,JSON.stringify(value),{mode:0o600});return {dir,path};}
test('client refuses missing, malformed or untrusted relay configuration',async t=>{
 assert.equal(createPlayRelay({configPath:'/nonexistent'}).enabled,false);
 for(const value of [{url:'https://example.com',token:secret},{url,token:'short'},{}]){const f=config(t,value);const verifier=createPlayRelay({configPath:f.path});assert.equal(verifier.enabled,false);await assert.rejects(verifier.verify(product,token),/billing_unavailable/);}
});
test('full relay path validates owner, persists before consume and prevents double credit',async t=>{
 const f=config(t),calls=[];let persisted=false;
 const p={account:'owner',id:'character',s:{stones:0}};
 const handler=createRelayHandler({secret,accessToken:async()=>'google',fetcher:async(u,o)=>{
  calls.push(o.method);if(o.method==='POST'){assert(persisted);return new Response(null,{status:204});}
  return Response.json({purchaseState:0,quantity:1,consumptionState:0,obfuscatedExternalAccountId:p.account,obfuscatedExternalProfileId:p.id});
 }});
 const fetcher=async(u,o)=>{assert.equal(u,url);assert.equal(o.redirect,'error');return handler(new Request(u,o));};
 const verifier=createPlayVerifier({relayConfigPath:f.path,fetcher});assert(verifier.enabled);
 const service=createBillingService(f.dir,verifier),input={productId:product,token};
 assert.equal((await service.redeem(p,input,()=>{persisted=true;})).gold,5000);
 assert.equal(p.s.stones,5000);assert((await service.redeem(p,input,()=>{})).duplicate);assert.equal(p.s.stones,5000);assert.deepEqual(calls,['GET','POST']);
 await assert.rejects(service.redeem({...p,account:'other'},input,()=>{}),/wrong_account/);
});
test('client rejects malformed successful upstream responses',async t=>{
 const f=config(t),verifier=createPlayRelay({configPath:f.path,fetcher:async()=>Response.json({})});
 await assert.rejects(verifier.verify(product,token),/verification_unavailable/);
 await assert.rejects(verifier.consume(product,token),/verification_unavailable/);
});

test('hashed server secret authenticates and fails closed on malformed digest',async()=>{
 const secretHash=createHash('sha256').update(secret).digest('hex');
 const handler=createRelayHandler({secretHash,accessToken:async()=>'google'});
 assert.equal((await handler(request({action:'invalid'}))).status,400);
 assert.equal((await handler(request({},'b'.repeat(64)))).status,401);
 assert.equal((await createRelayHandler({secretHash:secretHash+'a'})(request({}))).status,503);
});
