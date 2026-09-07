(()=>{'use strict';
const STYLE_ID='eviaEpaUiFixV1Styles';
const HOST_CLASS='evia-epa-home-character-host-v84';
let homeStage=null;
let homeFloat=null;

function installStyles(){
  const existing=document.getElementById(STYLE_ID);
  if(existing)existing.remove();
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
#screen .${HOST_CLASS}{
  width:1em;
  height:1em;
  flex:0 0 auto;
  font-size:clamp(123.75px,34.5vw,165px);
  transition:font-size 1100ms cubic-bezier(.22,1,.36,1);
  pointer-events:none;
}
#screen .evia-epa-zone-v2.settled .${HOST_CLASS}{
  font-size:clamp(61.875px,17.25vw,82.5px);
}
#screen .evia-epa-speech-v2{
  width:min(calc(100vw - 38px),470px)!important;
  min-height:48px!important;
  padding:12px 16px!important;
  border:1px solid rgba(245,196,0,.16)!important;
  border-radius:22px!important;
  background:rgba(250,249,242,.98)!important;
  box-shadow:0 7px 22px rgba(0,0,0,.12)!important;
  color:#333!important;
  display:flex;
  align-items:center;
  justify-content:center;
}
#screen .evia-epa-zone-v2.settled .evia-epa-speech-v2{margin-top:8px!important;font-size:13px!important;}
#screen .evia-epa-panel-v2{top:calc(max(16px,env(safe-area-inset-top)) + 166px)!important;}
#screen .evia-epa-zone-v2 .epa-v2-card>strong{color:#fff7d2!important;}
#screen .evia-epa-zone-v2 .epa-v2-card p,
#screen .evia-epa-zone-v2 .epa-v2-list,
#screen .evia-epa-zone-v2 .epa-v2-note{color:rgba(250,245,219,.84)!important;}
#screen .evia-epa-zone-v2 .epa-v2-btn{color:#f5e7a9!important;}
#screen .evia-epa-zone-v2 .epa-v2-btn.primary{color:#fff2b6!important;}
#screen .evia-epa-zone-v2 .epa-v2-answer{color:#f3efdb!important;}
#screen .evia-epa-zone-v2 .epa-v2-q{color:#fff7d2!important;}
#screen .evia-epa-zone-v2 .epa-v2-timer,
#screen .evia-epa-zone-v2 .epa-v2-record,
#screen .evia-epa-zone-v2 .epa-v2-score{color:#ebca53!important;}
#screen .evia-epa-zone-v2 .epa-v2-status{color:rgba(250,245,219,.68)!important;}
`;
  document.head.appendChild(s);
}

function findHomeStage(){
  if(homeStage?.isConnected)return homeStage;
  homeStage=document.getElementById('eviaStage');
  return homeStage;
}

function findHomeFloat(){
  if(homeFloat?.isConnected)return homeFloat;
  const stage=findHomeStage();
  if(stage)homeFloat=Array.from(stage.children).find(el=>el.classList?.contains('evia-float'))||null;
  if(!homeFloat)homeFloat=document.querySelector(`#eviaEpaZoneV2 .${HOST_CLASS} > .evia-float`);
  return homeFloat;
}

function ensureHost(zone){
  let host=zone.querySelector(`.${HOST_CLASS}`);
  if(host)return host;
  const oldAvatar=zone.querySelector('.evia-epa-avatar-v2');
  if(!oldAvatar)return null;
  host=document.createElement('div');
  host.className=HOST_CLASS;
  host.setAttribute('aria-hidden','true');
  oldAvatar.replaceWith(host);
  return host;
}

function syncRealEvia(){
  const zone=document.getElementById('eviaEpaZoneV2');
  const stage=findHomeStage();
  if(!zone||!stage)return;
  const float=findHomeFloat();
  if(!float)return;

  if(zone.classList.contains('open')){
    const host=ensureHost(zone);
    if(host&&float.parentNode!==host)host.appendChild(float);
    return;
  }

  if(float.parentNode!==stage)stage.appendChild(float);
}

installStyles();
const observer=new MutationObserver(syncRealEvia);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
queueMicrotask(syncRealEvia);
Object.defineProperty(globalThis,'EVIA_EPA_UI_FIX_V1',{value:Object.freeze({version:84,sync:syncRealEvia}),writable:false,configurable:false});
})();
