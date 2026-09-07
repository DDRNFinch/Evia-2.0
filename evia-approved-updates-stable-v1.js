(()=>{'use strict';
const CURRENT_VERSION='1.2';
const RELEASE_URL='./evia-release.json';
const PENDING_RELEASE_KEY='eviaPendingReleaseV1';
const YELLOW='#f5c400';
let registration=null;
let waitingWorker=null;
let releaseInfo={version:CURRENT_VERSION,title:`Evia v${CURRENT_VERSION}`,whatsNew:[]};
try{const cached=JSON.parse(localStorage.getItem(PENDING_RELEASE_KEY)||'null');if(cached&&typeof cached==='object')releaseInfo=cached}catch{}
let installing=false;
let reloading=false;

function injectStyles(){
  if(document.getElementById('eviaStableUpdateStyles'))return;
  const style=document.createElement('style');
  style.id='eviaStableUpdateStyles';
  style.textContent=`
    .evia-update-pill{position:absolute;left:50%;top:calc(50% - clamp(112px,29vw,137px));transform:translateX(-50%);min-height:34px;padding:0 14px;border:1.5px solid rgba(245,196,0,.5);border-radius:999px;background:rgba(250,249,242,.98);box-shadow:0 7px 18px rgba(0,0,0,.06);color:#665500;font-size:11px;font-weight:800;display:none;align-items:center;justify-content:center;gap:7px;z-index:38;cursor:pointer}
    .screen.evia-update-ready:not(.active) .evia-update-pill{display:flex}.evia-update-dot{width:7px;height:7px;border-radius:50%;background:${YELLOW};box-shadow:0 0 0 4px rgba(245,196,0,.13)}
    .screen.evia-update-ready .evia-body{animation:eviaUpdateHeartbeat 1.35s ease-in-out infinite!important;transform-origin:center}
    @keyframes eviaUpdateHeartbeat{0%,100%{transform:scale(1)}12%{transform:scale(1.055)}24%{transform:scale(1)}36%{transform:scale(1.035)}48%,100%{transform:scale(1)}}
    .evia-update-overlay{position:fixed;inset:0;z-index:12050;background:rgba(255,255,255,.97);display:none;overflow:auto;padding:calc(max(18px,env(safe-area-inset-top)) + 8px) 18px calc(max(22px,env(safe-area-inset-bottom)) + 18px)}.evia-update-overlay.open{display:block}
    .evia-update-shell{width:min(100%,480px);margin:0 auto}.evia-update-head{display:flex;align-items:center;gap:12px;margin-bottom:18px}.evia-update-mark{width:54px;height:54px;border:2px solid ${YELLOW};border-radius:50%;display:grid;place-items:center;color:${YELLOW};font-size:13px;font-weight:900;flex:0 0 54px;box-shadow:0 0 15px rgba(245,196,0,.11)}
    .evia-update-head strong{display:block;font-size:22px;color:#333}.evia-update-head span{display:block;margin-top:3px;font-size:11px;color:#666}.evia-update-card{border:1.5px solid rgba(245,196,0,.25);border-radius:24px;background:linear-gradient(180deg,#fff,rgba(250,249,242,.94));padding:17px;margin-bottom:11px;box-shadow:0 8px 22px rgba(0,0,0,.035)}.evia-update-card>strong{font-size:15px;color:#333}.evia-update-card p{margin-top:7px;font-size:11.5px;line-height:1.5;color:#626262}
    .evia-update-list{display:flex;flex-direction:column;gap:9px;margin-top:11px}.evia-update-item{display:flex;gap:9px;align-items:flex-start;font-size:11.5px;line-height:1.45;color:#555}.evia-update-item i{width:7px;height:7px;border-radius:50%;background:${YELLOW};margin-top:5px;flex:0 0 7px}
    .evia-update-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.evia-update-actions button{min-height:48px;border-radius:999px;font-size:13px;font-weight:800;cursor:pointer}.evia-update-later{border:1.5px solid rgba(45,45,45,.15);background:#fff;color:#555}.evia-update-install{border:1.5px solid rgba(245,196,0,.55);background:rgba(245,196,0,.13);color:#514500}.evia-update-install:disabled{opacity:.5;cursor:default}
  `;
  document.head.appendChild(style);
}
function ensureUi(){
  injectStyles();
  document.getElementById('eviaReleaseVersion')?.remove();
  const screen=document.getElementById('screen')||document.body;
  if(!document.getElementById('eviaUpdatePill')){const pill=document.createElement('button');pill.id='eviaUpdatePill';pill.className='evia-update-pill';pill.type='button';pill.innerHTML='<span class="evia-update-dot" aria-hidden="true"></span><span>Update ready</span>';pill.addEventListener('click',openUpdate);screen.appendChild(pill)}
  if(!document.getElementById('eviaUpdateOverlay')){const overlay=document.createElement('section');overlay.id='eviaUpdateOverlay';overlay.className='evia-update-overlay';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<div class="evia-update-shell" id="eviaUpdateShell"></div>';document.body.appendChild(overlay);overlay.addEventListener('click',event=>{const action=event.target.closest('[data-update-action]')?.dataset.updateAction;if(action==='later')closeUpdate();if(action==='install')installUpdate()})}
}
async function fetchRelease(){
  try{const response=await fetch(`${RELEASE_URL}?t=${Date.now()}`,{cache:'no-store'});if(response.ok){const data=await response.json();if(data&&typeof data==='object'){releaseInfo=data;try{localStorage.setItem(PENDING_RELEASE_KEY,JSON.stringify(data))}catch{}}}}catch{}
  return releaseInfo;
}
function setReady(worker){if(!worker)return;waitingWorker=worker;document.getElementById('screen')?.classList.add('evia-update-ready');fetchRelease()}
function clearReady(){waitingWorker=null;document.getElementById('screen')?.classList.remove('evia-update-ready')}
function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function renderUpdate(info){
  const shell=document.getElementById('eviaUpdateShell');if(!shell)return;const version=String(info?.version||'new');const title=String(info?.title||`Evia v${version}`);const notes=Array.isArray(info?.whatsNew)?info.whatsNew:[];const details=String(info?.details||'This update is ready to install. Your learner data stays on this device.');
  shell.innerHTML=`<div class="evia-update-head"><div class="evia-update-mark">v${escapeHtml(version)}</div><div><strong>${escapeHtml(title)}</strong><span>Currently installed: v${CURRENT_VERSION}</span></div></div><section class="evia-update-card"><strong>What's new</strong>${notes.length?`<div class="evia-update-list">${notes.map(note=>`<div class="evia-update-item"><i></i><span>${escapeHtml(note)}</span></div>`).join('')}</div>`:'<p>Release details are ready with this update.</p>'}</section><section class="evia-update-card"><strong>Install update</strong><p>${escapeHtml(details)}</p><p>Installing restarts Evia. It does not erase your course, evidence, Learning Hours, targets, profile or settings.</p></section><div class="evia-update-actions"><button class="evia-update-later" type="button" data-update-action="later">Later</button><button class="evia-update-install" id="eviaInstallUpdate" type="button" data-update-action="install">Install now</button></div>`;
}
async function openUpdate(){ensureUi();renderUpdate(await fetchRelease());const overlay=document.getElementById('eviaUpdateOverlay');overlay?.classList.add('open');overlay?.setAttribute('aria-hidden','false')}
function closeUpdate(){const overlay=document.getElementById('eviaUpdateOverlay');overlay?.classList.remove('open');overlay?.setAttribute('aria-hidden','true')}
function installUpdate(){if(!waitingWorker||installing)return;installing=true;const button=document.getElementById('eviaInstallUpdate');if(button){button.disabled=true;button.textContent='Installing…'}try{waitingWorker.postMessage({type:'EVIA_INSTALL_UPDATE'})}catch{installing=false;if(button){button.disabled=false;button.textContent='Install now'}}}
function watchRegistration(reg){
  registration=reg;if(reg.waiting)setReady(reg.waiting);
  reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state!=='installed'||!navigator.serviceWorker.controller)return;setTimeout(()=>{if(reg.waiting===worker)setReady(worker)},180)})});
}
async function checkForUpdate(){if(!registration)return;try{await registration.update();if(registration.waiting)setReady(registration.waiting)}catch{}}
async function start(){
  ensureUi();if(!('serviceWorker'in navigator))return;
  try{const existing=await navigator.serviceWorker.getRegistration('./');const reg=existing||await navigator.serviceWorker.register('./service-worker.js');watchRegistration(reg);await checkForUpdate()}catch{}
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;if(installing){try{localStorage.removeItem(PENDING_RELEASE_KEY)}catch{}clearReady()}window.location.reload()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate()});window.addEventListener('online',checkForUpdate);setInterval(checkForUpdate,30*60*1000);
}
window.eviaVersion=CURRENT_VERSION;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();