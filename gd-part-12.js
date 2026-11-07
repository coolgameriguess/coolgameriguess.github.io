(function(){
var load=document.getElementById('gdLoad');
var pct=document.getElementById('gdLoadPct');
var totals={wasm:123481510,data:322237583};
var loaded={wasm:0,data:0};
var shown=1;
pct.style.setProperty('--p',shown);
var completed=false;
var failed=false;
var completionTimer=null;
var hideTimer=null;
function update(){
if(completed||failed)return;
var value=Math.floor((loaded.wasm+loaded.data)/(totals.wasm+totals.data)*100);
value=Math.max(1,Math.min(99,value));
if(value>shown){shown=value;pct.style.setProperty('--p',shown);}
}
var originalSetAssetBar=window.setAssetBar;
window.setAssetBar=function(which,amount,total){
if(which==='wasm'||which==='data'){
loaded[which]=Math.max(0,Number(amount)||0);
if(Number(total)>0)totals[which]=Number(total);
update();
}
return originalSetAssetBar.apply(this,arguments);
};
function hide(){
if(failed)return;
if(completionTimer!==null)clearTimeout(completionTimer);
pct.style.setProperty('--p',100);
load.classList.add('off');
hideTimer=setTimeout(function(){load.style.display='none';},700);
}
function complete(){
if(completed||failed)return;
completed=true;
pct.style.setProperty('--p',100);
completionTimer=setTimeout(hide,300);
}
var originalFirstFrame=window.gdFirstFrame;
window.gdFirstFrame=function(){
complete();
if(typeof originalFirstFrame==='function')return originalFirstFrame.apply(this,arguments);
};
var bodyObserver=new MutationObserver(function(){
if(document.body.classList.contains('playing'))complete();
});
bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
var overlay=document.getElementById('errOverlay');
function hideForError(){
failed=true;
if(completionTimer!==null)clearTimeout(completionTimer);
if(hideTimer!==null)clearTimeout(hideTimer);
load.style.display='none';
}
var errorObserver=new MutationObserver(function(){
if(overlay.classList.contains('on'))hideForError();
});
errorObserver.observe(overlay,{attributes:true,attributeFilter:['class']});
if(overlay.classList.contains('on'))hideForError();
if(document.body.classList.contains('playing'))complete();
window.addEventListener('load',function(){gdStart();});
window.addEventListener('beforeunload',function(e){
if(!window.__gdRuntimeReady)return;
if(gdSaveTimer)clearTimeout(gdSaveTimer);
gdSaveTimer=null;
performSave();
e.preventDefault();
e.returnValue='';
});
document.addEventListener('contextmenu',function(e){e.preventDefault();});
function firstPointerDown(){
document.removeEventListener('pointerdown',firstPointerDown,true);
var audio=window.Module&&window.Module.gdAudioContext;
if(audio&&audio.state==='suspended')audio.resume();
if(!document.fullscreenElement){var button=document.getElementById('fsBtn');if(button)button.click();}
}
document.addEventListener('pointerdown',firstPointerDown,true);
})();