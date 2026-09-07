(()=>{'use strict';
const NAXOS_ASSESSMENT_URL='https://ddrnfinch.github.io/Naxos-Mapping_Engine/assessment-plans.json';
const PRACTICE_KEY='eviaEpaPracticeMethodsV1';
let activeSession=null;
let planCache=null;

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const escapeHtml=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function safeJson(value,fallback){try{const parsed=JSON.parse(value);return parsed??fallback}catch{return fallback}}
function currentMeta(){try{return typeof inferredCourseMeta==='function'?(inferredCourseMeta()||{}):{}}catch{return{}}}
function courseId(meta=currentMeta()){return clean(meta?.qualificationId||meta?.qualification?.id||meta?.standardCode||meta?.courseId||'')}
function isNvq(meta=currentMeta()){return /^6570-0[45]$/.test(courseId(meta))||clean(meta?.courseType).toLowerCase()==='nvq'}
function isDemo(meta=currentMeta()){try{if(localStorage.getItem('eviaDemoModeV1')==='1')return true}catch{}return meta?.demo===true||clean(meta?.standardCode)==='EVIA-DEMO'}
function endpoint(){
  const explicit=clean(globalThis.EVIA_EPA_DISCUSSION_ENDPOINT||'');if(explicit)return explicit;
  let base='';try{base=clean(globalThis.EviaTeachTestAI?.endpoint?.()||globalThis.EVIA_TEACH_TEST_ENDPOINT||'')}catch{}
  return base.replace(/\/v1\/teach-test(?:\?.*)?$/,'/v1/epa-discussion')
}
function courseContext(){
  try{const context=globalThis.EviaTeachTestAI?.context?.('epa');if(context&&Array.isArray(context.criteria))return context}catch{}
  const meta=currentMeta();const criteria=[];
  if(meta?.criteria&&typeof meta.criteria==='object'){
    if(Array.isArray(meta.criteria))meta.criteria.forEach(item=>criteria.push({code:clean(item?.code||item?.id),label:clean(item?.label||item?.wording),path:clean(item?.path),requirement:clean(item?.requirement||item?.wording)}));
    else Object.entries(meta.criteria).forEach(([code,text])=>criteria.push({code:clean(code),label:clean(text),path:'',requirement:clean(text)}));
  }
  return{courseId:courseId(meta),courseTitle:clean(meta?.qualificationTitle||meta?.qualification?.title||meta?.standardTitle||meta?.courseTitle||localStorage.getItem('eviaNaxosCourseTitle')||''),courseType:clean(meta?.courseType),level:clean(meta?.level),criteria:criteria.slice(0,90)}
}
function readPractice(){try{return safeJson(localStorage.getItem(PRACTICE_KEY)||'{}',{})||{}}catch{return{}}}
function writePractice(value){try{localStorage.setItem(PRACTICE_KEY,JSON.stringify(value))}catch{}}
function recordPractice(type,level){const state=readPractice(),row=state[type]&&typeof state[type]==='object'?state[type]:{};state[type]={count:Number(row.count||0)+1,lastLevel:clean(level)||'developing',lastAt:new Date().toISOString()};writePractice(state)}
function levelLabel(value){const key=clean(value).toLowerCase();if(key==='strong')return'Strong practice answer';if(key==='developing')return'Developing';if(key==='limited')return'Needs more detail';return'Not practised yet'}
function mcqStatus(){const state=safeJson(localStorage.getItem('eviaEpaPracticeV1')||'{}',{});const n=Number(state?.percent);return Number.isFinite(n)?`${Math.round(n)}% latest score`:'Not practised yet'}

function injectStyles(){
  if(document.getElementById('eviaMenuEpaPracticeV1Styles'))return;
  const style=document.createElement('style');style.id='eviaMenuEpaPracticeV1Styles';style.textContent=`
    .evia-hub-actions{display:flex;flex-direction:column;gap:10px}
    .evia-hub-action{width:100%;min-height:62px;border:1.5px solid rgba(245,196,0,.32);border-radius:22px;background:linear-gradient(180deg,#fff,#fffdf7);box-shadow:0 8px 22px rgba(35,35,35,.045);padding:12px 16px;text-align:left;color:#444;cursor:pointer}
    .evia-hub-action strong{display:block;font-size:14px;color:#373737}.evia-hub-action span{display:block;margin-top:4px;font-size:10.5px;line-height:1.4;color:#6c6c6c}
    .evia-epa-practice-grid{display:flex;flex-direction:column;gap:10px}
    .evia-epa-practice-card{border:1.5px solid rgba(245,196,0,.28);border-radius:24px;background:linear-gradient(180deg,#fff,#fffdf8);box-shadow:0 8px 22px rgba(35,35,35,.045);padding:15px}
    .evia-epa-practice-card>strong{display:block;font-size:15px;color:#363636}.evia-epa-practice-card>p{margin-top:5px;font-size:10.8px;line-height:1.45;color:#626262}
    .evia-epa-practice-meta{margin-top:9px;font-size:10px;font-weight:700;color:rgba(45,45,45,.58)}
    .evia-epa-practice-button{width:100%;min-height:44px;margin-top:11px;border:1.5px solid rgba(245,196,0,.38);border-radius:999px;background:#fffdf7;color:#505050;font-weight:700;font-size:12px;cursor:pointer}
    .evia-epa-question{font-size:18px!important;line-height:1.42!important;color:#333!important}
    .evia-epa-record-wrap{display:flex;flex-direction:column;align-items:center;gap:8px;margin:18px 0 6px}
    .evia-epa-record-button{width:82px;height:82px;border:2px solid rgba(245,196,0,.62);border-radius:50%;background:#fff;display:grid;place-items:center;color:#8a6c00;cursor:pointer;box-shadow:0 8px 20px rgba(35,35,35,.055)}
    .evia-epa-record-button.is-recording{background:rgba(245,196,0,.11)}
    .evia-epa-record-icon{font-size:29px;line-height:1}.evia-epa-record-label{font-size:11px;font-weight:700;color:#555;text-align:center}.evia-epa-record-timer{font-size:19px;font-weight:700;color:#f5c400;font-variant-numeric:tabular-nums;min-height:23px}
    .evia-epa-practice-status{min-height:18px;margin-top:8px;font-size:10.5px;line-height:1.4;text-align:center;color:#666}
    .evia-epa-feedback-list{margin:8px 0 0 18px;font-size:11px;line-height:1.5;color:#555}.evia-epa-feedback-list li+li{margin-top:4px}
    .evia-epa-transcript{margin-top:8px;padding:11px 12px;border-radius:15px;background:rgba(250,249,242,.82);font-size:10.8px;line-height:1.5;color:#5e5e5e}
    .evia-epa-feedback-actions{display:flex;flex-direction:column;gap:8px;margin-top:13px}.evia-epa-feedback-actions button{min-height:43px;border:1.5px solid rgba(245,196,0,.32);border-radius:999px;background:#fffdf7;color:#555;font-size:11.5px;font-weight:700;cursor:pointer}
    .evia-epa-method-note{margin-top:10px;font-size:9.8px!important;color:#747474!important}
  `;document.head.appendChild(style)
}
function closeLauncher(){try{globalThis.EviaPlusLauncher?.close?.()}catch{}}
function trigger(selector){const node=document.querySelector(selector);if(node instanceof HTMLElement){node.click();return true}return false}
function overlayParts(){return{overlay:document.getElementById('eviaSupportOverlay'),title:document.getElementById('eviaSupportTitle'),subtitle:document.getElementById('eviaSupportSubtitle'),content:document.getElementById('eviaSupportContent')}}
function openSupport(titleText,subtitleText,html){const{overlay,title,subtitle,content}=overlayParts();if(!overlay||!title||!subtitle||!content)return false;cancelAudio();title.textContent=titleText;subtitle.textContent=subtitleText||'';content.innerHTML=html;overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');return true}
function closeSupport(){const{overlay}=overlayParts();cancelAudio();if(overlay){overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true')}}
function hubButton(id,title,detail){return`<button class="evia-hub-action" id="${id}" type="button"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></button>`}
function openShareScan(){closeLauncher();if(!openSupport('Share & Scan','One place to send or receive Evia information.',`<div class="evia-hub-actions">${hubButton('eviaShowQr','Show my QR','Share Evia figures and progress with another approved assistant.')}${hubButton('eviaScanQr','Scan QR','Receive an approved update into Evia.')}</div>`))return;document.getElementById('eviaShowQr')?.addEventListener('click',()=>{closeSupport();trigger('[data-naxos-action="send"]')});document.getElementById('eviaScanQr')?.addEventListener('click',()=>{closeSupport();trigger('[data-naxos-action="scan"]')})}
function openProfileSettings(){closeLauncher();if(!openSupport('Profile & Settings','Your learner details and Evia preferences.',`<div class="evia-hub-actions">${hubButton('eviaOpenProfile','My Profile','Course details, dates and learner information stored in Evia.')}${hubButton('eviaOpenSettings','Settings','Accessibility, app preferences, privacy and administration.')}</div>`))return;document.getElementById('eviaOpenProfile')?.addEventListener('click',()=>{closeSupport();trigger('[data-evia-tool="profile"]')});document.getElementById('eviaOpenSettings')?.addEventListener('click',()=>{closeSupport();trigger('[data-evia-tool="settings"]')})}

async function assessmentPlan(){
  const id=courseId();if(!id)return null;if(planCache?.id===id)return planCache.plan;
  let data=null;
  try{const response=await fetch(NAXOS_ASSESSMENT_URL,{cache:'no-store'});if(response.ok)data=await response.json()}catch{}
  if(!data&&'caches'in window){try{const cached=await caches.match(NAXOS_ASSESSMENT_URL);if(cached)data=await cached.json()}catch{}}
  const plan=data?.courses?.[id]||null;planCache={id,plan};return plan
}
function findMethod(methods,pattern){return(Array.isArray(methods)?methods:[]).find(item=>pattern.test(clean(item?.title||item?.name||item)))||null}
function methodText(item){return{title:clean(typeof item==='string'?item:item?.title||item?.name),detail:clean(typeof item==='string'?'':item?.detail||item?.description)}}
async function openEpaPractice(){
  closeLauncher();
  if(isNvq()||isDemo()){openSupport('EPA Practice','',`<div class="evia-epa-practice-card"><strong>EPA Practice is not used for this course.</strong></div>`);return}
  openSupport('EPA Practice','Loading the assessment plan for your course…','<div class="evia-epa-practice-card"><strong>Preparing EPA Practice…</strong></div>');
  const plan=await assessmentPlan();if(!plan){openSupport('EPA Practice','',`<div class="evia-epa-practice-card"><strong>Assessment plan unavailable</strong><p>Evia could not load the Naxos EPA plan for this course.</p></div>`);return}
  const methods=Array.isArray(plan.methods)?plan.methods:[];
  const mcq=findMethod(methods,/multiple[- ]choice|knowledge test|test/i),discussion=findMethod(methods,/interview|discussion/i),practical=findMethod(methods,/practical/i);
  const practice=readPractice();const dCount=Number(practice?.discussion?.count||0),pCount=Number(practice?.practical?.count||0);
  let html='<div class="evia-epa-practice-grid">';
  if(mcq){const m=methodText(mcq);html+=`<section class="evia-epa-practice-card"><strong>Multiple-choice practice</strong><p>${escapeHtml(m.detail)}</p><div class="evia-epa-practice-meta">${escapeHtml(mcqStatus())}</div><button class="evia-epa-practice-button" id="eviaEpaMcq" type="button">Start MCQ practice</button></section>`}
  if(discussion){const m=methodText(discussion);html+=`<section class="evia-epa-practice-card"><strong>Discussion Practice</strong><p>${escapeHtml(m.detail)}</p><div class="evia-epa-practice-meta">${dCount?`${dCount} practice answer${dCount===1?'':'s'} · ${levelLabel(practice.discussion.lastLevel)}`:'Not practised yet'}</div><button class="evia-epa-practice-button" id="eviaEpaDiscussion" type="button">Practise a question</button></section>`}
  if(practical){const m=methodText(practical);html+=`<section class="evia-epa-practice-card"><strong>Practical Prep</strong><p>${escapeHtml(m.detail)}</p><div class="evia-epa-practice-meta">${pCount?`${pCount} practice answer${pCount===1?'':'s'} · ${levelLabel(practice.practical.lastLevel)}`:'Not practised yet'}</div><p class="evia-epa-method-note">This checks your planning, checks and decision-making. Evia cannot assess your physical practical competence.</p><button class="evia-epa-practice-button" id="eviaEpaPractical" type="button">Start practical prep</button></section>`}
  html+='</div>';
  openSupport('EPA Practice',`${clean(plan.title||'Your course')} · EPA methods from Naxos`,html);
  document.getElementById('eviaEpaMcq')?.addEventListener('click',startMcq);
  if(discussion)document.getElementById('eviaEpaDiscussion')?.addEventListener('click',()=>startAudioPractice('discussion',methodText(discussion)));
  if(practical)document.getElementById('eviaEpaPractical')?.addEventListener('click',()=>startAudioPractice('practical',methodText(practical)))
}
async function startMcq(){closeSupport();try{if(typeof openChat==='function')await openChat();testState={category:'epa',index:0,score:0};await askTestQuestion()}catch{try{await startTestMe()}catch{}}}

function requestCourse(){const course=courseContext();return{courseId:clean(course?.courseId),courseTitle:clean(course?.courseTitle),courseType:clean(course?.courseType),level:clean(course?.level),criteria:Array.isArray(course?.criteria)?course.criteria.slice(0,90):[]}}
async function requestQuestion(type,method,previous=[]){
  const url=endpoint();if(!url)throw new Error('EPA practice AI is not configured.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'question',practiceType:type,course:requestCourse(),assessmentMethod:method,previousQuestions:previous.slice(-4)}),signal:controller.signal,cache:'no-store'});const data=await response.json().catch(()=>null);if(!response.ok||!data?.ok)throw new Error(clean(data?.error)||'Could not create a question.');return data}finally{clearTimeout(timer)}
}
async function startAudioPractice(type,method){
  openSupport(type==='discussion'?'Discussion Practice':'Practical Prep',method.detail||'Preparing your question…','<div class="evia-epa-practice-card"><strong>Preparing a question…</strong></div>');
  try{const data=await requestQuestion(type,method,[]);activeSession={type,method,question:clean(data.question),mappedTo:Array.isArray(data.mappedTo)?data.mappedTo.map(clean).filter(Boolean):[],followUp:'',previous:[],recorder:null,stream:null,chunks:[],startedAt:0,timer:0,cancelled:false};renderQuestion()}catch(error){openSupport(type==='discussion'?'Discussion Practice':'Practical Prep',method.detail||'',`<div class="evia-epa-practice-card"><strong>Could not prepare a question</strong><p>${escapeHtml(error.message||'Please try again.')}</p><button class="evia-epa-practice-button" id="eviaEpaBackHub" type="button">Back to EPA Practice</button></div>`);document.getElementById('eviaEpaBackHub')?.addEventListener('click',openEpaPractice)}}
function renderQuestion(){if(!activeSession)return;const s=activeSession,typeLabel=s.type==='discussion'?'Discussion Practice':'Practical Prep';const note=s.type==='discussion'?'Answer naturally as if you were speaking to the independent assessor.':'Explain how you would plan, check and respond. This is preparation only and does not assess practical competence.';openSupport(typeLabel,s.method.detail||'',`<section class="evia-epa-practice-card"><strong class="evia-epa-question">${escapeHtml(s.question)}</strong><p>${escapeHtml(note)}</p><div class="evia-epa-record-wrap"><button class="evia-epa-record-button" id="eviaEpaRecord" type="button" aria-label="Record answer"><span class="evia-epa-record-icon">🎙</span></button><div class="evia-epa-record-label" id="eviaEpaRecordLabel">Record answer</div><div class="evia-epa-record-timer" id="eviaEpaRecordTimer">00:00</div></div><div class="evia-epa-practice-status" id="eviaEpaPracticeStatus"></div></section><div class="evia-epa-feedback-actions"><button id="eviaEpaBackHub" type="button">Back to EPA Practice</button></div>`);document.getElementById('eviaEpaRecord')?.addEventListener('click',toggleRecording);document.getElementById('eviaEpaBackHub')?.addEventListener('click',openEpaPractice)}
function formatTime(ms){const total=Math.max(0,Math.floor(ms/1000)),m=Math.floor(total/60),s=total%60;return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function setStatus(text){const el=document.getElementById('eviaEpaPracticeStatus');if(el)el.textContent=text||''}
function stopTimer(){if(activeSession?.timer){clearInterval(activeSession.timer);activeSession.timer=0}}
function stopTracks(){try{activeSession?.stream?.getTracks?.().forEach(track=>track.stop())}catch{}if(activeSession)activeSession.stream=null}
function cancelAudio(){if(!activeSession)return;activeSession.cancelled=true;stopTimer();try{if(activeSession.recorder?.state==='recording')activeSession.recorder.stop()}catch{}stopTracks()}
async function toggleRecording(){if(!activeSession)return;if(activeSession.recorder?.state==='recording'){setStatus('Preparing feedback…');activeSession.recorder.stop();return}await beginRecording()}
async function beginRecording(){
  if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder){setStatus('Audio recording is not supported on this device.');return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:{ideal:1},echoCancellation:true,noiseSuppression:true,autoGainControl:true}});activeSession.stream=stream;activeSession.chunks=[];activeSession.cancelled=false;
    const types=['audio/webm;codecs=opus','audio/webm','audio/mp4'];const mime=types.find(type=>{try{return MediaRecorder.isTypeSupported?.(type)}catch{return false}})||'';const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);activeSession.recorder=recorder;
    recorder.addEventListener('dataavailable',event=>{if(event.data?.size)activeSession?.chunks.push(event.data)});
    recorder.addEventListener('stop',()=>finishRecording(recorder.mimeType||mime||'audio/webm'));
    recorder.start(250);activeSession.startedAt=Date.now();const button=document.getElementById('eviaEpaRecord'),label=document.getElementById('eviaEpaRecordLabel');button?.classList.add('is-recording');if(label)label.textContent='Stop & get feedback';setStatus('Recording…');
    const timer=document.getElementById('eviaEpaRecordTimer');stopTimer();activeSession.timer=setInterval(()=>{if(timer&&activeSession?.startedAt)timer.textContent=formatTime(Date.now()-activeSession.startedAt)},250)
  }catch{setStatus('Microphone access is needed for discussion practice.')}
}
async function finishRecording(mime){if(!activeSession)return;stopTimer();stopTracks();if(activeSession.cancelled)return;const chunks=activeSession.chunks.slice();if(!chunks.length){setStatus('No audio was recorded.');return}const blob=new Blob(chunks,{type:mime||'audio/webm'});await submitFeedback(blob)}
async function submitFeedback(blob){
  if(!activeSession)return;const s=activeSession;openSupport(s.type==='discussion'?'Discussion Practice':'Practical Prep',s.method.detail||'',`<div class="evia-epa-practice-card"><strong>Listening to your answer…</strong><p>Evia is transcribing your response and comparing it with the question and relevant course criteria.</p></div>`);
  const url=endpoint();if(!url){renderFeedbackError('EPA practice AI is not configured.');return}
  const form=new FormData();form.append('action','feedback');form.append('practiceType',s.type);form.append('question',s.question);form.append('assessmentMethod',JSON.stringify(s.method));form.append('course',JSON.stringify(requestCourse()));form.append('mappedTo',JSON.stringify(s.mappedTo));form.append('audio',blob,'epa-practice.webm');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
  try{const response=await fetch(url,{method:'POST',body:form,signal:controller.signal,cache:'no-store'});const data=await response.json().catch(()=>null);if(!response.ok||!data?.ok)throw new Error(clean(data?.error)||'Could not review your answer.');s.followUp=clean(data.followUp);recordPractice(s.type,data.level);renderFeedback(data)}catch(error){renderFeedbackError(error.message||'Could not review your answer.')}finally{clearTimeout(timer)}
}
function renderFeedbackError(message){if(!activeSession)return;const s=activeSession;openSupport(s.type==='discussion'?'Discussion Practice':'Practical Prep',s.method.detail||'',`<div class="evia-epa-practice-card"><strong>Could not review this answer</strong><p>${escapeHtml(message)}</p></div><div class="evia-epa-feedback-actions"><button id="eviaEpaRetrySame" type="button">Try this question again</button><button id="eviaEpaNext" type="button">Next question</button><button id="eviaEpaBackHub" type="button">Back to EPA Practice</button></div>`);document.getElementById('eviaEpaRetrySame')?.addEventListener('click',renderQuestion);document.getElementById('eviaEpaNext')?.addEventListener('click',nextQuestion);document.getElementById('eviaEpaBackHub')?.addEventListener('click',openEpaPractice)}
function listMarkup(items){return(Array.isArray(items)?items:[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('')}
function renderFeedback(data){if(!activeSession)return;const s=activeSession;const strengths=Array.isArray(data.strengths)?data.strengths:[],improvements=Array.isArray(data.improvements)?data.improvements:[];openSupport(s.type==='discussion'?'Discussion Practice':'Practical Prep',`${levelLabel(data.level)} · coaching feedback`,`<section class="evia-epa-practice-card"><strong>Your answer</strong><div class="evia-epa-transcript"><b>What Evia heard</b><br>${escapeHtml(data.transcript||'')}</div></section><section class="evia-epa-practice-card"><strong>You covered well</strong><ul class="evia-epa-feedback-list">${listMarkup(strengths)||'<li>No clear strengths were identified yet.</li>'}</ul></section><section class="evia-epa-practice-card"><strong>Strengthen your answer</strong><ul class="evia-epa-feedback-list">${listMarkup(improvements)||'<li>No major additions suggested.</li>'}</ul><p>${escapeHtml(data.summary||'')}</p><p class="evia-epa-method-note">This is practice feedback, not an EPA pass decision or assessment of competence.</p></section><div class="evia-epa-feedback-actions"><button id="eviaEpaRetrySame" type="button">Try again</button>${s.followUp?'<button id="eviaEpaFollowUp" type="button">Follow-up question</button>':''}<button id="eviaEpaNext" type="button">Next question</button><button id="eviaEpaBackHub" type="button">Back to EPA Practice</button></div>`);document.getElementById('eviaEpaRetrySame')?.addEventListener('click',renderQuestion);document.getElementById('eviaEpaFollowUp')?.addEventListener('click',()=>{if(!activeSession?.followUp)return;activeSession.previous.push(activeSession.question);activeSession.question=activeSession.followUp;activeSession.followUp='';renderQuestion()});document.getElementById('eviaEpaNext')?.addEventListener('click',nextQuestion);document.getElementById('eviaEpaBackHub')?.addEventListener('click',openEpaPractice)}
async function nextQuestion(){if(!activeSession)return;const s=activeSession;s.previous.push(s.question);openSupport(s.type==='discussion'?'Discussion Practice':'Practical Prep',s.method.detail||'','<div class="evia-epa-practice-card"><strong>Preparing another question…</strong></div>');try{const data=await requestQuestion(s.type,s.method,s.previous);s.question=clean(data.question);s.mappedTo=Array.isArray(data.mappedTo)?data.mappedTo.map(clean).filter(Boolean):[];s.followUp='';renderQuestion()}catch(error){renderFeedbackError(error.message||'Could not prepare another question.')}}

function rebuildLauncher(){
  const menu=document.getElementById('eviaPlusMenu');if(!menu)return false;const items=[['Chat with Evia',()=>{closeLauncher();trigger('[data-evia-tool="chat"]')}],['Targets',()=>{closeLauncher();trigger('[data-evia-tool="targets"]')}]];
  if(!isNvq()&&!isDemo())items.push(['EPA Practice',openEpaPractice]);items.push(['Share & Scan',openShareScan],['Profile & Settings',openProfileSettings]);
  menu.innerHTML='';items.forEach((item,index)=>{const button=document.createElement('button');button.type='button';button.className='evia-plus-pill';button.textContent=item[0];button.style.setProperty('--evia-launch-delay',`${(items.length-1-index)*55}ms`);button.addEventListener('click',item[1]);menu.appendChild(button)});return true
}
function boot(){injectStyles();if(!rebuildLauncher())setTimeout(rebuildLauncher,0);document.querySelector('#eviaSupportOverlay .evia-support-back')?.addEventListener('click',cancelAudio,true);globalThis.EviaEpaPracticeV1=Object.freeze({open:openEpaPractice,openShareScan,openProfileSettings,rebuild:rebuildLauncher,assessmentPlan})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
