(()=>{'use strict';
const STYLE_ID='eviaEvidenceCaptureLayoutV1Styles';
const PAID_HOURS_RE=/completed\s+during\s+paid\s+working\s+hours/i;
function root(){try{return typeof screen!=='undefined'&&screen?.classList?screen:document.getElementById('screen')}catch{return document.getElementById('screen')}}
function visualStep(step){return !!step&&['video','photo','photo-range'].includes(String(step.type||'').toLowerCase())}
function setVisual(active){const el=root();if(!el)return;el.classList.toggle('evia-visual-capture-active',!!active)}
function removePaidHoursFromEvidence(){
  const evidence=document.querySelector('.evidence-screen');
  if(!evidence||!root()?.classList.contains('evidence-open'))return;
  evidence.querySelectorAll('input[type="checkbox"],[role="checkbox"]').forEach(control=>{
    const label=control.closest('label');
    const wrapper=label||control.parentElement;
    if(wrapper&&PAID_HOURS_RE.test(String(wrapper.textContent||'')))wrapper.remove();
  });
  evidence.querySelectorAll('label,span,p,div').forEach(node=>{
    if(!node.isConnected||node.children.length>2||!PAID_HOURS_RE.test(String(node.textContent||'')))return;
    const text=String(node.textContent||'').replace(/\s+/g,' ').trim();
    if(!PAID_HOURS_RE.test(text))return;
    const wrapper=node.closest('label')||node;
    if(wrapper.querySelector('input[type="checkbox"],[role="checkbox"]')||wrapper===node)wrapper.remove();
  });
}
function flashPhotoCapture(){
  const square=document.querySelector('#evidenceTop .capture-square');
  if(!square||!root()?.classList.contains('evidence-open'))return;
  square.querySelector('.evia-photo-flash')?.remove();
  const flash=document.createElement('div');
  flash.className='evia-photo-flash';
  flash.setAttribute('aria-hidden','true');
  square.appendChild(flash);
  const remove=()=>flash.remove();
  flash.addEventListener('animationend',remove,{once:true});
  setTimeout(remove,260);
}
function syncVisual(){const el=root();if(!el)return;const live=!!document.querySelector('#evidenceTop .capture-square #captureVideo')&&!!document.querySelector('#evidenceTop #recordToggle,#evidenceTop #photoCapture,#evidenceTop #naxosPhotoCapture');setVisual(el.classList.contains('evidence-open')&&live);removePaidHoursFromEvidence()}
function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
    .screen.evidence-open.evia-visual-capture-active .evia-speech,
    .screen.evidence-open.evia-visual-capture-active .course-title{
      opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:opacity 120ms ease!important;
    }
    .screen.evidence-open.evia-visual-capture-active .evidence-screen{
      top:calc(max(18px, env(safe-area-inset-top)) + 78px)!important;
      bottom:calc(max(62px, env(safe-area-inset-bottom) + 62px) + 8px)!important;
      width:min(calc(100vw - 18px),540px)!important;
      grid-template-rows:auto minmax(0,1fr)!important;
      gap:9px!important;
      align-content:start!important;
    }
    .screen.evidence-open.evia-visual-capture-active .evidence-top{
      display:block!important;min-height:0!important;height:auto!important;overflow:visible!important;
    }
    .screen.evidence-open.evia-visual-capture-active .capture-surface{
      width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:7px!important;border-radius:24px!important;overflow:visible!important;
    }
    .screen.evidence-open.evia-visual-capture-active .capture-square{
      position:relative!important;width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;
      aspect-ratio:1 / 1!important;border-radius:20px!important;overflow:hidden!important;background:#111!important;
    }
    .screen.evidence-open.evia-visual-capture-active .capture-square>video{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;
      object-fit:cover!important;display:block!important;border-radius:0!important;
    }
    .screen.evidence-open.evia-visual-capture-active .capture-controls{
      position:absolute!important;left:12px!important;right:12px!important;bottom:14px!important;z-index:4!important;display:flex!important;justify-content:center!important;align-items:center!important;gap:9px!important;transform:none!important;
    }
    .screen.evidence-open.evia-visual-capture-active .recording-timer{
      position:absolute!important;top:14px!important;left:14px!important;z-index:4!important;color:#fff!important;-webkit-text-fill-color:#fff!important;text-shadow:0 1px 2px rgba(0,0,0,.58)!important;
    }
    .screen.evidence-open .evia-photo-flash{
      position:absolute!important;inset:0!important;z-index:8!important;background:#fff!important;pointer-events:none!important;opacity:0;animation:eviaPhotoCaptureFlash 190ms ease-out both;
    }
    @keyframes eviaPhotoCaptureFlash{0%{opacity:0}22%{opacity:.96}100%{opacity:0}}
    .screen.evidence-open.evia-visual-capture-active .capture-status{
      margin:6px 4px 0!important;min-height:0!important;text-align:center!important;
    }
    .screen.evidence-open.evia-visual-capture-active .capture-status:empty{display:none!important}
    .screen.evidence-open.evia-visual-capture-active .evidence-requirements{
      min-height:0!important;height:auto!important;overflow-y:auto!important;overscroll-behavior:contain!important;margin:0!important;align-self:stretch!important;
      padding-top:14px!important;
    }
    .screen.evidence-open.evia-visual-capture-active .evia-evidence-task-title{margin-top:0!important}
    @media(max-height:650px){
      .screen.evidence-open.evia-visual-capture-active .evidence-screen{top:calc(max(14px, env(safe-area-inset-top)) + 72px)!important;width:min(calc(100vw - 14px),500px)!important}
      .screen.evidence-open.evia-visual-capture-active .capture-surface{padding:5px!important}
    }
  `;document.head.appendChild(style);
}
injectStyles();

try{
  if(typeof saveEvidenceBlob==='function'&&!saveEvidenceBlob.__eviaPhotoFlash){
    const original=saveEvidenceBlob;
    const wrapped=async function(){const result=await original.apply(this,arguments);if(String(arguments[1]||'').toLowerCase()==='photo')flashPhotoCapture();return result};
    wrapped.__eviaPhotoFlash=true;saveEvidenceBlob=wrapped;
  }
}catch{}
try{
  if(typeof runCaptureStep==='function'){
    const original=runCaptureStep;
    runCaptureStep=function(){let step=null;try{step=capturePlan?.[captureStepIndex]}catch{}setVisual(visualStep(step));const result=original.apply(this,arguments);requestAnimationFrame(syncVisual);return result};
  }
}catch{}
try{
  if(typeof renderEvidenceChoices==='function'){
    const original=renderEvidenceChoices;renderEvidenceChoices=function(){setVisual(false);return original.apply(this,arguments)};
  }
}catch{}
try{
  if(typeof cancelEvidenceCollectionToChoices==='function'){
    const original=cancelEvidenceCollectionToChoices;cancelEvidenceCollectionToChoices=function(){setVisual(false);return original.apply(this,arguments)};
  }
}catch{}
try{
  if(typeof clearCaptureSequence==='function'){
    const original=clearCaptureSequence;clearCaptureSequence=function(){const result=original.apply(this,arguments);setVisual(false);return result};
  }
}catch{}
try{
  if(typeof completeCaptureStep==='function'){
    const original=completeCaptureStep;completeCaptureStep=async function(){const result=await original.apply(this,arguments);requestAnimationFrame(syncVisual);return result};
  }
}catch{}
try{
  if(typeof showCaptureStatus==='function'){
    const original=showCaptureStatus;showCaptureStatus=function(message){const text=String(message??'').trim().toLowerCase();const active=root()?.classList.contains('evia-visual-capture-active');return original.call(this,active&&(text==='video'||text==='photo')?'':message)};
  }
}catch{}

const observer=new MutationObserver(()=>requestAnimationFrame(syncVisual));
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',()=>setTimeout(syncVisual,0),true);
window.addEventListener('pageshow',syncVisual);
window.addEventListener('resize',()=>requestAnimationFrame(syncVisual));
setTimeout(syncVisual,0);
window.EviaEvidenceCaptureLayout={version:2,sync:syncVisual,flashPhoto:flashPhotoCapture};
})();
