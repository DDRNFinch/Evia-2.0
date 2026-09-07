(()=>{'use strict';
const SUPPORT_KEY='eviaLearningSupportV1';
const THINKING_PAUSE_MS=3000;
let delayedOptionsTimer=null;
function state(){try{const value=JSON.parse(localStorage.getItem(SUPPORT_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
function enabled(){return Boolean(state().extraThinkingTime)}
function injectStyles(){if(document.getElementById('eviaRuntimeFixStyles'))return;const style=document.createElement('style');style.id='eviaRuntimeFixStyles';style.textContent='html.evia-reduce-motion #screen.evia-update-ready .evia-body{animation:eviaUpdateHeartbeat 1.35s ease-in-out infinite!important;transform-origin:center!important}';document.head.appendChild(style)}
function shouldPause(options){if(!enabled()||!Array.isArray(options)||!options.length)return false;const actions=new Set(['test-answer','check-wellbeing','check-confidence']);return options.some(option=>actions.has(String(option?.action||'')))}
function patchChoices(){
  try{
    if(typeof renderChatOptions!=='function'||renderChatOptions.__eviaThinkingPause)return;
    const original=renderChatOptions;
    const wrapped=function(options){
      if(delayedOptionsTimer){clearTimeout(delayedOptionsTimer);delayedOptionsTimer=null}
      if(!shouldPause(options))return original.apply(this,arguments);
      const context=this,args=arguments;original.call(context,[]);
      delayedOptionsTimer=setTimeout(()=>{delayedOptionsTimer=null;try{original.apply(context,args)}catch{}},THINKING_PAUSE_MS);
    };
    wrapped.__eviaThinkingPause=true;renderChatOptions=wrapped;
  }catch{}
}
injectStyles();patchChoices();setInterval(patchChoices,2500);window.eviaExtraThinkingTimeEnabled=enabled;
})();

(()=>{'use strict';
const INLINE_CLASS='evia-inline-chat-options';
function clearInlineChoices(){document.querySelectorAll(`.${INLINE_CLASS}`).forEach(node=>node.remove())}
function injectInlineChoiceStyles(){
  if(document.getElementById('eviaInlineChatChoiceStyles'))return;
  const style=document.createElement('style');
  style.id='eviaInlineChatChoiceStyles';
  style.textContent='#chatOptions{display:none!important}.evia-inline-chat-options{width:calc(100% - 40px);margin-left:40px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:0 0 2px;align-self:stretch}.evia-inline-chat-options .chat-option{width:100%}';
  document.head.appendChild(style);
}
function renderInlineChoices(){
  clearInlineChoices();
  if(typeof chatOptions==='undefined'||typeof chatScroll==='undefined'||!chatOptions||!chatScroll||!chatOptions.children.length)return;
  const inline=document.createElement('div');
  inline.className=INLINE_CLASS;
  Array.from(chatOptions.children).forEach(source=>{
    if(!(source instanceof HTMLButtonElement))return;
    const clone=source.cloneNode(true);
    clone.removeAttribute('id');
    clone.addEventListener('click',()=>{
      if(clone.disabled)return;
      inline.querySelectorAll('button').forEach(button=>{button.disabled=true});
      inline.remove();
      source.click();
    });
    inline.appendChild(clone);
  });
  if(!inline.children.length)return;
  chatScroll.appendChild(inline);
  if(typeof scrollChatBottom==='function')scrollChatBottom();
}
function startInlineChoices(){
  try{
    if(typeof chatOptions==='undefined'||typeof chatScroll==='undefined'||!chatOptions||!chatScroll)return;
    injectInlineChoiceStyles();
    const observer=new MutationObserver(renderInlineChoices);
    observer.observe(chatOptions,{childList:true});
    renderInlineChoices();
  }catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startInlineChoices,{once:true});else startInlineChoices();
})();

(()=>{'use strict';
function injectChatLayoutStyles(){
  if(document.getElementById('eviaFullscreenChatStyles'))return;
  const style=document.createElement('style');
  style.id='eviaFullscreenChatStyles';
  style.textContent='html.evia-chat-open #backButton,html.evia-chat-open #chatExitButton{display:none!important}#chatPanel{padding:0!important;align-items:stretch!important;justify-content:stretch!important}#chatPanel .chat-card{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;min-height:0!important;border:0!important;border-radius:0!important}#chatPanel .chat-header{min-height:56px!important;padding:0 12px!important;display:grid!important;grid-template-columns:minmax(72px,1fr) auto minmax(72px,1fr)!important;align-items:center!important;gap:8px!important;flex:0 0 auto!important}#chatPanel .evia-chat-title{text-align:center;font-size:15px;font-weight:600;color:rgba(45,45,45,.78)}#chatPanel .evia-chat-header-button{min-height:38px;border:1.5px solid rgba(245,196,0,.38);border-radius:999px;background:rgba(250,249,242,.97);color:rgba(45,45,45,.68);padding:0 14px;cursor:pointer;font:inherit}#chatPanel .evia-chat-header-back{justify-self:start}#chatPanel .evia-chat-header-exit{justify-self:end}#chatPanel .evia-chat-header-back[hidden]{visibility:hidden;display:block!important}#chatPanel .chat-scroll{padding-bottom:max(16px,env(safe-area-inset-bottom))!important}';
  document.head.appendChild(style);
}
function startChatLayout(){
  try{
    const panel=document.getElementById('chatPanel');
    const header=panel?.querySelector('.chat-header');
    const originalBack=document.getElementById('backButton');
    const originalExit=document.getElementById('chatExitButton');
    if(!panel||!header||!originalBack||!originalExit)return;
    injectChatLayoutStyles();
    if(!header.querySelector('.evia-chat-title')){
      header.textContent='';
      const back=document.createElement('button');
      back.type='button';back.className='evia-chat-header-button evia-chat-header-back';back.textContent='Back';back.setAttribute('aria-label','Back');
      const title=document.createElement('div');title.className='evia-chat-title';title.textContent='Evia';
      const exit=document.createElement('button');
      exit.type='button';exit.className='evia-chat-header-button evia-chat-header-exit';exit.textContent='Exit';exit.setAttribute('aria-label','Exit chat');
      back.addEventListener('click',()=>originalBack.click());
      exit.addEventListener('click',()=>originalExit.click());
      header.append(back,title,exit);
      const syncBack=()=>{back.hidden=!originalBack.classList.contains('show')};
      new MutationObserver(syncBack).observe(originalBack,{attributes:true,attributeFilter:['class','style']});
      syncBack();
    }
    const syncOpen=()=>document.documentElement.classList.toggle('evia-chat-open',panel.classList.contains('open'));
    new MutationObserver(syncOpen).observe(panel,{attributes:true,attributeFilter:['class']});
    syncOpen();
  }catch{}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startChatLayout,{once:true});else startChatLayout();
})();

(()=>{'use strict';
const ITEMS=[
  ['Chat with Evia','tool','chat'],
  ['Targets','tool','targets'],
  ['My Portfolio','naxos','portfolio'],
  ['Send QR Code','naxos','send'],
  ['Scan QR Code','naxos','scan'],
  ['Learner Profile','tool','profile'],
  ['Settings','tool','settings']
];
function injectLauncherStyles(){
  if(document.getElementById('eviaPlusLauncherStyles'))return;
  const style=document.createElement('style');
  style.id='eviaPlusLauncherStyles';
  style.textContent='#eviaToolsMenuButton,#eviaToolsMenu,#naxosMenu{display:none!important}#naxosArch{background:transparent!important;border:0!important;box-shadow:none!important;display:grid!important;place-items:center!important;padding:0!important;overflow:visible!important}#naxosArch .evia-plus-glyph{display:block;color:rgba(245,196,0,.78);font-size:42px;font-weight:300;line-height:1;transform:rotate(0deg);transform-origin:center;transition:transform 360ms cubic-bezier(.22,1,.36,1),opacity 220ms ease}#naxosArch.evia-launcher-open .evia-plus-glyph{transform:rotate(45deg)}.evia-plus-menu{position:absolute;left:50%;bottom:calc(max(62px,env(safe-area-inset-bottom) + 62px) + 10px);width:min(calc(100vw - 40px),460px);max-height:calc(100dvh - 180px);overflow-y:auto;transform:translateX(-50%);display:flex;flex-direction:column;gap:10px;z-index:18;pointer-events:none;padding:2px 0}.evia-plus-menu::-webkit-scrollbar{display:none}.evia-plus-pill{width:100%;min-height:52px;height:auto;border-radius:999px;border:1.5px solid rgba(245,196,0,.35);background:rgba(250,249,242,.97);box-shadow:0 8px 20px rgba(0,0,0,.05),inset 0 0 0 1px rgba(255,255,255,.72);display:flex;align-items:center;justify-content:center;padding:10px 18px;color:rgba(45,45,45,.62);font-size:14px;line-height:1.25;cursor:pointer;opacity:0;transform:translateY(22px);transition:opacity 280ms ease,transform 480ms cubic-bezier(.22,1,.36,1);transition-delay:0ms}.evia-plus-menu.open{pointer-events:auto}.evia-plus-menu.open .evia-plus-pill{opacity:1;transform:translateY(0);transition-delay:var(--evia-launch-delay,0ms)}#screen.evia-launcher-open .evia-stage{top:calc(max(18px,env(safe-area-inset-top)) + 28px)!important;font-size:clamp(61.875px,17.25vw,82.5px)!important}#screen.evia-launcher-open .evia-speech{top:calc(max(18px,env(safe-area-inset-top)) + 88px)!important}#screen.evia-launcher-open .pill-stack{opacity:0!important;visibility:hidden!important;pointer-events:none!important}html.evia-reduce-motion #naxosArch .evia-plus-glyph,html.evia-reduce-motion .evia-plus-pill{transition:none!important}';
  document.head.appendChild(style);
}
function startLauncher(){
  try{
    const screen=document.getElementById('screen');
    const arch=document.getElementById('naxosArch');
    const oldNaxos=document.getElementById('naxosMenu');
    if(!screen||!arch||!oldNaxos)return;
    injectLauncherStyles();
    arch.innerHTML='<span class="evia-plus-glyph" aria-hidden="true">+</span>';
    arch.setAttribute('aria-label','Open Evia menu');
    arch.setAttribute('aria-expanded','false');
    const menu=document.createElement('div');
    menu.className='evia-plus-menu';menu.id='eviaPlusMenu';menu.setAttribute('aria-label','Evia menu');
    ITEMS.forEach((item,index)=>{
      const button=document.createElement('button');button.type='button';button.className='evia-plus-pill';button.textContent=item[0];
      button.style.setProperty('--evia-launch-delay',`${(ITEMS.length-1-index)*55}ms`);
      button.addEventListener('click',()=>{
        closeLauncher();
        const source=item[1]==='tool'?document.querySelector(`[data-evia-tool="${item[2]}"]`):document.querySelector(`[data-naxos-action="${item[2]}"]`);
        if(source instanceof HTMLElement)source.click();
      });
      menu.appendChild(button);
    });
    screen.appendChild(menu);
    function openLauncher(){
      menu.classList.add('open');arch.classList.add('evia-launcher-open');screen.classList.add('evia-launcher-open');arch.setAttribute('aria-expanded','true');
    }
    function closeLauncher(){
      menu.classList.remove('open');arch.classList.remove('evia-launcher-open');screen.classList.remove('evia-launcher-open');arch.setAttribute('aria-expanded','false');
    }
    function toggleLauncher(){menu.classList.contains('open')?closeLauncher():openLauncher()}
    arch.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();toggleLauncher()},{capture:true});
    new MutationObserver(()=>{
      if(oldNaxos.classList.contains('open')){oldNaxos.classList.remove('open');openLauncher()}
    }).observe(oldNaxos,{attributes:true,attributeFilter:['class']});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.classList.contains('open'))closeLauncher()});
    window.EviaPlusLauncher={open:openLauncher,close:closeLauncher,toggle:toggleLauncher};
  }catch(error){console.warn('Evia plus launcher could not start',error)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startLauncher,{once:true});else startLauncher();
})();

(()=>{'use strict';
function reducedMotion(){return document.documentElement.classList.contains('evia-reduce-motion')||Boolean(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function injectChatMotionStyles(){
  if(document.getElementById('eviaSmoothChatStyles'))return;
  const style=document.createElement('style');style.id='eviaSmoothChatStyles';
  style.textContent='@keyframes eviaChatEnter{from{opacity:.35;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.chat-row.evia-chat-enter,.evia-inline-chat-options.evia-chat-enter{animation:eviaChatEnter 340ms cubic-bezier(.22,1,.36,1) both}html.evia-reduce-motion .chat-row.evia-chat-enter,html.evia-reduce-motion .evia-inline-chat-options.evia-chat-enter{animation:none!important}';
  document.head.appendChild(style);
}
function patchSmoothScroll(){
  try{
    if(typeof scrollChatBottom!=='function'||scrollChatBottom.__eviaSmooth)return;
    const original=scrollChatBottom;
    const wrapped=function(){
      requestAnimationFrame(()=>{
        try{
          if(typeof chatScroll==='undefined'||!chatScroll)return original.apply(this,arguments);
          const top=chatScroll.scrollHeight;
          if(reducedMotion()||chatScroll.children.length<=1)chatScroll.scrollTop=top;
          else if(typeof chatScroll.scrollTo==='function')chatScroll.scrollTo({top,behavior:'smooth'});
          else chatScroll.scrollTop=top;
        }catch{try{original.apply(this,arguments)}catch{}}
      });
    };
    wrapped.__eviaSmooth=true;scrollChatBottom=wrapped;
  }catch{}
}
function watchChatEntries(){
  try{
    if(typeof chatScroll==='undefined'||!chatScroll||chatScroll.__eviaEntryWatch)return;
    chatScroll.__eviaEntryWatch=true;
    new MutationObserver(records=>{
      records.forEach(record=>record.addedNodes.forEach(node=>{
        if(!(node instanceof HTMLElement))return;
        if(node.classList.contains('chat-row')||node.classList.contains('evia-inline-chat-options'))node.classList.add('evia-chat-enter');
      }));
    }).observe(chatScroll,{childList:true});
  }catch{}
}
function startChatMotion(){injectChatMotionStyles();patchSmoothScroll();watchChatEntries()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startChatMotion,{once:true});else startChatMotion();
setInterval(patchSmoothScroll,2500);
})();

(()=>{'use strict';
function isIPhone(){return /iPhone|iPod/i.test(String(navigator.userAgent||''))}
function loadImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read this photo.'))};
    image.src=url;
  });
}
function jpegBlob(canvas,quality){return new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))}
async function compressIPhonePhoto(file){
  const image=await loadImage(file),sourceWidth=image.naturalWidth||image.width,sourceHeight=image.naturalHeight||image.height;
  if(!sourceWidth||!sourceHeight)throw new Error('Could not read this photo.');
  const maxDimension=1280,scale=Math.min(1,maxDimension/Math.max(sourceWidth,sourceHeight));
  let canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(sourceWidth*scale));canvas.height=Math.max(1,Math.round(sourceHeight*scale));
  let context=canvas.getContext('2d',{alpha:false});context.drawImage(image,0,0,canvas.width,canvas.height);
  const targetBytes=350*1024,qualities=[0.88,0.82,0.76,0.70,0.64,0.60];
  let best=null;
  for(const quality of qualities){const blob=await jpegBlob(canvas,quality);if(blob){best=blob;if(blob.size<=targetBytes)return blob}}
  for(let pass=0;pass<2&&best&&best.size>targetBytes;pass++){
    const longest=Math.max(canvas.width,canvas.height);if(longest<=900)break;
    const factor=Math.max(0.75,Math.min(0.90,Math.sqrt(targetBytes/best.size)*0.95));
    const next=document.createElement('canvas');next.width=Math.max(1,Math.round(canvas.width*factor));next.height=Math.max(1,Math.round(canvas.height*factor));
    context=next.getContext('2d',{alpha:false});context.drawImage(canvas,0,0,next.width,next.height);canvas=next;
    for(const quality of [0.72,0.66,0.60]){const blob=await jpegBlob(canvas,quality);if(blob){best=blob;if(blob.size<=targetBytes)return blob}}
  }
  if(!best)throw new Error('Could not compress this photo.');
  return best;
}
function sizeLabel(bytes){if(!Number.isFinite(bytes))return'';return bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1024))} KB`}
try{
  if(isIPhone()&&typeof openPhotoCapture==='function'){
    const originalOpenPhotoCapture=openPhotoCapture;
    openPhotoCapture=async function(step,sessionId){
      if(!isIPhone())return originalOpenPhotoCapture.apply(this,arguments);
      stopCapture();captureMode='photo';
      evidenceTop.innerHTML='<div class="capture-surface"><div class="audio-panel"><button class="capture-button" id="photoCapture" type="button">Take photo</button><input id="eviaIphonePhotoInput" type="file" accept="image/*" capture="environment" style="position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none"><div class="capture-status" id="captureStatus"></div></div></div>';
      evidenceTop.style.gridTemplateRows='1fr';
      const capture=document.getElementById('photoCapture'),input=document.getElementById('eviaIphonePhotoInput');
      updateBackButton();fitUiText();showCaptureStatus('Tap Take photo to open the iPhone camera.');
      capture.addEventListener('click',()=>{if(sessionId!==captureSessionId)return;input.value='';input.click()});
      input.addEventListener('change',async()=>{
        const file=input.files?.[0];if(!file||sessionId!==captureSessionId)return;
        capture.disabled=true;showCaptureStatus('Compressing photo…');
        try{
          const blob=await compressIPhonePhoto(file);if(sessionId!==captureSessionId)return;
          await saveEvidenceBlob(blob,'photo');
          showCaptureStatus(`Saved · ${sizeLabel(file.size)} → ${sizeLabel(blob.size)}`);
          await new Promise(resolve=>setTimeout(resolve,450));
          await completeCaptureStep(sessionId);
        }catch(error){capture.disabled=false;showCaptureStatus(error?.message||'Could not save this photo.')}
      });
    };
    window.EviaIPhonePhotoTest={enabled:true,targetKb:350,maxDimension:1280};
  }
}catch(error){console.warn('Evia iPhone photo test could not start',error)}
})();