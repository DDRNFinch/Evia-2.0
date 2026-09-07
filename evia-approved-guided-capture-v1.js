(()=>{'use strict';
const VERSION=1;
const GUIDABLE=new Set(['photo','photo-range','video','audio','audio-or-text','text']);
let guide=null;

function clean(value){return String(value??'').replace(/\s+/g,' ').trim()}
function root(){try{return typeof screen!=='undefined'&&screen?.classList?screen:document.getElementById('screen')}catch{return document.getElementById('screen')}}
function activeStep(){try{return capturePlan?.[captureStepIndex]||null}catch{return null}}
function currentSession(){try{return captureSessionId}catch{return null}}
function currentIndex(){try{return Number(captureStepIndex)||0}catch{return 0}}
function formatOffset(ms){const total=Math.max(0,Math.floor(Number(ms||0)/1000)),m=Math.floor(total/60),s=total%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function explanationPrompt(text){return /\b(explain|describe|why|reason|cannot be seen|can't be seen|not be seen|talk through|say what|tell us)\b/i.test(text)}
function promptList(){
  let items=[];
  try{items=Array.isArray(activeEvidence?.requirementItems)?activeEvidence.requirementItems.map(clean).filter(Boolean):[]}catch{}
  if(!items.length){
    let text='';try{text=clean(activeEvidence?.requirements)}catch{}
    if(text)items=[text];
  }
  const unique=[];const seen=new Set();
  items.forEach(item=>{const key=item.toLowerCase();if(!seen.has(key)){seen.add(key);unique.push(item)}});
  if(unique.length<2)return unique;
  const practical=unique.filter(item=>!explanationPrompt(item));
  const explanations=unique.filter(explanationPrompt);
  return practical.length&&explanations.length?[...practical,...explanations]:unique;
}
function guidableStep(step){return !!step&&GUIDABLE.has(clean(step.type).toLowerCase())}
function remainingGuidableSteps(){
  try{return (capturePlan||[]).slice(currentIndex()).filter(guidableStep).length}catch{return 1}
}
function promptQuota(){
  if(!guide)return 0;
  const remaining=Math.max(0,guide.prompts.length-guide.cursor);
  if(!remaining)return 0;
  const future=Math.max(0,remainingGuidableSteps()-1);
  return Math.max(1,remaining-future);
}
function ensureGuide(){
  const session=currentSession();
  if(guide&&guide.sessionId===session)return guide;
  const prompts=promptList();
  guide={sessionId:session,prompts,cursor:0,stepIndex:-1,stepStart:0,stepEnd:0,markers:[],recording:false,recordingType:'',recordingStartedAt:0,textResponses:[]};
  return guide;
}
function prepareStep(step){
  const state=ensureGuide();
  const index=currentIndex();
  if(state.stepIndex===index)return state;
  state.stepIndex=index;
  state.stepStart=state.cursor;
  state.stepEnd=Math.min(state.prompts.length,state.stepStart+promptQuota());
  if(state.stepEnd<=state.stepStart&&state.prompts.length)state.stepEnd=Math.min(state.prompts.length,state.stepStart+1);
  state.markers=[];state.recording=false;state.recordingType='';state.recordingStartedAt=0;state.textResponses=[];
  return state;
}
function stepPromptCount(){return guide?Math.max(0,guide.stepEnd-guide.stepStart):0}
function promptAt(index){return guide?.prompts?.[index]||''}
function currentPrompt(step=null){
  const text=promptAt(guide?.cursor??0);
  if(text)return text;
  return clean(step?.instruction)||clean(step?.label)||'Capture the evidence for this step.';
}
function setGuided(active){const el=root();if(el)el.classList.toggle('evia-guided-capture-active',!!active)}
function progressText(){
  if(!guide?.prompts?.length)return '';
  const index=Math.min(guide.prompts.length-1,Math.max(0,guide.cursor));
  return `${index+1} of ${guide.prompts.length}`;
}
function panel(){return document.querySelector('#evidenceTop .evia-guided-capture')}
function renderPanel(step){
  const host=panel();if(!host||!guide)return;
  const progress=host.querySelector('.evia-guided-progress');
  const prompt=host.querySelector('.evia-guided-prompt');
  if(progress)progress.textContent=progressText();
  if(prompt)prompt.textContent=currentPrompt(step);
  renderContinuousAction(step);
  syncTextButton(step);
}
function injectPanel(step){
  const top=document.getElementById('evidenceTop');
  const surface=top?.querySelector('.capture-surface');
  if(!surface||!guidableStep(step))return;
  setGuided(true);
  surface.querySelector('.evia-guided-capture')?.remove();
  const box=document.createElement('div');box.className='evia-guided-capture';
  box.innerHTML='<div class="evia-guided-progress"></div><div class="evia-guided-prompt"></div><div class="evia-guided-actions"></div>';
  surface.insertBefore(box,surface.firstChild);
  renderPanel(step);
  attachMediaStart(step);
  attachTextSequence(step);
}
function stepElapsed(){return guide?.recordingStartedAt?Date.now()-guide.recordingStartedAt:0}
function markerFor(index,offset){return{promptIndex:index+1,prompt:promptAt(index),offsetMs:Math.max(0,Math.round(offset)),timestamp:formatOffset(offset)}}
function addMarker(index,offset){
  if(!guide)return;
  if(guide.markers.some(item=>item.promptIndex===index+1))return;
  guide.markers.push(markerFor(index,offset));
}
function startContinuous(type,toggle,step){
  if(!guide||guide.recording)return;
  guide.recording=true;guide.recordingType=type;guide.recordingStartedAt=Date.now();guide.markers=[];
  addMarker(guide.cursor,0);
  if(toggle)toggle.classList.add('evia-guided-record-toggle-hidden');
  renderPanel(step);
}
function finishContinuous(type){
  const id=type==='video'?'recordToggle':'audioToggle';
  const toggle=document.getElementById(id);
  if(toggle&&!toggle.disabled)toggle.click();
}
function renderContinuousAction(step){
  const actions=panel()?.querySelector('.evia-guided-actions');if(!actions)return;
  actions.innerHTML='';
  const type=clean(step?.type).toLowerCase();
  if(!['video','audio'].includes(type)||!guide?.recording)return;
  const button=document.createElement('button');button.type='button';button.className='capture-button evia-guided-next';
  const final=guide.cursor>=Math.max(guide.stepStart,guide.stepEnd-1);
  button.textContent=final?(type==='video'?'Finish video':'Finish audio'):'Next';
  button.addEventListener('click',()=>{
    if(!guide?.recording)return;
    if(final){finishContinuous(type);return}
    guide.cursor=Math.min(guide.stepEnd-1,guide.cursor+1);
    addMarker(guide.cursor,stepElapsed());
    renderPanel(step);
  });
  actions.appendChild(button);
}
function attachMediaStart(step){
  const type=clean(step?.type).toLowerCase();
  if(!['video','audio'].includes(type))return;
  const toggle=document.getElementById(type==='video'?'recordToggle':'audioToggle');if(!toggle||toggle.dataset.eviaGuidedStart)return;
  toggle.dataset.eviaGuidedStart='1';
  toggle.textContent=type==='video'?'Start video':'Start audio';
  toggle.addEventListener('click',()=>{
    setTimeout(()=>{
      let live=false;try{live=typeof recorder!=='undefined'&&recorder&&recorder.state==='recording'}catch{}
      if(live)startContinuous(type,toggle,step);
    },0);
  });
}
function responseText(){return clean(document.getElementById('textEvidence')?.value)}
function syncTextButton(step){
  if(clean(step?.type).toLowerCase()!=='text'||!guide)return;
  const button=document.getElementById('saveTextEvidence');if(!button)return;
  const final=guide.cursor>=Math.max(guide.stepStart,guide.stepEnd-1);
  button.textContent=final?'Save evidence':'Next';
}
function attachTextSequence(step){
  if(clean(step?.type).toLowerCase()!=='text'||!guide||stepPromptCount()<=1)return;
  const button=document.getElementById('saveTextEvidence');const textarea=document.getElementById('textEvidence');
  if(!button||!textarea||button.dataset.eviaGuidedText)return;
  button.dataset.eviaGuidedText='1';
  button.addEventListener('click',event=>{
    const final=guide.cursor>=Math.max(guide.stepStart,guide.stepEnd-1);
    if(final)return;
    const value=responseText();
    if(!value){event.preventDefault();event.stopImmediatePropagation();try{showCaptureStatus('Write your response before continuing.')}catch{}return}
    event.preventDefault();event.stopImmediatePropagation();
    guide.textResponses.push({promptIndex:guide.cursor+1,prompt:currentPrompt(step),response:value});
    guide.cursor=Math.min(guide.stepEnd-1,guide.cursor+1);textarea.value='';
    try{showCaptureStatus('')}catch{}
    renderPanel(step);textarea.focus();
  },true);
}
function discreteSnapshot(type,step){
  const index=Math.min(guide?.prompts?.length?guide.prompts.length-1:0,Math.max(0,guide?.cursor||0));
  return{type,promptIndex:index+1,prompt:promptAt(index)||currentPrompt(step)};
}
function guideText(data){
  if(!data)return'';
  if(Array.isArray(data.markers)&&data.markers.length)return data.markers.map(item=>`${item.timestamp} — ${item.prompt}`).join('\n');
  if(Array.isArray(data.responses)&&data.responses.length)return data.responses.map(item=>`${item.promptIndex}. ${item.prompt}`).join('\n');
  return data.prompt?`${data.promptIndex}. ${data.prompt}`:'';
}
function guidePayload(type,step){
  if(!guide)return null;
  const payload={version:VERSION,totalPrompts:guide.prompts.length,method:type};
  if(['video','audio'].includes(type)&&guide.markers.length){payload.markers=guide.markers.map(item=>({...item}));}
  else if(type==='text'&&guide.textResponses.length){
    const final=responseText();const responses=guide.textResponses.map(item=>({...item}));
    if(final)responses.push({promptIndex:guide.cursor+1,prompt:currentPrompt(step),response:final});
    payload.responses=responses;
  }else Object.assign(payload,discreteSnapshot(type,step));
  payload.assessmentGuide=guideText(payload);
  return payload;
}
async function persistGuide(entry,payload){
  if(!entry||!payload)return entry;
  const updated={...entry,guidedCapture:payload,assessmentGuide:payload.assessmentGuide||''};
  try{if(typeof addPortfolioEntry==='function')await addPortfolioEntry(updated)}catch{}
  return updated;
}
function advanceWithinStepAfterSave(type){
  if(!guide)return;
  if(['video','audio','text'].includes(type))return;
  if(guide.cursor<guide.stepEnd-1){guide.cursor+=1;renderPanel(activeStep())}
}
function closeStepCursor(){if(guide)guide.cursor=Math.max(guide.cursor,guide.stepEnd)}
function renderReviewGuide(entry){
  const data=entry?.guidedCapture;if(!data)return;
  const meta=document.getElementById('portfolioViewerMeta');if(!meta)return;
  const text=clean(entry.assessmentGuide||guideText(data));if(!text)return;
  if(meta.textContent.includes('Evidence guide'))return;
  meta.textContent=`${meta.textContent}\n\nEvidence guide\n${text}`;
}
function combinedTextBlob(blob){
  if(!guide?.textResponses?.length)return blob;
  const final=responseText();const responses=guide.textResponses.map(item=>({...item}));
  if(final)responses.push({promptIndex:guide.cursor+1,prompt:currentPrompt(activeStep()),response:final});
  const text=responses.map(item=>`${item.prompt}\n${item.response}`).join('\n\n');
  return new Blob([text],{type:'text/plain;charset=utf-8'});
}
function injectStyles(){
  if(document.getElementById('eviaGuidedCaptureV1Styles'))return;
  const style=document.createElement('style');style.id='eviaGuidedCaptureV1Styles';style.textContent=`
    .screen.evidence-open.evia-guided-capture-active .evidence-requirements{display:none!important}
    .screen.evidence-open.evia-guided-capture-active .evidence-screen{grid-template-rows:minmax(0,1fr)!important}
    .screen.evidence-open.evia-guided-capture-active .evidence-top{height:100%!important;min-height:0!important}
    .screen.evidence-open.evia-guided-capture-active .capture-surface{display:flex!important;flex-direction:column!important;gap:10px!important;height:100%!important;min-height:0!important}
    .evia-guided-capture{width:100%;flex:0 0 auto;padding:8px 10px 5px;text-align:center}
    .evia-guided-progress{min-height:16px;font-size:10px;font-weight:700;letter-spacing:.04em;color:rgba(45,45,45,.42)}
    .evia-guided-prompt{max-width:440px;margin:4px auto 0;font-size:clamp(19px,5.2vw,25px);line-height:1.28;font-weight:700;color:rgba(45,45,45,.86)}
    .evia-guided-actions{display:flex;justify-content:center;gap:9px;margin-top:10px}
    .evia-guided-actions:empty{display:none}
    .evia-guided-actions .capture-button{min-width:150px}
    #evidenceTop .evia-guided-record-toggle-hidden{display:none!important}
    .screen.evidence-open.evia-guided-capture-active .capture-square{flex:1 1 auto!important;min-height:0!important;max-height:none!important}
    .screen.evidence-open.evia-guided-capture-active .audio-panel{flex:1 1 auto;display:flex;flex-direction:column;justify-content:center;align-items:center}
    @media(max-height:700px){.evia-guided-prompt{font-size:18px}.evia-guided-capture{padding-top:4px}.evia-guided-actions{margin-top:6px}}
  `;document.head.appendChild(style);
}

injectStyles();

try{
  if(typeof saveEvidenceBlob==='function'&&!saveEvidenceBlob.__eviaGuidedCapture){
    const original=saveEvidenceBlob;
    const wrapped=async function(blob,type,savedContext){
      const step=activeStep();prepareStep(step);const kind=clean(type).toLowerCase();
      const sourceBlob=kind==='text'?combinedTextBlob(blob):blob;
      const payload=guidePayload(kind,step);
      const entry=await original.call(this,sourceBlob,type,savedContext);
      const updated=await persistGuide(entry,payload);advanceWithinStepAfterSave(kind);return updated;
    };
    wrapped.__eviaGuidedCapture=true;saveEvidenceBlob=wrapped;
  }
}catch{}
try{
  if(typeof runCaptureStep==='function'&&!runCaptureStep.__eviaGuidedCapture){
    const original=runCaptureStep;
    const wrapped=function(){
      const step=activeStep();prepareStep(step);setGuided(guidableStep(step));
      const result=original.apply(this,arguments);
      requestAnimationFrame(()=>injectPanel(step));
      setTimeout(()=>injectPanel(step),80);
      return result;
    };
    wrapped.__eviaGuidedCapture=true;runCaptureStep=wrapped;
  }
}catch{}
try{
  if(typeof completeCaptureStep==='function'&&!completeCaptureStep.__eviaGuidedCapture){
    const original=completeCaptureStep;
    const wrapped=async function(){closeStepCursor();const result=await original.apply(this,arguments);return result};
    wrapped.__eviaGuidedCapture=true;completeCaptureStep=wrapped;
  }
}catch{}
try{
  if(typeof clearCaptureSequence==='function'&&!clearCaptureSequence.__eviaGuidedCapture){
    const original=clearCaptureSequence;
    const wrapped=function(){const result=original.apply(this,arguments);guide=null;setGuided(false);return result};
    wrapped.__eviaGuidedCapture=true;clearCaptureSequence=wrapped;
  }
}catch{}
try{
  if(typeof cancelEvidenceCollectionToChoices==='function'&&!cancelEvidenceCollectionToChoices.__eviaGuidedCapture){
    const original=cancelEvidenceCollectionToChoices;
    cancelEvidenceCollectionToChoices=function(){guide=null;setGuided(false);return original.apply(this,arguments)};
  }
}catch{}
try{
  if(typeof renderEvidenceViewer==='function'&&!renderEvidenceViewer.__eviaGuidedCapture){
    const original=renderEvidenceViewer;
    const wrapped=async function(entry){const result=await original.apply(this,arguments);renderReviewGuide(entry);return result};
    wrapped.__eviaGuidedCapture=true;renderEvidenceViewer=wrapped;
  }
}catch{}

window.EviaGuidedCapture={version:VERSION,formatAssessmentGuide:entry=>clean(entry?.assessmentGuide||guideText(entry?.guidedCapture)),getState:()=>guide?JSON.parse(JSON.stringify(guide)):null};
})();
