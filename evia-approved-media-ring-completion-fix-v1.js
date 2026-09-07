(()=>{'use strict';
const STYLE_ID='eviaMediaRingCompletionFixV1Styles';
const SVG_NS='http://www.w3.org/2000/svg';
const YELLOW='#f5c400';
function clean(v){return String(v??'').trim()}
function dockGuidedControl(){
  const next=document.querySelector('#evidenceTop .evia-guided-next');if(!next)return;
  const videoToggle=document.getElementById('recordToggle');
  const audioToggle=document.getElementById('audioToggle');
  if(videoToggle){
    const dock=videoToggle.closest('.capture-controls');
    if(dock&&next.parentElement!==dock)dock.appendChild(next);
    return;
  }
  if(audioToggle){
    const dock=audioToggle.parentElement;
    if(dock&&next.parentElement!==dock)audioToggle.insertAdjacentElement('afterend',next);
  }
}
function ensureCompletionVisual(){
  const el=document.getElementById('flyingFile');if(!el)return;
  if(!el.querySelector('.evia-complete-arrow')){const arrow=document.createElement('span');arrow.className='evia-complete-arrow';arrow.setAttribute('aria-hidden','true');el.appendChild(arrow)}
  if(!el.querySelector('.evia-complete-visual-svg')){
    const svg=document.createElementNS(SVG_NS,'svg');svg.setAttribute('class','evia-complete-visual-svg');svg.setAttribute('viewBox','0 0 120 120');svg.setAttribute('aria-hidden','true');
    const sweep=document.createElementNS(SVG_NS,'circle');sweep.setAttribute('class','evia-complete-sweep');sweep.setAttribute('cx','60');sweep.setAttribute('cy','60');sweep.setAttribute('r','51');sweep.setAttribute('pathLength','100');
    const fill=document.createElementNS(SVG_NS,'circle');fill.setAttribute('class','evia-complete-fill');fill.setAttribute('cx','60');fill.setAttribute('cy','60');fill.setAttribute('r','48');
    const tick=document.createElementNS(SVG_NS,'path');tick.setAttribute('class','evia-complete-tick');tick.setAttribute('d','M35 61 L52 78 L86 42');tick.setAttribute('pathLength','100');
    svg.append(sweep,fill,tick);el.appendChild(svg);
  }
}
function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
    .evia-ring-dot-orbit,.bottom-arches .evia-ring-marker-group{display:none!important}
    #evidenceTop .evia-guided-actions{min-height:0!important;margin-top:0!important}
    #evidenceTop .capture-controls .evia-guided-next{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;margin:0!important;min-width:150px!important;z-index:5!important}
    #evidenceTop .audio-panel>.evia-guided-next{position:relative!important;margin:0!important;min-width:150px!important;z-index:5!important}
    .flying-file.evia-final-download{opacity:1!important;animation:eviaCompletionContainerFix 1180ms cubic-bezier(.22,1,.36,1) both!important}
    .flying-file.evia-final-download::before{animation:none!important;background:#fff!important;border-color:rgba(78,78,78,.72)!important}
    .flying-file .evia-complete-arrow{background:${YELLOW}!important;z-index:6!important}
    .flying-file.evia-final-download .evia-complete-arrow{animation:eviaCompletionArrowFix 1120ms cubic-bezier(.22,1,.36,1) both!important}
    .evia-complete-visual-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:5;pointer-events:none}
    .evia-complete-sweep{fill:none;stroke:${YELLOW};stroke-width:8;stroke-linecap:round;stroke-dasharray:0 100;transform:rotate(-90deg);transform-origin:60px 60px}
    .evia-complete-fill{fill:${YELLOW};opacity:0;transform-origin:60px 60px;transform:scale(.84)}
    .evia-complete-tick{fill:none;stroke:#fff;stroke-width:9;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:100;stroke-dashoffset:100;opacity:0}
    .flying-file.evia-final-download .evia-complete-sweep{animation:eviaCompletionSweepFix 1120ms cubic-bezier(.22,1,.36,1) both}
    .flying-file.evia-final-download .evia-complete-fill{animation:eviaCompletionFillFix 1120ms cubic-bezier(.22,1,.36,1) both}
    .flying-file.evia-final-download .evia-complete-tick{animation:eviaCompletionTickFix 1120ms cubic-bezier(.22,1,.36,1) both}
    @keyframes eviaCompletionContainerFix{0%{transform:translate(-50%,-50%) scale(.86)}12%{transform:translate(-50%,-50%) scale(1.02)}88%{transform:translate(-50%,-50%) scale(1)}100%{transform:translate(-50%,-50%) scale(.96)}}
    @keyframes eviaCompletionArrowFix{0%{opacity:0;transform:translate(-50%,-22px)}10%{opacity:1}32%{opacity:1;transform:translate(-50%,7px)}44%,100%{opacity:0;transform:translate(-50%,9px)}}
    @keyframes eviaCompletionSweepFix{0%,28%{stroke-dasharray:0 100;opacity:0}32%{opacity:1}62%,100%{stroke-dasharray:100 100;opacity:1}}
    @keyframes eviaCompletionFillFix{0%,56%{opacity:0;transform:scale(.84)}68%,100%{opacity:1;transform:scale(1)}}
    @keyframes eviaCompletionTickFix{0%,65%{opacity:0;stroke-dashoffset:100}70%{opacity:1}90%,100%{opacity:1;stroke-dashoffset:0}}
    html.evia-reduce-motion .flying-file.evia-final-download,html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-arrow,html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-sweep,html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-fill,html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-tick{animation:none!important}
    html.evia-reduce-motion .flying-file.evia-final-download{opacity:1!important}
    html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-arrow{opacity:0!important}
    html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-sweep{stroke-dasharray:100 100!important;opacity:1!important}
    html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-fill{opacity:1!important;transform:scale(1)!important}
    html.evia-reduce-motion .flying-file.evia-final-download .evia-complete-tick{opacity:1!important;stroke-dashoffset:0!important}
  `;document.head.appendChild(style);
}
function sync(){dockGuidedControl();ensureCompletionVisual()}
function boot(){injectStyles();sync();const root=document.getElementById('screen')||document.body;new MutationObserver(()=>requestAnimationFrame(sync)).observe(root,{childList:true,subtree:true});window.addEventListener('resize',()=>requestAnimationFrame(sync))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
