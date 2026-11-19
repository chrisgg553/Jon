const status=document.querySelector("#status"),input=document.querySelector("#url"),iframe=document.querySelector("#view");
const loadScript=src=>new Promise((resolve,reject)=>{const x=document.createElement("script");x.src=src;x.onload=resolve;x.onerror=()=>reject(Error("Cannot load "+src));document.head.append(x)});
const isTikTok=value=>{try{const u=new URL(value);return u.protocol==="https:"&&["tiktok.com","www.tiktok.com","m.tiktok.com","vm.tiktok.com","vt.tiktok.com"].includes(u.hostname.toLowerCase())}catch{return false}};
let frame;
try {
 if(!("serviceWorker" in navigator))throw Error("Safari service workers are unavailable in this browser");
 const registration=await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});
 await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller) await new Promise((resolve,reject)=>{const tid=setTimeout(()=>reject(Error("Service worker did not start; reload Safari")),12000);navigator.serviceWorker.addEventListener("controllerchange",()=>{clearTimeout(tid);resolve()},{once:true})});
 const worker=navigator.serviceWorker.controller??registration.active;
 for (const path of ["/scram/scramjet.js","/controller/controller.api.js","/utils/scramjet-utils.js"])await loadScript(path);
 const {default:LibcurlClient}=await import("/libcurl/index.mjs");
 const transport=new LibcurlClient({wisp:(location.protocol==="https:"?"wss:":"ws:")+"//"+location.host+"/wisp/"});
 const controller=new window.$scramjetController.Controller({serviceworker:worker,transport,config:{scramjetPath:"/scram/scramjet.js",wasmPath:"/scram/scramjet.wasm",injectPath:"/controller/controller.inject.js"}});
 await controller.wait();
 class HistoryUrlCompat extends window.$scramjetUtils.ManagedPlugin {
   constructor(){super("history-url-compat",[])}
   install(activeFrame){
     super.install(activeFrame);
     this.tap(activeFrame.hooks.init.post,context=>{
       if(!context.isTopLevel)return;
       const win=context.window,history=win.history,client=context.client;
       for(const method of ["pushState","replaceState"]){
         const original=history[method];
         history[method]=function(data,unused,url){
           return original.call(this,data,unused,url??client.url.href);
         };
       }
     });
   }
 }
 frame=controller.createFrame(iframe,{plugins:[new HistoryUrlCompat(),new window.$scramjetUtils.HttpCachePlugin(),new window.$scramjetUtils.UrlWatcherPlugin(url=>{if(url?.startsWith("https://www.tiktok.com"))status.textContent="TikTok page: "+url.slice(0,85)})]});
 status.textContent="Proxy engine ready. TikTok may block its content.";
 setInterval(()=>navigator.serviceWorker.controller?.postMessage("keepalive"),15000);
}catch(err){status.textContent="Proxy startup failed: "+(err?.message||String(err));status.style.color="#ffd1b5";console.error(err)}
function go(){
 if(!frame){status.textContent="Proxy is not ready. Reload Safari or check the connection.";return}
 const link=input.value.trim();if(!isTikTok(link)){status.textContent="Only public HTTPS TikTok links are supported.";return}
 document.querySelector("#welcome").style.display="none";document.querySelector("#screen").style.display="block";status.textContent="Opening TikTok through Scramjet…";
 try{frame.go(link)}catch(e){status.textContent="Navigation failed: "+(e?.message||String(e))}
}
document.querySelector("#nav").addEventListener("submit",e=>{e.preventDefault();go()});
document.querySelector("#start").addEventListener("click",go);
