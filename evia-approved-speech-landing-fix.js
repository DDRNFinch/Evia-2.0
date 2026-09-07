(()=>{'use strict';
const STYLE_ID='eviaSpeechLandingFixStyles';
const MOVING='evia-speech-travelling';
const PRESSING='evia-speech-press-fade';
let fallbackTimer=null;
let pressTimer=null;

function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .evia-speech.${PRESSING}{opacity:0!important;transition:opacity 170ms ease!important}
    .evia-speech.${MOVING}{opacity:0!important;transition:opacity 180ms ease!important}
  `;
  document.head.appendChild(style);
}

function start(){
  injectStyles();
  const screen=document.getElementById('screen');
  const stage=document.querySelector('.evia-stage');
  const speech=document.querySelector('.evia-speech');
  if(!screen||!stage||!speech)return;

  let wasActive=screen.classList.contains('active');

  function finishLanding(){
    if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=null}
    speech.classList.remove(MOVING,PRESSING);
  }

  function holdSpeechUntilLanding(){
    if(fallbackTimer)clearTimeout(fallbackTimer);
    speech.classList.add(MOVING);
    speech.classList.remove(PRESSING);
    fallbackTimer=setTimeout(finishLanding,1240);
  }

  function beginPressFade(){
    const stateAtPress=screen.classList.contains('active');
    speech.classList.add(PRESSING);
    if(pressTimer)clearTimeout(pressTimer);
    pressTimer=setTimeout(()=>{
      if(screen.classList.contains('active')===stateAtPress&&!speech.classList.contains(MOVING))speech.classList.remove(PRESSING);
    },520);
  }

  stage.addEventListener('pointerdown',beginPressFade,true);
  stage.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' ')beginPressFade();
  },true);

  stage.addEventListener('transitionend',event=>{
    if(event.target!==stage||event.propertyName!=='top'||!speech.classList.contains(MOVING))return;
    setTimeout(finishLanding,24);
  });

  const observer=new MutationObserver(()=>{
    const isActive=screen.classList.contains('active');
    if(isActive===wasActive)return;
    wasActive=isActive;
    holdSpeechUntilLanding();
  });
  observer.observe(screen,{attributes:true,attributeFilter:['class']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
