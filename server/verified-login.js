// Both the Supabase user and OAuth provider token come from the server-side PKCE exchange.
export function emailAddress(value){
 if(typeof value!=='string')return '';
 const email=value.trim().toLowerCase();
 return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'';
}
export async function verifiedIdentity(user,session,requestedEmail,fetcher){
 const email=emailAddress(user.email);
 if(!email||!user.email_confirmed_at)throw Error('email_unverified');
 const google=user.identities?.find(i=>i.provider==='google'&&emailAddress(i.identity_data?.email)===email);
 const subject=google?.identity_data?.sub;
 if(typeof subject!=='string'||!subject)throw Error('google_required');
 if(requestedEmail){
  if(requestedEmail!==email)throw Error('auth_failed');
 }else{
  if(!session.provider_token)throw Error('google_required');
  const response=await fetcher('https://openidconnect.googleapis.com/v1/userinfo',{
   headers:{Authorization:'Bearer '+session.provider_token},signal:AbortSignal.timeout(10000)
  });
  if(!response.ok)throw Error('auth_failed');
  const proof=await response.json();
  if(proof.sub!==subject||proof.email_verified!==true||emailAddress(proof.email)!==email)throw Error('email_unverified');
 }
 return {email,googleSubject:subject};
}
