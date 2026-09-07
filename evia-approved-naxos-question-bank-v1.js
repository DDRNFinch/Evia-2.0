(()=>{'use strict';
const STYLE_ID='eviaNaxosQuestionBankV1Styles';
const CACHE_NAME='evia-question-bank-v1';
const NAXOS_BASE='https://ddrnfinch.github.io/Naxos-Mapping_Engine/question-banks/';
const banks={maths:[],english:[],trade:[],epa:[]};
let loadedKey='';
let loadPromise=null;

function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
    .evia-inline-chat-options{
      width:calc(100% - 64px)!important;
      margin:8px 12px 4px 52px!important;
      padding:0!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:flex-end!important;
      gap:8px!important;
      align-self:stretch!important;
    }
    .evia-inline-chat-options .chat-option{
      width:auto!important;
      min-width:62%!important;
      max-width:100%!important;
      min-height:48px!important;
      height:auto!important;
      display:flex!important;
      align-items:center!important;
      justify-content:flex-start!important;
      text-align:left!important;
      white-space:normal!important;
      line-height:1.3!important;
      padding:11px 16px!important;
      border-radius:22px!important;
    }
    .bottom-arches .evia-circle-marker-v2,
    .bottom-arches .evia-ring-dot-orbit,
    .bottom-arches .evia-ring-marker-group{display:none!important}
    @media(max-width:380px){
      .evia-inline-chat-options{width:calc(100% - 54px)!important;margin-left:42px!important}
      .evia-inline-chat-options .chat-option{min-width:68%!important}
    }
  `;document.head.appendChild(style)
}

function clearLegacyBanks(){
  try{if(typeof quickTestBanks==='object'&&quickTestBanks)Object.keys(quickTestBanks).forEach(key=>{quickTestBanks[key]=[]})}catch{}
  try{if(typeof epaQuestionBanks==='object'&&epaQuestionBanks)Object.keys(epaQuestionBanks).forEach(key=>{epaQuestionBanks[key]=[]})}catch{}
}

function currentMeta(){try{return typeof inferredCourseMeta==='function'?(inferredCourseMeta()||{}):{}}catch{return{}}}
function courseIdFromMeta(meta){return String(meta?.qualificationId||meta?.qualification?.id||'').trim()}
function absoluteBank(name){return `${NAXOS_BASE}${name}`}

function migrationRefs(meta){
  const courseId=courseIdFromMeta(meta);
  if(['ST0095','ST0264-SITE','ST0264-AJ','ST0171'].includes(courseId)){
    return{schemaVersion:1,source:'Naxos',maths:absoluteBank('maths-v1.json'),english:absoluteBank('english-v1.json'),trade:absoluteBank(`${courseId}-trade-v1.json`),epa:absoluteBank(`${courseId}-epa-v1.json`)}
  }
  const routeMaps={
    '6570-04':{'234':'cladding','238':'thin','690':'repair','817':'concrete','828':'specialist','837':'drainage'},
    '6570-05':{'238':'thin','690':'repair','828':'specialist','837':'drainage'}
  };
  if(routeMaps[courseId]){
    const units=(meta?.units||[]).map(String);let route='';
    for(const unit of units){if(routeMaps[courseId][unit]){route=routeMaps[courseId][unit];break}}
    if(route)return{schemaVersion:1,source:'Naxos',maths:absoluteBank('maths-v1.json'),english:absoluteBank('english-v1.json'),trade:absoluteBank(`${courseId}-${route}-trade-v1.json`)}
  }
  return null
}

function questionRefs(meta=currentMeta()){
  const supplied=meta?.questionBank&&typeof meta.questionBank==='object'?meta.questionBank:null;
  return supplied||migrationRefs(meta)
}

function normalise(question){
  return{
    q:String(question?.question||''),
    a:Array.isArray(question?.answers)?question.answers.map(String):[],
    correct:Number(question?.correct),
    explanation:String(question?.explanation||''),
    id:String(question?.id||''),
    difficulty:String(question?.difficulty||''),
    mappings:Array.isArray(question?.mappings)?question.mappings.slice():[],
    source:'Naxos'
  }
}

async function cachedJson(url){
  const cache=await caches.open(CACHE_NAME);
  let response=await cache.match(url);
  if(!response){
    try{
      const network=await fetch(url,{cache:'no-store'});
      if(network?.ok){response=network.clone();await cache.put(url,network.clone())}
    }catch{}
  }
  if(!response)throw new Error(`Question bank unavailable: ${url}`);
  const data=await response.json();
  if(data?.naxosQuestionBank!==1||!Array.isArray(data.questions))throw new Error(`Invalid Naxos question bank: ${url}`);
  return data
}

function resetMemory(){for(const key of Object.keys(banks))banks[key]=[];loadedKey='';loadPromise=null}

async function loadBanksForMeta(meta=currentMeta()){
  const refs=questionRefs(meta);
  if(!refs)throw new Error('No question bank is linked to this course.');
  const entries=['maths','english','trade','epa'].filter(category=>typeof refs[category]==='string'&&refs[category]);
  const key=JSON.stringify(entries.map(category=>[category,refs[category]]));
  if(key===loadedKey&&entries.every(category=>banks[category].length))return banks;
  if(loadPromise&&key===loadedKey)return loadPromise;
  loadedKey=key;
  loadPromise=(async()=>{
    for(const category of Object.keys(banks))banks[category]=[];
    const loaded=await Promise.all(entries.map(async category=>[category,await cachedJson(refs[category])]));
    for(const [category,data] of loaded){
      banks[category]=(data.questions||[]).filter(q=>q&&q.active!==false&&Array.isArray(q.answers)&&q.answers.length===4).map(normalise)
    }
    return banks
  })();
  try{return await loadPromise}catch(error){loadedKey='';throw error}finally{loadPromise=null}
}

async function preloadForMeta(meta){
  const refs=questionRefs(meta);if(!refs)return;
  const urls=['maths','english','trade','epa'].map(category=>refs[category]).filter(url=>typeof url==='string'&&url);
  if(!urls.length)return;
  await Promise.allSettled(urls.map(cachedJson));
}

function installMetaHooks(){
  try{
    if(typeof buildKsbCourseMeta==='function'&&!buildKsbCourseMeta.__eviaStaticQuestionRefs){
      const original=buildKsbCourseMeta;
      const wrapped=function(pack,registry,items){const meta=original.apply(this,arguments);if(pack?.questionBank)meta.questionBank=JSON.parse(JSON.stringify(pack.questionBank));return meta};
      wrapped.__eviaStaticQuestionRefs=true;buildKsbCourseMeta=wrapped
    }
  }catch{}
  try{
    if(typeof buildNvqCourseMeta==='function'&&!buildNvqCourseMeta.__eviaStaticQuestionRefs){
      const original=buildNvqCourseMeta;
      const wrapped=function(pack,items,categories,requiredTargets){const meta=original.apply(this,arguments);if(pack?.questionBank)meta.questionBank=JSON.parse(JSON.stringify(pack.questionBank));return meta};
      wrapped.__eviaStaticQuestionRefs=true;buildNvqCourseMeta=wrapped
    }
  }catch{}
  try{
    if(typeof applyImportedCourse==='function'&&!applyImportedCourse.__eviaStaticQuestionRefs){
      const original=applyImportedCourse;
      const wrapped=async function(items,title,meta={}){
        const result=await original.apply(this,arguments);
        resetMemory();
        preloadForMeta(meta).catch(()=>{});
        return result
      };
      wrapped.__eviaStaticQuestionRefs=true;applyImportedCourse=wrapped
    }
  }catch{}
}

function installBankOverride(){
  try{
    const wrapped=function(category){return banks[String(category||'').toLowerCase()]||[]};
    wrapped.__eviaStaticQuestionBank=true;testBankForCategory=wrapped
  }catch{}
}

function installTestMenuOverride(){
  try{
    const wrapped=async function(){
      try{testState=null}catch{}
      try{
        await loadBanksForMeta();
        const options=[
          banks.maths.length?{label:'Maths',action:'test-category',value:'maths'}:null,
          banks.english.length?{label:'English',action:'test-category',value:'english'}:null,
          banks.trade.length?{label:'Trade',action:'test-category',value:'trade'}:null,
          banks.epa.length?{label:'EPA',action:'test-category',value:'epa'}:null
        ].filter(Boolean);
        if(!options.length){await chatSay('I cannot find a question bank for this course yet.');return}
        await chatSay('What should I test you on?',options)
      }catch{
        await chatSay('I cannot load this course question bank right now. If it has been downloaded before, check that Evia is fully updated and try again.')
      }
    };
    wrapped.__eviaStaticQuestionBank=true;startTestMe=wrapped
  }catch{}
}

function install(){
  injectStyles();clearLegacyBanks();installMetaHooks();installBankOverride();installTestMenuOverride();
  window.EviaNaxosQuestionBankV1=Object.freeze({
    version:2,
    delivery:'static-course-json',
    load:()=>loadBanksForMeta(),
    preload:()=>preloadForMeta(currentMeta()),
    counts:()=>Object.fromEntries(Object.entries(banks).map(([key,value])=>[key,value.length]))
  })
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
