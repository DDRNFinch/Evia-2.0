(()=>{'use strict';
const SUPPORT_KEY='eviaLearningSupportV1';
const VERSION='1.0';
const YELLOW='#f5c400';
const defaults={textScale:1,dyslexiaFriendly:false,tint:'none',lineSpacing:false,letterSpacing:false,highContrast:false,reduceMotion:false,simplifiedReading:false,readingFocus:false,focusY:50,extraThinkingTime:false};
const tintColours={none:'transparent',cream:'rgba(255,231,130,.22)',blue:'rgba(129,200,255,.18)',green:'rgba(145,219,157,.18)',grey:'rgba(120,120,120,.12)'};
const labels={
  textScale:['Text size','Compare your current text size with the new size before applying it.'],
  dyslexiaFriendly:['Dyslexia-friendly text','Compare standard Evia text with the clearer reading style.'],
  tint:['Screen tint','Compare the screen without this tint and with the selected overlay.'],
  readingFocus:['Reading Focus','Preview the clear reading window with surrounding content dimmed.'],
  lineSpacing:['More line spacing','Compare standard line spacing with extra space between lines.'],
  letterSpacing:['More word and letter spacing','Compare standard text with wider word and letter spacing.'],
  highContrast:['Higher contrast','Compare the normal interface with stronger text and edges.'],
  reduceMotion:['Reduce movement','Compare normal decorative movement with non-essential movement removed.'],
  simplifiedReading:['Simplified reading','Compare the normal view with a calmer, more spacious reading layout.'],
  extraThinkingTime:['Extra thinking time','Preview the short processing pause used before supported answer choices.']
};
let preview=null;
let focusDragging=false;

function load(){
  try{const saved=JSON.parse(localStorage.getItem(SUPPORT_KEY)||'{}');return{...defaults,...(saved&&typeof saved==='object'?saved:{})}}catch{return{...defaults}}
}
function save(state){try{localStorage.setItem(SUPPORT_KEY,JSON.stringify(state))}catch{}}
function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function gear(){
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="${YELLOW}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M9.50 4.30 10.44 2.12h3.12l.94 2.18 1.18.48 2.20-.87 2.21 2.21-.87 2.20.48 1.18 2.18.94v3.12l-2.18.94-.48 1.18.87 2.20-2.21 2.21-2.20-.87-1.18.48-.94 2.18h-3.12l-.94-2.18-1.18-.48-2.20.87-2.21-2.21.87-2.20-.48-1.18-2.18-.94v-3.12l2.18-.94.48-1.18-.87-2.20 2.21-2.21 2.20.87 1.18-.48Z"/><circle cx="12" cy="12" r="3.15"/></svg>`;
}
function injectStyles(){
  if(document.getElementById('eviaStableSettingsStyles'))return;
  const style=document.createElement('style');
  style.id='eviaStableSettingsStyles';
  style.textContent=`
    .evia-stable-settings{position:fixed;inset:0;z-index:10020;background:rgba(255,255,255,.98);display:none;overflow:auto;padding:calc(max(16px,env(safe-area-inset-top)) + 8px) 18px calc(max(22px,env(safe-area-inset-bottom)) + 18px);overscroll-behavior:contain}
    .evia-stable-settings.open{display:block}.evia-stable-shell{width:min(100%,480px);margin:0 auto}
    .evia-stable-head{display:flex;align-items:center;gap:10px;margin-bottom:18px}.evia-stable-back{width:42px;height:42px;border:1.5px solid rgba(245,196,0,.32);border-radius:50%;background:#fff;display:grid;place-items:center;cursor:pointer;flex:0 0 42px}.evia-stable-back svg{width:22px;height:22px}
    .evia-stable-title{font-size:22px;font-weight:700;color:#333}.evia-stable-subtitle{margin-top:2px;font-size:12px;line-height:1.4;color:#666}
    .evia-stable-section{border:1.5px solid rgba(245,196,0,.31);border-radius:24px;background:linear-gradient(180deg,#fff,#fffdf7);box-shadow:0 10px 26px rgba(35,35,35,.055);padding:17px;margin-bottom:11px}
    .evia-stable-section>strong{font-size:15px;color:#333}.evia-stable-note{font-size:12px;line-height:1.5;color:#5c5c5c;margin-top:6px}
    .evia-stable-row{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:50px;border-top:1px solid rgba(45,45,45,.06);padding:5px 0}.evia-stable-row:first-of-type{border-top:0}
    .evia-stable-label{display:flex;flex-direction:column;gap:2px;min-width:0}.evia-stable-label strong{font-size:13px;color:#3d3d3d}.evia-stable-label span{font-size:10.5px;line-height:1.42;color:#707070}
    .evia-stable-toggle{width:46px;height:27px;padding:2px;border:0;border-radius:999px;background:#ddd;flex:0 0 auto;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(45,45,45,.05)}.evia-stable-toggle::after{content:'';display:block;width:23px;height:23px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18);transition:transform .18s ease}.evia-stable-toggle.on{background:${YELLOW}}.evia-stable-toggle.on::after{transform:translateX(19px)}
    .evia-stable-range{width:108px;accent-color:${YELLOW}}.evia-stable-tints{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.evia-stable-tint-choice{width:28px;height:28px;border-radius:50%;border:2px solid rgba(45,45,45,.12);cursor:pointer}.evia-stable-tint-choice.selected{outline:2px solid ${YELLOW};outline-offset:2px}
    .evia-stable-read{width:100%;min-height:44px;margin-top:8px;border:1.5px solid rgba(245,196,0,.34);border-radius:999px;background:rgba(250,249,242,.98);color:#555;font-size:12px;font-weight:600;cursor:pointer}
    .evia-stable-version{margin:14px 2px 2px;padding-top:12px;border-top:1px solid rgba(45,45,45,.07);text-align:center;font-size:9.5px;font-weight:700;letter-spacing:.035em;color:rgba(45,45,45,.38)}
    .evia-stable-preview{position:fixed;inset:0;z-index:10040;background:rgba(255,255,255,.98);display:none;overflow:auto;padding:calc(max(16px,env(safe-area-inset-top)) + 10px) 16px calc(max(20px,env(safe-area-inset-bottom)) + 18px);overscroll-behavior:contain}.evia-stable-preview.open{display:block}.evia-stable-preview-shell{width:min(100%,500px);margin:0 auto}
    .evia-stable-preview-head{display:flex;align-items:center;gap:11px;margin-bottom:15px}.evia-stable-preview-mark{width:42px;height:42px;border:1.7px solid rgba(245,196,0,.55);border-radius:50%;display:grid;place-items:center;color:${YELLOW};font-size:17px;font-weight:800;flex:0 0 42px}.evia-stable-preview-head strong{display:block;font-size:20px;color:#333}.evia-stable-preview-head span{display:block;margin-top:3px;font-size:11px;line-height:1.4;color:#656565}
    .evia-stable-preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.evia-stable-preview-column{min-width:0}.evia-stable-preview-label{display:block;margin:0 0 6px 4px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#777}
    .evia-stable-sample{position:relative;overflow:hidden;min-height:190px;border:1.5px solid rgba(245,196,0,.28);border-radius:22px;background:#fff;padding:15px;box-shadow:0 8px 22px rgba(0,0,0,.035);font-family:Arial,sans-serif;font-size:14px;line-height:1.42;color:#3f3f3f}.evia-stable-sample>strong{display:block;font-size:15px;margin-bottom:8px;color:#333}.evia-stable-sample p{margin:0 0 10px}.evia-stable-sample-pill{min-height:36px;border:1.5px solid rgba(245,196,0,.34);border-radius:999px;background:rgba(250,249,242,.98);display:flex;align-items:center;padding:0 12px;font-size:11px;font-weight:600;color:#555}.evia-stable-motion{width:9px;height:9px;margin:12px auto 0;border-radius:50%;background:${YELLOW};animation:eviaStablePreviewPulse 1s ease-in-out infinite}.evia-stable-sample.reduced .evia-stable-motion{animation:none!important}
    .evia-stable-focus-top,.evia-stable-focus-bottom{position:absolute;left:0;right:0;background:rgba(35,35,35,.46);display:none;pointer-events:none}.evia-stable-focus-top{top:0;height:60px}.evia-stable-focus-bottom{top:116px;bottom:0}.evia-stable-sample.focus .evia-stable-focus-top,.evia-stable-sample.focus .evia-stable-focus-bottom{display:block}.evia-stable-sample.focus::after{content:'';position:absolute;left:0;right:0;top:60px;height:56px;border-top:1.5px solid rgba(245,196,0,.75);border-bottom:1.5px solid rgba(245,196,0,.75);pointer-events:none}.evia-stable-sample-tint{position:absolute;inset:0;pointer-events:none}
    .evia-stable-preview-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.evia-stable-preview-actions button{min-height:48px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer}.evia-stable-cancel{border:1.5px solid rgba(45,45,45,.15);background:#fff;color:#555}.evia-stable-accept{border:1.5px solid rgba(245,196,0,.55);background:rgba(245,196,0,.13);color:#514500}
    .evia-stable-screen-tint{position:fixed;inset:0;z-index:9000;pointer-events:none;display:none;background:transparent}
    .evia-stable-focus-mask{position:fixed;inset:0;z-index:110;pointer-events:none;display:none}.evia-stable-focus-mask.on{display:block}.evia-stable-focus-dim{position:absolute;left:0;right:0;background:rgba(35,35,35,.44);pointer-events:none}.evia-stable-focus-dim.top{top:0;height:calc(var(--focus-y,50vh) - 42px)}.evia-stable-focus-dim.bottom{top:calc(var(--focus-y,50vh) + 42px);bottom:0}.evia-stable-focus-strip{position:absolute;left:0;right:0;top:calc(var(--focus-y,50vh) - 42px);height:84px;border-top:1.5px solid rgba(245,196,0,.7);border-bottom:1.5px solid rgba(245,196,0,.7);background:rgba(255,255,255,.035)}.evia-stable-focus-handle{position:absolute;right:8px;top:calc(var(--focus-y,50vh) - 21px);width:38px;height:42px;border:1.5px solid rgba(245,196,0,.75);border-radius:18px;background:rgba(255,255,255,.95);pointer-events:auto;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 5px 15px rgba(0,0,0,.12)}.evia-stable-focus-handle i{display:block;width:15px;height:1.5px;border-radius:2px;background:${YELLOW}}
    html.evia-dyslexia body,html.evia-dyslexia button,html.evia-dyslexia input,html.evia-dyslexia textarea,.evia-stable-settings{font-family:Verdana,Tahoma,Arial,sans-serif!important}
    html.evia-dyslexia #screen{letter-spacing:.025em!important;word-spacing:.085em!important}html.evia-dyslexia #screen p,html.evia-dyslexia #screen .chat-bubble,html.evia-dyslexia #screen .speech-line,html.evia-dyslexia #screen .pill{line-height:1.68!important}
    html.evia-line-spacing #screen{line-height:1.75!important}html.evia-line-spacing #screen p,html.evia-line-spacing #screen .chat-bubble,html.evia-line-spacing #screen .speech-line,html.evia-line-spacing #screen .pill{line-height:1.78!important}
    html.evia-letter-spacing #screen{letter-spacing:.06em!important;word-spacing:.18em!important}
    html.evia-high-contrast #screen{filter:contrast(1.28)!important}
    html.evia-simple-reading #screen .evia-float::before{display:none!important}html.evia-simple-reading #screen .pill,html.evia-simple-reading #screen .detail-card,html.evia-simple-reading #screen .arch-detail-card,html.evia-simple-reading #screen .criterion-tile,html.evia-simple-reading #screen .evidence-choice,html.evia-simple-reading #screen .evidence-requirements,html.evia-simple-reading #screen .capture-surface,html.evia-simple-reading #screen .etr-target,html.evia-simple-reading #screen .etr-summary,html.evia-simple-reading #screen .etr-review{box-shadow:none!important;background:#fff!important}html.evia-simple-reading #screen p,html.evia-simple-reading #screen .chat-bubble,html.evia-simple-reading #screen .speech-line,html.evia-simple-reading #screen .detail-card p{font-size:1.06em!important;line-height:1.78!important}
    html.evia-reduce-motion #screen *,html.evia-reduce-motion #screen *::before,html.evia-reduce-motion #screen *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
    html.evia-reduce-motion #screen.evia-update-ready .evia-body{animation:eviaUpdateHeartbeat 1.35s ease-in-out infinite!important}
    @keyframes eviaStablePreviewPulse{0%,100%{transform:translateX(-16px);opacity:.55}50%{transform:translateX(16px);opacity:1}}
    @media(max-width:390px){.evia-stable-preview-grid{grid-template-columns:1fr}.evia-stable-sample{min-height:155px}}
  `;
  document.head.appendChild(style);
}
function ensureUi(){
  injectStyles();
  if(!document.getElementById('eviaStableScreenTint')){
    const tint=document.createElement('div');tint.id='eviaStableScreenTint';tint.className='evia-stable-screen-tint';tint.setAttribute('aria-hidden','true');document.body.appendChild(tint);
  }
  if(!document.getElementById('eviaStableReadingFocus')){
    const focus=document.createElement('div');focus.id='eviaStableReadingFocus';focus.className='evia-stable-focus-mask';focus.setAttribute('aria-hidden','true');
    focus.innerHTML='<div class="evia-stable-focus-dim top"></div><div class="evia-stable-focus-strip"></div><div class="evia-stable-focus-dim bottom"></div><div class="evia-stable-focus-handle" aria-label="Hold and slide reading focus"><i></i><i></i><i></i></div>';
    document.body.appendChild(focus);
    const handle=focus.querySelector('.evia-stable-focus-handle');
    handle?.addEventListener('pointerdown',event=>{focusDragging=true;handle.setPointerCapture?.(event.pointerId);moveFocus(event.clientY,false);event.preventDefault()},true);
    handle?.addEventListener('pointermove',event=>{if(!focusDragging)return;moveFocus(event.clientY,false);event.preventDefault()},true);
    const finish=event=>{if(!focusDragging)return;moveFocus(event.clientY,true);focusDragging=false;event.preventDefault()};
    handle?.addEventListener('pointerup',finish,true);handle?.addEventListener('pointercancel',finish,true);
  }
  if(!document.getElementById('eviaStableSettings')){
    const overlay=document.createElement('section');overlay.id='eviaStableSettings';overlay.className='evia-stable-settings';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<div class="evia-stable-shell" id="eviaStableSettingsShell"></div>';document.body.appendChild(overlay);
    overlay.addEventListener('click',onSettingsClick);
    overlay.addEventListener('change',onSettingsChange);
  }
  if(!document.getElementById('eviaStablePreview')){
    const overlay=document.createElement('section');overlay.id='eviaStablePreview';overlay.className='evia-stable-preview';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<div class="evia-stable-preview-shell" id="eviaStablePreviewShell"></div>';document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{const action=event.target.closest('[data-stable-preview]')?.dataset.stablePreview;if(action==='cancel')closePreview();if(action==='accept')acceptPreview()});
  }
}
function moveFocus(clientY,persist){
  const height=Math.max(1,window.innerHeight);const percent=Math.max(8,Math.min(92,(Number(clientY)/height)*100));const state=load();state.focusY=Math.round(percent*10)/10;
  document.getElementById('eviaStableReadingFocus')?.style.setProperty('--focus-y',`${state.focusY}vh`);
  if(persist)save(state);
}
function apply(state=load()){
  ensureUi();
  const root=document.documentElement;
  root.style.setProperty('--evia-text-scale',String(Math.max(.9,Math.min(1.35,Number(state.textScale)||1))));
  root.classList.toggle('evia-dyslexia',Boolean(state.dyslexiaFriendly));
  root.classList.toggle('evia-line-spacing',Boolean(state.lineSpacing));
  root.classList.toggle('evia-letter-spacing',Boolean(state.letterSpacing));
  root.classList.toggle('evia-high-contrast',Boolean(state.highContrast));
  root.classList.toggle('evia-reduce-motion',Boolean(state.reduceMotion));
  root.classList.toggle('evia-simple-reading',Boolean(state.simplifiedReading));
  root.style.removeProperty('--bg');document.body.style.background='';
  const oldTint=document.getElementById('eviaScreenTint');if(oldTint)oldTint.style.display='none';
  const tint=document.getElementById('eviaStableScreenTint');if(tint){tint.style.background=tintColours[state.tint]||'transparent';tint.style.display=state.tint==='none'?'none':'block'}
  const oldFocus=document.getElementById('eviaReadingFocus');oldFocus?.classList.remove('on');oldFocus?.setAttribute('aria-hidden','true');
  const focus=document.getElementById('eviaStableReadingFocus');if(focus){focus.classList.toggle('on',Boolean(state.readingFocus));focus.setAttribute('aria-hidden',state.readingFocus?'false':'true');focus.style.setProperty('--focus-y',`${Math.max(8,Math.min(92,Number(state.focusY)||50))}vh`)}
}
function row(key,title,description,state){
  return `<div class="evia-stable-row"><span class="evia-stable-label"><strong>${title}</strong><span>${description}</span></span><button class="evia-stable-toggle${state[key]?' on':''}" type="button" data-stable-toggle="${key}" aria-pressed="${state[key]?'true':'false'}"></button></div>`;
}
function renderSettings(){
  const state=load();const tints=[['none','#fff','No tint'],['cream','#fff8df','Cream'],['blue','#edf7ff','Pale blue'],['green','#eef9ef','Pale green'],['grey','#f2f2f2','Soft grey']];
  const shell=document.getElementById('eviaStableSettingsShell');if(!shell)return;
  shell.innerHTML=`<div class="evia-stable-head"><button class="evia-stable-back" type="button" data-stable-action="back" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="${YELLOW}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 6-6 6 6 6"/></svg></button><div><div class="evia-stable-title">Settings</div><div class="evia-stable-subtitle">Learning Support</div></div></div>
  <section class="evia-stable-section"><strong>Learning Support</strong><p class="evia-stable-note">Choose the adjustments that make Evia easier and more comfortable to use. These settings stay on this device.</p>
  <div class="evia-stable-row"><span class="evia-stable-label"><strong>Text size</strong><span>Make text smaller or larger.</span></span><input class="evia-stable-range" id="eviaStableTextScale" type="range" min=".9" max="1.35" step=".05" value="${Number(state.textScale)||1}"></div>
  ${row('dyslexiaFriendly','Dyslexia-friendly text','Uses a clearer system font and keeps wording easy to scan.',state)}
  <div class="evia-stable-row"><span class="evia-stable-label"><strong>Screen tint</strong><span>Choose a softer whole-screen overlay.</span></span><div class="evia-stable-tints">${tints.map(([id,colour,label])=>`<button class="evia-stable-tint-choice${state.tint===id?' selected':''}" type="button" data-stable-tint="${id}" aria-label="${label}" title="${label}" style="background:${colour}"></button>`).join('')}</div></div>
  ${row('readingFocus','Reading Focus','Hold the handle and slide the focus window up or down anywhere on Evia.',state)}
  ${row('lineSpacing','More line spacing','Adds more space between lines of text.',state)}
  ${row('letterSpacing','More word and letter spacing','Adds extra spacing to make text easier to separate.',state)}
  ${row('highContrast','Higher contrast','Makes text and interface edges stronger.',state)}
  ${row('reduceMotion','Reduce movement','Stops non-essential animation and movement.',state)}
  ${row('simplifiedReading','Simplified reading','Reduces visual distraction and gives text more breathing room.',state)}
  ${row('extraThinkingTime','Extra thinking time','Adds a short processing pause before answer choices in Test Me and Check-ins.',state)}
  <button class="evia-stable-read" type="button" data-stable-action="read">Read this page aloud</button></section>
  <div class="evia-stable-version">Evia v${VERSION}</div>`;
}
function openSettings(){
  ensureUi();renderSettings();const overlay=document.getElementById('eviaStableSettings');overlay?.classList.add('open');overlay?.setAttribute('aria-hidden','false');if(overlay)overlay.scrollTop=0;
}
function closeSettings(){const overlay=document.getElementById('eviaStableSettings');overlay?.classList.remove('open');overlay?.setAttribute('aria-hidden','true');window.speechSynthesis?.cancel?.()}
function sampleStyle(state){
  const scale=Math.max(.9,Math.min(1.35,Number(state.textScale)||1));
  return [`font-size:${14*scale}px`,`font-family:${state.dyslexiaFriendly?'Verdana,Tahoma,Arial,sans-serif':'Arial,sans-serif'}`,`line-height:${state.lineSpacing?'1.82':(state.simplifiedReading?'1.78':'1.42')}`,`letter-spacing:${state.letterSpacing?'.065em':'normal'}`,`word-spacing:${state.letterSpacing?'.18em':'normal'}`,`filter:${state.highContrast?'contrast(1.3)':'none'}`,state.simplifiedReading?'padding:23px;box-shadow:none':''].join(';');
}
function sample(state){
  const classes=['evia-stable-sample',state.readingFocus?'focus':'',state.reduceMotion?'reduced':''].filter(Boolean).join(' ');
  const extra=state.extraThinkingTime?'<p><strong style="display:inline;font-size:inherit">Extra thinking time:</strong> answer choices pause briefly so you can process the question first.</p>':'';
  return `<div class="${classes}" style="${sampleStyle(state)}"><strong>Learning in Evia</strong><p>Read the task carefully, identify the important information and work through one step at a time.</p>${extra}<div class="evia-stable-sample-pill">Example Evia learning option</div><div class="evia-stable-motion" aria-hidden="true"></div><div class="evia-stable-focus-top"></div><div class="evia-stable-focus-bottom"></div>${state.tint!=='none'?`<div class="evia-stable-sample-tint" style="background:${tintColours[state.tint]||'transparent'}"></div>`:''}</div>`;
}
function openPreview(key,candidate){
  ensureUi();const current=load();preview={key,current,candidate};const [title,description]=labels[key]||['Learning Support','Preview this change before applying it.'];const shell=document.getElementById('eviaStablePreviewShell');if(!shell)return;
  shell.innerHTML=`<div class="evia-stable-preview-head"><div class="evia-stable-preview-mark">Aa</div><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></div></div><div class="evia-stable-preview-grid"><div class="evia-stable-preview-column"><span class="evia-stable-preview-label">Before</span>${sample(current)}</div><div class="evia-stable-preview-column"><span class="evia-stable-preview-label">After</span>${sample(candidate)}</div></div><div class="evia-stable-preview-actions"><button class="evia-stable-cancel" type="button" data-stable-preview="cancel">Cancel</button><button class="evia-stable-accept" type="button" data-stable-preview="accept">Accept</button></div>`;
  const overlay=document.getElementById('eviaStablePreview');overlay?.classList.add('open');overlay?.setAttribute('aria-hidden','false');if(overlay)overlay.scrollTop=0;
}
function closePreview(){const overlay=document.getElementById('eviaStablePreview');overlay?.classList.remove('open');overlay?.setAttribute('aria-hidden','true');preview=null}
function acceptPreview(){if(!preview)return;save(preview.candidate);apply(preview.candidate);closePreview();renderSettings()}
function onSettingsClick(event){
  const action=event.target.closest('[data-stable-action]')?.dataset.stableAction;
  if(action==='back'){closeSettings();return}
  if(action==='read'){readAloud();return}
  const toggle=event.target.closest('[data-stable-toggle]');if(toggle){const current=load();const key=toggle.dataset.stableToggle;if(key)openPreview(key,{...current,[key]:!Boolean(current[key])});return}
  const tint=event.target.closest('[data-stable-tint]');if(tint){const current=load();openPreview('tint',{...current,tint:tint.dataset.stableTint||'none'})}
}
function onSettingsChange(event){
  if(event.target?.id!=='eviaStableTextScale')return;const current=load();const next=Math.max(.9,Math.min(1.35,Number(event.target.value)||1));openPreview('textScale',{...current,textScale:next});
}
function readAloud(){
  if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const source=document.getElementById('eviaStableSettings');const text=String(source?.innerText||'').replace(/\s+/g,' ').trim();if(!text)return;const utterance=new SpeechSynthesisUtterance(text.slice(0,7000));utterance.rate=.92;window.speechSynthesis.speak(utterance);
}
function directGear(){const icon=document.querySelector('[data-evia-tool="settings"] .evia-tool-icon');if(icon)icon.innerHTML=gear()}
function closeMenu(){document.getElementById('eviaToolsMenu')?.classList.remove('open');document.getElementById('eviaToolsMenuButton')?.setAttribute('aria-expanded','false')}
function interceptSettings(event){
  const item=event.target?.closest?.('[data-evia-tool="settings"]');if(!item)return;
  event.preventDefault();event.stopImmediatePropagation();closeMenu();openSettings();
}
function start(){
  ensureUi();apply();directGear();
  window.addEventListener('click',interceptSettings,true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();