// The native SDK owns the ad creative. Only reserve its reported, unscaled size.
export function installFieldBanner(){
 if(!document.documentElement||!document.querySelector)return;
 const slot=document.querySelector('.sector-card'),hud=document.getElementById('hud'),modal=document.getElementById('modal');
 if(!slot||!hud)return;
 let frame=0,last='';
 const collapse=()=>{slot.classList.remove('ad-loaded');slot.style.removeProperty('--ad-width');slot.style.removeProperty('--ad-height');};
 function sync(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  const r=slot.getBoundingClientRect(),left=document.querySelector('#quickMenuToggle')?.getBoundingClientRect().right||160;
  const control=document.querySelector('#controls .combat')?.getBoundingClientRect();
  const visible=!hud.hidden&&!modal?.open&&!document.hidden;
  if(!visible)collapse();
  const message={type:'fieldBanner',visible,viewportWidth:innerWidth,right:Math.max(0,innerWidth-r.right),top:Math.max(0,r.top),maxWidth:Math.max(0,innerWidth-left-24),maxHeight:Math.max(0,(control?.top||innerHeight)-r.top-20)};
  const key=JSON.stringify(message);if(key===last)return;
  try{if(window.CockroAds?.postMessage){window.CockroAds.postMessage(key);last=key;}}catch{}
 });}
 window.addEventListener('cockro-field-banner',e=>{const d=e.detail||{};if(d.loaded===true&&Number.isFinite(d.width)&&Number.isFinite(d.height)&&d.width>0&&d.height>0&&d.width<=innerWidth&&d.height<=innerHeight&&!hud.hidden&&!modal?.open&&!document.hidden){slot.style.setProperty('--ad-width',d.width+'px');slot.style.setProperty('--ad-height',d.height+'px');slot.classList.add('ad-loaded');}else collapse();});
 window.addEventListener('resize',sync);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',sync);
 new MutationObserver(sync).observe(hud,{attributes:true,attributeFilter:['hidden']});
 if(modal)new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['open']});
 window.addEventListener('cockro-ad',sync);sync();
}
