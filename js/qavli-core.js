/* QAVLI Premium 2.1 runtime */
(function(){
  document.documentElement.classList.add('qavli-premium');
  document.body.classList.add('qavli-premium');

  const boot=document.createElement('div');
  boot.id='qavli-boot';
  boot.innerHTML='<div class="qb"><div class="qm">Q</div><strong>QAVLI</strong><span>PRIVATE MESSAGING</span></div>';
  document.body.prepend(boot);

  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='css/premium.css?v=21';
  document.head.appendChild(link);

  window.QAVLI=Object.freeze({
    version:'2.1-premium',
    clampText(value,max){return String(value??'').trim().slice(0,max)},
    debounce(fn,delay=250){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay)}},
    prefersReducedMotion:()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true
  });

  let ready=false;
  const finish=()=>{
    if(ready)return; ready=true;
    setTimeout(()=>boot.classList.add('hide'),180);
    setTimeout(()=>boot.remove(),520);
  };
  window.addEventListener('qavli-auth-ready',finish,{once:true});
  const observer=new MutationObserver(()=>{const home=document.getElementById('vhome'),setup=document.getElementById('vsetup');if(home?.classList.contains('on')||setup?.classList.contains('on')){observer.disconnect();finish();}});
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  setTimeout(finish,4500);
})();