(()=>{'use strict';
const VERSION=1;
const clean=v=>{try{return typeof cleanText==='function'?cleanText(v):String(v??'').replace(/\s+/g,' ').trim()}catch{return String(v??'').replace(/\s+/g,' ').trim()}};
const INTRO='Please introduce yourself: your name, job role and working relationship with the apprentice.';
const CONFIRM='Do you confirm that what you have described is what you personally observed?';
function offset(ms){const sec=Math.max(0,Math.floor(Number(ms||0)/1000)),m=Math.floor(sec/60),s=sec%60;return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function root(){try{return typeof screen!=='undefined'&&screen?.classList?screen:document.getElementById('screen')}catch{return document.getElementById('screen')}}
function witnessPrompts(){
  let task=[];try{task=Array.isArray(activeEvidence?.requirementItems)?activeEvidence.requirementItems.map(clean).filter(Boolean):[]}catch{}
  const out=[INTRO,...task.filter(x=>x!==INTRO&&x!==CONFIRM),CONFIRM],seen=new Set();return out.filter(x=>{const k=x.toLowerCase();if(seen.has(k))return false;seen.add(k);return true})
}
function setActive(on){root()?.classList.toggle('evia-witness-video-active',!!on)}
function injectStyles(){if(document.getElementById('eviaWitnessVideoV1Styles'))return;const style=document.createElement('style');style.id='eviaWitnessVideoV1Styles';style.textContent=`
.screen.evidence-open.evia-witness-video-active .evidence-requirements{display:none!important}.screen.evidence-open.evia-witness-video-active .evidence-screen{grid-template-rows:minmax(0,1fr)!important}.screen.evidence-open.evia-witness-video-active .evidence-top{height:100%!important;min-height:0!important}.screen.evidence-open.evia-witness-video-active .capture-surface{display:flex!important;flex-direction:column!important;gap:10px!important;height:100%!important;min-height:0!important}.evia-witness-guide{width:100%;flex:0 0 auto;padding:8px 10px 5px;text-align:center}.evia-witness-progress{min-height:16px;font-size:10px;font-weight:700;letter-spacing:.04em;color:rgba(45,45,45,.42)}.evia-witness-prompt{max-width:440px;margin:4px auto 0;font-size:clamp(19px,5.2vw,25px);line-height:1.28;font-weight:700;color:rgba(45,45,45,.86)}.evia-witness-actions{display:flex;justify-content:center;gap:9px;margin-top:10px}.evia-witness-actions .capture-button{min-width:150px}.evia-witness-start-hidden{display:none!important}.screen.evidence-open.evia-witness-video-active .capture-square{flex:1 1 auto!important;min-height:0!important;max-height:none!important}@media(max-height:700px){.evia-witness-prompt{font-size:18px}.evia-witness-guide{padding-top:4px}.evia-witness-actions{margin-top:6px}}
`;document.head.appendChild(style)}
function renderChoice(step,sessionId,original){
  setActive(false);try{stopCapture()}catch{};try{captureMode='witness'}catch{}
  evidenceTop.innerHTML='<div class="capture-surface"><div class="audio-panel"><button class="capture-button" id="recordWitnessVideo" type="button">Record witness video</button><button class="capture-button" id="importWitnessTestimony" type="button">Import witness testimony</button><div class="capture-status" id="captureStatus"></div></div></div>';
  evidenceTop.style.gridTemplateRows='1fr';try{updateBackButton();fitUiText();showCaptureStatus('Choose how the witness testimony will be collected.')}catch{}
  document.getElementById('recordWitnessVideo')?.addEventListener('click',()=>{if(sessionId!==captureSessionId)return;openWitnessVideo(step,sessionId)});
  document.getElementById('importWitnessTestimony')?.addEventListener('click',()=>{if(sessionId!==captureSessionId)return;setActive(false);original(step,sessionId)});
}
async function openWitnessVideo(step,sessionId){
  try{stopCapture()}catch{};setActive(true);try{captureMode='witness-video'}catch{}
  const prompts=witnessPrompts();let index=0,startedAt=0,markers=[];
  evidenceTop.innerHTML='<div class="capture-surface"><div class="evia-witness-guide"><div class="evia-witness-progress"></div><div class="evia-witness-prompt"></div><div class="evia-witness-actions"></div></div><div class="capture-square"><video id="captureVideo" playsinline muted></video><div class="recording-timer" id="recordingTimer">00:00</div><div class="capture-controls"><button class="capture-button" id="recordToggle" type="button">Start witness video</button></div></div><div class="capture-status" id="captureStatus"></div></div>';
  evidenceTop.style.gridTemplateRows='1fr';
  const video=document.getElementById('captureVideo'),timer=document.getElementById('recordingTimer'),start=document.getElementById('recordToggle'),progress=document.querySelector('.evia-witness-progress'),prompt=document.querySelector('.evia-witness-prompt'),actions=document.querySelector('.evia-witness-actions');
  const render=()=>{if(progress)progress.textContent=`${index+1} of ${prompts.length}`;if(prompt)prompt.textContent=prompts[index];actions.innerHTML='';let live=false;try{live=recorder&&recorder.state==='recording'}catch{};if(!live)return;const b=document.createElement('button');b.type='button';b.className='capture-button';b.textContent=index>=prompts.length-1?'Finish witness video':'Next';b.onclick=()=>{if(index>=prompts.length-1){b.disabled=true;try{if(recorder&&recorder.state!=='inactive')recorder.stop()}catch{};return}index+=1;markers.push({promptIndex:index+1,prompt:prompts[index],offsetMs:Math.max(0,Date.now()-startedAt),timestamp:offset(Date.now()-startedAt)});render()};actions.appendChild(b)};
  render();try{updateBackButton();fitUiText()}catch{}
  try{
    captureStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:'user'},width:{ideal:1280},height:{ideal:1280},aspectRatio:{ideal:1},frameRate:{ideal:24,max:30}},audio:{channelCount:{ideal:1},echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(sessionId!==captureSessionId){try{stopCapture()}catch{};return}
    video.srcObject=captureStream;await video.play();try{showCaptureStatus('Front camera ready.')}catch{}
    start.addEventListener('click',()=>{
      if(!window.MediaRecorder){try{showCaptureStatus('Recording is not supported by this browser.')}catch{};return}
      let current=null;try{current=recorder}catch{}
      if(current&&current.state!=='inactive')return;
      const chunks=[],recordingContext=typeof captureEvidenceContext==='function'?captureEvidenceContext('witness'):null,mimeType=typeof preferredVideoMimeType==='function'?preferredVideoMimeType():'',options={videoBitsPerSecond:1200000,audioBitsPerSecond:64000};if(mimeType)options.mimeType=mimeType;
      const currentRecorder=new MediaRecorder(captureStream,options);recorder=currentRecorder;
      currentRecorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
      currentRecorder.onstop=async()=>{
        try{stopRecordingTimer()}catch{};if(recorder===currentRecorder)recorder=null;if(sessionId!==captureSessionId)return;
        const blob=new Blob(chunks,{type:currentRecorder.mimeType||mimeType||'video/webm'});if(!blob.size)return;
        try{
          const saved=await saveEvidenceBlob(blob,'witness',recordingContext);const guide={version:1,method:'witness-video',cameraFacing:'front',markers:markers.map(x=>({...x}))};const assessmentGuide=guide.markers.map(x=>`${x.timestamp} — ${x.prompt}`).join('\n');
          if(saved&&typeof addPortfolioEntry==='function')await addPortfolioEntry({...saved,witnessVideo:true,cameraFacing:'front',guidedCapture:guide,assessmentGuide});
          try{showCaptureStatus('Saved')}catch{};setActive(false);await completeCaptureStep(sessionId);
        }catch(error){try{showCaptureStatus('Could not save this witness video.')}catch{}}
      };
      currentRecorder.start(1000);startedAt=Date.now();markers=[{promptIndex:1,prompt:prompts[0],offsetMs:0,timestamp:'00:00'}];try{startRecordingTimer(timer)}catch{};start.classList.add('evia-witness-start-hidden');try{showCaptureStatus('Recording witness testimony.')}catch{};render();try{fitUiText()}catch{}
    });
  }catch(error){setActive(false);evidenceTop.innerHTML='<div class="capture-surface">Front camera and microphone access are required to record this witness testimony.</div>'}
}
injectStyles();
try{
  if(typeof openWitnessImport==='function'&&!openWitnessImport.__eviaWitnessVideo){const original=openWitnessImport;const wrapped=function(step,sessionId){return renderChoice(step,sessionId,original)};wrapped.__eviaWitnessVideo=true;openWitnessImport=wrapped}
}catch{}
try{if(typeof clearCaptureSequence==='function'&&!clearCaptureSequence.__eviaWitnessVideo){const original=clearCaptureSequence;const wrapped=function(){setActive(false);return original.apply(this,arguments)};wrapped.__eviaWitnessVideo=true;clearCaptureSequence=wrapped}}catch{}
try{if(typeof cancelEvidenceCollectionToChoices==='function'&&!cancelEvidenceCollectionToChoices.__eviaWitnessVideo){const original=cancelEvidenceCollectionToChoices;cancelEvidenceCollectionToChoices=function(){setActive(false);return original.apply(this,arguments)}}}catch{}
window.EviaWitnessVideo=Object.freeze({version:VERSION,camera:'front',switching:false});
})();