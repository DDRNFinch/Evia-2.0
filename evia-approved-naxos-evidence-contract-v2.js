(()=>{'use strict';
const TOKEN=/^naxosv2:([^:]+):(\d+):(\d+)$/i;
let contractUrl='';
let lastRules=null;

function clean(v){try{return typeof cleanText==='function'?cleanText(v):String(v??'').trim()}catch{return String(v??'').trim()}}
function clamp(n,min,max){n=Number(n);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min}
function quantity(type,label){
  const text=clean(label).toLowerCase();
  const range=text.match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)/i);
  if(range){const a=Math.max(1,Number(range[1])||1),b=Math.max(a,Number(range[2])||a);return{min:a,max:b}}
  const direct=text.match(/\b(\d+)\b/);const count=Math.max(1,Number(direct?.[1])||1);
  return clean(type).toLowerCase()==='photos'&&!direct?{min:1,max:3}:{min:count,max:count};
}
function tokenSpec(type,label){
  const raw=clean(type).toLowerCase(),match=raw.match(TOKEN);
  if(match)return{kind:match[1],min:Math.max(1,Number(match[2])||1),max:Math.max(1,Number(match[3])||1)};
  const map={photos:'photo',photo:'photo',video:'video',audio:'audio',microphone:'audio',voice:'audio',reflection:'audio',written:'written',writing:'written',text:'written',document:'document',witness:'witness',observation:'observation'};
  const kind=map[raw];if(!kind)return null;const q=quantity(raw,label);return{kind,min:q.min,max:q.max};
}
function runtimeSteps(specs){
  const out=[];
  (Array.isArray(specs)?specs:[]).forEach(spec=>{
    if(!spec||typeof spec!=='object')return;
    const kind=clean(spec.kind||spec.type).toLowerCase();
    if(kind==='choice'){
      const options=(Array.isArray(spec.options)?spec.options:[]).map(option=>({label:clean(option?.label)||'Choose',steps:runtimeSteps(option?.steps)})).filter(option=>option.steps.length);
      if(options.length)out.push({type:'choice',label:clean(spec.label)||'Choose evidence form',options});
      return;
    }
    const mapped=kind==='written'?'text':kind==='photos'?'photo':kind;
    if(!['video','photo','audio','text','document','witness','observation'].includes(mapped))return;
    let min=clamp(spec.min??spec.quantity??1,1,12),max=clamp(spec.max??spec.quantity??min,min,12);
    if(mapped==='photo'&&(max>1||min!==max)){out.push({type:'photo-range',min,max,label:clean(spec.label)||'Photos',instruction:clean(spec.instruction)});return}
    for(let i=1;i<=max;i++)out.push({type:mapped,label:clean(spec.label)||mapped,instruction:clean(spec.instruction),itemIndex:i,itemTotal:max});
  });
  return out;
}
function itemPlan(item){
  if(Array.isArray(item?.capture))return runtimeSteps(item.capture);
  if(Array.isArray(item?.capture?.steps))return runtimeSteps(item.capture.steps);
  const spec=tokenSpec(item?.type,item?.label);return spec?runtimeSteps([{...spec,label:clean(item?.label),instruction:clean(item?.instruction)}]):[];
}
function optionType(plan){
  const first=Array.isArray(plan)?plan[0]:null;
  if(!first)return'text';if(first.type==='photo-range')return'photo';if(first.type==='text')return'text';return first.type||'text';
}
function displayType(type){
  const match=clean(type).toLowerCase().match(TOKEN);const raw=match?match[1]:clean(type);
  const mapped=raw==='written'?'written':raw==='photo'?'photo':raw;
  try{return evidenceTypeDisplayLabel(mapped)||mapped}catch{return mapped}
}
function mergeRules(rules,contract){
  if(!rules||typeof rules!=='object'||!contract?.profiles)return rules;
  const merged=JSON.parse(JSON.stringify(rules));
  Object.entries(contract.profiles).forEach(([id,c])=>{
    const p=merged.profiles?.[id];if(!p)return;
    if(Array.isArray(p.preferred))p.preferred=p.preferred.map((item,i)=>({...item,capture:Array.isArray(c?.preferred?.[i]?.steps)?c.preferred[i].steps:item.capture}));
    if(Array.isArray(p.alternatives))p.alternatives=p.alternatives.map((item,i)=>({...item,capturePlan:Array.isArray(c?.alternatives?.[i]?.steps)?c.alternatives[i].steps:item.capturePlan}));
  });
  lastRules=merged;return merged;
}

try{
  if(typeof fetchNaxosJson==='function'){
    const original=fetchNaxosJson;
    fetchNaxosJson=async function(url){
      const data=await original.apply(this,arguments);
      let isRules=false;try{isRules=/\/evidence-rules\.json(?:[?#]|$)/i.test(new URL(url,location.href).href)}catch{}
      if(!isRules)return data;
      try{
        const base=new URL(url,location.href);const target=contractUrl?new URL(contractUrl,location.href).href:new URL('evidence-capture-contract-v2.json',base).href;
        const contract=await original(target);return mergeRules(data,contract);
      }catch(error){console.warn('Evia could not load Naxos evidence capture contract',error);lastRules=data;return data}
    };
  }
}catch{}

try{
  if(typeof naxosPreferredOption==='function'){
    naxosPreferredOption=function(profile){
      const preferred=Array.isArray(profile?.preferred)?profile.preferred:[];
      if(!preferred.length)return{label:'Written evidence',type:'text',details:[],capturePlan:[{type:'text',label:'Written evidence',itemIndex:1,itemTotal:1}]};
      const details=preferred.map(item=>({rawType:clean(item?.type),displayType:displayType(item?.type),label:clean(item?.label),instruction:clean(item?.instruction),capture:item?.capture||null}));
      const plan=preferred.flatMap(item=>itemPlan(item));
      const label=preferred.map(item=>clean(item?.label||item?.type)).filter(Boolean).join(' + ')||'Recommended evidence';
      return{label,type:optionType(plan),details,capturePlan:plan};
    };
  }
  if(typeof naxosAlternativeOption==='function'){
    naxosAlternativeOption=function(profile){
      const alternative=Array.isArray(profile?.alternatives)?profile.alternatives[0]:null;if(!alternative)return null;
      let plan=Array.isArray(alternative.capturePlan)?runtimeSteps(alternative.capturePlan):[];
      if(!plan.length){const spec=tokenSpec(alternative?.type,alternative?.label);if(spec)plan=runtimeSteps([{...spec,label:clean(alternative?.label),instruction:clean(alternative?.instruction)}])}
      const label=clean(alternative.label)||'Alternative evidence';
      return{label,type:optionType(plan),details:[{rawType:clean(alternative?.type),displayType:displayType(alternative?.type),label,instruction:clean(alternative.instruction),capture:alternative?.capture||null}],capturePlan:plan};
    };
  }
}catch{}

try{
  if(typeof normaliseEvidenceDetail==='function'){
    const original=normaliseEvidenceDetail;
    normaliseEvidenceDetail=function(item){const result=original.apply(this,arguments);if(result&&item&&typeof item==='object'){result.rawType=clean(item.rawType||item.type||item.method||item.evidenceType);result.capture=item.capture||null;if(result.rawType)result.displayType=clean(item.displayType||item.typeLabel)||displayType(result.rawType)}return result};
  }
  if(typeof normaliseEvidenceOption==='function'){
    const original=normaliseEvidenceOption;
    normaliseEvidenceOption=function(option,fallbackLabel){const result=original.apply(this,arguments);if(!result||!option||typeof option!=='object')return result;const plan=Array.isArray(option.capturePlan)?option.capturePlan:[];if(plan.length){result.capturePlan=JSON.parse(JSON.stringify(plan));result.type=optionType(plan)}return result};
  }
}catch{}

try{
  if(typeof buildCapturePlan==='function'){
    const original=buildCapturePlan;
    buildCapturePlan=function(option){
      if(Array.isArray(option?.capturePlan)&&option.capturePlan.length)return JSON.parse(JSON.stringify(option.capturePlan));
      const details=Array.isArray(option?.details)&&option.details.length?option.details:[];
      const plan=[];details.forEach(detail=>{
        if(Array.isArray(detail?.capture))plan.push(...runtimeSteps(detail.capture));
        else{const spec=tokenSpec(detail?.rawType||detail?.type,detail?.label);if(spec)plan.push(...runtimeSteps([{...spec,label:clean(detail?.label),instruction:clean(detail?.instruction)}]))}
      });
      if(plan.length)return plan;
      const spec=tokenSpec(option?.type,option?.label);if(spec)return runtimeSteps([{...spec,label:clean(option?.label),instruction:clean(option?.instruction)}]);
      return original.apply(this,arguments);
    };
  }
}catch{}

function fileExtension(mime){
  const m=clean(mime).toLowerCase();
  if(m.includes('pdf'))return'pdf';if(m.includes('wordprocessingml'))return'docx';if(m.includes('msword'))return'doc';if(m.includes('spreadsheetml'))return'xlsx';if(m.includes('ms-excel'))return'xls';if(m.includes('presentationml'))return'pptx';if(m.includes('powerpoint'))return'ppt';if(m.includes('csv'))return'csv';if(m.includes('text'))return'txt';if(m.includes('png'))return'png';if(m.includes('jpeg')||m.includes('jpg'))return'jpg';return'bin';
}
try{if(typeof extensionForMime==='function'){const original=extensionForMime;extensionForMime=function(mime,type){if(type==='document'||type==='observation')return fileExtension(mime);return original.apply(this,arguments)}}}catch{}

function openFileStep(step,sessionId,observation=false){
  stopCapture();captureMode=observation?'observation':'document';
  const label=observation?'Import assessor observation':'Choose document';
  evidenceTop.innerHTML=`<div class="capture-surface"><div class="audio-panel"><button class="capture-button" id="naxosFilePick" type="button">${label}</button><input id="naxosFileInput" type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png"><div class="capture-status" id="captureStatus"></div></div></div>`;
  evidenceTop.style.gridTemplateRows='1fr';updateBackButton();fitUiText();showCaptureStatus(observation?'Import the assessor observation file supplied for this task.':'Choose the document required by Naxos.');
  const input=document.getElementById('naxosFileInput');document.getElementById('naxosFilePick')?.addEventListener('click',()=>input?.click());
  input?.addEventListener('change',async()=>{const file=input.files?.[0];if(!file||sessionId!==captureSessionId)return;try{await saveEvidenceBlob(file,observation?'observation':'document');showCaptureStatus('Saved');await completeCaptureStep(sessionId)}catch{showCaptureStatus('Could not save this file.')}});
}
function openChoiceStep(step,sessionId){
  stopCapture();captureMode='choice';
  const buttons=(step.options||[]).map((option,i)=>`<button class="capture-button" type="button" data-naxos-choice="${i}">${clean(option.label)||`Option ${i+1}`}</button>`).join('');
  evidenceTop.innerHTML=`<div class="capture-surface"><div class="audio-panel">${buttons}<div class="capture-status" id="captureStatus"></div></div></div>`;evidenceTop.style.gridTemplateRows='1fr';updateBackButton();fitUiText();showCaptureStatus(clean(step.label)||'Choose the evidence form Naxos allows.');
  evidenceTop.querySelectorAll('[data-naxos-choice]').forEach(button=>button.addEventListener('click',()=>{if(sessionId!==captureSessionId)return;const option=step.options?.[Number(button.dataset.naxosChoice)];if(!option)return;const replacement=Array.isArray(option.steps)?JSON.parse(JSON.stringify(option.steps)):[];capturePlan.splice(captureStepIndex,1,...replacement);captureMode=null;runCaptureStep()}));
}
async function openPhotoRange(step,sessionId){
  stopCapture();captureMode='photo';const min=clamp(step.min||1,1,12),max=clamp(step.max||min,min,12);let count=0;
  evidenceTop.innerHTML='<div class="capture-surface"><div class="capture-square"><video id="captureVideo" playsinline muted></video><div class="capture-controls"><button class="capture-button" id="naxosPhotoCapture" type="button">Take photo</button><button class="capture-button" id="naxosPhotoFinish" type="button" hidden>Finish photos</button></div></div><div class="capture-status" id="captureStatus"></div></div>';evidenceTop.style.gridTemplateRows='1fr';updateBackButton();fitUiText();
  const video=document.getElementById('captureVideo'),take=document.getElementById('naxosPhotoCapture'),finish=document.getElementById('naxosPhotoFinish');
  try{
    captureStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1600},aspectRatio:{ideal:1}},audio:false});if(sessionId!==captureSessionId){stopCapture();return}video.srcObject=captureStream;await video.play();
    const status=()=>showCaptureStatus(min===max?`Photo ${Math.min(count+1,max)} of ${max}`:`${count} saved · take ${min} to ${max} photos`);status();
    take.addEventListener('click',async()=>{if(sessionId!==captureSessionId)return;take.disabled=true;const canvas=document.createElement('canvas');canvas.width=video.videoWidth||1280;canvas.height=video.videoHeight||1280;canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob){take.disabled=false;return}try{await saveEvidenceBlob(blob,'photo');count+=1;if(count>=max){showCaptureStatus('Saved');await completeCaptureStep(sessionId);return}finish.hidden=count<min;take.disabled=false;status()}catch{take.disabled=false;showCaptureStatus('Could not save this photo.')}});
    finish.addEventListener('click',async()=>{if(sessionId!==captureSessionId||count<min)return;showCaptureStatus('Saved');await completeCaptureStep(sessionId)});
  }catch{evidenceTop.innerHTML='<div class="capture-surface">Camera access is required to take these photos.</div>'}
}

try{
  if(typeof runCaptureStep==='function'){
    const original=runCaptureStep;
    runCaptureStep=function(){const step=capturePlan[captureStepIndex],sessionId=captureSessionId;if(!step)return original.apply(this,arguments);if(step.type==='choice')return openChoiceStep(step,sessionId);if(step.type==='photo-range')return openPhotoRange(step,sessionId);if(step.type==='document')return openFileStep(step,sessionId,false);if(step.type==='observation')return openFileStep(step,sessionId,true);return original.apply(this,arguments)};
  }
}catch{}

try{
  if(typeof renderEvidenceRequirements==='function'){
    const original=renderEvidenceRequirements;
    renderEvidenceRequirements=function(node){const result=original.apply(this,arguments);const box=typeof evidenceRequirements!=='undefined'?evidenceRequirements:document.getElementById('evidenceRequirements');const heading=typeof requirementsHeading!=='undefined'?requirementsHeading:document.getElementById('requirementsHeading');box?.querySelector('.evia-evidence-task-title')?.remove();const title=clean(node?.label);if(box&&heading&&title){const el=document.createElement('div');el.className='evia-evidence-task-title';el.textContent=title;heading.parentNode?.insertBefore(el,heading)}return result};
  }
}catch{}

function evidenceFromCompact(value,baseProfileId=''){
  if(!Array.isArray(value))return null;const profileId=clean(value[0])||baseProfileId;const rows=Array.isArray(value[1])?value[1]:[];const base=lastRules?.profiles?.[profileId]||{};
  const preferred=rows.length?rows.map(row=>({type:clean(row?.[0]),label:clean(row?.[1]),instruction:clean(row?.[2])})):Array.isArray(base.preferred)?base.preferred:[];
  const profile={...base,preferred};return{recommended:typeof naxosPreferredOption==='function'?naxosPreferredOption(profile):null,alternative:typeof naxosAlternativeOption==='function'?naxosAlternativeOption(profile):null,profileId};
}
function applyNvqPatch(items,patch){
  const p=patch&&typeof patch==='object'?patch:{};
  (Array.isArray(p.c)?p.c:[]).forEach(row=>{const ci=Number(row?.[0]),title=clean(row?.[1]);if(items?.[ci]&&title)items[ci].label=title});
  (Array.isArray(p.s)?p.s:[]).forEach(row=>{const ci=Number(row?.[0]),si=Number(row?.[1]),title=clean(row?.[2]);if(items?.[ci]?.children?.[si]&&title)items[ci].children[si].label=title});
  (Array.isArray(p.t)?p.t:[]).forEach(row=>{const ci=Number(row?.[0]),si=Number(row?.[1]),ti=Number(row?.[2]),title=clean(row?.[3]);if(items?.[ci]?.children?.[si]?.children?.[ti]&&title)items[ci].children[si].children[ti].label=title});
  (Array.isArray(p.e)?p.e:[]).forEach(row=>{const node=items?.[Number(row?.[0])]?.children?.[Number(row?.[1])]?.children?.[Number(row?.[2])];if(!node)return;const ev=evidenceFromCompact(row?.[3]);if(ev){node.recommended=ev.recommended;node.alternative=ev.alternative}});
  (Array.isArray(p.a)?p.a:[]).forEach(row=>{const ci=Number(row?.[0]),si=Number(row?.[1]),title=clean(row?.[2]),targets=Array.isArray(row?.[3])?row[3].map(clean).filter(Boolean):[],ev=evidenceFromCompact(row?.[4]);const sub=items?.[ci]?.children?.[si];if(!sub||!title||!targets.length||!ev)return;sub.children=sub.children||[];sub.children.push({label:title,recommended:ev.recommended,alternative:ev.alternative,requirementsHeading:'What the evidence must show or explain',requirementItems:targets,requirements:targets.join('\n'),acTargets:targets,atomicTargets:targets,naxosCustom:true})});
  return items;
}

function installImportWrappers(){
  try{if(typeof importNaxosKsbPack==='function'){const original=importNaxosKsbPack;importNaxosKsbPack=async function(pointer){const previous=contractUrl;contractUrl=clean(pointer?.evidenceContractUrl);try{return await original.apply(this,arguments)}finally{contractUrl=previous}}}}catch{}
  try{if(typeof importNaxosNvqPack==='function'){const original=importNaxosNvqPack;importNaxosNvqPack=async function(pointer){const previous=contractUrl;contractUrl=clean(pointer?.evidenceContractUrl);try{const result=await original.apply(this,arguments);if(pointer?.nvqPatchV2){let items=[];try{items=JSON.parse(localStorage.getItem('eviaNaxosCourse')||'[]')}catch{}if(Array.isArray(items)&&items.length){applyNvqPatch(items,pointer.nvqPatchV2);let title='';try{title=localStorage.getItem('eviaNaxosCourseTitle')||''}catch{}let meta={};try{meta=JSON.parse(localStorage.getItem('eviaNaxosCourseMetaV1')||'{}')||{}}catch{}if(typeof applyImportedCourse==='function')applyImportedCourse(items,title,meta);else if(typeof saveCourse==='function')saveCourse(items,title)}}return result}finally{contractUrl=previous}}}}catch{}
}
installImportWrappers();

try{
  if(!document.getElementById('eviaNaxosEvidenceContractStyles')){const style=document.createElement('style');style.id='eviaNaxosEvidenceContractStyles';style.textContent='.evia-evidence-task-title{font-size:14px;font-weight:800;line-height:1.3;color:rgba(45,45,45,.82);margin:0 0 5px}.evia-evidence-task-title+#requirementsHeading{margin-top:0}.capture-controls:has(#naxosPhotoFinish){display:flex;gap:8px;flex-wrap:wrap}.capture-controls:has(#naxosPhotoFinish) .capture-button{flex:1 1 130px}';document.head.appendChild(style)}
}catch{}
window.EviaNaxosEvidenceContract={version:2};
})();
