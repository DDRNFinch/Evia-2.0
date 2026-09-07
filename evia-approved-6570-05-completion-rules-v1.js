(()=>{'use strict';
const QUALIFICATION_ID='6570-05';
const DEFAULT_RULES=Object.freeze({
  '234.7.3':{type:'minimum-options',required:1,options:['234.7.3.a','234.7.3.b','234.7.3.c','234.7.3.d'],statement:'Complete at least 1 of the 4 listed structures.'},
  '238.7.2':{type:'minimum-options',required:3,options:['238.7.2.a','238.7.2.b','238.7.2.c','238.7.2.d'],statement:'Complete at least 3 of the 4 listed thin-joint masonry activities.'},
  '313.7.3':{type:'minimum-options',required:3,options:['313.7.3.a','313.7.3.b','313.7.3.c','313.7.3.d','313.7.3.e','313.7.3.f','313.7.3.g'],statement:'Complete at least 3 of the 7 listed architectural or decorative masonry features.'},
  '690.7.3':{type:'minimum-options',required:3,options:['690.7.3.a','690.7.3.b','690.7.3.c','690.7.3.d','690.7.3.e','690.7.3.f'],statement:'Complete at least 3 of the 6 listed repair and maintenance activities.'},
  '701.7.3':{type:'minimum-options',required:4,options:['701.7.3.a','701.7.3.b','701.7.3.c','701.7.3.d','701.7.3.e','701.7.3.f','701.7.3.g'],statement:'Complete at least 4 of the 7 listed setting-out lines.'},
  '828.7.3':{type:'required-tasks-plus-minimum-options',required:2,options:['828.7.3.a','828.7.3.b','828.7.3.c','828.7.3.d','828.7.3.e'],requiredTaskLabels:['Install fire barriers or fire breaks','Install a masonry support system'],excludeRequiredTaskPathsFromOptions:true,statement:'Complete fire barriers/breaks and support angles, plus at least 2 of the 5 listed specialist masonry support elements.'},
  '837.7.2':{type:'minimum-options',required:2,options:['837.7.2.a','837.7.2.b','837.7.2.c','837.7.2.d'],statement:'Complete at least 2 of the 4 listed drainage types.'}
});

const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const copy=value=>JSON.parse(JSON.stringify(value));

function qualificationId(){
  try{return clean(activeCourseMeta?.qualificationId||activeCourseMeta?.qualification?.id||inferredCourseMeta?.()?.qualificationId||inferredCourseMeta?.()?.qualification?.id)}catch{return''}
}
function applies(){return qualificationId()===QUALIFICATION_ID}
function rules(){
  if(!applies())return{};
  try{
    const supplied=activeCourseMeta?.completionRules;
    if(supplied&&typeof supplied==='object'&&Object.keys(supplied).length)return supplied;
  }catch{}
  return DEFAULT_RULES;
}
function leaves(){try{return typeof courseLeaves==='function'?courseLeaves():[]}catch{return[]}}
function key(path){try{return evidencePathKey(path)}catch{return JSON.stringify(path||[])}}
function completed(path){try{return completedEvidencePaths.has(key(path))}catch{return false}}
function uniquePaths(paths){
  const out=[],seen=new Set();
  (paths||[]).forEach(path=>{if(!Array.isArray(path)||!path.length)return;const k=key(path);if(seen.has(k))return;seen.add(k);out.push(path)});
  return out;
}
function atomicPaths(target){
  const wanted=clean(target);
  return uniquePaths(leaves().filter(leaf=>Array.isArray(leaf?.node?.atomicTargets)&&leaf.node.atomicTargets.some(id=>clean(id)===wanted)).map(leaf=>leaf.path));
}
function taskPaths(label){
  const wanted=clean(label).toLowerCase();
  return uniquePaths(leaves().filter(leaf=>clean(leaf?.node?.label).toLowerCase()===wanted).map(leaf=>leaf.path));
}
function requiredTaskState(rule){
  const labels=Array.isArray(rule?.requiredTaskLabels)?rule.requiredTaskLabels:[];
  const rows=labels.map(label=>{const paths=taskPaths(label);return{label,paths,complete:paths.some(completed)}});
  return{rows,completed:rows.filter(row=>row.complete).length,total:rows.length,all:rows.every(row=>row.complete)};
}
function ruleProgress(id,base){
  const rule=rules()[id];if(!rule)return null;
  const required=Math.max(1,Number(rule.required)||1);
  const requiredTasks=requiredTaskState(rule);
  const excluded=new Set();
  if(rule.excludeRequiredTaskPathsFromOptions)requiredTasks.rows.flatMap(row=>row.paths).forEach(path=>excluded.add(key(path)));
  const optionRows=(Array.isArray(rule.options)?rule.options:[]).map(target=>{
    const paths=atomicPaths(target),eligible=paths.filter(path=>!excluded.has(key(path)));
    return{target,paths,eligible,complete:eligible.some(completed)};
  });
  const optionCompleted=optionRows.filter(row=>row.complete).length;
  const optionCredit=Math.min(required,optionCompleted);
  const compulsoryCredit=requiredTasks.completed;
  const total=required+(requiredTasks.total||0);
  const done=optionCredit+compulsoryCredit;
  const prerequisitesMet=requiredTasks.total?requiredTasks.all:true;
  const complete=prerequisitesMet&&optionCompleted>=required;
  const fraction=total?Math.min(1,done/total):0;
  const paths=uniquePaths([...(base?.paths||[]),...optionRows.flatMap(row=>row.paths),...requiredTasks.rows.flatMap(row=>row.paths)]);
  return{completed:done,total,fraction,percent:fraction*100,complete,paths,rule,optionCompleted,optionRequired:required,optionTotal:optionRows.length,requiredTasksCompleted:requiredTasks.completed,requiredTasksTotal:requiredTasks.total};
}
function collectAcTargets(node,out=new Set()){
  if(!node||typeof node!=='object')return out;
  const children=Array.isArray(node.children)?node.children.filter(Boolean):[];
  if(children.length)children.forEach(child=>collectAcTargets(child,out));
  else (Array.isArray(node.acTargets)?node.acTargets:[]).forEach(id=>{const value=clean(id);if(value)out.add(value)});
  return out;
}
function ruleStatusText(progress){
  if(progress.complete)return'Requirement met ✓';
  if(progress.requiredTasksTotal)return`${progress.requiredTasksCompleted} of ${progress.requiredTasksTotal} compulsory parts complete · ${Math.min(progress.optionCompleted,progress.optionRequired)} of ${progress.optionRequired} additional options complete.`;
  return`${Math.min(progress.optionCompleted,progress.optionRequired)} of ${progress.optionRequired} required options complete.`;
}

try{
  if(typeof buildNvqCourseMeta==='function'&&!buildNvqCourseMeta.__evia657005Rules){
    const original=buildNvqCourseMeta;
    const wrapped=function(pack){const meta=original.apply(this,arguments);const id=clean(pack?.qualification?.id||pack?.qualificationId);if(id===QUALIFICATION_ID)meta.completionRules=copy(pack?.completionRules&&typeof pack.completionRules==='object'?pack.completionRules:DEFAULT_RULES);return meta};
    wrapped.__evia657005Rules=true;buildNvqCourseMeta=wrapped;
  }
}catch{}

try{
  if(typeof targetProgress==='function'&&!targetProgress.__evia657005Rules){
    const original=targetProgress;
    const wrapped=function(id){const base=original.apply(this,arguments);if(!applies())return base;return ruleProgress(clean(id),base)||base};
    wrapped.__evia657005Rules=true;targetProgress=wrapped;
  }
}catch{}

try{
  if(typeof pillCompletion==='function'&&!pillCompletion.__evia657005Rules){
    const original=pillCompletion;
    const wrapped=function(node,prefix){
      if(!applies())return original.apply(this,arguments);
      const ids=[...collectAcTargets(node)];if(!ids.length)return original.apply(this,arguments);
      const progress=ids.map(id=>targetProgress(id)),completedCount=progress.filter(item=>item.complete).length;
      return{completed:completedCount,total:ids.length,complete:progress.every(item=>item.complete)};
    };
    wrapped.__evia657005Rules=true;pillCompletion=wrapped;
  }
}catch{}

try{
  if(typeof completedCourseProgress==='function'&&!completedCourseProgress.__evia657005Rules){
    const original=completedCourseProgress;
    const wrapped=function(){
      if(!applies())return original.apply(this,arguments);
      let meta={};try{meta=inferredCourseMeta()}catch{}
      const criteria=Array.isArray(meta?.criteria)?meta.criteria:[];if(!criteria.length)return original.apply(this,arguments);
      const rows=criteria.map(item=>targetProgress(clean(item?.id))).filter(Boolean),completedCount=rows.filter(item=>item.complete).length;
      const fraction=rows.length?rows.reduce((sum,item)=>sum+(Number(item.fraction)||0),0)/rows.length:0;
      return{completed:completedCount,total:rows.length,percent:fraction*100};
    };
    wrapped.__evia657005Rules=true;completedCourseProgress=wrapped;
  }
}catch{}

try{
  if(typeof renderTargetDetail==='function'&&!renderTargetDetail.__evia657005Rules){
    const original=renderTargetDetail;
    const wrapped=function(id){
      const result=original.apply(this,arguments);if(!applies())return result;
      const rule=rules()[clean(id)];if(!rule)return result;
      const progress=targetProgress(clean(id)),host=typeof archDetailContent!=='undefined'?archDetailContent:document.getElementById('archDetailContent');if(!host)return result;
      const card=document.createElement('div');card.className='detail-card evia-completion-rule-card';card.dataset.completionRule=clean(id);
      const title=document.createElement('strong');title.textContent='Completion requirement';
      const statement=document.createElement('p');statement.textContent=clean(rule.statement);
      const status=document.createElement('p');status.className='detail-muted';status.textContent=ruleStatusText(progress);
      card.append(title,statement,status);
      if(host.firstElementChild)host.firstElementChild.insertAdjacentElement('afterend',card);else host.prepend(card);
      if(progress.complete)host.querySelectorAll('.mapping-button:not(.completed)').forEach(button=>{button.classList.add('evia-rule-not-required');const text=button.querySelector('.mapping-status');if(text)text.textContent='Not required — criterion complete'});
      return result;
    };
    wrapped.__evia657005Rules=true;renderTargetDetail=wrapped;
  }
}catch{}

globalThis.Evia657005CompletionRules=Object.freeze({version:1,qualificationId:QUALIFICATION_ID,defaultRules:DEFAULT_RULES,getRule:id=>rules()[clean(id)]||null,getProgress:id=>{try{return targetProgress(clean(id))}catch{return null}}});
})();