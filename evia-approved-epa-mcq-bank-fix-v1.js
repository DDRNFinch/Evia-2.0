(()=>{'use strict';
const FLAG='__eviaEpaMcqBankFixV1';
if(globalThis[FLAG])return;
const originalFetch=globalThis.fetch.bind(globalThis);
const RECENT_KEY='eviaEpaMcqRecentV1';
const clean=(v,n=1000)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const escCode=v=>clean(v,40).toUpperCase();
function isEpaEndpoint(input){
  try{const raw=typeof input==='string'?input:input?.url;const url=new URL(raw,location.href);return /\/v1\/epa-discussion\/?$/.test(url.pathname)}catch{return false}
}
function bodyFrom(init){
  try{if(typeof init?.body!=='string')return null;const data=JSON.parse(init.body);return data&&typeof data==='object'?data:null}catch{return null}
}
function evidenceCodes(body){
  const text=[...(Array.isArray(body?.evidence)?body.evidence:[]),...(Array.isArray(body?.focus)?body.focus:[])].map(item=>typeof item==='string'?item:JSON.stringify(item)).join(' ');
  const matches=text.match(/\b(?:K\d+[A-Z]?|S\d+[A-Z]?|B\d+[A-Z]?)\b/gi)||[];
  return new Set(matches.map(escCode));
}
function recentIds(courseId){
  try{const all=JSON.parse(localStorage.getItem(RECENT_KEY)||'{}');const ids=all?.[courseId];return Array.isArray(ids)?ids.map(String):[]}catch{return[]}
}
function saveRecent(courseId,ids){
  try{const all=JSON.parse(localStorage.getItem(RECENT_KEY)||'{}')||{};all[courseId]=ids.slice(-30);localStorage.setItem(RECENT_KEY,JSON.stringify(all))}catch{}
}
function score(question,codes,recent){
  const mappings=Array.isArray(question?.mappings)?question.mappings.map(escCode):[];
  let value=0;
  if(mappings.some(code=>codes.has(code)))value+=8;
  if(clean(question?.difficulty).toLowerCase()==='stretch')value+=3;
  if(!recent.has(String(question?.id||'')))value+=2;
  return value+Math.random();
}
function normalise(question){
  const answers=Array.isArray(question?.a)?question.a.map(v=>clean(v,900)):Array.isArray(question?.answers)?question.answers.map(v=>clean(v,900)):[];
  const mapped=Array.isArray(question?.mappings)?question.mappings.map(escCode).filter(Boolean):Array.isArray(question?.mappedTo)?question.mappedTo.map(escCode).filter(Boolean):[];
  return{
    question:clean(question?.q||question?.question,1500),
    answers,
    correct:Number(question?.correct),
    explanation:clean(question?.explanation,1200),
    mappedTo:mapped.slice(0,4),
    evidenceFocus:mapped.slice(0,3),
    id:clean(question?.id,120),
    difficulty:clean(question?.difficulty,40)
  }
}
async function localMcq(body){
  const api=globalThis.EviaNaxosQuestionBankV1;
  if(!api?.load)return null;
  const banks=await api.load();
  const bank=Array.isArray(banks?.epa)?banks.epa:[];
  const valid=bank.map(normalise).filter(q=>q.question&&q.answers.length===4&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4);
  if(!valid.length)return null;
  const count=Math.max(1,Math.min(10,Number(body?.count)||5));
  const courseId=clean(body?.course?.courseId,80)||'course';
  const codes=evidenceCodes(body);
  const recentList=recentIds(courseId),recent=new Set(recentList);
  const ranked=valid.map(q=>({q,rank:score(q,codes,recent)})).sort((a,b)=>b.rank-a.rank).map(x=>x.q);
  const selected=ranked.slice(0,Math.min(count,ranked.length));
  if(selected.length<count)return null;
  saveRecent(courseId,[...recentList,...selected.map(q=>q.id).filter(Boolean)]);
  return{ok:true,action:'mcq',title:'EPA Practice',questions:selected,model:'naxos-question-bank',source:'Naxos'}
}
globalThis.fetch=async function(input,init){
  if(isEpaEndpoint(input)&&String(init?.method||'GET').toUpperCase()==='POST'){
    const body=bodyFrom(init);
    if(clean(body?.action).toLowerCase()==='mcq'){
      try{
        const data=await localMcq(body);
        if(data)return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
      }catch(error){console.warn('Evia could not load the Naxos EPA question bank; using the live EPA service.',error)}
    }
  }
  return originalFetch(input,init)
};
Object.defineProperty(globalThis,FLAG,{value:true,writable:false,configurable:false});
})();
