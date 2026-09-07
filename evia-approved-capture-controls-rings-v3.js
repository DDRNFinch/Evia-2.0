(()=>{'use strict';
const STYLE_ID='eviaCaptureControlsRingsV3Styles';
const SVG_NS='http://www.w3.org/2000/svg';
const YELLOW='#f5c400';
const AVATAR_YELLOW='#e6bd2f';
const RING_RADIUS=43;
const RING_CIRCUMFERENCE=2*Math.PI*RING_RADIUS;
let bypassNative=false;
let audioStartedAt=0;
let audioTimerId=0;

function root(){try{return typeof screen!=='undefined'&&screen?.classList?screen:document.getElementById('screen')}catch{return document.getElementById('screen')}}
function liveRecorder(){try{return typeof recorder!=='undefined'&&recorder&&recorder.state==='recording'}catch{return false}}
function formatTime(ms){const total=Math.max(0,Math.floor(Number(ms||0)/1000)),m=Math.floor(total/60),s=total%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}

function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
    .evia-body{border-color:${AVATAR_YELLOW}!important;filter:drop-shadow(0 0 .038em rgba(230,189,47,.38)) drop-shadow(0 0 .105em rgba(230,189,47,.18)) drop-shadow(0 0 .22em rgba(230,189,47,.08))!important}
    .eye{border-color:${AVATAR_YELLOW}!important}
    .evia-float::before{background:radial-gradient(circle at center,rgba(230,189,47,.16),rgba(230,189,47,.055) 46%,rgba(230,189,47,0) 76%)!important}
    .bottom-arches{height:78px!important;align-items:end!important;padding:0 5px 3px!important;overflow:visible!important}
    .bottom-arches .status-arch{position:relative!important;width:min(100%,68px)!important;height:76px!important;padding:0!important;overflow:visible!important;display:block!important;background:transparent!important;border:0!important;box-shadow:none!important}
    .bottom-arches .status-arch .arch-progress-svg{position:absolute!important;left:50%!important;top:0!important;width:60px!important;height:60px!important;transform:translateX(-50%)!important;overflow:visible!important;z-index:1!important}
    .bottom-arches .status-arch-value{position:absolute!important;left:50%!important;top:30px!important;transform:translate(-50%,-50%)!important;width:54px!important;font-size:13px!important;line-height:1!important;font-weight:700!important;text-align:center!important;z-index:4!important}
    .bottom-arches .status-arch-label{position:absolute!important;left:50%!important;top:62px!important;bottom:auto!important;transform:translateX(-50%)!important;font-size:9.5px!important;line-height:1!important;font-weight:700!important;white-space:nowrap!important;text-align:center!important;z-index:4!important}
    .bottom-arches .evia-circle-track-v3,.bottom-arches .evia-circle-fill-v3{fill:none;vector-effect:non-scaling-stroke;stroke-width:4}
    .bottom-arches .evia-circle-track-v3{stroke:rgba(245,196,0,.19)}
    .bottom-arches .evia-circle-fill-v3{stroke:${YELLOW};stroke-linecap:butt;stroke-dasharray:0 ${RING_CIRCUMFERENCE};stroke-dashoffset:0;transform:rotate(-90deg);transform-origin:50px 50px;transition:stroke-dasharray 900ms cubic-bezier(.22,1,.36,1)}
    .bottom-arches .evia-circle-marker-v2,.bottom-arches .evia-ring-dot-orbit,.bottom-arches .evia-ring-marker-group{display:none!important}
    #evidenceTop #recordToggle.evia-guided-record-toggle-hidden,#evidenceTop #audioToggle.evia-guided-record-toggle-hidden{display:inline-flex!important}
    #evidenceTop #recordToggle.evia-witness-start-hidden{display:inline-flex!important}
    #evidenceTop .evia-guided-next,#evidenceTop .evia-witness-actions{display:none!important}
    #evidenceTop .audio-panel{position:relative}
    #evidenceTop .evia-audio-recording-timer{min-height:24px;margin:0 0 12px;font-size:20px;line-height:1;font-weight:600;color:rgba(45,45,45,.72);font-variant-numeric:tabular-nums;opacity:.55}
    #evidenceTop .evia-audio-recording-timer.is-recording{opacity:1;color:${YELLOW}}
    @media(max-width:380px){
      .bottom-arches{height:74px!important}
      .bottom-arches .status-arch{width:min(100%,64px)!important;height:72px!important}
      .bottom-arches .status-arch .arch-progress-svg{width:56px!important;height:56px!important}
      .bottom-arches .status-arch-value{top:28px!important}
      .bottom-arches .status-arch-label{top:58px!important;font-size:9px!important}
    }
  `;document.head.appendChild(style)
}

function ringValue(button){const n=Number(button?.style?.getPropertyValue('--arch-progress'));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0}
function displayedRingValue(button){const text=String(button?.querySelector('.status-arch-value')?.textContent||'').trim(),match=text.match(/^(-?\d+(?:\.\d+)?)%$/);if(match){const n=Number(match[1]);if(Number.isFinite(n))return Math.max(0,Math.min(100,Math.round(n)))}return Math.round(ringValue(button))}
function ensureCircle(button){
  const svg=button?.querySelector('.arch-progress-svg');if(!svg)return null;
  if(!svg.dataset.eviaCircleV3){
    svg.dataset.eviaCircleV3='1';svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.innerHTML='';
    const track=document.createElementNS(SVG_NS,'circle');track.setAttribute('class','evia-circle-track-v3');track.setAttribute('cx','50');track.setAttribute('cy','50');track.setAttribute('r',String(RING_RADIUS));
    const fill=document.createElementNS(SVG_NS,'circle');fill.setAttribute('class','evia-circle-fill-v3');fill.setAttribute('cx','50');fill.setAttribute('cy','50');fill.setAttribute('r',String(RING_RADIUS));
    svg.append(track,fill)
  }
  svg.querySelectorAll('.evia-circle-marker-v2,.evia-ring-marker-group').forEach(node=>node.remove());
  return svg
}
function syncCircle(button){
  const svg=ensureCircle(button);if(!svg)return;
  const p=displayedRingValue(button),fill=svg.querySelector('.evia-circle-fill-v3'),dash=RING_CIRCUMFERENCE*(p/100),gap=RING_CIRCUMFERENCE-dash;
  if(fill){fill.style.strokeDasharray=`${dash} ${gap}`;fill.style.strokeDashoffset='0';fill.style.opacity=button.classList.contains('progress-ready')&&p>0?'1':'0'}
}
function installCircles(){
  document.querySelectorAll('.bottom-arches .status-arch').forEach(button=>{
    syncCircle(button);
    if(button.dataset.eviaCircleV3Observer)return;
    button.dataset.eviaCircleV3Observer='1';
    new MutationObserver(()=>syncCircle(button)).observe(button,{attributes:true,attributeFilter:['style','class']});
    const value=button.querySelector('.status-arch-value');if(value)new MutationObserver(()=>syncCircle(button)).observe(value,{childList:true,characterData:true,subtree:true})
  })
}

function newestGuidedProxy(){const list=[...document.querySelectorAll('#evidenceTop .evia-guided-next')].filter(x=>x.isConnected);return list[list.length-1]||null}
function witnessProxy(){return document.querySelector('#evidenceTop .evia-witness-actions .capture-button')}
function cleanGuidedProxies(){const list=[...document.querySelectorAll('#evidenceTop .evia-guided-next')].filter(x=>x.isConnected);list.slice(0,-1).forEach(x=>x.remove())}
function activeWitness(){return !!root()?.classList.contains('evia-witness-video-active')}

function ensureAudioTimer(){
  const panel=document.querySelector('#evidenceTop .audio-panel'),toggle=document.getElementById('audioToggle');if(!panel||!toggle)return null;
  let timer=panel.querySelector('.evia-audio-recording-timer');
  if(!timer){timer=document.createElement('div');timer.className='evia-audio-recording-timer';timer.textContent='00:00';panel.insertBefore(timer,toggle)}
  return timer
}
function stopAudioTimer(){if(audioTimerId){clearInterval(audioTimerId);audioTimerId=0}audioStartedAt=0;document.querySelector('#evidenceTop .evia-audio-recording-timer')?.classList.remove('is-recording')}
function startAudioTimer(){
  const timer=ensureAudioTimer();if(!timer)return;
  if(audioTimerId)clearInterval(audioTimerId);audioStartedAt=Date.now();timer.textContent='00:00';timer.classList.add('is-recording');
  audioTimerId=setInterval(()=>{const current=ensureAudioTimer();if(!current){stopAudioTimer();return}if(!liveRecorder()){if(audioStartedAt)current.textContent=formatTime(Date.now()-audioStartedAt);stopAudioTimer();return}current.textContent=formatTime(Date.now()-audioStartedAt)},250)
}
function syncRecordingControl(){
  cleanGuidedProxies();const live=liveRecorder();
  if(activeWitness()){const toggle=document.getElementById('recordToggle'),proxy=witnessProxy();if(toggle&&live&&proxy)toggle.textContent=proxy.textContent;return}
  const video=document.getElementById('recordToggle'),audio=document.getElementById('audioToggle'),toggle=video||audio,proxy=newestGuidedProxy();
  if(toggle&&live&&proxy)toggle.textContent=proxy.textContent;if(audio)ensureAudioTimer()
}
function handleToggleCapture(event){
  const toggle=event.target?.closest?.('#recordToggle,#audioToggle');if(!toggle||!document.getElementById('evidenceTop')?.contains(toggle)||bypassNative)return;
  const isAudio=toggle.id==='audioToggle';
  if(!liveRecorder()){setTimeout(()=>{if(isAudio&&liveRecorder())startAudioTimer();syncRecordingControl()},60);return}
  const proxy=activeWitness()?witnessProxy():newestGuidedProxy();if(!proxy)return;
  event.preventDefault();event.stopImmediatePropagation();const finish=/^finish\b/i.test(String(proxy.textContent||'').trim());
  if(!activeWitness()&&finish)bypassNative=true;try{proxy.click()}finally{if(!activeWitness()&&finish)bypassNative=false}
  if(isAudio&&finish)setTimeout(stopAudioTimer,0);requestAnimationFrame(syncRecordingControl);setTimeout(syncRecordingControl,40)
}
function sync(){installCircles();syncRecordingControl();if(document.getElementById('audioToggle'))ensureAudioTimer();else stopAudioTimer()}
function boot(){injectStyles();sync();document.addEventListener('click',handleToggleCapture,true);const host=document.getElementById('screen')||document.body;new MutationObserver(()=>requestAnimationFrame(sync)).observe(host,{childList:true,subtree:true});window.addEventListener('resize',()=>requestAnimationFrame(sync));window.EviaCaptureControlsRingsV3=Object.freeze({version:3,sync})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();