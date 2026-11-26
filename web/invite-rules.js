import {thb} from './token-economy.js';
export const WELCOME=thb(1), INVITED=thb(5), INVITER=thb(20);
export function normalizeInviteCode(value){
 if(typeof value!=='string'||! /^[a-zA-Z0-9]{4,16}$/.test(value.trim()))return '';
 return value.trim().toUpperCase();
}
export function inviteLink(code){
 const value=normalizeInviteCode(code);
 if(!value)throw Error('referral_format');
 return 'https://cockro-game-updates.vercel.app/play/invite.html?ref='+value;
}
