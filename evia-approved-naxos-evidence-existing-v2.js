(()=>{'use strict';
const NAXOS_BASE='https://ddrnfinch.github.io/Naxos-Mapping_Engine/';
function clean(v){try{return typeof cleanText==='function'?cleanText(v):String(v??'').trim()}catch{return String(v??'').trim()}}
function normalLabel(v){return clean(v).toLowerCase().replace(/\s+/g,' ').trim()}
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch{return v}}

/* Keep older Naxos NVQ QR payloads readable while the exact evidence contract is adopted. */
try{
  if(typeof parseNaxosPackPointer==='function'){
    const original=parseNaxosPackPointer;
    parseNaxosPackPointer=function(raw){
      const current=original.apply(this,arguments);if(current)return current;
      try{
        const parsed=JSON.parse(raw);if(!parsed||typeof parsed!=='object'||parsed.type!=='evia-mapping-pack-url'||!clean(parsed.packUrl))return null;
        const courseType=clean(parsed.courseType||'nvq').toLowerCase();if(!['ksb','nvq'].includes(courseType))return null;
        return{...parsed,courseType};
      }catch{return null}
    };
  }
}catch{}

function quantity(text,kind){
  const value=clean(text).toLowerCase();
  const range=value.match(/(\d+)\s*(?:-|–|—|to)\s*(\d+)/i);if(range)return{min:Math.max(1,Number(range[1])||1),max:Math.max(1,Number(range[2])||1)};
  const upto=value.match(/up\s+to\s+(\d+)/i);if(upto)return{min:1,max:Math.max(1,Number(upto[1])||1)};
  const direct=value.match(/\b(\d+)\b/);if(direct){const n=Math.max(1,Number(direct[1])||1);return{min:n,max:n}}
  return kind==='photo'?{min:1,max:1}:{min:1,max:1};
}
function legacyKind(value){
  const raw=normalLabel(value);
  if(/^video\b/.test(raw))return'video';
  if(/^photos?\b/.test(raw)||raw==='camera')return'photo';
  if(/^audio\b/.test(raw)||/^voice\b/.test(raw)||/^reflection\b/.test(raw))return'audio';
  if(/^written\b/.test(raw)||/^text\b/.test(raw))return'text';
  if(/^document\b/.test(raw))return'document';
  if(/^witness\b/.test(raw))return'witness';
  if(/^assessor observation\b/.test(raw)||/^observation\b/.test(raw))return'observation';
  return'';
}
function legacyPlan(option){
  const details=Array.isArray(option?.details)?option.details:[];
  const plan=[];
  for(const detail of details){
    const kind=legacyKind(detail?.rawType||detail?.type||detail?.displayType);
    if(!kind)continue;
    const q=quantity(`${detail?.label||''} ${detail?.instruction||''}`,kind);
    if(kind==='photo'&&(q.max>1||q.min!==q.max)){plan.push({type:'photo-range',min:q.min,max:q.max,label:clean(detail?.label)||'Photos',instruction:clean(detail?.instruction)});continue}
    for(let i=1;i<=q.max;i++)plan.push({type:kind,label:clean(detail?.label)||kind,instruction:clean(detail?.instruction),itemIndex:i,itemTotal:q.max});
  }
  if(plan.length)return plan;
  const kind=legacyKind(option?.label);if(!kind)return[];
  const q=quantity(`${option?.label||''} ${details.map(d=>d?.instruction||'').join(' ')}`,kind);
  if(kind==='photo'&&(q.max>1||q.min!==q.max))return[{type:'photo-range',min:q.min,max:q.max,label:clean(option?.label)||'Photos'}];
  return Array.from({length:q.max},(_,i)=>({type:kind,label:clean(option?.label)||kind,itemIndex:i+1,itemTotal:q.max}));
}

/* Last-resort compatibility for locally stored pre-contract options. New Naxos data always carries capturePlan. */
try{
  if(typeof buildCapturePlan==='function'){
    const original=buildCapturePlan;
    buildCapturePlan=function(option){
      if(Array.isArray(option?.capturePlan)&&option.capturePlan.length)return original.apply(this,arguments);
      const exact=legacyPlan(option);if(exact.length)return exact;
      return original.apply(this,arguments);
    };
  }
}catch{}

function addPlan(map,label,plan){
  const key=normalLabel(label);if(!key||!Array.isArray(plan)||!plan.length)return;
  const serial=JSON.stringify(plan),existing=map.get(key);
  if(!existing)map.set(key,{serial,plan:clone(plan)});else if(existing.serial!==serial)map.set(key,{serial:'',plan:null});
}
function walk(nodes,fn){
  (Array.isArray(nodes)?nodes:[]).forEach(node=>{if(Array.isArray(node?.children)&&node.children.length)walk(node.children,fn);else if(node&&typeof node==='object')fn(node)});
}
async function migrateExistingCourse(){
  let items=[];try{items=JSON.parse(localStorage.getItem('eviaNaxosCourse')||'[]')}catch{}
  if(!Array.isArray(items)||!items.length||typeof fetchNaxosJson!=='function')return;
  try{
    const rules=await fetchNaxosJson(`${NAXOS_BASE}evidence-rules.json`);const profiles=rules?.profiles||{};const map=new Map();
    Object.values(profiles).forEach(profile=>{
      try{const rec=typeof naxosPreferredOption==='function'?naxosPreferredOption(profile):null;if(rec)addPlan(map,rec.label,rec.capturePlan)}catch{}
      try{const alt=typeof naxosAlternativeOption==='function'?naxosAlternativeOption(profile):null;if(alt)addPlan(map,alt.label,alt.capturePlan)}catch{}
    });
    let changed=false;
    walk(items,node=>{
      for(const key of ['recommended','alternative']){
        const option=node[key];if(!option||Array.isArray(option.capturePlan)&&option.capturePlan.length)continue;
        const match=map.get(normalLabel(option.label));
        if(match?.plan){option.capturePlan=clone(match.plan);changed=true;continue}
        const fallback=legacyPlan(option);if(fallback.length){option.capturePlan=fallback;changed=true}
      }
    });
    if(!changed)return;
    try{localStorage.setItem('eviaNaxosCourse',JSON.stringify(items))}catch{}
    try{courseItems=items}catch{}
  }catch(error){console.warn('Evia could not migrate the existing Naxos evidence plan',error)}
}
setTimeout(migrateExistingCourse,0);
window.EviaNaxosEvidenceExistingMigration={version:2};
})();
