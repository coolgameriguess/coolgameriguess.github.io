
window.__framed=window.self!==window.top;
window.addEventListener("message",function(e){if(e.data==="gd-focus"){window.focus();var c=document.getElementById("canvas");if(c)try{c.focus({preventScroll:true});}catch(t){}}if(e.data==="gd-fullscreen"){var c2=document.getElementById("canvas");try{if(document.fullscreenElement)document.exitFullscreen();else if(c2){var r=c2.requestFullscreen||c2.webkitRequestFullscreen;if(r)r.call(c2);}}catch(t){}}});
document.addEventListener("click",function(){try{if(window.parent!==window)window.parent.postMessage("gd-click","*");}catch(t){}});
