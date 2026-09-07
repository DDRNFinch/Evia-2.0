(()=>{'use strict';

const VERSION=1;
const ATTENDANCE_KEY='eviaAttendanceDataV1';
const ATTENDANCE_LEGACY_KEY='eviaAttendancePercent';
let paidWorkingHours=false;
let attendanceQrMode=false;
let portfolioGroupUrls=[];

function addStyles(){
  if(document.getElementById('eviaApprovedUpdateSystemV1Styles'))return;
  const style=document.createElement('style');
  style.id='eviaApprovedUpdateSystemV1Styles';
  style.textContent=`
    #chatPanel.open .chat-exit-button{
      right:calc(max(14px, env(safe-area-inset-right)) + 56px)!important;
    }
    .evia-paid-hours-check{
      position:absolute;right:10px;top:10px;z-index:8;
      display:flex;align-items:center;gap:7px;
      min-height:34px;max-width:calc(100% - 20px);
      padding:6px 10px;border:1.5px solid rgba(245,196,0,.52);
      border-radius:999px;background:rgba(255,255,255,.94);
      box-shadow:0 5px 16px rgba(0,0,0,.08);
      font-size:11px;font-weight:700;line-height:1.2;color:#333;
    }
    .evia-paid-hours-check input{width:18px;height:18px;accent-color:var(--evia-yellow);flex:0 0 auto}
    .evia-update-actions,.evia-learn-actions{display:grid;grid-template-columns:1fr;gap:9px;width:100%}
    .evia-update-button{
      width:100%;min-height:50px;border:1.5px solid rgba(245,196,0,.38);
      border-radius:18px;background:#fff;color:#333;padding:11px 14px;
      text-align:left;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.035);
      display:flex;align-items:center;justify-content:space-between;gap:10px;
      font-weight:700;
    }
    .evia-update-button small{font-size:10.5px;font-weight:500;color:#505050;text-align:right;line-height:1.25}
    .evia-update-button.primary,.learn-action-card.evia-learn-primary{
      background:rgba(245,196,0,.13);border-color:rgba(245,196,0,.62);
    }
    .evia-learn-actions .learn-action-card{
      position:relative;min-height:76px!important;padding-right:44px!important;cursor:pointer!important;
    }
    .evia-learn-actions .learn-action-card::after{
      content:'›';position:absolute;right:17px;top:50%;transform:translateY(-50%);
      font-size:28px;line-height:1;color:rgba(45,45,45,.52);
    }
    .evia-section-label{
      margin:2px 3px 0;font-size:12px;font-weight:800;color:#333;
      letter-spacing:.01em;
    }
    .evia-inline-status{
      min-height:18px;font-size:12px;line-height:1.4;color:#505050;text-align:center;
    }
    .evia-form-check{
      display:flex;align-items:center;gap:9px;min-height:44px;
      border:1.5px solid rgba(245,196,0,.28);border-radius:15px;
      background:#fff;padding:9px 11px;font-size:12px;font-weight:700;color:#333;
    }
    .evia-form-check input{width:19px;height:19px;accent-color:var(--evia-yellow)}
    .evia-file-pick{
      display:flex;flex-direction:column;gap:7px;
      border:1.5px solid rgba(245,196,0,.26);border-radius:16px;background:#fff;padding:11px;
    }
    .evia-file-pick strong{font-size:12px}.evia-file-name{font-size:11px;color:#505050;overflow-wrap:anywhere}
    .evia-portfolio-group{padding:13px!important;cursor:default!important}
    .evia-portfolio-group-head{padding:1px 1px 10px}
    .evia-portfolio-group-head strong{font-size:14px!important;margin-bottom:4px!important}
    .evia-portfolio-group-head span{font-size:11px!important}
    .evia-portfolio-submissions{display:flex;flex-direction:column;gap:9px}
    .evia-portfolio-submission{
      width:100%;border:1px solid rgba(245,196,0,.22);border-radius:15px;
      background:#fff;padding:9px;text-align:left;cursor:pointer;color:#333;
      display:grid;grid-template-columns:68px minmax(0,1fr);gap:10px;align-items:center;
    }
    .evia-portfolio-thumb{
      width:68px;height:68px;border-radius:12px;background:rgba(245,196,0,.07);
      overflow:hidden;display:grid;place-items:center;font-size:11px;font-weight:800;color:#505050;
    }
    .evia-portfolio-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .evia-portfolio-submission-copy{min-width:0}
    .evia-portfolio-submission-copy strong{
      display:block;font-size:12px!important;margin:0 0 4px!important;white-space:normal;overflow-wrap:anywhere
    }
    .evia-portfolio-submission-copy span{display:block;font-size:10.5px!important;line-height:1.35!important;color:#505050!important}
    .evia-portfolio-text-snippet{
      width:100%;height:100%;padding:7px;font-size:9.5px;line-height:1.25;overflow:hidden;color:#505050;
    }
    @media(max-width:380px){
      #chatPanel.open .chat-exit-button{right:calc(max(10px, env(safe-area-inset-right)) + 50px)!important;min-width:64px;padding:0 12px}
      .evia-portfolio-submission{grid-template-columns:58px minmax(0,1fr)}
      .evia-portfolio-thumb{width:58px;height:58px}
    }
  `;
  document.head.appendChild(style);
}

function numberValue(value,min=0,max=100){
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const n=Number(value);if(!Number.isFinite(n))return null;
  return Math.max(min,Math.min(max,n));
}
function rawAttendance(){
  try{const data=JSON.parse(localStorage.getItem(ATTENDANCE_KEY)||'{}');return data&&typeof data==='object'?data:{}}catch{return{}}
}
function attendancePayload(value){
  const source=value&&typeof value==='object'?(value.attendance&&typeof value.attendance==='object'?value.attendance:value):{};
  const first=(...keys)=>{for(const key of keys){if(Object.prototype.hasOwnProperty.call(source,key))return source[key]}return undefined};
  return {
    college:numberValue(first('college','collegeAttendance','college_attendance','collegePercent','college_percent')),
    workplace:numberValue(first('workplace','workplaceAttendance','workplace_attendance','workplacePercent','workplace_percent')),
    collegeLearningHours:numberValue(first('collegeLearningHours','college_learning_hours','collegeHours','college_hours'),0,100000),
    combined:numberValue(first('combined','combinedAttendance','combined_attendance','attendancePercent','attendance_percent'))
  };
}
function applyAttendance(value,source='external'){
  const next=attendancePayload(value);
  if(next.college===null&&next.workplace===null&&next.collegeLearningHours===null&&next.combined===null)return {applied:false};
  const current=rawAttendance();
  if(next.college!==null)current.college=next.college;
  if(next.workplace!==null)current.workplace=next.workplace;
  if(next.collegeLearningHours!==null)current.collegeLearningHours=next.collegeLearningHours;
  current.updatedAt=new Date().toISOString();
  current.updatedBy=String(source||'external');
  try{localStorage.setItem(ATTENDANCE_KEY,JSON.stringify(current))}catch{}
  let combined=next.combined;
  if(combined===null&&Number.isFinite(Number(current.college))&&Number.isFinite(Number(current.workplace))){
    combined=(Number(current.college)+Number(current.workplace))/2;
  }
  if(combined!==null){try{localStorage.setItem(ATTENDANCE_LEGACY_KEY,String(combined))}catch{}}
  try{updateArchBars().catch(()=>{})}catch{}
  return {applied:true,data:current,combined};
}
function applyUpdate(section,payload,source='external'){
  const key=String(section||payload?.section||'').trim().toLowerCase();
  if(key==='attendance'||key==='attend')return applyAttendance(payload,source);
  return {applied:false,reason:'unsupported-section'};
}
window.EviaUpdateSystem={version:VERSION,apply:applyUpdate,applyAttendance};
document.addEventListener('evia:update',(event)=>{
  const detail=event?.detail||{};
  applyUpdate(detail.section,detail.payload??detail.data??detail,detail.source||'external');
});

function appendAttendanceActions(){
  if(!archDetailContent||archDetailContent.querySelector('#eviaAttendanceUpdateActions'))return;
  const wrap=document.createElement('div');
  wrap.id='eviaAttendanceUpdateActions';
  wrap.className='evia-update-actions';
  wrap.innerHTML=`
    <div class="evia-section-label">Update attendance</div>
    <button class="evia-update-button primary" id="eviaAttendanceManual" type="button"><span>Manual update</span><small>Enter attendance directly</small></button>
    <button class="evia-update-button" id="eviaAttendanceQr" type="button"><span>QR code</span><small>Scan an attendance update</small></button>
    <button class="evia-update-button" id="eviaAttendanceNisia" type="button"><span>Nisia</span><small>Connect or sync</small></button>
    <div class="evia-inline-status" id="eviaAttendanceUpdateStatus"></div>`;
  archDetailContent.appendChild(wrap);
  const raw=rawAttendance();
  if(raw.updatedAt){
    const status=wrap.querySelector('#eviaAttendanceUpdateStatus');
    const source=String(raw.updatedBy||'update');
    const when=new Date(raw.updatedAt);
    if(Number.isFinite(when.getTime()))status.textContent=`Last updated via ${source} · ${when.toLocaleString()}`;
  }
}
try{
  if(typeof renderAttendPage==='function'){
    const originalRenderAttendPage=renderAttendPage;
    renderAttendPage=function(){const result=originalRenderAttendPage.apply(this,arguments);appendAttendanceActions();return result};
  }
}catch{}
try{attendanceArch?.addEventListener('click',appendAttendanceActions)}catch{}

function renderAttendanceManualForm(){
  const data=typeof loadAttendanceData==='function'?loadAttendanceData():{college:null,workplace:null,collegeLearningHours:0};
  archDetailContent.innerHTML=`
    <div class="detail-card"><strong>Manual attendance update</strong><p>Use this when attendance has not been received by QR or Nisia.</p></div>
    <div class="learn-catchup-form">
      <label class="detail-muted">College attendance %</label>
      <input id="eviaManualCollegeAttendance" type="number" min="0" max="100" step="1" inputmode="decimal" value="${data.college===null?'':Math.round(data.college)}">
      <label class="detail-muted">Workplace attendance %</label>
      <input id="eviaManualWorkplaceAttendance" type="number" min="0" max="100" step="1" inputmode="decimal" value="${data.workplace===null?'':Math.round(data.workplace)}">
      <label class="detail-muted">College OTJ / GLH hours received</label>
      <input id="eviaManualCollegeHours" type="number" min="0" step="0.1" inputmode="decimal" value="${Number(data.collegeLearningHours||0).toFixed(1)}">
      <button class="secondary-button" id="eviaSaveManualAttendance" type="button">Save attendance</button>
      <div class="evia-inline-status" id="eviaManualAttendanceStatus"></div>
    </div>`;
}
function saveManualAttendance(){
  const status=document.getElementById('eviaManualAttendanceStatus');
  const college=document.getElementById('eviaManualCollegeAttendance')?.value;
  const workplace=document.getElementById('eviaManualWorkplaceAttendance')?.value;
  const hours=document.getElementById('eviaManualCollegeHours')?.value;
  const result=applyAttendance({college,workplace,collegeLearningHours:hours},'manual');
  if(!result.applied){if(status)status.textContent='Add at least one attendance value.';return}
  if(status)status.textContent='Attendance saved.';
  setTimeout(()=>{try{archDetailStack=[];renderAttendPage()}catch{}},250);
}
function startAttendanceQr(){
  attendanceQrMode=true;
  try{
    startScanner();
    setTimeout(()=>{
      if(scannerPanel?.classList.contains('open')){
        scannerStatus.textContent='Scan an Evia attendance QR code. Upload QR Image remains available.';
      }
    },60);
  }catch{
    attendanceQrMode=false;
  }
}
function openNisiaFromAttendance(){
  const status=document.getElementById('eviaAttendanceUpdateStatus');
  const button=document.getElementById('uploadPortfolio');
  if(!button){if(status)status.textContent='Nisia connection is not available on this device.';return}
  if(status)status.textContent='Opening Nisia connection / sync…';
  button.click();
}

try{
  if(typeof handleQrRawValue==='function'){
    const originalHandleQrRawValue=handleQrRawValue;
    handleQrRawValue=function(rawValue){
      let parsed=null;try{parsed=JSON.parse(rawValue)}catch{}
      const type=String(parsed?.type||'').toLowerCase();
      const section=String(parsed?.section||'').toLowerCase();
      const isAttendance=type==='evia-attendance-update-v1'||(type==='evia-update-v1'&&(section==='attendance'||section==='attend'));
      if(isAttendance){
        const payload=parsed.attendance??parsed.payload??parsed.data??parsed;
        const result=applyAttendance(payload,'QR');
        if(result.applied){
          scannerStatus.textContent='Attendance updated from QR.';
          attendanceQrMode=false;
          setTimeout(()=>{try{closeScanner(false);renderAttendPage()}catch{}},350);
          return true;
        }
        scannerStatus.textContent='That attendance QR did not contain usable attendance values.';
        return false;
      }
      if(attendanceQrMode){
        scannerStatus.textContent='That QR code is not an Evia attendance update.';
        return false;
      }
      return originalHandleQrRawValue.apply(this,arguments);
    };
  }
}catch{}

try{
  if(typeof closeScanner==='function'){
    const originalCloseScanner=closeScanner;
    closeScanner=function(reopenNaxos=true){
      const returningToAttendance=attendanceQrMode;
      attendanceQrMode=false;
      return originalCloseScanner.call(this,returningToAttendance?false:reopenNaxos);
    };
  }
}catch{}

function enhanceLearnPage(){
  const grid=archDetailContent?.querySelector('.learn-action-grid');
  if(!grid||grid.querySelector('#openManualLearning'))return;
  grid.classList.add('evia-learn-actions');
  const heading=document.createElement('div');heading.className='evia-section-label';heading.textContent='Add or review learning';
  grid.parentNode.insertBefore(heading,grid);
  const add=document.createElement('button');
  add.className='learn-action-card evia-learn-primary';
  add.id='openManualLearning';
  add.type='button';
  add.innerHTML='<strong>Add Learning</strong><span>Add learning whenever it happens, with date, time and optional evidence.</span>';
  grid.insertBefore(add,grid.firstChild);
  const catchup=grid.querySelector('#openLearnCatchup strong');if(catchup)catchup.textContent='Add Learning from Evidence';
}
try{
  if(typeof renderLearnPage==='function'){
    const originalRenderLearnPage=renderLearnPage;
    renderLearnPage=function(){const result=originalRenderLearnPage.apply(this,arguments);enhanceLearnPage();return result};
  }
}catch{}
try{learnArch?.addEventListener('click',enhanceLearnPage)}catch{}

function todayValue(){
  const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function manualEvidenceType(file){
  const mime=String(file?.type||'').toLowerCase();
  if(mime.startsWith('image/'))return 'photo';
  if(mime.startsWith('video/'))return 'video';
  if(mime.startsWith('audio/'))return 'audio';
  if(mime.startsWith('text/'))return 'text';
  return 'document';
}
async function saveManualLearningAttachment(file,learningEntry,paid){
  if(!file||!learningEntry)return null;
  const createdAt=new Date().toISOString();
  const type=manualEvidenceType(file);
  const extension=typeof witnessFileExtension==='function'?witnessFileExtension(file):((String(file.name||'').split('.').pop()||'file').toLowerCase());
  const label=learningEntry.evidenceLabel||'Learning evidence';
  const entry={
    id:`${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
    createdAt,
    type,
    mimeType:file.type||'application/octet-stream',
    fileName:`${createdAt.replace(/[-:]/g,'').replace(/\..+/,'').replace('T','-')}-${safeFilename(label)}.${extension}`,
    originalFileName:cleanText(file.name),
    path:['Learning',label],
    groupKey:`learning:${learningEntry.id}`,
    evidenceLabel:label,
    methodHeading:'Learning',
    methodLabel:'Manual upload',
    requirements:'',
    learner:officialLearnerProfile(),
    paidWorkingHours:Boolean(paid),
    learningEntryId:learningEntry.id,
    blob:file
  };
  await addPortfolioEntry(entry);
  return entry;
}
function renderManualLearningForm(){
  archDetailContent.innerHTML=`
    <div class="detail-card"><strong>Add Learning</strong><p>Add learning that genuinely happened. You can attach a photo, video, audio recording or document if you have one.</p></div>
    <div class="learn-catchup-form">
      <label class="detail-muted">Date</label>
      <input class="learn-date-input" id="eviaManualLearningDate" type="date" value="${todayValue()}">
      <textarea id="eviaManualLearningText" placeholder="What did you do and what did you learn?"></textarea>
      <div class="learning-time-grid">
        <label>Hours<input id="eviaManualLearningHours" type="number" min="0" step="1" inputmode="numeric" value="0"></label>
        <label>Minutes<input id="eviaManualLearningMinutes" type="number" min="0" max="59" step="1" inputmode="numeric" value="0"></label>
      </div>
      <label class="evia-form-check"><input id="eviaManualLearningPaid" type="checkbox">Completed during paid working hours</label>
      <div class="evia-file-pick">
        <strong>Learning evidence (optional)</strong>
        <button class="secondary-button" id="eviaChooseManualLearningFile" type="button">Choose file</button>
        <input id="eviaManualLearningFile" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" hidden>
        <span class="evia-file-name" id="eviaManualLearningFileName">No file selected</span>
      </div>
      <button class="secondary-button" id="eviaSaveManualLearning" type="button">Save Learning</button>
      <div class="evia-inline-status" id="eviaManualLearningStatus"></div>
    </div>`;
  const file=document.getElementById('eviaManualLearningFile');
  document.getElementById('eviaChooseManualLearningFile')?.addEventListener('click',()=>file?.click());
  file?.addEventListener('change',()=>{const name=document.getElementById('eviaManualLearningFileName');if(name)name.textContent=file.files?.[0]?.name||'No file selected'});
  document.getElementById('eviaSaveManualLearning')?.addEventListener('click',saveManualLearning);
}
async function saveManualLearning(){
  const status=document.getElementById('eviaManualLearningStatus');
  const text=document.getElementById('eviaManualLearningText')?.value.trim()||'';
  const hours=Math.max(0,Number(document.getElementById('eviaManualLearningHours')?.value||0));
  const minutes=Math.max(0,Math.min(59,Number(document.getElementById('eviaManualLearningMinutes')?.value||0)));
  const date=document.getElementById('eviaManualLearningDate')?.value||todayValue();
  const paid=Boolean(document.getElementById('eviaManualLearningPaid')?.checked);
  const file=document.getElementById('eviaManualLearningFile')?.files?.[0]||null;
  if(!text){if(status)status.textContent='Add what you did and learned before saving.';return}
  const totalHours=hours+(minutes/60);
  if(totalHours<=0){if(status)status.textContent='Add the learning time before saving.';return}
  if(status)status.textContent=file?'Saving learning and evidence…':'Saving learning…';
  try{
    const label=text.length>64?`${text.slice(0,61)}…`:text;
    const entry=saveLearningReflection(text,totalHours,[],label,{
      activityType:'manual',
      learningDate:date,
      learningSource:'learner-added learning',
      paidWorkingHours:paid
    });
    if(!entry)throw new Error('Learning could not be saved.');
    if(file){
      const attachment=await saveManualLearningAttachment(file,entry,paid);
      if(attachment){entry.attachmentEvidenceId=attachment.id;saveLearningEntries()}
    }
    if(status)status.textContent='Saved to Learn.';
    setTimeout(()=>{try{archDetailStack=[];renderLearnPage()}catch{}},300);
  }catch(error){
    if(status)status.textContent=error?.message||'Could not save this learning.';
  }
}

function appendLearningPaidCheck(id){
  const form=archDetailContent?.querySelector('.learn-catchup-form');
  if(!form||form.querySelector(`#${id}`))return;
  const save=form.querySelector('button[id^="save"]');
  const label=document.createElement('label');label.className='evia-form-check';
  label.innerHTML=`<input id="${id}" type="checkbox">Completed during paid working hours`;
  if(save)form.insertBefore(label,save);else form.appendChild(label);
}
try{
  if(typeof renderOtjEntryForm==='function'){
    const originalRenderOtjEntryForm=renderOtjEntryForm;
    renderOtjEntryForm=function(){const result=originalRenderOtjEntryForm.apply(this,arguments);appendLearningPaidCheck('eviaOtjLearningPaid');return result};
  }
  if(typeof renderCatchupEntryForm==='function'){
    const originalRenderCatchupEntryForm=renderCatchupEntryForm;
    renderCatchupEntryForm=async function(){const result=await originalRenderCatchupEntryForm.apply(this,arguments);appendLearningPaidCheck('eviaCatchupLearningPaid');return result};
  }
  if(typeof saveLearningReflection==='function'){
    const originalSaveLearningReflection=saveLearningReflection;
    saveLearningReflection=function(textValue,hoursValue,evidencePath,evidenceLabel,extras={}){
      const supplied=extras&&typeof extras==='object'?{...extras}:{};
      if(supplied.paidWorkingHours===undefined){
        const visible=document.querySelector('#eviaOtjLearningPaid,#eviaCatchupLearningPaid');
        if(visible)supplied.paidWorkingHours=Boolean(visible.checked);
        else if(completionContext)supplied.paidWorkingHours=Boolean(paidWorkingHours);
      }
      return originalSaveLearningReflection.call(this,textValue,hoursValue,evidencePath,evidenceLabel,supplied);
    };
  }
}catch{}

function injectPaidWorkingHours(){
  const surface=evidenceTop?.querySelector('.capture-surface');
  if(!surface||surface.querySelector('.evia-paid-hours-check'))return;
  const label=document.createElement('label');
  label.className='evia-paid-hours-check';
  label.innerHTML='<input type="checkbox" aria-label="Completed during paid working hours"><span>Completed during paid working hours</span>';
  const input=label.querySelector('input');input.checked=paidWorkingHours;
  input.addEventListener('change',()=>{paidWorkingHours=input.checked});
  surface.appendChild(label);
  const textarea=surface.querySelector('.text-evidence');if(textarea)textarea.style.paddingTop='56px';
}
try{
  if(typeof beginEvidenceCollection==='function'){
    const originalBeginEvidenceCollection=beginEvidenceCollection;
    beginEvidenceCollection=function(){paidWorkingHours=false;const result=originalBeginEvidenceCollection.apply(this,arguments);setTimeout(injectPaidWorkingHours,0);return result};
  }
  if(typeof runCaptureStep==='function'){
    const originalRunCaptureStep=runCaptureStep;
    runCaptureStep=function(){const result=originalRunCaptureStep.apply(this,arguments);requestAnimationFrame(injectPaidWorkingHours);return result};
  }
  if(typeof addPortfolioEntry==='function'){
    const originalAddPortfolioEntry=addPortfolioEntry;
    addPortfolioEntry=async function(entry){
      if(entry&&typeof entry==='object'&&captureMode!==null&&entry.paidWorkingHours===undefined){
        entry.paidWorkingHours=Boolean(paidWorkingHours);
      }
      return originalAddPortfolioEntry.apply(this,arguments);
    };
  }
}catch{}

function revokePortfolioGroupUrls(){
  portfolioGroupUrls.forEach(url=>{try{URL.revokeObjectURL(url)}catch{}});
  portfolioGroupUrls=[];
}
function groupKeyForEntry(entry){
  if(cleanText(entry?.groupKey))return `explicit:${cleanText(entry.groupKey)}`;
  if(Array.isArray(entry?.path)&&entry.path.length)return `path:${evidencePathKey(entry.path)}`;
  return `entry:${entry?.id||Math.random()}`;
}
function groupTitle(entry){
  const path=Array.isArray(entry?.path)?entry.path.filter(Boolean):[];
  return path[path.length-1]||entry?.evidenceLabel||'Evidence';
}
function groupParent(entry){
  const path=Array.isArray(entry?.path)?entry.path.filter(Boolean):[];
  return path.length>1?path.slice(0,-1).join(' › '):'';
}
function mediaLabel(entry){
  const type=String(entry?.type||'').toLowerCase();
  if(type==='photo')return 'Photo';
  if(type==='video')return 'Video';
  if(type==='audio')return 'Audio';
  if(type==='text')return 'Written';
  if(type==='witness')return 'Witness';
  return 'File';
}
async function submissionThumb(entry){
  const box=document.createElement('div');box.className='evia-portfolio-thumb';
  const mime=cleanText(entry?.mimeType||entry?.blob?.type).toLowerCase();
  if((entry?.type==='photo'||mime.startsWith('image/'))&&entry?.blob instanceof Blob){
    const url=URL.createObjectURL(entry.blob);portfolioGroupUrls.push(url);
    const img=document.createElement('img');img.src=url;img.alt='';box.appendChild(img);return box;
  }
  if((entry?.type==='text'||mime.startsWith('text/'))&&entry?.blob instanceof Blob){
    const snippet=document.createElement('div');snippet.className='evia-portfolio-text-snippet';
    try{const text=await entry.blob.text();snippet.textContent=text.slice(0,110)}catch{snippet.textContent='Written'}
    box.appendChild(snippet);return box;
  }
  box.textContent=mediaLabel(entry);
  return box;
}
async function groupedPortfolioList(){
  revokePortfolioGroupUrls();
  try{
    const entries=await getPortfolioEntries();
    portfolioEntriesById=new Map(entries.map(entry=>[entry.id,entry]));
    portfolioList.innerHTML='';
    if(!entries.length){
      portfolioList.innerHTML='<div class="portfolio-item"><strong>No evidence yet</strong><span>Evidence you capture will appear here.</span></div>';
      return;
    }
    const groups=new Map();
    for(const entry of entries){
      const key=groupKeyForEntry(entry);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(entry);
    }
    for(const groupEntries of groups.values()){
      groupEntries.sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
      const first=groupEntries[0];
      const card=document.createElement('div');card.className='portfolio-item evia-portfolio-group';
      const head=document.createElement('div');head.className='evia-portfolio-group-head';
      const latest=new Date(first.createdAt||Date.now());
      head.innerHTML=`<strong>${escapeDetailHtml(groupTitle(first))}</strong>${groupParent(first)?`<span>${escapeDetailHtml(groupParent(first))}</span>`:''}<span>${groupEntries.length} evidence item${groupEntries.length===1?'':'s'} · latest ${latest.toLocaleString()}</span>`;
      const list=document.createElement('div');list.className='evia-portfolio-submissions';
      for(const entry of groupEntries){
        const row=document.createElement('button');row.type='button';row.className='evia-portfolio-submission';row.dataset.evidenceId=entry.id;
        const thumb=await submissionThumb(entry);
        const copy=document.createElement('div');copy.className='evia-portfolio-submission-copy';
        const title=document.createElement('strong');title.textContent=[entry.methodHeading,entry.methodLabel].filter(Boolean).join(' — ')||mediaLabel(entry);
        const meta=document.createElement('span');const date=new Date(entry.createdAt||Date.now()).toLocaleString();
        meta.textContent=`${date} · ${formatBytes(entry.blob?.size||0)}`;
        copy.append(title,meta);
        if(typeof entry.paidWorkingHours==='boolean'){
          const paid=document.createElement('span');paid.textContent=`Paid working hours: ${entry.paidWorkingHours?'Yes':'No'}`;copy.appendChild(paid);
        }
        row.append(thumb,copy);list.appendChild(row);
      }
      card.append(head,list);portfolioList.appendChild(card);
    }
  }catch(error){
    portfolioList.innerHTML='<div class="portfolio-item"><strong>Portfolio unavailable</strong><span>Local evidence storage could not be opened.</span></div>';
  }
}
try{
  if(typeof renderPortfolioList==='function')renderPortfolioList=groupedPortfolioList;
  if(typeof renderEvidenceViewer==='function'){
    const originalRenderEvidenceViewer=renderEvidenceViewer;
    renderEvidenceViewer=async function(entry){
      const result=await originalRenderEvidenceViewer.apply(this,arguments);
      if(entry&&typeof entry.paidWorkingHours==='boolean'&&portfolioViewerMeta){
        portfolioViewerMeta.textContent+=`\nPaid working hours: ${entry.paidWorkingHours?'Yes':'No'}`;
      }
      return result;
    };
  }
}catch{}

archDetailContent?.addEventListener('click',(event)=>{
  if(event.target.closest('#eviaAttendanceManual')){event.preventDefault();event.stopPropagation();pushArchView(renderAttendanceManualForm,'Manual Attendance');return}
  if(event.target.closest('#eviaAttendanceQr')){event.preventDefault();event.stopPropagation();startAttendanceQr();return}
  if(event.target.closest('#eviaAttendanceNisia')){event.preventDefault();event.stopPropagation();openNisiaFromAttendance();return}
  if(event.target.closest('#eviaSaveManualAttendance')){event.preventDefault();event.stopPropagation();saveManualAttendance();return}
  if(event.target.closest('#openManualLearning')){event.preventDefault();event.stopPropagation();pushArchView(renderManualLearningForm,'Add Learning');return}
},true);

addStyles();
window.EviaApprovedUpdateSystem={version:VERSION};
})();