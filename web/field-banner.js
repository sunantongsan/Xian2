// The native AdView reports its size in WebView pixels after it receives a creative.
export function installFieldBanner(resizeGame){
 if(!document.querySelector)return;
 const slot=document.querySelector('.sector-card'),hud=document.getElementById('hud');
 const modal=document.getElementById('modal'),menu=document.getElementById('menuBtn');
 if(!slot||!hud||!menu)return;
 let frame=0,last='',reserved=0;
 function bounds(){
  const r=slot.getBoundingClientRect(),combat=document.querySelector('#controls .combat')?.getBoundingClientRect();
  const left=Math.max(menu.getBoundingClientRect().right,document.getElementById('characterShortcut').getBoundingClientRect().right);
  return {type:'fieldBanner',visible:!hud.hidden&&!modal?.open&&!document.hidden&&menu.getAttribute('aria-expanded')!=='true',
   viewportWidth:innerWidth,right:Math.max(0,innerWidth-r.right),top:Math.max(0,r.top),
   maxWidth:Math.max(0,r.right-left-16),maxHeight:Math.max(0,Math.min(innerHeight*.25,(combat?.top??innerHeight)-r.top-16))};
 }
 function reserve(height){
  if(height===reserved)return;
  reserved=height;
  document.documentElement.style.setProperty('--field-ad-inset',height+'px');
  resizeGame();
 }
 function collapse(){
  slot.classList.remove('ad-loaded');slot.style.removeProperty('--ad-width');slot.style.removeProperty('--ad-height');reserve(0);
 }
 function sync(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  const message=bounds();
  if(hud.hidden)collapse(); // a window or the menu only hides the ad; the game keeps its size
  const key=JSON.stringify(message);if(key===last)return;
  if(window.CockroAds?.postMessage){window.CockroAds.postMessage(key);last=key;}
 });}
 window.addEventListener('cockro-field-banner',e=>{
  const {loaded,width,height}=e.detail||{},b=bounds();
  if(!b.visible)return;
  if(!loaded||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width>b.maxWidth||height>b.maxHeight){collapse();return;}
  slot.style.setProperty('--ad-width',width+'px');slot.style.setProperty('--ad-height',height+'px');slot.classList.add('ad-loaded');sync();
  reserve(Math.ceil(b.top+height+8));
 });
 window.addEventListener('resize',sync);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',sync);
 const observer=new MutationObserver(sync);
 observer.observe(hud,{attributes:true,attributeFilter:['hidden']});
 observer.observe(menu,{attributes:true,attributeFilter:['aria-expanded']});
 if(modal)observer.observe(modal,{attributes:true,attributeFilter:['open']});
 window.addEventListener('cockro-ad',sync);sync();
}
