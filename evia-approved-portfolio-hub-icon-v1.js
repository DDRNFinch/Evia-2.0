(()=>{'use strict';
const arch=document.getElementById('naxosArch');
if(!arch)return;
if(window.EviaPlusLauncher||document.getElementById('eviaPlusMenu')||arch.querySelector('.evia-plus-glyph'))return;
arch.innerHTML=`<svg class="evia-portfolio-hub-mark" viewBox="0 0 48 38" aria-hidden="true" focusable="false"><g fill="none" stroke="rgba(255,255,255,.98)" stroke-width="2.35" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7h17v24H16z"/><path d="M12 4h17v3M12 4v24h4"/><path d="M20 14h9M20 19h9M20 24h7"/><path d="M7 23V11"/><path d="m3.5 14.5 3.5-3.5 3.5 3.5"/><path d="M41 15v12"/><path d="m37.5 23.5 3.5 3.5 3.5-3.5"/></g></svg>`;
if(!document.getElementById('eviaPortfolioHubIconStyles')){
  const style=document.createElement('style');
  style.id='eviaPortfolioHubIconStyles';
  style.textContent='.evia-portfolio-hub-mark{width:42px;height:34px;display:block;overflow:visible}.naxos-arch .evia-portfolio-hub-mark{flex:0 0 auto}';
  document.head.appendChild(style);
}
window.EviaPortfolioHubIcon={version:1};
})();
