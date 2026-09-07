(() => {
  'use strict';

  const VERSION = '1.0';
  const YELLOW = '#f2c94c';
  const OVERLAY_ID = 'eviaDeveloperOverlay';
  let taps = 0;
  let lastTap = 0;
  let unlocked = false;
  let lastReport = null;

  const esc = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const readJson = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; } };
  const ownedKeys = (storage) => {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      const lower = String(key || '').toLowerCase();
      if (lower.startsWith('evia') || lower.startsWith('nisia-evia')) keys.push(key);
    }
    return keys;
  };

  function styles() {
    if (document.getElementById('eviaDeveloperStyles')) return;
    const style = document.createElement('style');
    style.id = 'eviaDeveloperStyles';
    style.textContent = `
      .evia-stable-version{user-select:none;-webkit-user-select:none}
      .evia-dev{position:fixed;inset:0;z-index:10070;background:rgba(255,255,255,.99);display:none;overflow:auto;padding:calc(max(16px,env(safe-area-inset-top)) + 8px) 18px calc(max(24px,env(safe-area-inset-bottom)) + 20px)}.evia-dev.open{display:block}.evia-dev-shell{width:min(100%,500px);margin:0 auto}.evia-dev-head{display:flex;align-items:center;gap:11px;margin-bottom:16px}.evia-dev-back{width:42px;height:42px;border:1.5px solid rgba(242,201,76,.48);border-radius:50%;background:#fff;display:grid;place-items:center;flex:0 0 42px}.evia-dev-title{font-size:22px;font-weight:800;color:#303030}.evia-dev-sub{font-size:11px;color:#737373;margin-top:2px}.evia-dev-card{border:1.5px solid rgba(242,201,76,.30);border-radius:22px;background:linear-gradient(180deg,#fff,#fffdf7);padding:15px;margin-bottom:10px;box-shadow:0 7px 19px rgba(0,0,0,.035)}.evia-dev-card>strong{font-size:14px;color:#333}.evia-dev-note{margin-top:5px;font-size:10.5px;line-height:1.45;color:#6b6b6b}.evia-dev-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.evia-dev-stat{border:1px solid rgba(45,45,45,.07);border-radius:14px;background:#fff;padding:9px;text-align:center;min-width:0}.evia-dev-stat strong{display:block;font-size:14px;color:#383838;overflow-wrap:anywhere}.evia-dev-stat span{display:block;margin-top:3px;font-size:9px;color:#777}.evia-dev-checks{display:grid;gap:6px;margin-top:10px}.evia-dev-check{display:flex;justify-content:space-between;gap:10px;padding:8px 9px;border-radius:12px;background:#fff;border:1px solid rgba(45,45,45,.06);font-size:10.5px;color:#555}.evia-dev-check b{font-size:9px}.evia-dev-check.ok b{color:#227447}.evia-dev-check.warn b{color:#8a6a08}.evia-dev-check.problem b{color:#a53535}.evia-dev-actions{display:grid;gap:8px;margin-top:10px}.evia-dev-btn{width:100%;min-height:46px;border:1.5px solid rgba(242,201,76,.42);border-radius:999px;background:rgba(242,201,76,.10);color:#4a4430;font:inherit;font-size:12px;font-weight:800;padding:8px 16px}.evia-dev-btn.secondary{background:#fff;border-color:rgba(45,45,45,.13);color:#555}.evia-dev-btn.danger{background:#fff5f5;border-color:rgba(183,50,50,.30);color:#9b2d2d}.evia-dev-btn:disabled{opacity:.45}.evia-dev-status{min-height:18px;margin-top:8px;font-size:10px;color:#666;text-align:center}.evia-dev-confirm{position:fixed;inset:0;z-index:10090;background:rgba(20,20,20,.42);display:grid;place-items:center;padding:20px}.evia-dev-confirm-card{width:min(100%,390px);border-radius:24px;background:#fff;padding:19px;box-shadow:0 20px 60px rgba(0,0,0,.18)}.evia-dev-confirm-card strong{font-size:18px;color:#2f2f2f}.evia-dev-confirm-card p{margin-top:8px;font-size:12px;line-height:1.5;color:#666}.evia-dev-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}.evia-dev-confirm-actions button{min-height:46px;border-radius:999px;font:inherit;font-size:12px;font-weight:800}.evia-dev-cancel{border:1px solid #ddd;background:#fff;color:#555}.evia-dev-reset{border:0;background:#a93636;color:#fff}`;
    document.head.appendChild(style);
  }

  function ensureUi() {
    styles();
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;
    overlay = document.createElement('section');
    overlay.id = OVERLAY_ID;
    overlay.className = 'evia-dev';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML = `<div class="evia-dev-shell"><div class="evia-dev-head"><button class="evia-dev-back" data-dev="close" type="button" aria-label="Back"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${YELLOW}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 6-6 6 6 6"/></svg></button><div><div class="evia-dev-title">Developer Mode</div><div class="evia-dev-sub">Diagnostics and maintenance for this Evia installation</div></div></div><div id="eviaDeveloperContent"></div><div class="evia-dev-status" id="eviaDeveloperStatus"></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', onAction);
    return overlay;
  }

  const setStatus = (text) => { const node = document.getElementById('eviaDeveloperStatus'); if (node) node.textContent = text || ''; };

  function portfolioSummary() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) return resolve({ ok:false, count:0, ids:[] });
      const request = indexedDB.open('EviaPortfolio', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('evidence')) db.createObjectStore('evidence', { keyPath:'id' });
      };
      request.onerror = () => resolve({ ok:false, count:0, ids:[] });
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction('evidence','readonly');
          const store = tx.objectStore('evidence');
          const count = store.count();
          const keys = store.getAllKeys();
          tx.oncomplete = () => { db.close(); resolve({ ok:true, count:Number(count.result || 0), ids:(keys.result || []).map(String) }); };
          tx.onerror = () => { db.close(); resolve({ ok:false, count:0, ids:[] }); };
        } catch { db.close(); resolve({ ok:false, count:0, ids:[] }); }
      };
    });
  }

  async function collect() {
    const portfolio = await portfolioSummary();
    let storageOk = false;
    try { localStorage.setItem('eviaDeveloperStorageCheck','1'); storageOk = localStorage.getItem('eviaDeveloperStorageCheck') === '1'; localStorage.removeItem('eviaDeveloperStorageCheck'); } catch {}
    let persisted = null;
    try { if (navigator.storage?.persisted) persisted = await navigator.storage.persisted(); } catch {}
    let workerOk = false, workerState = 'unavailable';
    try { const reg = await navigator.serviceWorker?.getRegistration?.(); const worker = reg?.active || reg?.waiting || reg?.installing; workerOk = Boolean(worker); workerState = worker?.state || 'unavailable'; } catch {}
    const course = readJson('eviaNaxosCourse', null);
    const courseTitle = String(localStorage.getItem('eviaNaxosCourseTitle') || '').trim();
    let courseAreas = 0;
    try { if (typeof courseLeaves === 'function') courseAreas = Number(courseLeaves()?.length || 0); } catch {}
    const completed = readJson('eviaCompletedEvidencePathsV1', []);
    const learning = readJson('eviaLearningEntries', []);
    const targets = readJson('eviaMilosTargetsV1', []);
    const attendance = readJson('eviaAttendanceDataV1', {});
    let nisia = { connected:false, serverOk:false, assignmentPresent:false, queuedEvidence:0, trackedEvidence:0, lastSync:'', recoveryAvailable:false };
    try { if (window.__eviaNisiaDeveloper?.status) nisia = { ...nisia, ...(await window.__eviaNisiaDeveloper.status()) }; } catch {}
    let appCache = '';
    try { appCache = (await caches.keys()).find((key) => /^evia-pwa-v/i.test(key)) || ''; } catch {}
    return {
      generatedAt:new Date().toISOString(),
      app:{ version:VERSION, cache:appCache || 'unknown', serviceWorker:workerState, online:navigator.onLine },
      health:{ localStorage:storageOk, indexedDb:portfolio.ok, persistentStorage:persisted, serviceWorker:workerOk },
      data:{ localKeys:ownedKeys(localStorage).length, courseLoaded:Array.isArray(course) && course.length>0, courseTitle, courseAreas, courseHash:String(localStorage.getItem('eviaNisiaCourseHashV1') || '').slice(0,16), evidence:portfolio.count, completedAreas:Array.isArray(completed)?completed.length:0, learningEntries:Array.isArray(learning)?learning.length:0, targets:Array.isArray(targets)?targets.length:0, attendanceStored:Boolean(attendance && Object.keys(attendance).length) },
      nisia:{ connected:Boolean(nisia.connected), serverOk:Boolean(nisia.serverOk), assignmentPresent:Boolean(nisia.assignmentPresent), queuedEvidence:Number(nisia.queuedEvidence || 0), trackedEvidence:Number(nisia.trackedEvidence || 0), lastSync:String(nisia.lastSync || ''), recoveryAvailable:Boolean(nisia.recoveryAvailable) }
    };
  }

  function check(label, state, detail='') {
    const kind = state === true ? 'ok' : state === false ? 'problem' : 'warn';
    return `<div class="evia-dev-check ${kind}"><span>${esc(label)}${detail?` · ${esc(detail)}`:''}</span><b>${state===true?'OK':state===false?'PROBLEM':'CHECK'}</b></div>`;
  }

  async function render() {
    const root = document.getElementById('eviaDeveloperContent');
    if (!root) return;
    root.innerHTML = '<section class="evia-dev-card"><strong>Checking this Evia…</strong><p class="evia-dev-note">Reading local data, evidence storage, app files and Nisia status.</p></section>';
    const r = await collect(); lastReport = r;
    const nisiaState = r.nisia.connected ? (r.nisia.serverOk || !navigator.onLine ? true : null) : true;
    root.innerHTML = `
      <section class="evia-dev-card"><strong>Evia health check</strong><div class="evia-dev-checks">${check('Local storage',r.health.localStorage)}${check('Evidence database',r.health.indexedDb)}${check('Persistent storage',r.health.persistentStorage===true?true:null,r.health.persistentStorage===true?'granted':'not confirmed')}${check('Service worker / app files',r.health.serviceWorker)}${check('Nisia connection',nisiaState,r.nisia.connected?(r.nisia.serverOk?'connected':'session present'):'not connected')}</div></section>
      <section class="evia-dev-card"><strong>Data summary</strong><div class="evia-dev-grid"><div class="evia-dev-stat"><strong>${r.data.evidence}</strong><span>Evidence items</span></div><div class="evia-dev-stat"><strong>${r.data.completedAreas}${r.data.courseAreas?` / ${r.data.courseAreas}`:''}</strong><span>Completed areas</span></div><div class="evia-dev-stat"><strong>${r.data.learningEntries}</strong><span>Learning entries</span></div><div class="evia-dev-stat"><strong>${r.data.targets}</strong><span>Targets</span></div><div class="evia-dev-stat"><strong>${r.data.courseLoaded?'Loaded':'None'}</strong><span>Course</span></div><div class="evia-dev-stat"><strong>${r.data.localKeys}</strong><span>Evia local records</span></div></div>${r.data.courseTitle?`<p class="evia-dev-note">Course: ${esc(r.data.courseTitle)}</p>`:''}</section>
      <section class="evia-dev-card"><strong>Nisia</strong><div class="evia-dev-grid"><div class="evia-dev-stat"><strong>${r.nisia.connected?'Connected':'Not connected'}</strong><span>Connection</span></div><div class="evia-dev-stat"><strong>${r.nisia.queuedEvidence}</strong><span>Waiting to sync</span></div><div class="evia-dev-stat"><strong>${r.nisia.recoveryAvailable?'Available':'Unavailable'}</strong><span>Recovery</span></div><div class="evia-dev-stat"><strong>${r.nisia.lastSync?new Date(r.nisia.lastSync).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'}</strong><span>Last sync</span></div></div><div class="evia-dev-actions"><button class="evia-dev-btn" data-dev="force-sync" type="button" ${r.nisia.connected?'':'disabled'}>Force sync with Nisia</button><button class="evia-dev-btn secondary" data-dev="reset-nisia" type="button" ${r.nisia.connected?'':'disabled'}>Reset Nisia connection</button></div></section>
      <section class="evia-dev-card"><strong>App information</strong><div class="evia-dev-grid"><div class="evia-dev-stat"><strong>v${esc(r.app.version)}</strong><span>Evia version</span></div><div class="evia-dev-stat"><strong>${esc(r.app.cache)}</strong><span>App cache</span></div><div class="evia-dev-stat"><strong>${esc(r.app.serviceWorker)}</strong><span>Service worker</span></div><div class="evia-dev-stat"><strong>${r.app.online?'Online':'Offline'}</strong><span>Network</span></div></div>${r.data.courseHash?`<p class="evia-dev-note">Course pack hash: ${esc(r.data.courseHash)}</p>`:''}<div class="evia-dev-actions"><button class="evia-dev-btn secondary" data-dev="refresh-files" type="button">Check update / refresh app files</button><button class="evia-dev-btn secondary" data-dev="copy" type="button">Copy diagnostics</button></div></section>
      <section class="evia-dev-card"><strong>Reset this Evia</strong><p class="evia-dev-note">Completely clears learner data from this Evia installation and disconnects Nisia. The Nisia provider/server record is not deleted.</p><div class="evia-dev-actions"><button class="evia-dev-btn danger" data-dev="reset-all" type="button">Reset all data</button></div></section>`;
  }

  function open() { unlocked = true; const overlay = ensureUi(); overlay.classList.add('open'); overlay.setAttribute('aria-hidden','false'); overlay.scrollTop=0; setStatus(''); render().catch((error)=>setStatus(error?.message || 'Diagnostics could not load.')); }
  function close() { const overlay=document.getElementById(OVERLAY_ID); overlay?.classList.remove('open'); overlay?.setAttribute('aria-hidden','true'); setStatus(''); }

  async function clearPortfolio() {
    if (!('indexedDB' in window)) return;
    await new Promise((resolve) => {
      const request = indexedDB.open('EviaPortfolio',1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('evidence'))db.createObjectStore('evidence',{keyPath:'id'});};
      request.onerror=()=>resolve();
      request.onsuccess=()=>{const db=request.result;try{const tx=db.transaction('evidence','readwrite');tx.objectStore('evidence').clear();tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();resolve();};}catch{db.close();resolve();}};
    });
    try { indexedDB.deleteDatabase('EviaPortfolio'); } catch {}
  }

  async function resetAll() {
    try { await window.__eviaNisiaDeveloper?.resetConnection?.(); } catch {}
    await clearPortfolio();
    try { ownedKeys(localStorage).forEach((key)=>localStorage.removeItem(key)); } catch {}
    try { ownedKeys(sessionStorage).forEach((key)=>sessionStorage.removeItem(key)); } catch {}
    const url=new URL(location.href);url.search='';url.hash='';location.replace(url.href);
  }

  function confirmReset() {
    if (document.getElementById('eviaDeveloperResetConfirm')) return;
    const overlay=document.createElement('div');overlay.id='eviaDeveloperResetConfirm';overlay.className='evia-dev-confirm';overlay.innerHTML='<div class="evia-dev-confirm-card"><strong>Reset all Evia data?</strong><p>This removes the learner profile, course, evidence and media, Learning/OTJ, attendance, progress, targets, EPA data, support settings and Nisia connection from this Evia installation.</p><p>Nisia\'s provider/server record is not deleted.</p><div class="evia-dev-confirm-actions"><button class="evia-dev-cancel" data-reset="cancel" type="button">Cancel</button><button class="evia-dev-reset" data-reset="confirm" type="button">Reset all data</button></div></div>';document.body.appendChild(overlay);
    overlay.addEventListener('click',async(event)=>{if(event.target===overlay||event.target.closest('[data-reset="cancel"]'))return overlay.remove();const button=event.target.closest('[data-reset="confirm"]');if(!button)return;button.disabled=true;button.textContent='Resetting…';await resetAll();});
  }

  async function onAction(event) {
    const button=event.target.closest('[data-dev]');if(!button)return;const action=button.dataset.dev;
    try {
      if(action==='close') return close();
      if(action==='reset-all') return confirmReset();
      if(action==='force-sync'){button.disabled=true;setStatus('Syncing with Nisia…');const result=await window.__eviaNisiaDeveloper?.forceSync?.();setStatus(`${Number(result?.synced||0)} evidence update${Number(result?.synced||0)===1?'':'s'} synced.`);button.disabled=false;return render();}
      if(action==='reset-nisia'){button.disabled=true;setStatus('Resetting Nisia connection…');await window.__eviaNisiaDeveloper?.resetConnection?.();setStatus('Nisia connection reset. Learner data remains on Evia.');button.disabled=false;return render();}
      if(action==='copy'){const report=lastReport||await collect();await navigator.clipboard.writeText(JSON.stringify(report,null,2));setStatus('Diagnostics copied without learner name or evidence content.');return;}
      if(action==='refresh-files'){button.disabled=true;setStatus('Refreshing Evia app files…');try{const keys=await caches.keys();await Promise.all(keys.filter((key)=>/^evia-pwa-v/i.test(key)).map((key)=>caches.delete(key)));}catch{}const reg=await navigator.serviceWorker?.getRegistration?.();await reg?.update?.();if(reg?.waiting)reg.waiting.postMessage({type:'EVIA_INSTALL_UPDATE'});setStatus('App files refreshed. Reloading…');setTimeout(()=>location.reload(),500);}
    } catch(error){console.error('Evia Developer Mode action failed',error);button.disabled=false;setStatus(error?.message||'That developer action could not complete.');}
  }

  function versionTap(event) {
    if(!event.target?.closest?.('.evia-stable-version'))return;
    if(unlocked){event.preventDefault();return open();}
    const now=Date.now();if(now-lastTap>1800)taps=0;lastTap=now;taps+=1;
    if(taps>=10){taps=0;event.preventDefault();open();}
  }

  function boot(){styles();document.addEventListener('click',versionTap,true);window.__eviaDeveloperModeV1=true;}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();