(()=>{'use strict';
const STATE_KEY='eviaTargetReviewStateV2';
const TARGETS_KEY='eviaMilosTargetsV1';
const EPA_DATE_KEY='eviaPlannedEpaDateV1';
const PLANNER_VERSION='completion-paced-v1';
const REVIEW_MS=84*24*60*60*1000;

const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value===null?fallback:value}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const clean=value=>String(value??'').trim();
const validDate=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d:null};
const iso=value=>{const d=validDate(value);return d?d.toISOString().slice(0,10):''};
const niceDate=value=>{const d=validDate(value);return d?d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):''};
const makeId=type=>`evia-${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;

function currentProfile(){
  try{return learnerProfile||read('eviaLearnerProfile',{})}catch{return read('eviaLearnerProfile',{})}
}
function currentMeta(){
  try{if(typeof inferredCourseMeta==='function')return inferredCourseMeta()||{}}catch{}
  try{return activeCourseMeta||{}}catch{return read('eviaNaxosCourseMetaV1',{})}
}
function plannedEndDate(){
  const stored=clean(localStorage.getItem(EPA_DATE_KEY)||'');
  const meta=currentMeta();
  const profile=currentProfile();
  const candidates=[stored,meta?.plannedEpaDate,meta?.epa?.plannedDate,meta?.epa?.plannedEpaDate,meta?.qualification?.plannedEpaDate,profile?.plannedEpaDate,profile?.endDate];
  for(const value of candidates){const d=validDate(value);if(d)return d}
  return null;
}
function coursePosition(){
  try{const p=completedCourseProgress();return{completed:Number(p?.completed||0),total:Number(p?.total||0),percent:p?.percent==null?null:Number(p.percent)}}catch{return{completed:0,total:0,percent:null}}
}
function learningPosition(){
  let required=null,learner=0,college=0;
  try{required=totalLearningRequirement()}catch{}
  try{learner=Number(learnerLearningHours()||0)}catch{}
  try{college=Number(loadAttendanceData()?.collegeLearningHours||0)}catch{}
  const total=Math.max(0,learner)+Math.max(0,college);
  return{required:Number(required)>0?Number(required):null,total,percent:Number(required)>0?Math.min(100,total/Number(required)*100):null};
}
function attendancePosition(){try{const data=loadAttendanceData();const value=combinedAttendancePercent(data);return value==null?null:Number(value)}catch{return null}}
function evidenceCount(){try{return Number(completedEvidencePaths?.size||0)}catch{const rows=read('eviaCompletedEvidencePathsV1',[]);return Array.isArray(rows)?rows.length:0}}
function remainingReviewCycles(endDate){const remaining=endDate.getTime()-Date.now();if(remaining<=0)return 1;return Math.max(1,Math.floor(remaining/REVIEW_MS))}
function nextReviewDate(endDate){return new Date(Math.min(Date.now()+REVIEW_MS,endDate.getTime()))}

function buildTargets(endDate){
  const course=coursePosition();
  const learning=learningPosition();
  if(!course.total||!learning.required)return null;
  const cycles=remainingReviewCycles(endDate);
  const due=nextReviewDate(endDate);
  const dueText=niceDate(due);
  const courseRemaining=Math.max(0,course.total-course.completed);
  const courseMove=courseRemaining?Math.max(1,Math.ceil(courseRemaining/cycles)):0;
  const courseTargetCount=Math.min(course.total,course.completed+courseMove);
  const courseTargetPercent=course.total?courseTargetCount/course.total*100:100;
  const learningRemaining=Math.max(0,learning.required-learning.total);
  const learningMove=learningRemaining/cycles;
  const learningTarget=Math.min(learning.required,learning.total+learningMove);
  const attendance=attendancePosition();
  const baselineEvidence=evidenceCount();
  const targets=[
    {id:makeId('course'),source:'evia',type:'course',destination:'course',dueDate:iso(due),title:courseMove>0?`Reach at least ${Math.ceil(courseTargetPercent)}% Course progress`:'Keep Course progress complete',detail:courseMove>0?`Complete ${courseMove} more measurable course task${courseMove===1?'':'s'} by ${dueText}. This keeps you paced to finish by your planned EPA date.`:`Keep your Course complete through to ${dueText}.`,targetValue:courseTargetPercent,baselineValue:course.percent||0,plannedMove:courseMove,plannedCyclesRemaining:cycles,plannedEndDate:iso(endDate)},
    {id:makeId('learning'),source:'evia',type:'learning',destination:'learn',dueDate:iso(due),title:learningMove>0.05?`Complete ${learningMove.toFixed(1)} more Learning Hours`:'Keep Learning Hours complete',detail:learningMove>0.05?`Reach at least ${learningTarget.toFixed(1)} of ${learning.required.toFixed(1)} Learning Hours by ${dueText}. This spreads the remaining hours across ${cycles} review period${cycles===1?'':'s'}.`:`Keep your required Learning Hours complete through to ${dueText}.`,targetValue:learningTarget,baselineValue:learning.total,requiredAdditional:learningMove,plannedCyclesRemaining:cycles,plannedEndDate:iso(endDate)},
    {id:makeId('attendance'),source:'evia',type:'attendance',destination:'attend',dueDate:iso(due),title:'Attend every scheduled college session',detail:`Aim for the highest possible attendance between now and ${dueText}.`,targetValue:attendance==null?100:attendance,baselineValue:attendance,plannedEndDate:iso(endDate)},
    {id:makeId('evidence'),source:'evia',type:'evidence',destination:'course',dueDate:iso(due),title:courseMove>0?`Submit ${courseMove} new piece${courseMove===1?'':'s'} of course evidence`:'Keep your course evidence complete',detail:courseMove>0?`Complete enough measurable evidence to support the Course movement needed by ${dueText}.`:'No extra evidence is currently needed to stay on your completion plan.',targetValue:baselineEvidence+courseMove,baselineValue:baselineEvidence,requiredAdditional:courseMove,plannedCyclesRemaining:cycles,plannedEndDate:iso(endDate)},
    {id:makeId('checkin'),source:'evia',type:'checkin',destination:'check-in',dueDate:iso(due),title:'Complete 3 Evia check-ins',detail:`Complete 3 wellbeing and confidence check-ins before ${dueText}.`,targetValue:3,baselineValue:0,plannedEndDate:iso(endDate)}
  ];
  return{targets,dueDate:iso(due),cycles,plannedEndDate:iso(endDate),courseMove,learningMove};
}
function shouldReplan(state){
  if(!state||state.milosReviewSeen)return false;
  const current=Array.isArray(state.currentTargets)?state.currentTargets:[];
  if(!current.length)return false;
  if(!current.every(target=>clean(target?.source).toLowerCase()==='evia'))return false;
  return state.plannerVersion!==PLANNER_VERSION;
}
function migrateInitialTargets(){
  const state=read(STATE_KEY,{});
  if(!shouldReplan(state))return false;
  const end=plannedEndDate();
  if(!end)return false;
  const plan=buildTargets(end);
  if(!plan||plan.targets.length!==5)return false;
  const next={...state,plannerVersion:PLANNER_VERSION,plannedEndDate:plan.plannedEndDate,plannedCyclesRemaining:plan.cycles,dueDate:plan.dueDate,currentTargets:plan.targets};
  save(STATE_KEY,next);save(TARGETS_KEY,plan.targets);return true;
}
function rememberPlannedEpa(payload){
  if(!payload||typeof payload!=='object')return;
  const value=clean(payload.plannedEpaDate||payload.epaDate||payload.plannedCompletionDate||payload.review?.plannedEpaDate||payload.review?.epaDate||payload.programme?.plannedEpaDate);
  if(validDate(value))try{localStorage.setItem(EPA_DATE_KEY,iso(value))}catch{}
}
function looksLikeMilos(payload){const type=clean(payload?.type).toLowerCase();return!!payload&&typeof payload==='object'&&type.includes('milos')&&type.includes('review')}
function patchQrBridge(){
  try{
    if(typeof handleQrRawValue!=='function'||handleQrRawValue.__eviaCompletionPlanner)return;
    const previous=handleQrRawValue;
    const wrapped=function(raw){try{const payload=JSON.parse(String(raw||''));if(looksLikeMilos(payload))rememberPlannedEpa(payload)}catch{}return previous(raw)};
    wrapped.__eviaCompletionPlanner=1;wrapped.__etr=previous.__etr||1;handleQrRawValue=wrapped;
  }catch{}
}
function patchDirectMilos(){
  try{
    const previous=window.eviaApplyMilosReview;
    if(typeof previous!=='function'||previous.__eviaCompletionPlanner)return;
    const wrapped=function(payload){rememberPlannedEpa(payload);return previous(payload)};
    wrapped.__eviaCompletionPlanner=1;window.eviaApplyMilosReview=wrapped;
  }catch{}
}
window.eviaTargetPlanRecommendation=()=>{const end=plannedEndDate();return end?buildTargets(end):null};
window.addEventListener('evia:milos-review',event=>rememberPlannedEpa(event.detail));
migrateInitialTargets();patchQrBridge();patchDirectMilos();
setInterval(()=>{migrateInitialTargets();patchQrBridge();patchDirectMilos()},2500);
})();
