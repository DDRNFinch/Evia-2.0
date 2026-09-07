const teachTestWorker=(()=>{
const DEFAULT_MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
const SUBJECTS=new Set(['trade','maths','english','edi','epa','ask']);
const MODES=new Set(['teach','test']);

function clean(value,max=4000){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}
function json(body,status=200,headers={}){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})
}
function corsHeaders(request,env){
  const origin=request.headers.get('origin')||'';
  const allowed=clean(env.ALLOWED_ORIGIN||'https://ddrnfinch.github.io',300);
  if(!origin)return {'access-control-allow-origin':allowed,'vary':'origin'};
  if(origin===allowed||origin==='http://localhost:8787'||origin==='http://127.0.0.1:8787')return {'access-control-allow-origin':origin,'vary':'origin'};
  return {'access-control-allow-origin':allowed,'vary':'origin'}
}
function sanitizeCriteria(items){
  if(!Array.isArray(items))return[];
  return items.slice(0,90).map(item=>({
    code:clean(item?.code,40),
    label:clean(item?.label,700),
    path:clean(item?.path,700),
    requirement:clean(item?.requirement,1200)
  })).filter(item=>item.code||item.label||item.requirement)
}
function sanitizeCourse(course={}){
  return{
    courseId:clean(course?.courseId,80),
    courseTitle:clean(course?.courseTitle,240),
    courseType:clean(course?.courseType,80),
    level:clean(course?.level,40),
    criteria:sanitizeCriteria(course?.criteria)
  }
}
function schemaFor(mode){
  if(mode==='teach')return{
    type:'object',
    properties:{
      title:{type:'string'},
      focus:{type:'string'},
      mappedTo:{type:'array',items:{type:'string'},maxItems:4},
      teaching:{type:'array',items:{type:'string'},minItems:3,maxItems:4}
    },
    required:['title','focus','mappedTo','teaching']
  };
  return{
    type:'object',
    properties:{
      title:{type:'string'},
      questions:{type:'array',minItems:5,maxItems:5,items:{
        type:'object',
        properties:{
          question:{type:'string'},
          answers:{type:'array',items:{type:'string'},minItems:4,maxItems:4},
          correct:{type:'integer',minimum:0,maximum:3},
          explanation:{type:'string'},
          mappedTo:{type:'array',items:{type:'string'},maxItems:4},
          difficulty:{type:'string',enum:['developing','competent','stretch']}
        },
        required:['question','answers','correct','explanation','mappedTo','difficulty']
      }}
    },
    required:['title','questions']
  }
}
function subjectGuidance(subject){
  if(subject==='trade')return 'Use the supplied course criteria as the source of truth. Test or teach authentic occupational knowledge, skills and judgement relevant to those criteria.';
  if(subject==='epa')return 'Use the supplied apprenticeship criteria as the source of truth. Focus on applying and explaining those criteria in realistic end-point-assessment style scenarios. Do not invent assessment methods that were not supplied.';
  if(subject==='maths')return 'Use practical UK apprenticeship maths: measurement, area, volume, ratio, percentages, estimation, scale, tolerances and calculations appropriate to the supplied course context. Keep arithmetic correct.';
  if(subject==='english')return 'Use practical UK apprenticeship English: reading instructions, extracting meaning, vocabulary, spelling, grammar, concise workplace writing and communication in the supplied course context.';
  if(subject==='edi')return 'Teach or test workplace equality, diversity and inclusion using respectful, practical UK workplace scenarios. Focus on fair treatment, inclusive behaviour, challenging assumptions and appropriate workplace action.';
  return 'The learner has typed what they want to learn or be tested on. Infer whether their request is Trade, Maths, English, EDI or EPA and stay strictly within apprenticeship learning. For course-specific Trade or EPA requests, use the supplied course criteria as the source of truth. For Maths, English or EDI requests, keep examples practical and relevant to apprenticeship work. Follow the learner request closely and do not drift to an unrelated topic.'
}
function systemPrompt(mode,subject){
  const common=`You are the tightly-scoped Teach/Test engine for Evia, a UK apprenticeship learning app. Your ONLY role is educational teaching and testing. You cannot control the app, alter progress, evidence, attendance, portfolios, settings, QR data or learner records. Never ask for or infer a learner name, employer, contact details or other identifying information. ${subjectGuidance(subject)} Use British English. Keep content concise, accurate and natural. Do not merely rewrite the official criterion as a sentence. Do not use repetitive stock answers. Wrong answers must be plausible but clearly less correct. Do not invent KSB/AC codes. When mappings are supplied, mappedTo values must come from those supplied codes where possible.`;
  if(mode==='teach')return `${common} Produce one short teaching sequence. Choose one useful focus. Give 3 or 4 short teaching messages that explain the idea, show how it applies and highlight a common mistake or check. Do not turn it into a lecture.`;
  return `${common} Produce exactly 5 multiple-choice questions. Each question must have exactly 4 answer options and exactly one best answer. Vary the correct answer position. Across the 5 questions, vary the scenario and concept. Do not repeat the same correct-answer wording. Explanations should briefly say why the selected answer is strongest.`
}
function buildUserPrompt(mode,subject,course,focus){
  const criteria=course.criteria.map(item=>({code:item.code,label:item.label,path:item.path,requirement:item.requirement}));
  const payload={mode,subject,course:{courseId:course.courseId,courseTitle:course.courseTitle,courseType:course.courseType,level:course.level},criteria};
  if(focus&&typeof focus==='object')payload.focus={title:clean(focus.title,240),focus:clean(focus.focus,400),mappedTo:Array.isArray(focus.mappedTo)?focus.mappedTo.map(v=>clean(v,40)).filter(Boolean).slice(0,4):[]};
  return `Create the requested Evia content from this approved context only:\n${JSON.stringify(payload)}`
}
function parseAiResponse(result){
  const value=result&&Object.prototype.hasOwnProperty.call(result,'response')?result.response:result;
  if(value&&typeof value==='object')return value;
  if(typeof value==='string')return JSON.parse(value);
  throw new Error('Workers AI returned an unsupported response.')
}
function filterMappings(values,course,subject){
  const list=Array.isArray(values)?values.map(v=>clean(v,40)).filter(Boolean):[];
  if(subject!=='trade'&&subject!=='epa'&&subject!=='ask')return[];
  const allowed=new Set(course.criteria.map(item=>clean(item.code,40)).filter(Boolean).map(v=>v.toLowerCase()));
  if(!allowed.size)return[];
  return list.filter(value=>allowed.has(value.toLowerCase())).slice(0,4)
}
function validateTeach(data,course,subject){
  const teaching=Array.isArray(data?.teaching)?data.teaching.map(v=>clean(v,800)).filter(Boolean).slice(0,4):[];
  if(teaching.length<3)throw new Error('Teach response did not contain enough teaching points.');
  return{title:clean(data?.title,240),focus:clean(data?.focus,500),mappedTo:filterMappings(data?.mappedTo,course,subject),teaching}
}
function validateTest(data,course,subject){
  if(!Array.isArray(data?.questions)||data.questions.length<5)throw new Error('Test response did not contain five questions.');
  const questions=data.questions.slice(0,5).map((q,index)=>{
    const answers=Array.isArray(q?.answers)?q.answers.map(v=>clean(v,700)):[];
    const correct=Number(q?.correct);
    if(!clean(q?.question,1000)||answers.length!==4||!Number.isInteger(correct)||correct<0||correct>3)throw new Error(`Invalid question ${index+1}.`);
    return{question:clean(q.question,1000),answers,correct,explanation:clean(q?.explanation,700),mappedTo:filterMappings(q?.mappedTo,course,subject),difficulty:['developing','competent','stretch'].includes(clean(q?.difficulty).toLowerCase())?clean(q.difficulty).toLowerCase():'competent'}
  });
  const correctTexts=questions.map(q=>q.answers[q.correct].toLowerCase());
  if(new Set(correctTexts).size!==questions.length)throw new Error('Workers AI repeated a correct answer.');
  return{title:clean(data?.title,240),questions}
}

return{
  async fetch(request,env){
    const cors=corsHeaders(request,env);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400'}});
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname.endsWith('/health'))return json({ok:true,service:'evia-teach-test',scope:'teach-test-only',model:clean(env.MODEL||DEFAULT_MODEL,200)},200,cors);
    if(request.method!=='POST'||!url.pathname.endsWith('/v1/teach-test'))return json({ok:false,error:'Not found.'},404,cors);
    const origin=request.headers.get('origin')||'';
    const allowed=clean(env.ALLOWED_ORIGIN||'https://ddrnfinch.github.io',300);
    if(origin&&origin!==allowed&&origin!=='http://localhost:8787'&&origin!=='http://127.0.0.1:8787')return json({ok:false,error:'Origin not allowed.'},403,cors);
    const length=Number(request.headers.get('content-length')||0);if(length>100000)return json({ok:false,error:'Request too large.'},413,cors);
    let body;try{body=await request.json()}catch{return json({ok:false,error:'Invalid JSON.'},400,cors)}
    const mode=clean(body?.mode).toLowerCase(),subject=clean(body?.subject).toLowerCase();
    if(!MODES.has(mode)||!SUBJECTS.has(subject))return json({ok:false,error:'Unsupported Teach/Test request.'},400,cors);
    const course=sanitizeCourse(body?.course||{}),focus=body?.focus&&typeof body.focus==='object'?body.focus:null;
    if((subject==='trade'||subject==='epa')&&!course.criteria.length)return json({ok:false,error:'This course does not contain enough mapped criteria for AI Teach/Test yet.'},400,cors);
    const schema=schemaFor(mode),model=clean(env.MODEL||DEFAULT_MODEL,200)||DEFAULT_MODEL;
    try{
      const result=await env.AI.run(model,{
        messages:[{role:'system',content:systemPrompt(mode,subject)},{role:'user',content:buildUserPrompt(mode,subject,course,focus)}],
        response_format:{type:'json_schema',json_schema:schema},
        max_tokens:mode==='test'?1500:850,
        temperature:0.45,
        repetition_penalty:1.08
      });
      const parsed=parseAiResponse(result),validated=mode==='test'?validateTest(parsed,course,subject):validateTeach(parsed,course,subject);
      return json({ok:true,mode,subject,...validated},200,cors)
    }catch(error){
      return json({ok:false,error:'Teach/Test AI could not create valid content. Please try again.'},502,cors)
    }
  }
};
})();

const epaWorker=(()=>{
const DEFAULT_EPA_MODEL='@cf/nvidia/nemotron-3-120b-a12b';
const FALLBACK_EPA_MODEL='@cf/zai-org/glm-4.7-flash';
const WHISPER_MODEL='@cf/openai/whisper-large-v3-turbo';
const PRACTICE_TYPES=new Set(['discussion','practical','mcq']);

function clean(value,max=4000){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function corsHeaders(request,env){const origin=request.headers.get('origin')||'',allowed=clean(env.ALLOWED_ORIGIN||'https://ddrnfinch.github.io',300);if(!origin)return{'access-control-allow-origin':allowed,'vary':'origin'};if(origin===allowed||origin==='http://localhost:8787'||origin==='http://127.0.0.1:8787')return{'access-control-allow-origin':origin,'vary':'origin'};return{'access-control-allow-origin':allowed,'vary':'origin'}}
function allowedOrigin(request,env){const origin=request.headers.get('origin')||'',allowed=clean(env.ALLOWED_ORIGIN||'https://ddrnfinch.github.io',300);return!origin||origin===allowed||origin==='http://localhost:8787'||origin==='http://127.0.0.1:8787'}
function sanitizeCriteria(items){if(!Array.isArray(items))return[];return items.slice(0,90).map(item=>({code:clean(item?.code||item?.id,40),label:clean(item?.label||item?.wording,700),path:clean(item?.path,700),requirement:clean(item?.requirement||item?.wording,1200)})).filter(item=>item.code||item.label||item.requirement)}
function sanitizeCourse(course={}){return{courseId:clean(course?.courseId,80),courseTitle:clean(course?.courseTitle,240),courseType:clean(course?.courseType,80),level:clean(course?.level,40),criteria:sanitizeCriteria(course?.criteria)}}
function sanitizeEvidence(items){if(!Array.isArray(items))return[];return items.slice(-60).map(item=>({id:clean(item?.id,120),path:Array.isArray(item?.path)?item.path.slice(0,8).map(value=>clean(value,180)).filter(Boolean):[],label:clean(item?.label,240),type:clean(item?.type,80),method:clean(item?.method,160),assessmentGuide:clean(item?.assessmentGuide,1200),text:clean(item?.text,1800)})).filter(item=>item.path.length||item.label||item.assessmentGuide||item.text)}
function sanitizeFocus(items){return(Array.isArray(items)?items:[]).map(value=>clean(value,400)).filter(Boolean).slice(0,8)}
function filterMappings(values,course,max=12){const list=Array.isArray(values)?values.map(v=>clean(v,40)).filter(Boolean):[],allowed=new Set(course.criteria.map(item=>clean(item.code,40)).filter(Boolean).map(v=>v.toLowerCase()));return list.filter(value=>allowed.has(value.toLowerCase())).slice(0,max)}
function methodText(value){if(value&&typeof value==='object')return{title:clean(value.title||value.name,240),detail:clean(value.detail||value.description,1200)};return{title:clean(value,240),detail:''}}
function parseJsonField(value,fallback){try{return JSON.parse(String(value||''))}catch{return fallback}}
function arrayBufferToBase64(buffer){const bytes=new Uint8Array(buffer),chunk=0x8000;let binary='';for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(binary)}
function parseAiResponse(result){let value=result;if(value&&Object.prototype.hasOwnProperty.call(value,'response'))value=value.response;else if(value?.choices?.[0]?.message?.content!==undefined)value=value.choices[0].message.content;if(value&&typeof value==='object')return value;if(typeof value==='string'){const text=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');return JSON.parse(text)}throw new Error('Workers AI returned an unsupported response.')}
function schemaFormat(schema){return{type:'json_schema',json_schema:schema}}

function questionSchema(){return{type:'object',properties:{question:{type:'string'},focus:{type:'string'},mappedTo:{type:'array',items:{type:'string'},maxItems:4},evidenceFocus:{type:'array',items:{type:'string'},maxItems:4}},required:['question','focus','mappedTo','evidenceFocus']}}
function feedbackSchema(){return{type:'object',properties:{strengths:{type:'array',items:{type:'string'},minItems:1,maxItems:4},improvements:{type:'array',items:{type:'string'},minItems:1,maxItems:4},summary:{type:'string'},followUp:{type:'string'},level:{type:'string',enum:['limited','developing','strong']},mappedTo:{type:'array',items:{type:'string'},maxItems:6},evidenceToRevisit:{type:'array',items:{type:'string'},maxItems:5}},required:['strengths','improvements','summary','followUp','level','mappedTo','evidenceToRevisit']}}
function mcqSchema(count=5){return{type:'object',properties:{title:{type:'string'},questions:{type:'array',minItems:count,maxItems:count,items:{type:'object',properties:{question:{type:'string'},answers:{type:'array',items:{type:'string'},minItems:4,maxItems:4},correct:{type:'integer',minimum:0,maximum:3},explanation:{type:'string'},mappedTo:{type:'array',items:{type:'string'},maxItems:4},evidenceFocus:{type:'array',items:{type:'string'},maxItems:3}},required:['question','answers','correct','explanation','mappedTo','evidenceFocus']}}},required:['title','questions']}}
function summarySchema(){return{type:'object',properties:{overall:{type:'string',enum:['limited','developing','strong']},strongAreas:{type:'array',items:{type:'string'},maxItems:6},weakAreas:{type:'array',items:{type:'string'},maxItems:6},evidenceToRevisit:{type:'array',items:{type:'string'},maxItems:6},nextActions:{type:'array',items:{type:'string'},maxItems:5},mappedTo:{type:'array',items:{type:'string'},maxItems:12},score:{type:'number'},total:{type:'number'},percent:{type:'number'}},required:['overall','strongAreas','weakAreas','evidenceToRevisit','nextActions','mappedTo']}}
function contextPayload(course){return course.criteria.map(item=>({code:item.code,label:item.label,path:item.path,requirement:item.requirement}))}

function expertCommon(){return 'You are EPA Evia, a specialist UK apprenticeship end-point-assessment preparation coach. Your practice is deliberately demanding: use expert/stretch-level scenarios that require application, justification, diagnosis, comparison, checks, tolerances, corrective action and occupational judgement. Difficult must mean deep reasoning, not trick questions, obscure trivia or invented rules. Naxos assessment-method information and the supplied course criteria are the source of truth. Learner evidence is context for personalisation, not proof of competence. Use only the supplied criteria, assessment-method information and evidence. Never invent KSB/AC codes, assessment rules, evidence facts or learner details. Use British English. Never make an EPA pass/fail decision or claim competence. Do not ask for personal identifiers.'}
function questionSystem(practiceType){const common=expertCommon();if(practiceType==='practical')return`${common} Create one Practical Prep question the learner can answer verbally. Base it on relevant evidence where possible and probe planning, sequence, drawings/specification, safety, quality, checks, tolerances, faults or corrective action. Do not claim to observe physical performance. Return only structured JSON.`;return`${common} Create one assessor-style interview/discussion question based on relevant learner evidence where possible. It must require a detailed occupational explanation, reasons and examples rather than simple recall. Return only structured JSON.`}
function feedbackSystem(practiceType){const common=expertCommon();if(practiceType==='practical')return`${common} Review one spoken Practical Prep answer. Judge only the quality of the explanation against the question and supplied criteria. Focus on planning, sequence, checks, safety, quality, tolerances, diagnosis and corrective action. The follow-up must probe the most important missing or weak point. Never claim you observed practical competence. Return only structured JSON.`;return`${common} Review one spoken interview/discussion answer. Judge only what the transcript actually says. Reward clear occupational examples, explanation, justification, checks and reasons. Identify weak or vague points and produce one challenging assessor-style follow-up question. Return only structured JSON.`}
function mcqSystem(){return`${expertCommon()} Create exactly five expert/stretch EPA multiple-choice questions. Use realistic occupational scenarios. Several options may sound plausible, but exactly one must be the strongest answer from the supplied approved context. Avoid simple definition recall unless necessary. Vary the correct option position and do not repeat answer wording. Return only structured JSON.`}
function summarySystem(){return`${expertCommon()} Produce a concise practice-session report from the supplied results. Identify genuine strong and weak areas, relevant evidence worth revisiting, and useful next practice actions. If an MCQ score is supplied, preserve it accurately. overall describes practice quality only. Return only structured JSON.`}

async function runEpaModel(env,{system,user,schema,maxTokens=1200,temperature=.28}){const primary=clean(env.EPA_MODEL||DEFAULT_EPA_MODEL,200)||DEFAULT_EPA_MODEL,fallback=clean(env.EPA_FALLBACK_MODEL||FALLBACK_EPA_MODEL,200)||FALLBACK_EPA_MODEL,models=[primary,...(fallback&&fallback!==primary?[fallback]:[])];let lastError=null;for(const model of models){try{const result=await env.AI.run(model,{messages:[{role:'system',content:system},{role:'user',content:user}],response_format:schemaFormat(schema),max_completion_tokens:maxTokens,max_tokens:maxTokens,temperature,reasoning_effort:'medium'});return{data:parseAiResponse(result),model}}catch(error){lastError=error}}throw lastError||new Error('EPA Workers AI is unavailable.')}
function approvedContext(body,practiceType){const course=sanitizeCourse(body?.course||{});if(!course.criteria.length)throw new Error('This course does not contain enough mapped criteria for EPA practice yet.');return{practiceType,course,method:methodText(body?.assessmentMethod),evidence:sanitizeEvidence(body?.evidence),focus:sanitizeFocus(body?.focus)}}

async function createQuestion(body,env){const practiceType=clean(body?.practiceType).toLowerCase();if(!['discussion','practical'].includes(practiceType))throw new Error('Unsupported EPA practice type.');const context=approvedContext(body,practiceType),previous=(Array.isArray(body?.previousQuestions)?body.previousQuestions:[]).map(v=>clean(v,1200)).filter(Boolean).slice(-6),payload={practiceType,course:{courseId:context.course.courseId,courseTitle:context.course.courseTitle,courseType:context.course.courseType,level:context.course.level},assessmentMethod:context.method,criteria:contextPayload(context.course),learnerEvidence:context.evidence,focus:context.focus,previousQuestions:previous};const {data,model}=await runEpaModel(env,{system:questionSystem(practiceType),user:`Create the next EPA practice question from this approved context only:\n${JSON.stringify(payload)}`,schema:questionSchema(),maxTokens:600,temperature:.32});const question=clean(data?.question,1400);if(!question)throw new Error('EPA practice AI did not return a question.');return{question,focus:clean(data?.focus,500),mappedTo:filterMappings(data?.mappedTo,context.course,4),evidenceFocus:Array.isArray(data?.evidenceFocus)?data.evidenceFocus.map(v=>clean(v,300)).filter(Boolean).slice(0,4):[],model}}
function validateMcq(data,course,count){if(!Array.isArray(data?.questions)||data.questions.length<count)throw new Error('EPA AI did not return enough questions.');const questions=data.questions.slice(0,count).map((q,index)=>{const answers=Array.isArray(q?.answers)?q.answers.map(v=>clean(v,800)):[],correct=Number(q?.correct),question=clean(q?.question,1400);if(!question||answers.length!==4||!Number.isInteger(correct)||correct<0||correct>3)throw new Error(`Invalid EPA MCQ ${index+1}.`);return{question,answers,correct,explanation:clean(q?.explanation,1000),mappedTo:filterMappings(q?.mappedTo,course,4),evidenceFocus:Array.isArray(q?.evidenceFocus)?q.evidenceFocus.map(v=>clean(v,300)).filter(Boolean).slice(0,3):[]}});return{title:clean(data?.title,240)||'EPA expert practice',questions}}
async function createMcq(body,env){const context=approvedContext(body,'mcq'),count=5,payload={practiceType:'mcq',course:{courseId:context.course.courseId,courseTitle:context.course.courseTitle,courseType:context.course.courseType,level:context.course.level},assessmentMethod:context.method,criteria:contextPayload(context.course),learnerEvidence:context.evidence,focus:context.focus,count};const {data,model}=await runEpaModel(env,{system:mcqSystem(),user:`Create the EPA multiple-choice practice from this approved context only:\n${JSON.stringify(payload)}`,schema:mcqSchema(count),maxTokens:2100,temperature:.34});return{...validateMcq(data,context.course,count),model}}

async function transcribeAudio(file,env,question){const buffer=await file.arrayBuffer();if(!buffer.byteLength)throw new Error('No audio was received.');const base64=arrayBufferToBase64(buffer);const result=await env.AI.run(WHISPER_MODEL,{audio:base64,task:'transcribe',language:'en',vad_filter:true,condition_on_previous_text:false,initial_prompt:`UK apprenticeship EPA practice response. Question: ${clean(question,600)}`});const transcript=clean(result?.text||result?.transcription_info?.text||result?.transcript,14000);if(!transcript)throw new Error('Evia could not hear enough speech to review this answer.');return transcript}
async function reviewAnswer(form,env){const practiceType=clean(form.get('practiceType')).toLowerCase();if(!['discussion','practical'].includes(practiceType))throw new Error('Unsupported EPA practice type.');const question=clean(form.get('question'),1400),course=sanitizeCourse(parseJsonField(form.get('course'),{})),method=methodText(parseJsonField(form.get('assessmentMethod'),{})),requestedMappings=parseJsonField(form.get('mappedTo'),[]),evidence=sanitizeEvidence(parseJsonField(form.get('evidence'),[])),audio=form.get('audio');if(!question||!course.criteria.length)throw new Error('EPA practice context is incomplete.');if(!(audio instanceof File))throw new Error('Audio answer is required.');if(audio.size>12*1024*1024)throw new Error('This recording is too large. Keep EPA practice answers shorter and try again.');const transcript=await transcribeAudio(audio,env,question),payload={practiceType,question,assessmentMethod:method,mappedTo:filterMappings(requestedMappings,course,6),course:{courseId:course.courseId,courseTitle:course.courseTitle},criteria:contextPayload(course),learnerEvidence:evidence,transcript};const {data,model}=await runEpaModel(env,{system:feedbackSystem(practiceType),user:`Coach this EPA practice answer from the approved context only:\n${JSON.stringify(payload)}`,schema:feedbackSchema(),maxTokens:1200,temperature:.24});const strengths=Array.isArray(data?.strengths)?data.strengths.map(v=>clean(v,800)).filter(Boolean).slice(0,4):[],improvements=Array.isArray(data?.improvements)?data.improvements.map(v=>clean(v,800)).filter(Boolean).slice(0,4):[],level=['limited','developing','strong'].includes(clean(data?.level).toLowerCase())?clean(data.level).toLowerCase():'developing';if(!strengths.length)strengths.push('You gave Evia a spoken response that can be developed through further practice.');if(!improvements.length)improvements.push('Add a specific occupational example, check and reason to make the answer harder for an assessor to probe.');return{transcript,strengths,improvements,summary:clean(data?.summary,1100),followUp:clean(data?.followUp,1200),level,mappedTo:filterMappings(data?.mappedTo,course,6),evidenceToRevisit:Array.isArray(data?.evidenceToRevisit)?data.evidenceToRevisit.map(v=>clean(v,500)).filter(Boolean).slice(0,5):[],model}}
function sanitiseResults(items){if(!Array.isArray(items))return[];return items.slice(-20).map(item=>({correct:typeof item?.correct==='boolean'?item.correct:undefined,question:clean(item?.question,1200),selected:clean(item?.selected,800),correctAnswer:clean(item?.correctAnswer,800),explanation:clean(item?.explanation,1000),level:clean(item?.level,40),strengths:Array.isArray(item?.strengths)?item.strengths.map(v=>clean(v,500)).filter(Boolean).slice(0,4):[],improvements:Array.isArray(item?.improvements)?item.improvements.map(v=>clean(v,500)).filter(Boolean).slice(0,4):[],evidenceToRevisit:Array.isArray(item?.evidenceToRevisit)?item.evidenceToRevisit.map(v=>clean(v,400)).filter(Boolean).slice(0,4):[],mappedTo:Array.isArray(item?.mappedTo)?item.mappedTo.map(v=>clean(v,40)).filter(Boolean).slice(0,6):[]}))}
async function createSummary(body,env){const practiceType=clean(body?.practiceType).toLowerCase();if(!PRACTICE_TYPES.has(practiceType))throw new Error('Unsupported EPA practice type.');const context=approvedContext(body,practiceType),results=sanitiseResults(body?.results);if(!results.length)throw new Error('There are no EPA practice results to summarise.');let score,total,percent;if(practiceType==='mcq'){total=results.filter(item=>typeof item.correct==='boolean').length;score=results.filter(item=>item.correct===true).length;percent=total?Math.round((score/total)*100):0}const payload={practiceType,course:{courseId:context.course.courseId,courseTitle:context.course.courseTitle},assessmentMethod:context.method,criteria:contextPayload(context.course),learnerEvidence:context.evidence,results,score,total,percent};const {data,model}=await runEpaModel(env,{system:summarySystem(),user:`Create the EPA practice report from this approved context only:\n${JSON.stringify(payload)}`,schema:summarySchema(),maxTokens:1100,temperature:.2});const overall=['limited','developing','strong'].includes(clean(data?.overall).toLowerCase())?clean(data.overall).toLowerCase():(practiceType==='mcq'?(percent>=80?'strong':percent>=60?'developing':'limited'):'developing');return{overall,strongAreas:Array.isArray(data?.strongAreas)?data.strongAreas.map(v=>clean(v,600)).filter(Boolean).slice(0,6):[],weakAreas:Array.isArray(data?.weakAreas)?data.weakAreas.map(v=>clean(v,600)).filter(Boolean).slice(0,6):[],evidenceToRevisit:Array.isArray(data?.evidenceToRevisit)?data.evidenceToRevisit.map(v=>clean(v,500)).filter(Boolean).slice(0,6):[],nextActions:Array.isArray(data?.nextActions)?data.nextActions.map(v=>clean(v,600)).filter(Boolean).slice(0,5):[],mappedTo:filterMappings(data?.mappedTo,context.course,12),...(practiceType==='mcq'?{score,total,percent}:{}),model}}
async function handleEpa(request,env){const cors=corsHeaders(request,env);if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400'}});if(request.method!=='POST')return json({ok:false,error:'Method not allowed.'},405,cors);if(!allowedOrigin(request,env))return json({ok:false,error:'Origin not allowed.'},403,cors);const length=Number(request.headers.get('content-length')||0);if(length>13*1024*1024)return json({ok:false,error:'Request too large.'},413,cors);try{const type=request.headers.get('content-type')||'';if(type.includes('application/json')){const body=await request.json(),action=clean(body?.action).toLowerCase();let result;if(action==='question')result=await createQuestion(body,env);else if(action==='mcq')result=await createMcq(body,env);else if(action==='summary')result=await createSummary(body,env);else return json({ok:false,error:'Unsupported EPA practice action.'},400,cors);return json({ok:true,action,...result},200,cors)}if(type.includes('multipart/form-data')){const form=await request.formData();if(clean(form.get('action')).toLowerCase()!=='feedback')return json({ok:false,error:'Unsupported EPA practice action.'},400,cors);const result=await reviewAnswer(form,env);return json({ok:true,action:'feedback',...result},200,cors)}return json({ok:false,error:'Unsupported content type.'},415,cors)}catch(error){return json({ok:false,error:clean(error?.message,500)||'EPA practice AI could not complete this request. Please try again.'},502,cors)}}
return{async fetch(request,env,ctx){const url=new URL(request.url);if(url.pathname.endsWith('/v1/epa-discussion'))return handleEpa(request,env);if(request.method==='GET'&&url.pathname.endsWith('/health')){const cors=corsHeaders(request,env);return json({ok:true,service:'evia-teach-test',scope:'teach-test-plus-epa',model:clean(env.MODEL||'@cf/meta/llama-3.1-8b-instruct-fast',200),epaModel:clean(env.EPA_MODEL||DEFAULT_EPA_MODEL,200),epaFallbackModel:clean(env.EPA_FALLBACK_MODEL||FALLBACK_EPA_MODEL,200)},200,cors)}return teachTestWorker.fetch(request,env,ctx)}};
})();

const DEFAULT_EPA_MODEL='@cf/nvidia/nemotron-3-120b-a12b';
const DEFAULT_EPA_FALLBACK_MODEL='@cf/zai-org/glm-4.7-flash';
const DEFAULT_STRUCTURED_FALLBACK_MODEL='@cf/meta/llama-3.1-8b-instruct-fast';
const EPA_ENGINE_VERSION='native-json-fallback-v1';

function clean(value,max=4000){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max)}
function jsonText(value){
  if(Array.isArray(value))value=value.map(part=>typeof part==='string'?part:(part?.text??part?.content??'')).join('');
  if(typeof value!=='string')return null;
  let text=value.trim();
  if(!text)return null;
  text=text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try{return JSON.parse(text)}catch{}
  const first=text.indexOf('{'),last=text.lastIndexOf('}');
  if(first>=0&&last>first){try{return JSON.parse(text.slice(first,last+1))}catch{}}
  return null;
}
function parseResult(result){
  const choices=result?.choices;
  const message=choices?.[0]?.message;
  const candidates=[
    result?.response,
    message?.content,
    choices?.[0]?.text,
    result?.output_text,
    result?.result?.response,
    result?.result?.choices?.[0]?.message?.content
  ];
  for(const candidate of candidates){
    if(candidate&&typeof candidate==='object'&&!Array.isArray(candidate))return candidate;
    const parsed=jsonText(candidate);if(parsed&&typeof parsed==='object')return parsed;
  }
  if(result&&typeof result==='object'&&!Array.isArray(result)){
    const likely=['question','questions','overall','strengths','summary'];
    if(likely.some(key=>Object.prototype.hasOwnProperty.call(result,key)))return result;
  }
  throw new Error('Workers AI returned an unsupported response.');
}
function schemaMatches(value,schema){
  if(!schema||typeof schema!=='object')return true;
  if(schema.enum&&!schema.enum.includes(value))return false;
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))return false;
    if(Array.isArray(schema.required)&&schema.required.some(key=>!Object.prototype.hasOwnProperty.call(value,key)))return false;
    for(const [key,child] of Object.entries(schema.properties||{}))if(Object.prototype.hasOwnProperty.call(value,key)&&!schemaMatches(value[key],child))return false;
    return true;
  }
  if(schema.type==='array'){
    if(!Array.isArray(value))return false;
    if(Number.isFinite(schema.minItems)&&value.length<schema.minItems)return false;
    if(Number.isFinite(schema.maxItems)&&value.length>schema.maxItems)return false;
    return !schema.items||value.every(item=>schemaMatches(item,schema.items));
  }
  if(schema.type==='string')return typeof value==='string';
  if(schema.type==='integer')return Number.isInteger(value)&&(!Number.isFinite(schema.minimum)||value>=schema.minimum)&&(!Number.isFinite(schema.maximum)||value<=schema.maximum);
  if(schema.type==='number')return typeof value==='number'&&Number.isFinite(value);
  if(schema.type==='boolean')return typeof value==='boolean';
  return true;
}
function nativeInput(input,schema){
  const next={...input};delete next.response_format;
  const contract=`Return one JSON object only, with no markdown or commentary. It must match this JSON Schema exactly: ${JSON.stringify(schema)}`;
  const messages=Array.isArray(input?.messages)?input.messages.map(message=>({...message})):[];
  const systemIndex=messages.findIndex(message=>message?.role==='system');
  if(systemIndex>=0)messages[systemIndex].content=`${messages[systemIndex].content||''}\n\n${contract}`;
  else messages.unshift({role:'system',content:contract});
  next.messages=messages;
  return next;
}
function structuredInput(input){
  return{
    messages:input?.messages,
    response_format:input?.response_format,
    max_tokens:input?.max_tokens||input?.max_completion_tokens||1200,
    temperature:input?.temperature
  };
}
function wrapAi(env){
  const real=env.AI;
  const primary=clean(env.EPA_MODEL||DEFAULT_EPA_MODEL,200)||DEFAULT_EPA_MODEL;
  const secondary=clean(env.EPA_FALLBACK_MODEL||DEFAULT_EPA_FALLBACK_MODEL,200)||DEFAULT_EPA_FALLBACK_MODEL;
  const structured=clean(env.EPA_STRUCTURED_FALLBACK_MODEL||DEFAULT_STRUCTURED_FALLBACK_MODEL,200)||DEFAULT_STRUCTURED_FALLBACK_MODEL;
  return{
    async run(model,input={}){
      if(model!==primary&&model!==secondary)return real.run(model,input);
      const schema=input?.response_format?.json_schema;
      if(!schema)return real.run(model,input);
      try{
        const result=await real.run(model,nativeInput(input,schema));
        const data=parseResult(result);
        if(!schemaMatches(data,schema))throw new Error('EPA AI returned JSON that did not match the required shape.');
        return{response:data};
      }catch(error){
        if(model!==secondary||structured===secondary)throw error;
        const result=await real.run(structured,structuredInput(input));
        const data=parseResult(result);
        if(!schemaMatches(data,schema))throw new Error('EPA structured fallback returned invalid JSON.');
        return{response:data};
      }
    }
  };
}
function wrappedEnv(env){const ai=wrapAi(env);return new Proxy(env,{get(target,prop){return prop==='AI'?ai:Reflect.get(target,prop)}})}

export default{
  async fetch(request,env,ctx){
    const response=await epaWorker.fetch(request,wrappedEnv(env),ctx);
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname.endsWith('/health')&&response.ok){
      try{
        const body=await response.json();
        return new Response(JSON.stringify({...body,epaEngineVersion:EPA_ENGINE_VERSION,epaStructuredFallbackModel:clean(env.EPA_STRUCTURED_FALLBACK_MODEL||DEFAULT_STRUCTURED_FALLBACK_MODEL,200)}),{status:response.status,headers:response.headers});
      }catch{}
    }
    return response;
  }
};
