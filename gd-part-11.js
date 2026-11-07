(function(){
var ov=document.getElementById('errOverlay');
function err(m){ if(ov){ov.textContent=m;ov.classList.add('on');} }
try{
  var c=document.createElement('canvas');
  var gl=c.getContext('webgl2');
  if(!gl) err('WebGL2 not available - use Chrome/Edge 137+ with hardware acceleration.');
  if(!window.crossOriginIsolated) console.log('[page] note: page is not cross-origin isolated; threads may be limited.');
  if(typeof WebAssembly.Suspending!=='function'||typeof WebAssembly.promising!=='function') err('This game needs a browser with WebAssembly JSPI support. Update Chrome or Edge.');
  if(gl){var lose=gl.getExtension('WEBGL_lose_context');if(lose)lose.loseContext();}
}catch(e){ err('Feature check failed: '+e); }
window.addEventListener('error',function(e){ if(e&&e.message&&/JSPI|WebAssembly|wasm|memory/i.test(String(e.message))) err('Runtime error: '+e.message); });
})();