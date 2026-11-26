import {inviteLink,normalizeInviteCode} from './invite-rules.js';
import {language} from './i18n.js';

export const inviteText=(thai,english)=>language.current==='en'?english:thai;
const pendingKey='cockro-registration-invite';
function fromLink(){
 const url=new URL(location.href);
 const value=normalizeInviteCode(url.searchParams.get('ref'));
 if(value)sessionStorage.setItem(pendingKey,value);
 return value;
}
export function prefillInvite(input){
 let edited=false;
 const fill=()=>{
  if(!edited)input.value=normalizeInviteCode(globalThis.CockroInvite?.getCode())||fromLink()||sessionStorage.getItem(pendingKey)||'';
 };
 fill();
 const update=()=>{if(!input.isConnected){window.removeEventListener('cockro-invite',update);return;}fill();};
 window.addEventListener('cockro-invite',update);
 input.addEventListener('input',()=>{edited=true;sessionStorage.setItem(pendingKey,input.value);});
}
export function clearInvite(){
 sessionStorage.removeItem(pendingKey);globalThis.CockroInvite?.clearCode();
}
export function inviteError(reason){
 const messages={
  referral_invalid:['ไม่พบรหัสแนะนำนี้ กรุณาตรวจรหัส','Unknown invite code. Check the code.'],
  referral_self:['ใช้รหัสของตัวเองไม่ได้','You cannot use your own code.'],
  referral_taken:['มีผู้ใช้รหัสนี้แล้ว','This code is already taken.'],
  referral_format:['ใช้ A–Z หรือ 0–9 จำนวน 4–16 ตัว','Use 4–16 letters A–Z or digits.'],
  reward_budget_unavailable:['รางวัลสมัครเต็มแล้ว กรุณาลองภายหลัง','Registration rewards are exhausted. Please try again later.'],
  character_required:['กรุณาสร้างตัวละครก่อนสร้างรหัส','Create your character before creating an invite code.']
 };
 return messages[reason]?inviteText(...messages[reason]):null;
}
export async function shareInvite(code,field){
 const url=inviteLink(code);
 if(globalThis.CockroInvite?.share){globalThis.CockroInvite.share(code);return;}
 if(navigator.share){
  try{await navigator.share({title:'COCKRO MAN',url});return;}catch(e){if(e.name==='AbortError')return;}
 }
 try{await navigator.clipboard.writeText(url);return inviteText('คัดลอกลิงก์แล้ว','Link copied');}
 catch{field.focus();field.select();return inviteText('กดค้างเพื่อคัดลอกลิงก์','Press and hold to copy the link');}
}
