import {t,ui} from './i18n.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function forgeResultHTML({success,icon='',name='',plus=0,stats='',message=''}){
 return `<section class="forge-result ${success?'forge-result-success':'forge-result-failure'}" role="status"><div class="forge-result-sigil" aria-hidden="true">${success?'✦':'◇'}</div><h2>${success?t('ตีบวกสำเร็จ!'):t('ตีบวกล้มเหลว')}</h2>${success?`<div class="forge-result-item"><div class="forge-result-icon">${icon}<b>+${Number(plus)||0}</b></div><div><h3>${escape(name)}</h3><p class="stat-gain">${escape(stats)}</p></div></div>`:`<p class="forge-result-message">${escape(message||t('การตีบวกครั้งนี้ไม่สำเร็จ'))}</p>`}<button id="forgeContinue">${success?t('ตีบวกต่อ'):t('กลับไปตีบวก')}</button></section>`;
}
