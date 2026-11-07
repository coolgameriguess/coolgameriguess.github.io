
window.__gdScramjetOff=/[?&]noscramjet(=|&|$)/.test(location.search);
window.__gdProxyFallbackBases=["/gdfb1","/gdfb2","/gdfb3"];
window.__gdProxyBases=(function(){var d=["/gdw1/?url=","/gdw2/?url=","/gdw3/?url=","/gdw4/?url="].concat(window.__gdProxyFallbackBases);try{var q=new URLSearchParams(location.search).get("proxy");if(q){try{localStorage.setItem("gdProxyBase",q);}catch(e){}return[q];}var s=localStorage.getItem("gdProxyBase");if(s)return[s].concat(d.filter(function(x){return x!==s;}));}catch(e){}return d;})();
window.__gdProxyBase=window.__gdProxyBases[0];
window.__gdProxyPass=["googletagmanager","cloudflareinsights","jsdelivr","gstatic","googleapis","corsfix","corsproxy","allorigins","workers.dev"];
window.__gdProxyTarget=function(u){var k="/__proxy?url=";if(typeof u!=="string")return null;for(var b=0;b<window.__gdProxyBases.length;b++)if(u.indexOf(window.__gdProxyBases[b])===0)return null;var i=u.indexOf(k);if(i>=0){if(i>0){try{var o=new URL(u.slice(0,i)).origin;if(o!==location.origin&&o!==new URL(document.baseURI).origin)return null;}catch(e){return null;}}var s=u.slice(i+k.length);try{return decodeURIComponent(s);}catch(e){return s;}}if(/^https?:\/\//i.test(u)){try{var w=new URL(u);if(w.origin===location.origin)return null;for(var p=0;p<window.__gdProxyPass.length;p++)if(w.hostname.indexOf(window.__gdProxyPass[p])>=0)return null;return u;}catch(e){return null;}}return null;};
window.__gdProxyBuild=function(base,target){if(base.indexOf("corsfix")>=0)return base+target;return base+encodeURIComponent(target);};
(function(){
var nativeFetch=window.fetch.bind(window);
var workerCooldowns={};
function retryable(st){return st===400||st===401||st===403||st===429||st===503;}
function secret(init){try{var b=init&&init.body;if(!b)return false;var t=typeof b==="string"?b:new TextDecoder().decode(b);return /(^|&)(gjp2?|password)=/.test(t);}catch(e){return false;}}
function fallbackWorker(base){return window.__gdProxyFallbackBases.some(function(worker){return base.indexOf(worker.split("/?")[0])===0;});}
function coolDown(base){var until=Date.now()+300000;workerCooldowns[base]=until;try{localStorage.setItem("gdProxyCooldown:"+base,String(until));}catch(e){}}
function skipped(base,target){if(!fallbackWorker(base))return false;if(target.toLowerCase().indexOf("gjaccount")>=0)return true;var until=workerCooldowns[base]||0;try{until=Math.max(until,Number(localStorage.getItem("gdProxyCooldown:"+base))||0);}catch(e){}if(until<=Date.now()){delete workerCooldowns[base];return false;}workerCooldowns[base]=until;return true;}
function nextProxy(target,idx){for(var i=idx+1;i<window.__gdProxyBases.length;i++)if(!skipped(window.__gdProxyBases[i],target))return i;return -1;}
function cloudflareHtml(res){var type=(res.headers.get("content-type")||"").toLowerCase();if(type.indexOf("html")<0)return Promise.resolve(false);if((res.headers.get("server")||"").toLowerCase().indexOf("cloudflare")>=0||res.headers.get("cf-ray"))return Promise.resolve(true);return res.clone().text().then(function(body){return /cloudflare|cf-error|error\s*1027/i.test(body);});}
function attempt(input,init,target,idx){
if(idx<0){return nativeFetch(input,init).then(function(res){if(retryable(res.status)){var first=nextProxy(target,-1);return first<0?res:attempt(input,init,target,first);}return res;},function(){var first=nextProxy(target,-1);if(first<0)throw new TypeError("no eligible proxy available");return attempt(input,init,target,first);});}
if(idx>=0&&secret(init)&&window.__gdProxyBases[idx].indexOf("ale7208.workers.dev")<0)return Promise.reject(new TypeError("login data is only sent through the allowed proxy"));
var base=window.__gdProxyBases[idx];
if(skipped(base,target)){var next=nextProxy(target,idx);return next<0?Promise.reject(new TypeError("no eligible proxy available")):attempt(input,init,target,next);}
var url=window.__gdProxyBuild(base,target);
var out=(typeof input==="string")?url:((typeof Request!=="undefined")?new Request(url,input):url);
function advance(res){var next=nextProxy(target,idx);return next<0?res:attempt(input,init,target,next);}
return nativeFetch(out,init).then(function(res){
if(fallbackWorker(base)&&(res.status===429||res.status===1027)){coolDown(base);return advance(res);}
if(fallbackWorker(base))return cloudflareHtml(res).then(function(isCloudflare){if(isCloudflare){coolDown(base);return advance(res);}if(retryable(res.status))return advance(res);window.__gdProxyBase=base;return res;});
if(retryable(res.status))return advance(res);
window.__gdProxyBase=base;return res;
},function(err){var next=nextProxy(target,idx);if(next>=0)return attempt(input,init,target,next);throw err;});
}
window.fetch=function(input,init){var u=(typeof input==="string")?input:(input&&input.url);var target=window.__gdProxyTarget(u);if(target===null)return nativeFetch(input,init);var form=typeof u==="string"&&u.indexOf("/__proxy?url=")>=0;if(form){var first=nextProxy(target,-1);return first<0?Promise.reject(new TypeError("no eligible proxy available")):attempt(input,init,target,first);}return attempt(input,init,target,-1);};
var nativeOpen=XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open=function(method,url){this.__gdProxyWorkerBase=null;if(typeof url==="string"){var target=window.__gdProxyTarget(url);if(target!==null){var base=window.__gdProxyBase||window.__gdProxyBases[0];if(skipped(base,target)){var next=nextProxy(target,-1);if(next<0&&url.indexOf("/__proxy?url=")<0)return nativeOpen.apply(this,arguments);if(next>=0)base=window.__gdProxyBases[next];}if(fallbackWorker(base))this.__gdProxyWorkerBase=base;arguments[1]=window.__gdProxyBuild(base,target);}}return nativeOpen.apply(this,arguments);};
var nativeSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send=function(){var xhr=this,base=this.__gdProxyWorkerBase;if(base)this.addEventListener("load",function(){if(xhr.status===429||xhr.status===1027){coolDown(base);return;}var type=(xhr.getResponseHeader("content-type")||"").toLowerCase();if(type.indexOf("html")<0)return;if((xhr.getResponseHeader("server")||"").toLowerCase().indexOf("cloudflare")>=0||xhr.getResponseHeader("cf-ray")){coolDown(base);return;}if((xhr.responseType===""||xhr.responseType==="text")&&/cloudflare|cf-error|error\s*1027/i.test(xhr.responseText))coolDown(base);});return nativeSend.apply(this,arguments);};
})();
