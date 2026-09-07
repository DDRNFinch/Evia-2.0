(()=>{
  'use strict';
  if(window.__eviaSwUpdateHardeningV1)return;
  window.__eviaSwUpdateHardeningV1=true;
  if(!('serviceWorker' in navigator))return;
  let checking=false;
  async function checkFresh(){
    if(checking)return;
    checking=true;
    try{
      const registration=await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});
      await registration.update();
    }catch{}
    finally{checking=false}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',checkFresh,{once:true});else checkFresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkFresh()});
  window.addEventListener('online',checkFresh);
})();