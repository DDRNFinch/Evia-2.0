(()=>{'use strict';
const ASK_SUBJECT='ask';
const askBanks={};
let lastAskTeach=null;
let askMode='';
let baseStartTestMe=null;
let baseStartTeachMe=null;
let baseHandleChatAction=null;
let baseTestBankForCategory=null;

function clean(value){return String(value??'').replace(/\s+/g,' ').trim()}
function isDemo(){
  try{if(localStorage.getItem('eviaDemoModeV1')==='1')return true}catch{}
  try{const meta=typeof inferredCourseMeta==='function'?(inferredCourseMeta()||{}):{};return meta?.demo===true||clean(meta?.standardCode)==='EVIA-DEMO'}catch{return false}
}
function aiReady(){try{return !isDemo()&&Boolean(globalThis.EviaTeachTestAI?.configured?.())}catch{return false}}
function labels(){return{trade:'Trade',maths:'Maths',english:'English',edi:'EDI',epa:'EPA'}}
function exact(options){return options.map(option=>({...option,__eviaAiExact:true}))}
function subjectOptions(action){
  const names=labels();
  let subjects=[];try{subjects=globalThis.EviaTeachTestAI?.subjects?.()||[]}catch{}
  return exact([
    ...subjects.map(subject=>({label:names[subject]||subject,action,value:subject})),
    {label:'Ask Evia…',action:action==='ai-test-category'?'ai-ask-test':'ai-ask-teach',value:''}
  ])
}
function endpoint(){try{return clean(globalThis.EviaTeachTestAI?.endpoint?.()||globalThis.EVIA_TEACH_TEST_ENDPOINT||'')}catch{return clean(globalThis.EVIA_TEACH_TEST_ENDPOINT||'')}}
function courseContext(){
  try{
    const context=globalThis.EviaTeachTestAI?.context?.('trade')||{};
    return{...context,subject:ASK_SUBJECT,criteria:Array.isArray(context?.criteria)?context.criteria:[]}
  }catch{return{courseId:'',courseTitle:'',courseType:'',level:'',subject:ASK_SUBJECT,criteria:[]}}
}
async function callAsk(mode,focus){
  const url=endpoint();if(!url)throw new Error('AI endpoint is not configured.');
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,mode,subject:ASK_SUBJECT,course:courseContext(),focus}),signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error(`AI request failed (${response.status}).`);
    const data=await response.json();if(!data||data.ok!==true)throw new Error(clean(data?.error)||'AI response was invalid.');
    return data
  }finally{clearTimeout(timer)}
}
function normaliseQuestions(data){
  const list=Array.isArray(data?.questions)?data.questions:[];
  return list.slice(0,5).map((question,index)=>({
    q:clean(question?.question),
    a:Array.isArray(question?.answers)?question.answers.map(clean):[],
    correct:Number(question?.correct),
    explanation:clean(question?.explanation),
    id:clean(question?.id)||`AI-ask-${Date.now()}-${index+1}`,
    difficulty:clean(question?.difficulty)||'adaptive',
    mappings:Array.isArray(question?.mappedTo)?question.mappedTo.map(clean).filter(Boolean):[],
    source:'Evia Teach/Test AI'
  })).filter(q=>q.q&&q.a.length===4&&Number.isInteger(q.correct)&&q.correct>=0&&q.correct<4)
}
function ensureAskForm(){
  let form=document.getElementById('eviaAiAskForm');if(form)return form;
  const card=document.querySelector('#chatPanel .chat-card'),options=document.getElementById('chatOptions');if(!card||!options)return null;
  const style=document.createElement('style');style.id='eviaAiAskStyle';style.textContent=`
    .evia-ai-ask-form{display:none;align-items:center;gap:8px;padding:10px 12px 12px;border-top:1px solid rgba(45,45,45,.08);background:#fff}
    .evia-ai-ask-form.open{display:flex}
    .evia-ai-ask-input{min-width:0;flex:1 1 auto;min-height:44px;border:1.5px solid rgba(245,196,0,.4);border-radius:18px;background:rgba(250,249,242,.98);color:rgba(45,45,45,.82);padding:10px 13px;font-size:14px;outline:0}
    .evia-ai-ask-send{flex:0 0 auto;min-height:44px;border:1.5px solid rgba(245,196,0,.4);border-radius:999px;background:rgba(250,249,242,.98);color:rgba(45,45,45,.72);padding:8px 14px;font-size:13px;cursor:pointer}
  `;document.head.appendChild(style);
  form=document.createElement('form');form.id='eviaAiAskForm';form.className='evia-ai-ask-form';form.innerHTML='<input class="evia-ai-ask-input" id="eviaAiAskInput" type="text" maxlength="500" autocomplete="off" aria-label="Ask Evia" placeholder="Type a topic or question…"><button class="evia-ai-ask-send" type="submit">Send</button>';
  card.insertBefore(form,options);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const input=form.querySelector('#eviaAiAskInput'),text=clean(input?.value),mode=askMode;if(!text||!mode)return;
    try{chatNavStack.push(captureChatSnapshot())}catch{}
    try{appendUserBubble(text)}catch{}
    hideAskInput();
    if(mode==='test')await startAskedTest(text);
    else await startAskedTeach(text)
  });
  return form
}
function hideAskInput(){const form=document.getElementById('eviaAiAskForm');if(form)form.classList.remove('open');askMode=''}
async function showAskInput(mode){
  const form=ensureAskForm();if(!form)return;
  askMode=mode;
  const prompt=mode==='test'?'What would you like me to test you on?':'What would you like me to teach you?';
  await chatSay(prompt,[]);
  const input=form.querySelector('#eviaAiAskInput');input.value='';input.placeholder=mode==='test'?'Type what you want to be tested on…':'Type what you want to learn about…';
  form.classList.add('open');setTimeout(()=>input.focus(),40)
}
async function startAskedTest(text,focusOverride=null){
  await chatSay(`I’ll make a test on ${text}.`);
  try{
    const focus=focusOverride||{title:text,focus:text,mappedTo:[]};
    const data=await callAsk('test',focus),bank=normaliseQuestions(data);if(!bank.length)throw new Error('No valid questions returned.');
    const category=`ai:ask:${Date.now()}`;askBanks[category]=bank;
    testState={category,index:0,score:0};
    await askTestQuestion()
  }catch(error){
    await chatSay('I could not create that test right now. Please try Ask Evia again.',exact([
      {label:'Ask Evia…',action:'ai-ask-test',value:''},
      {label:'Test Me',action:'test-me',value:''},
      {label:'Main menu',action:'chat-home',value:''}
    ]))
  }
}
async function startAskedTeach(text){
  await chatSay(`I’ll teach you about ${text}.`);
  try{
    const data=await callAsk('teach',{title:text,focus:text,mappedTo:[]});
    const teaching=Array.isArray(data?.teaching)?data.teaching.map(clean).filter(Boolean).slice(0,4):[];if(!teaching.length)throw new Error('No valid teaching content returned.');
    lastAskTeach={request:text,title:clean(data?.title),focus:clean(data?.focus),mappedTo:Array.isArray(data?.mappedTo)?data.mappedTo.map(clean).filter(Boolean):[]};
    if(lastAskTeach.title)await chatSay(lastAskTeach.title);
    for(const point of teaching)await chatSay(point);
    await chatSay('What would you like to do next?',exact([
      {label:'Test me on this',action:'ai-ask-test-topic',value:''},
      {label:'Ask Evia again',action:'ai-ask-teach',value:''},
      {label:'Teach another',action:'teach-me',value:''},
      {label:'Main menu',action:'chat-home',value:''}
    ]))
  }catch(error){
    await chatSay('I could not teach that topic right now. Please try Ask Evia again.',exact([
      {label:'Ask Evia…',action:'ai-ask-teach',value:''},
      {label:'Teach Me',action:'teach-me',value:''},
      {label:'Main menu',action:'chat-home',value:''}
    ]))
  }
}
function installBankOverride(){
  if(typeof testBankForCategory!=='function'||testBankForCategory.__eviaAiAsk)return;
  baseTestBankForCategory=testBankForCategory;
  const wrapped=function(category){const key=clean(category);if(key.startsWith('ai:ask:')&&askBanks[key])return askBanks[key];return baseTestBankForCategory.apply(this,arguments)};
  wrapped.__eviaAiAsk=true;testBankForCategory=wrapped
}
function installMenus(){
  if(typeof startTestMe==='function'&&!startTestMe.__eviaAiAsk){
    baseStartTestMe=startTestMe;
    const wrapped=async function(){hideAskInput();if(!aiReady())return baseStartTestMe.apply(this,arguments);try{testState=null}catch{}await chatSay('What should I test you on?',subjectOptions('ai-test-category'))};
    wrapped.__eviaAiAsk=true;startTestMe=wrapped
  }
  if(typeof startTeachMe==='function'&&!startTeachMe.__eviaAiAsk){
    baseStartTeachMe=startTeachMe;
    const wrapped=async function(){hideAskInput();if(!aiReady())return baseStartTeachMe.apply(this,arguments);try{teachState=null}catch{}await chatSay('What should I teach you?',subjectOptions('ai-teach-category'))};
    wrapped.__eviaAiAsk=true;startTeachMe=wrapped
  }
}
function installActions(){
  if(typeof handleChatAction!=='function'||handleChatAction.__eviaAiAsk)return;
  baseHandleChatAction=handleChatAction;
  const wrapped=async function(action,value,label){
    if(aiReady()){
      if(action==='ai-ask-test'||action==='ai-ask-teach'){
        try{chatNavStack.push(captureChatSnapshot())}catch{}try{appendUserBubble(label)}catch{}
        await showAskInput(action==='ai-ask-test'?'test':'teach');return
      }
      if(action==='ai-ask-test-topic'){
        hideAskInput();try{chatNavStack.push(captureChatSnapshot())}catch{}try{appendUserBubble(label)}catch{}
        const current=lastAskTeach;if(!current){await showAskInput('test');return}
        await startAskedTest(current.request,{title:current.title||current.request,focus:current.focus||current.request,mappedTo:current.mappedTo||[]});return
      }
    }
    hideAskInput();return baseHandleChatAction.apply(this,arguments)
  };
  wrapped.__eviaAiAsk=true;handleChatAction=wrapped
}
function installHideHooks(){
  document.getElementById('chatExitButton')?.addEventListener('click',hideAskInput,true);
  document.getElementById('chatButton')?.addEventListener('click',hideAskInput,true);
  document.getElementById('backButton')?.addEventListener('click',hideAskInput,true)
}
function install(){
  ensureAskForm();installBankOverride();installMenus();installActions();installHideHooks();
  globalThis.EviaTeachTestAsk=Object.freeze({version:1,scope:'teach-test-only',openTeach:()=>showAskInput('teach'),openTest:()=>showAskInput('test')})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
