// Model the two identity authorities independently of the account/session file store.
export function googleReply(url,id,email=id+'@example.com',access='test'){
 const proof={sub:'google:'+id,email,email_verified:true};
 if(url.includes('/token?'))return {access_token:access,provider_token:'google-provider-token'};
 if(url==='https://openidconnect.googleapis.com/v1/userinfo')return proof;
 return {id,email,email_confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{full_name:'Owner'},
  identities:[{provider:'google',identity_data:proof}]};
}
