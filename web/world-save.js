import {t,ui} from './i18n.js';
// Persisted server state; never accepted from a client save command.
export function normalizeWorldSave(s,v){
 const w=v.worldState;
 if(w&&['town','forest','star','aurora','ruins','depths'].includes(w.map)&&['x','y','hp','mp'].every(k=>Number.isFinite(w[k]))&&Math.abs(w.x)<1e6&&Math.abs(w.y)<1e6){
  s.worldState={townRevision:w.townRevision===711?711:0,mapRevision:Number.isSafeInteger(w.mapRevision)?w.mapRevision:0,map:w.map,x:w.x,y:w.y,hp:Math.max(0,w.hp),mp:Math.max(0,w.mp),cd:Object.fromEntries(Object.entries(w.cd||{}).filter(([k,n])=>/^[a-zA-Z0-9_-]{1,40}$/.test(k)&&Number.isFinite(n)&&n>=0)),offlineSince:Number.isFinite(w.offlineSince)?w.offlineSince:0};
 }
 s.pvpReports=(Array.isArray(v.pvpReports)?v.pvpReports:[]).filter(r=>r&&typeof r.id==='string'&&Number.isFinite(r.at)).slice(-30).map(r=>({id:r.id.slice(0,80),at:r.at,opponent:String(r.opponent||t('ผู้เล่น')).slice(0,40),result:['won','lost','escaped','interrupted'].includes(r.result)?r.result:'interrupted',damageTaken:Math.max(0,Number(r.damageTaken)||0),damageDealt:Math.max(0,Number(r.damageDealt)||0),potions:Math.max(0,Number(r.potions)||0),mpPotions:Math.max(0,Number(r.mpPotions)||0),unread:r.unread!==false,pending:r.pending===true}));
}

