/* QAVLI 2.0 lightweight core helpers. Firebase data flows remain in the existing app until each module is migrated. */
window.QAVLI=Object.freeze({
  version:'2.0-foundation',
  clampText(value,max){return String(value??'').trim().slice(0,max)},
  debounce(fn,delay=250){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),delay)}},
  prefersReducedMotion:()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true
});
