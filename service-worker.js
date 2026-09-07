importScripts('./evia-runtime-manifest.js');

const C='evia-pwa-v91';
const UPDATE_UI_MARKER='evia-update-ui-ready-v1';
const RELEASE_VERSION='1.2';
const RELEASE_MARKER_URL=new URL('./__evia-visible-release-version__',self.registration.scope).href;
const LEGACY_INTERNAL_RELOAD_MARKER_URL=new URL('./__evia-internal-reload__',self.registration.scope).href;
const OPTIONAL_OFFLINE_MARKER_URL=new URL('./__evia-optional-offline-v5__',self.registration.scope).href;
const RUNTIME_SCRIPTS=Array.isArray(globalThis.EVIA_RUNTIME_SCRIPTS)?[...globalThis.EVIA_RUNTIME_SCRIPTS]:[];
if(!RUNTIME_SCRIPTS.length)throw new Error('Evia runtime manifest is unavailable.');

const F=[
  './manifest.webmanifest?v=50',
  './evia-release.json',
  './evia-runtime-manifest.js',
  ...RUNTIME_SCRIPTS,
  './nisia-sync.js?v=4',
  './icons/evia-180.png?v=50',
  './icons/evia-192.png?v=50',
  './icons/evia-512.png?v=50'
];
const QR_CACHE='evia-feature-lib-v1';
const QUESTION_CACHE='evia-question-bank-v1';
const QR_LIBRARY_URL='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
const PDF_LIBRARY_URL='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const NAXOS_CACHE='evia-naxos-offline-v3';
const NAXOS_BASE='https://ddrnfinch.github.io/Naxos-Mapping_Engine/';
const NAXOS_SEEDS=[
  'course-catalog.json','ksb-manifest.json','manifest-6570-04.json','manifest.json','evidence-rules.json','evidence-capture-contract-v2.json','assessment-plans.json'
].map(path=>new URL(path,NAXOS_BASE).href);
let optionalOfflineCacheStarted=false;

function navigationResponse(text,source){
  const headers=new Headers(source.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.delete('content-length');
  headers.delete('content-encoding');
  headers.set('cache-control','no-store');
  return new Response(text,{status:source.status,statusText:source.statusText,headers});
}

async function fetchFreshLocal(path){
  const url=new URL(path,self.registration.scope).href;
  const response=await fetch(new Request(url,{cache:'reload'}));
  if(!response.ok)throw new Error(`Could not cache Evia file: ${path}`);
  return response;
}

async function cacheCoreFresh(cache){
  await Promise.allSettled(F.map(async path=>{
    const response=await fetchFreshLocal(path);
    await cache.put(new URL(path,self.registration.scope).href,response.clone());
  }));
}

function collectNaxosJsonReferences(value,baseUrl,out=new Set()){
  if(typeof value==='string'){
    const text=value.trim();
    if(!/\.json(?:[?#].*)?$/i.test(text))return out;
    try{const url=new URL(text,baseUrl),naxos=new URL(NAXOS_BASE);if(url.origin===naxos.origin&&url.pathname.startsWith(naxos.pathname))out.add(url.href)}catch{}
    return out;
  }
  if(Array.isArray(value)){value.forEach(item=>collectNaxosJsonReferences(item,baseUrl,out));return out}
  if(value&&typeof value==='object')Object.values(value).forEach(item=>collectNaxosJsonReferences(item,baseUrl,out));
  return out;
}

async function cacheNaxosCourseGraph(){
  const cache=await caches.open(NAXOS_CACHE),queue=[...NAXOS_SEEDS],seen=new Set();
  while(queue.length){
    const href=queue.shift();if(seen.has(href))continue;seen.add(href);
    const response=await fetch(href,{cache:'reload'});if(!response.ok)throw new Error(`Could not cache Naxos course data: ${href}`);
    await cache.put(href,response.clone());let data=null;try{data=await response.json()}catch{}
    if(data)for(const next of collectNaxosJsonReferences(data,href))if(!seen.has(next))queue.push(next);
  }
}

async function cacheFeatureLibrary(url,label){
  const response=await fetch(url,{mode:'cors',cache:'reload'});if(!response.ok)throw new Error(`Could not cache the offline ${label}.`);
  const cache=await caches.open(QR_CACHE);await cache.put(url,response);
}
async function cacheQrLibrary(){return cacheFeatureLibrary(QR_LIBRARY_URL,'QR library')}
async function cachePdfLibrary(){return cacheFeatureLibrary(PDF_LIBRARY_URL,'PDF library')}

async function cacheOptionalOfflineAssets(){
  const marker=await caches.open(UPDATE_UI_MARKER);
  if(await marker.match(OPTIONAL_OFFLINE_MARKER_URL))return;
  const results=await Promise.allSettled([cacheQrLibrary(),cachePdfLibrary()]);
  if(results.every(result=>result.status==='fulfilled')){
    await marker.put(OPTIONAL_OFFLINE_MARKER_URL,new Response('1',{headers:{'content-type':'text/plain'}}));
  }
}

function startOptionalOfflineCache(event){
  if(optionalOfflineCacheStarted)return;
  optionalOfflineCacheStarted=true;
  event.waitUntil(cacheOptionalOfflineAssets());
}

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const marker=await caches.open(UPDATE_UI_MARKER);
    const installedRelease=await marker.match(RELEASE_MARKER_URL);
    const installedVersion=installedRelease?await installedRelease.text():'';
    const cache=await caches.open(C);
    await cacheCoreFresh(cache);
    const index=await fetch(new URL('./index.html',self.registration.scope).href,{cache:'no-store'});
    if(!index.ok)throw new Error('Could not cache Evia.');
    const prepared=navigationResponse(await index.text(),index);
    await cache.put(new URL('./index.html',self.registration.scope).href,prepared.clone());
    await cache.put(new URL('./',self.registration.scope).href,prepared.clone());
    if(!installedVersion)await self.skipWaiting();
  })());
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==C&&key!==QR_CACHE&&key!==QUESTION_CACHE&&key!==NAXOS_CACHE&&key!==UPDATE_UI_MARKER).map(key=>caches.delete(key)));
    const marker=await caches.open(UPDATE_UI_MARKER);
    await marker.delete(LEGACY_INTERNAL_RELOAD_MARKER_URL);
    await marker.put(RELEASE_MARKER_URL,new Response(RELEASE_VERSION,{headers:{'content-type':'text/plain'}}));
    await self.clients.claim();
  })());
});

self.addEventListener('message',e=>{if(e.data?.type==='EVIA_INSTALL_UPDATE')e.waitUntil(self.skipWaiting())});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  startOptionalOfflineCache(e);
  const requestUrl=new URL(e.request.url);
  const isInstallMetadata=requestUrl.origin===self.location.origin&&(
    requestUrl.pathname.endsWith('/manifest.webmanifest')||
    requestUrl.pathname.endsWith('/icons/evia-180.png')||
    requestUrl.pathname.endsWith('/icons/evia-192.png')||
    requestUrl.pathname.endsWith('/icons/evia-512.png')
  );
  if(isInstallMetadata){
    e.respondWith((async()=>{
      try{
        const response=await fetch(e.request,{cache:'no-store'});
        if(response&&response.ok){const cache=await caches.open(C);await cache.put(e.request,response.clone())}
        return response;
      }catch{
        return (await caches.match(e.request,{ignoreSearch:true}))||Response.error();
      }
    })());
    return;
  }
  if(e.request.mode==='navigate'){
    e.respondWith((async()=>{
      try{
        const network=await fetch(e.request,{cache:'no-store'});
        const prepared=navigationResponse(await network.text(),network);
        const cache=await caches.open(C);
        await cache.put(new URL('./index.html',self.registration.scope).href,prepared.clone());
        await cache.put(new URL('./',self.registration.scope).href,prepared.clone());
        return prepared;
      }catch{
        return (await caches.match(new URL('./index.html',self.registration.scope).href))||(await caches.match(new URL('./',self.registration.scope).href));
      }
    })());
    return;
  }
  e.respondWith((async()=>{
    const cached=await caches.match(e.request);if(cached)return cached;
    const response=await fetch(e.request);
    if(new URL(e.request.url).origin===self.location.origin&&response&&response.ok){const cache=await caches.open(C);await cache.put(e.request,response.clone())}
    return response;
  })());
});