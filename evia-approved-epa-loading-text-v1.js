(()=>{'use strict';
const FLAG='__eviaEpaLoadingTextV1';
if(globalThis[FLAG])return;
const STYLE_ID='eviaEpaLoadingTextV1Styles';
const LOADER_ID='epaV2LoadingOverlay';
const FIVE_SECONDS=5000;
let minimumUntil=0;
let hideTimer=0;

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
#screen #eviaEpaZoneV2 .evia-epa-speech-v2{
  min-height:0!important;
  padding:0!important;
  border:0!important;
  border-radius:0!important;
  background:transparent!important;
  box-shadow:none!important;
  color:#fff!important;
}
#screen #eviaEpaZoneV2 .evia-epa-speech-v2.evia-epa-speech-reveal-v1{
  animation:eviaEpaSpeechRevealV1 760ms cubic-bezier(.22,1,.36,1) both;
}
.evia-epa-loading-v1{
  position:absolute;
  left:50%;
  top:calc(max(16px,env(safe-area-inset-top)) + 166px);
  bottom:76px;
  width:min(calc(100vw - 26px),500px);
  transform:translateX(-50%);
  display:none;
  place-items:center;
  z-index:7;
  pointer-events:auto;
}
.evia-epa-loading-v1.show{display:grid}
.evia-epa-loading-spinner-v1{
  position:relative;
  width:66px;
  height:66px;
}
.evia-epa-loading-spinner-v1 i{
  --dot-angle:calc(var(--i) * 45deg);
  position:absolute;
  left:28px;
  top:28px;
  width:10px;
  height:10px;
  border-radius:50%;
  background:#f5c400;
  opacity:.2;
  transform:rotate(var(--dot-angle)) translateY(-25px) scale(.62);
  transform-origin:5px 5px;
  animation:eviaEpaLoaderDotV1 900ms linear infinite;
  animation-delay:calc(var(--i) * -112.5ms);
  box-shadow:0 0 9px rgba(245,196,0,.2);
}
@keyframes eviaEpaLoaderDotV1{
  0%,100%{opacity:.2;transform:rotate(var(--dot-angle)) translateY(-25px) scale(.62)}
  22%{opacity:1;transform:rotate(var(--dot-angle)) translateY(-25px) scale(1.18)}
  48%{opacity:.64;transform:rotate(var(--dot-angle)) translateY(-25px) scale(.88)}
  72%{opacity:.34;transform:rotate(var(--dot-angle)) translateY(-25px) scale(.72)}
}
@keyframes eviaEpaSpeechRevealV1{
  0%{opacity:0;clip-path:inset(0 100% 0 0);transform:translateX(-8px)}
  28%{opacity:1}
  100%{opacity:1;clip-path:inset(0 0 0 0);transform:translateX(0)}
}
@media(prefers-reduced-motion:reduce){
  #screen #eviaEpaZoneV2 .evia-epa-speech-v2.evia-epa-speech-reveal-v1{animation:none!important}
  .evia-epa-loading-spinner-v1 i{animation:none!important;opacity:.72!important}
}
`;
  document.head.appendChild(s);
}

function zone(){return document.getElementById('eviaEpaZoneV2')}
function panel(){return document.getElementById('epaV2Panel')}
function speechNode(){return document.getElementById('epaV2Speech')}

function ensureLoader(){
  const z=zone();
  if(!z)return null;
  let x=document.getElementById(LOADER_ID);
  if(x)return x;
  x=document.createElement('div');
  x.id=LOADER_ID;
  x.className='evia-epa-loading-v1';
  x.setAttribute('aria-hidden','true');
  x.innerHTML=`<div class="evia-epa-loading-spinner-v1" role="status" aria-label="Loading EPA practice">${Array.from({length:8},(_,i)=>`<i style="--i:${i}" aria-hidden="true"></i>`).join('')}</div>`;
  z.appendChild(x);
  return x;
}

function showLoader(){
  const x=ensureLoader();
  if(!x)return;
  x.classList.add('show');
  x.setAttribute('aria-hidden','false');
}

function hideLoader(){
  const x=document.getElementById(LOADER_ID);
  if(!x)return;
  x.classList.remove('show');
  x.setAttribute('aria-hidden','true');
}

function preparingQuestion(){
  const text=String(panel()?.textContent||'').replace(/\s+/g,' ').trim();
  return /Preparing expert questions|Preparing your question/i.test(text);
}

function syncLoader(){
  clearTimeout(hideTimer);
  hideTimer=0;
  const z=zone();
  if(!z||!z.classList.contains('open')){
    minimumUntil=0;
    hideLoader();
    return;
  }
  const waiting=preparingQuestion();
  const remaining=Math.max(0,minimumUntil-Date.now());
  if(waiting||remaining>0)showLoader();
  else hideLoader();
  if(!waiting&&remaining>0)hideTimer=setTimeout(syncLoader,remaining+30);
}

function revealSpeech(){
  const x=speechNode();
  if(!x)return;
  if(!String(x.textContent||'').trim()){
    x.classList.remove('evia-epa-speech-reveal-v1');
    return;
  }
  x.classList.remove('evia-epa-speech-reveal-v1');
  void x.offsetWidth;
  x.classList.add('evia-epa-speech-reveal-v1');
}

function isMcqReadyClick(target){
  const button=target instanceof Element?target.closest('#eviaEpaReadyV2'):null;
  if(!button)return false;
  return /Multiple-choice test/i.test(String(panel()?.textContent||''));
}

document.addEventListener('click',event=>{
  if(!isMcqReadyClick(event.target))return;
  minimumUntil=Date.now()+FIVE_SECONDS;
  showLoader();
  clearTimeout(hideTimer);
  hideTimer=setTimeout(syncLoader,FIVE_SECONDS+30);
},true);

installStyles();
const observer=new MutationObserver(mutations=>{
  let panelChanged=false;
  let speechChanged=false;
  for(const mutation of mutations){
    const target=mutation.target?.nodeType===Node.TEXT_NODE?mutation.target.parentElement:mutation.target;
    if(target instanceof Element){
      if(target.id==='epaV2Panel'||target.closest?.('#epaV2Panel'))panelChanged=true;
      if(target.id==='epaV2Speech'||target.closest?.('#epaV2Speech'))speechChanged=true;
    }
  }
  if(panelChanged)syncLoader();
  if(speechChanged)revealSpeech();
  ensureLoader();
});
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
queueMicrotask(()=>{ensureLoader();syncLoader();revealSpeech()});
Object.defineProperty(globalThis,FLAG,{value:true,writable:false,configurable:false});
})();
