(()=>{'use strict';
const ENDPOINT_KEY='eviaTeachTestEndpointV1';
const CONFIG_ENDPOINT=()=>String(globalThis.EVIA_TEACH_TEST_ENDPOINT||'').trim();
const SUBJECTS=['trade','maths','english','edi','epa'];
const LABELS={trade:'Trade',maths:'Maths',english:'English',edi:'EDI',epa:'EPA'};
const aiBanks={};
let lastTeach=null;
let original={};

function clean(value){return String(value??'').replace(/\s+/g,' ').trim()}
function endpoint(){
  try{return clean(localStorage.getItem(ENDPOINT_KEY)||CONFIG_ENDPOINT())}catch{return CONFIG_ENDPOINT()}
}
function currentMeta(){try{return typeof inferredCourseMeta==='function'?(inferredCourseMeta()||{}):{}}catch{return{}}}
function courseId(meta=currentMeta()){return clean(meta?.qualificationId||meta?.qualification?.id||meta?.standardCode||meta?.courseId||'')}
function isDemo(){const meta=currentMeta();try{if(localStorage.getItem('eviaDemoModeV1')==='1')return true}catch{}return meta?.demo===true||clean(meta?.standardCode)==='EVIA-DEMO'}
function isNvq(meta=currentMeta()){return /^6570-0[45]$/.test(courseId(meta))||clean(meta?.courseType).toLowerCase()==='nvq'}
function exact(options){return options.map(option=>({...option,__eviaAiExact:true}))}

function courseTitle(meta=currentMeta()){
  try{return clean(meta?.qualificationTitle||meta?.qualification?.title||meta?.standardTitle||meta?.courseTitle||localStorage.getItem('eviaNaxosCourseTitle')||document.querySelector('.course-title')?.textContent||'')}
  catch{return clean(meta?.qualificationTitle||meta?.qualification?.title||meta?.standardTitle||meta?.courseTitle||'')}
}
function detectCode(node,label){
  const direct=[node?.code,node?.id,node?.ksb,node?.ksbId,node?.ac,node?.acId,node?.criterion,node?.target].map(clean).find(v=>/^(?:[KSB]\d+[a-z]?|AC\d+(?:\.\d+)*|\d+(?:\.\d+)+)$/i.test(v));
  if(direct)return direct;
  const match=clean(label).match(/\b(?:K\d+[a-z]?|S\d+[a-z]?|B\d+[a-z]?|AC\d+(?:\.\d+)*|\d+(?:\.\d+)+)\b/i);
  return match?match[0]:''
}
function collectLeaves(nodes,path=[],out=[]){
  for(const node of Array.isArray(nodes)?nodes:[]){
    if(!node||typeof node!=='object')continue;
    const label=clean(node.label||node.title||node.name||'');
    const next=label?[...path,label]:path;
    if(Array.isArray(node.children)&&node.children.length){collectLeaves(node.children,next,out);continue}
    const requirement=clean(node.requirements||(typeof node.evidenceRequirements==='string'?node.evidenceRequirements:'')||node.guidance||node.evidence||'');
    const code=detectCode(node,label);
    if(label||requirement)out.push({code,label,path:next.join(' › '),requirement});
  }
  return out
}
function criteriaFromMeta(meta){
  const out=[];
  if(meta?.criteria&&typeof meta.criteria==='object'&&!Array.isArray(meta.criteria)){
    for(const [code,text] of Object.entries(meta.criteria))out.push({code:clean(code),label:clean(text),path:'',requirement:clean(text)});
  }
  if(meta?.officialItems&&typeof meta.officialItems==='object'&&!Array.isArray(meta.officialItems)){
    for(const [code,text] of Object.entries(meta.officialItems))out.push({code:clean(code),label:clean(text),path:'',requirement:clean(text)});
  }
  return out
}
function dedupeCriteria(items){
  const seen=new Set(),out=[];
  for(const item of items){
    const key=(clean(item.code)||clean(item.path)||clean(item.label)).toLowerCase();if(!key||seen.has(key))continue;seen.add(key);
    out.push({code:clean(item.code),label:clean(item.label),path:clean(item.path),requirement:clean(item.requirement)})
  }
  return out.slice(0,90)
}
function courseContext(subject){
  const meta=currentMeta();
  let leaves=[];try{leaves=collectLeaves(typeof courseItems!=='undefined'?courseItems:[])}catch{}
  const criteria=dedupeCriteria([...criteriaFromMeta(meta),...leaves]);
  return{
    courseId:courseId(meta),
    courseTitle:courseTitle(meta),
    courseType:clean(meta?.courseType||meta?.qualificationType||''),
    level:clean(meta?.level||meta?.qualificationLevel||meta?.qualification?.level||''),
    subject,
    criteria:(subject==='trade'||subject==='epa')?criteria:criteria.slice(0,20)
  }
}
function availableSubjects(){return SUBJECTS.filter(subject=>subject!=='epa'||!isNvq())}
function subjectOptions(action){return exact(availableSubjects().map(subject=>({label:LABELS[subject],action,value:subject})))}

async function callAi(mode,subject,extra={}){
  const url=endpoint();if(!url)throw new Error('AI endpoint is not configured.');
  const body={version:1,mode,subject,course:courseContext(subject),...extra};
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error(`AI request failed (${response.status}).`);
    const data=await response.json();if(!data||data.ok!==true)throw new Error(clean(data?.error)||'AI response was invalid.');
    return data
  }finally{clearTimeout(timer)}
}
function normaliseQuestions(subject,data){
  const list=Array.isArray(data?.questions)?data.questions:[];
  return list.slice(0,5).map((question,index)=>({
    q:clean(question?.question),
    a:Array.isArray(question?.answers)?question.answers.map(clean):[],
    correct:Number(question?.correct),
    explanation:clean(question?.explanation),
    id:clean(question?.id)||`AI-${subject}-${Date.now()}-${index+1}`,
    difficulty:clean(question?.difficulty)||'adaptive',
    mappings:Array.isArray(question?.mappedTo)?question.mappedTo.map(clean).filter(Boolean):[],
    source:'Evia Teach/Test AI'
  })).filter(q=>q.q&&q.a.length===4&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4)
}
async function sayWorking(text){try{await chatSay(text)}catch{}}

async function startAiTest(subject,focus={}){
  const key=clean(subject).toLowerCase();if(!availableSubjects().includes(key))return;
  await sayWorking(`I’ll make a ${LABELS[key]} test from your course.`);
  try{
    const data=await callAi('test',key,{focus});
    const bank=normaliseQuestions(key,data);if(!bank.length)throw new Error('No valid questions returned.');
    const category=`ai:${key}:${Date.now()}`;aiBanks[category]=bank;
    testState={category,index:0,score:0};
    await askTestQuestion()
  }catch(error){
    await chatSay('I cannot reach Teach/Test AI right now. I’ll use Evia’s local test instead.');
    if(typeof original.startTestMe==='function')return original.startTestMe()
  }
}
async function startAiTeach(subject){
  const key=clean(subject).toLowerCase();if(!availableSubjects().includes(key))return;
  await sayWorking(`I’ll choose a useful ${LABELS[key]} area from your course.`);
  try{
    const data=await callAi('teach',key);
    const teaching=Array.isArray(data?.teaching)?data.teaching.map(clean).filter(Boolean).slice(0,4):[];
    if(!teaching.length)throw new Error('No valid teaching content returned.');
    lastTeach={subject:key,title:clean(data?.title),mappedTo:Array.isArray(data?.mappedTo)?data.mappedTo.map(clean).filter(Boolean):[],focus:clean(data?.focus)};
    if(lastTeach.title)await chatSay(lastTeach.title);
    for(const point of teaching)await chatSay(point);
    await chatSay('What would you like to do next?',exact([
      {label:'Test me on this',action:'ai-test-topic',value:key},
      {label:'Teach another',action:'teach-me',value:''},
      {label:'Main menu',action:'chat-home',value:''}
    ]))
  }catch(error){
    await chatSay('I cannot reach Teach/Test AI right now. I’ll use Evia’s local teaching instead.');
    if(typeof original.startTeachMe==='function')return original.startTeachMe()
  }
}

function installExactOptionSupport(){
  try{
    if(typeof prepareChatOptions!=='function'||prepareChatOptions.__eviaAiExact)return;
    const base=prepareChatOptions;
    const wrapped=function(options=[]){
      if(Array.isArray(options)&&options.some(option=>option?.__eviaAiExact)){
        try{chatOptionOverflow=[]}catch{}
        return options.filter(Boolean).map(option=>{const clone={...option};delete clone.__eviaAiExact;return clone})
      }
      return base.apply(this,arguments)
    };
    wrapped.__eviaAiExact=true;prepareChatOptions=wrapped
  }catch{}
}
function installBankOverride(){
  try{
    if(typeof testBankForCategory!=='function'||testBankForCategory.__eviaAiTeachTest)return;
    original.testBankForCategory=testBankForCategory;
    const wrapped=function(category){const key=clean(category);if(key.startsWith('ai:')&&aiBanks[key])return aiBanks[key];return original.testBankForCategory.apply(this,arguments)};
    wrapped.__eviaAiTeachTest=true;testBankForCategory=wrapped
  }catch{}
}
function installMenus(){
  try{
    if(typeof startTestMe==='function'&&!startTestMe.__eviaAiTeachTest){
      original.startTestMe=startTestMe;
      const wrapped=async function(){if(isDemo()||!endpoint())return original.startTestMe.apply(this,arguments);try{testState=null}catch{}await chatSay('What should I test you on?',subjectOptions('ai-test-category'))};
      wrapped.__eviaAiTeachTest=true;startTestMe=wrapped
    }
  }catch{}
  try{
    if(typeof startTeachMe==='function'&&!startTeachMe.__eviaAiTeachTest){
      original.startTeachMe=startTeachMe;
      const wrapped=async function(){if(isDemo()||!endpoint())return original.startTeachMe.apply(this,arguments);try{teachState=null}catch{}await chatSay('What should I teach you?',subjectOptions('ai-teach-category'))};
      wrapped.__eviaAiTeachTest=true;startTeachMe=wrapped
    }
  }catch{}
}
function installActionOverride(){
  try{
    if(typeof handleChatAction!=='function'||handleChatAction.__eviaAiTeachTest)return;
    original.handleChatAction=handleChatAction;
    const wrapped=async function(action,value,label){
      if(!isDemo()&&endpoint()){
        if(action==='ai-test-category'){
          try{chatNavStack.push(captureChatSnapshot())}catch{}try{appendUserBubble(label)}catch{}
          await startAiTest(value);return
        }
        if(action==='ai-teach-category'){
          try{chatNavStack.push(captureChatSnapshot())}catch{}try{appendUserBubble(label)}catch{}
          await startAiTeach(value);return
        }
        if(action==='ai-test-topic'){
          try{chatNavStack.push(captureChatSnapshot())}catch{}try{appendUserBubble(label)}catch{}
          const focus=lastTeach?{title:lastTeach.title,mappedTo:lastTeach.mappedTo,focus:lastTeach.focus}:{};
          await startAiTest(value,focus);return
        }
      }
      return original.handleChatAction.apply(this,arguments)
    };
    wrapped.__eviaAiTeachTest=true;handleChatAction=wrapped
  }catch{}
}
function install(){
  installExactOptionSupport();installBankOverride();installMenus();installActionOverride();
  globalThis.EviaTeachTestAI=Object.freeze({
    version:1,
    scope:'teach-test-only',
    configured:()=>Boolean(endpoint()),
    endpoint:()=>endpoint(),
    subjects:()=>availableSubjects().slice(),
    configure(value){try{const next=clean(value);if(next)localStorage.setItem(ENDPOINT_KEY,next);else localStorage.removeItem(ENDPOINT_KEY);return true}catch{return false}},
    context:subject=>courseContext(clean(subject).toLowerCase())
  })
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
