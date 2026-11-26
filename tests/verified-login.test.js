import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAccounts,AUTH_REDIRECT} from '../server/accounts.js';
import {googleReply} from './google-fixture.js';

function setup(t,change=()=>{}){
 const dir=mkdtempSync(join(tmpdir(),'cockro-proof-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,options});
  const body=googleReply(url,'g1','user@example.com');
  change(body,url,options);
  return {ok:true,json:async()=>body};
 };
 return {accounts:createAccounts(dir,{fetcher}),calls};
}
test('email link resumes an existing Google account only after verification; no email signup',async t=>{
 const {accounts,calls}=setup(t);
 const emailFlow=()=>accounts.authStart(null,'emailLogin','User@example.com');
 let flow=await emailFlow();
 const sent=calls.at(-1);
 assert.equal(new URL(sent.url).searchParams.get('redirect_to'),AUTH_REDIRECT);
 assert.equal(JSON.parse(sent.options.body).create_user,false);
 assert.equal(sent.options.body.includes('code_verifier'),false);
 await assert.rejects(emailFlow(),/rate_limit/);
 await assert.rejects(accounts.authFinish(flow.flow,'confirmed'),/google_registration_required/);
 flow=await accounts.authStart();
 const original=await accounts.authFinish(flow.flow,'from-google');
 flow=await emailFlow();
 const restored=await accounts.authFinish(flow.flow,'from-email');
 assert.equal(accounts.resolve(restored.token),accounts.resolve(original.token));
 assert.equal(restored.passwordReset,false);assert.equal(restored.accountDeletionReady,false);
 await assert.rejects(accounts.authFinish(flow.flow,'again'),/auth_expired/);
});
test('unverified mailbox and unmatched Google proof cannot register',async t=>{
 for(const change of [
  (body,url)=>{if(url.endsWith('/auth/v1/user'))delete body.email_confirmed_at;},
  (body,url)=>{if(url.endsWith('/userinfo'))body.email_verified=false;},
  (body,url)=>{if(url.endsWith('/userinfo'))body.sub='different';},
  (body,url)=>{if(url.includes('/token?'))delete body.provider_token;}
 ]){
  const {accounts}=setup(t,change);const flow=await accounts.authStart();
  await assert.rejects(accounts.authFinish(flow.flow,'code'),/email_unverified|google_required/);
 }
});
test('email login binds the mailbox in the request to the verified identity',async t=>{
 const {accounts}=setup(t);
 await assert.rejects(accounts.authStart(null,'emailLogin','bad'),/invalid_email/);
 const flow=await accounts.authStart(null,'emailLogin','other@example.com');
 await assert.rejects(accounts.authFinish(flow.flow,'confirmed'),/auth_failed/);
});
