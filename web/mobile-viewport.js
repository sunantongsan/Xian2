// Keep dialogs above the software keyboard in Android WebView and browsers.
export function installMobileViewport(){
if(!document.documentElement)return;
let frame;
function syncViewport(){
 cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  const v=window.visualViewport,style=document.documentElement.style;
  document.documentElement.classList.toggle('short-viewport',(v?.height||innerHeight)<300);
  style.setProperty('--visible-height',`${Math.round(v?.height||innerHeight)}px`);
  style.setProperty('--visible-top',`${Math.round(v?.offsetTop||0)}px`);
 });
}
window.visualViewport?.addEventListener('resize',syncViewport);
window.visualViewport?.addEventListener('scroll',syncViewport);
window.addEventListener('resize',syncViewport);
window.addEventListener('pageshow',syncViewport);
window.addEventListener('orientationchange',syncViewport);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncViewport();});
syncViewport();

}
