(()=>{'use strict';
const VERSION=1;
const clean=v=>{try{return typeof cleanText==='function'?cleanText(v):String(v??'').replace(/\s+/g,' ').trim()}catch{return String(v??'').replace(/\s+/g,' ').trim()}};
const uniq=items=>{const seen=new Set(),out=[];(items||[]).forEach(x=>{const s=clean(x),k=s.toLowerCase();if(s&&!seen.has(k)){seen.add(k);out.push(s)}});return out};
function sentence(text){const s=clean(text);if(!s)return'';return /[?.!]$/.test(s)?s:`${s}.`}
function taskPhrase(title){return clean(title).replace(/[?.!]+$/,'').replace(/^(work to|carry out|complete|perform|undertake)\s+/i,'').trim()||'this task'}
function profileId(value){
  const raw=clean(value?.id||value?.label||value).toLowerCase();
  if(['job-information','practical','hidden-work','knowledge','safety','resources','quality','programme','communication'].includes(raw))return raw;
  if(/communicat|witness/.test(raw))return'communication';
  if(/hidden/.test(raw))return'hidden-work';
  if(/safety/.test(raw))return'safety';
  if(/resource|tool/.test(raw))return'resources';
  if(/quality/.test(raw))return'quality';
  if(/programme|progress/.test(raw))return'programme';
  if(/job information|drawing|specification/.test(raw))return'job-information';
  if(/practical/.test(raw))return'practical';
  return'knowledge';
}
function derive(title,conditional='',profile='knowledge'){
  const t=taskPhrase(title),low=t.toLowerCase(),specific=sentence(conditional),p=profileId(profile);
  if(/regulation|standard|required standard|compliance/.test(low))return[
    'Which standard or regulation applies to the work you are carrying out?',
    'What requirement from it affects how this work must be completed?',
    'Show or describe where that requirement applies to the work in front of you.',
    'What could be wrong or non-compliant if that requirement was not followed?'
  ];
  if(p==='communication')return uniq([
    `What did you personally observe the apprentice doing during ${t}?`,
    `What did the apprentice communicate, coordinate or contribute during ${t}?`,
    specific?`From what you personally observed, ${specific.charAt(0).toLowerCase()+specific.slice(1)}`:'',
    `What result showed the apprentice handled ${t} appropriately?`
  ]);
  if(p==='job-information'||/drawing|specification|information|instruction/.test(low))return uniq([
    `Show the drawing, specification or job information you actually used for ${t}.`,
    specific,
    `Which dimensions or requirements were most important for ${t}?`,
    `How did that information change or confirm what you did?`
  ]);
  if(p==='safety')return uniq([
    `Show the main hazard and the controls you are using for ${t}.`,
    specific,
    `Why are those controls suitable for ${t}?`,
    'What would make you stop or change the work?'
  ]);
  if(p==='hidden-work')return uniq([
    `Show the ${t} clearly before it is covered or concealed.`,
    specific,
    `Show the position, fixing, bed, joint, spacing or continuity detail that matters for ${t}.`,
    'Show a wider view so the assessor can locate this detail in the work.'
  ]);
  if(p==='resources')return uniq([
    `Show the actual tools, materials or components you selected for ${t}.`,
    specific,
    `Why are they suitable for ${t}?`,
    'What did you check before using them?'
  ]);
  if(p==='quality')return uniq([
    `Show the check or measurement you are using for ${t}.`,
    specific,
    'What result, tolerance or requirement are you checking against?',
    'What would you correct if the result was outside the requirement?'
  ]);
  if(p==='programme')return uniq([
    `What time or sequence was planned for ${t}?`,
    specific,
    'What progress did you actually make against that plan?',
    'What changed, and who did you tell if the plan had to change?'
  ]);
  if(p==='practical')return uniq([
    `Show ${t} as you carry it out, not only the finished result.`,
    specific,
    `Show a measurement, check or quality decision that proves ${t} is being done correctly.`,
    `Explain anything important about ${t} that the camera cannot show directly.`
  ]);
  return uniq([
    specific,
    `Use the work you are doing to explain ${t} in your own words.`,
    `Give a real example from ${t} and explain what you did or would do.`,
    `What requirement, check or decision matters most for ${t}, and why?`
  ]);
}
function promptList(task,profile){
  const explicit=Array.isArray(task?.capturePrompts)?task.capturePrompts.map(clean).filter(Boolean):[];
  if(explicit.length)return explicit;
  return derive(clean(task?.title||task?.label),clean(task?.conditionalPrompt),profile||task?.evidenceProfile||'knowledge');
}
function applyPromptRowsToKsb(categories,patch){
  const p=patch&&typeof patch==='object'?patch:{};
  (Array.isArray(p.p)?p.p:[]).forEach(row=>{
    const task=categories?.[Number(row?.[0])]?.subcategories?.[Number(row?.[1])]?.tasks?.[Number(row?.[2])];
    const prompts=Array.isArray(row?.[3])?row[3].map(clean).filter(Boolean):[];
    if(task&&prompts.length)task.capturePrompts=prompts;
  });
  (Array.isArray(p.pc)?p.pc:[]).forEach(row=>{
    const sub=categories?.[Number(row?.[0])]?.subcategories?.[Number(row?.[1])];
    const title=clean(row?.[2]),prompts=Array.isArray(row?.[3])?row[3].map(clean).filter(Boolean):[];
    if(!sub||!title||!prompts.length)return;
    const task=(sub.tasks||[]).slice().reverse().find(item=>item?.naxosCustom&&clean(item.title)===title);
    if(task)task.capturePrompts=prompts;
  });
  return categories;
}
function applyPromptRowsToNvq(items,patch){
  const p=patch&&typeof patch==='object'?patch:{};
  (Array.isArray(p.p)?p.p:[]).forEach(row=>{
    const node=items?.[Number(row?.[0])]?.children?.[Number(row?.[1])]?.children?.[Number(row?.[2])];
    const prompts=Array.isArray(row?.[3])?row[3].map(clean).filter(Boolean):[];
    if(node&&prompts.length){node.requirementItems=prompts;node.requirements=prompts.join('\n')}
  });
  (Array.isArray(p.pc)?p.pc:[]).forEach(row=>{
    const sub=items?.[Number(row?.[0])]?.children?.[Number(row?.[1])],title=clean(row?.[2]),prompts=Array.isArray(row?.[3])?row[3].map(clean).filter(Boolean):[];
    if(!sub||!title||!prompts.length)return;
    const node=(sub.children||[]).slice().reverse().find(item=>item?.naxosCustom&&clean(item.label)===title);
    if(node){node.requirementItems=prompts;node.requirements=prompts.join('\n')}
  });
  return items;
}
try{
  if(typeof naxosTaskRequirements==='function'&&!naxosTaskRequirements.__eviaActivityPrompts){
    const wrapped=function(task,registry,profile){return promptList(task,profile)};
    wrapped.__eviaActivityPrompts=true;naxosTaskRequirements=wrapped;
  }
}catch{}
try{
  if(typeof applyNaxosKsbPatch==='function'&&!applyNaxosKsbPatch.__eviaActivityPrompts){
    const original=applyNaxosKsbPatch;
    const wrapped=function(categories,patch,facets){const result=original.apply(this,arguments);return applyPromptRowsToKsb(result,patch)};
    wrapped.__eviaActivityPrompts=true;applyNaxosKsbPatch=wrapped;
  }
}catch{}
try{
  if(typeof applyNaxosKsbCustomisations==='function'&&!applyNaxosKsbCustomisations.__eviaActivityPrompts){
    const original=applyNaxosKsbCustomisations;
    const wrapped=function(categories,customisations){const result=original.apply(this,arguments);const custom=customisations&&typeof customisations==='object'?customisations:{};
      Object.entries(custom.taskEdits||{}).forEach(([key,edit])=>{const [ci,si,ti]=String(key).split(':').map(Number),task=result?.[ci]?.subcategories?.[si]?.tasks?.[ti],prompts=Array.isArray(edit?.capturePrompts)?edit.capturePrompts.map(clean).filter(Boolean):[];if(task&&prompts.length)task.capturePrompts=prompts});
      (Array.isArray(custom.customTasks)?custom.customTasks:[]).forEach(item=>{const sub=result?.[Number(item?.categoryIndex)]?.subcategories?.[Number(item?.subcategoryIndex)],prompts=Array.isArray(item?.capturePrompts)?item.capturePrompts.map(clean).filter(Boolean):[];if(!sub||!prompts.length)return;const task=(sub.tasks||[]).slice().reverse().find(x=>x?.naxosCustom&&clean(x.title)===clean(item.title));if(task)task.capturePrompts=prompts});return result};
    wrapped.__eviaActivityPrompts=true;applyNaxosKsbCustomisations=wrapped;
  }
}catch{}
function reapplyNvqPromptPatch(pointer){
  const patch=pointer?.nvqPatchV2;if(!patch||(!Array.isArray(patch.p)&&!Array.isArray(patch.pc)))return;
  let items=[];try{items=JSON.parse(localStorage.getItem('eviaNaxosCourse')||'[]')}catch{}
  if(!Array.isArray(items)||!items.length)return;
  applyPromptRowsToNvq(items,patch);
  try{localStorage.setItem('eviaNaxosCourse',JSON.stringify(items))}catch{}
  try{courseItems=items}catch{}
}
try{
  if(typeof importNaxosNvqPack==='function'&&!importNaxosNvqPack.__eviaActivityPrompts){
    const original=importNaxosNvqPack;
    const wrapped=async function(pointer){const result=await original.apply(this,arguments);reapplyNvqPromptPatch(pointer);return result};
    wrapped.__eviaActivityPrompts=true;importNaxosNvqPack=wrapped;
  }
}catch{}
function inferProfileFromNode(node){
  const text=clean(`${node?.recommended?.label||''} ${node?.recommended?.methodLabel||''} ${node?.recommended?.details?.map?.(x=>`${x?.displayType||''} ${x?.label||''}`).join(' ')||''} ${node?.label||''}`).toLowerCase();
  if(/witness|communication/.test(text))return'communication';
  if(/safety/.test(text))return'safety';
  if(/photo|material|tool|resource/.test(text))return'resources';
  if(/video/.test(text))return'practical';
  if(/quality|check|tolerance/.test(text))return'quality';
  if(/programme|progress|schedule/.test(text))return'programme';
  return'knowledge';
}
const LEGACY_GENERIC=[
  /^select only the information sources genuinely used today\.?$/i,
  /^for each selected source:/i,
  /^do not include confidential project information/i,
  /^show the task itself, not just the finished result\.?$/i,
  /^show at least one measurement, check or quality decision where relevant\.?$/i,
  /^explain any criterion that cannot be seen directly\.?$/i,
  /^make the hidden detail clearly visible before it is covered\.?$/i,
  /^show position, fixing\/bed\/joint and any spacing or continuity requirement relevant to the task\.?$/i,
  /^include a wider view so the detail can be identified in the work\.?$/i,
  /^answer the whole prompt, not just a yes\/no response\.?$/i,
  /^use a real workplace example where possible\.?$/i,
  /^the same response may satisfy equivalent criteria in several active units\.?$/i,
  /^only claim ppe, rpe, lev, access or other controls/i,
  /^include changed conditions or reporting where the task requires it\.?$/i,
  /^name the actual resource or tool used\.?$/i,
  /^link suitability and checks to the specification or task requirement\.?$/i,
  /^show the check, not only the finished work\.?$/i,
  /^record the outcome and any correction made\.?$/i,
  /^give the estimated\/allocated time where the criterion requires it\.?$/i,
  /^state whether the task was completed within that time and explain any change\.?$/i,
  /^identify who was involved and why the communication was needed\.?$/i,
  /^explain the information\/advice given and the result\.?$/i,
  /^where a performance criterion requires real communication/i
];
function legacyGenericPrompt(value){const text=clean(value);return LEGACY_GENERIC.some(rule=>rule.test(text))}
function migrateExistingCourse(){
  let items=[];try{items=JSON.parse(localStorage.getItem('eviaNaxosCourse')||'[]')}catch{}
  if(!Array.isArray(items)||!items.length)return;
  let changed=false;
  const walk=nodes=>(Array.isArray(nodes)?nodes:[]).forEach(node=>{
    if(Array.isArray(node?.children)&&node.children.length){walk(node.children);return}
    if(!node||typeof node!=='object'||Number(node.activityPromptsVersion||0)>=VERSION)return;
    const existing=Array.isArray(node.requirementItems)?node.requirementItems.map(clean).filter(Boolean):[];
    if(!existing.some(legacyGenericPrompt))return;
    const specific=existing.find(item=>!legacyGenericPrompt(item))||'';
    const prompts=derive(clean(node.label),specific,inferProfileFromNode(node));
    if(prompts.length){node.requirementItems=prompts;node.requirements=prompts.join('\n');node.activityPromptsVersion=VERSION;changed=true}
  });
  walk(items);if(!changed)return;
  try{localStorage.setItem('eviaNaxosCourse',JSON.stringify(items))}catch{}
  try{courseItems=items}catch{}
}
setTimeout(migrateExistingCourse,0);
window.EviaNaxosActivityPrompts=Object.freeze({version:VERSION,derive,promptList,migrateExistingCourse,reapplyNvqPromptPatch});
})();