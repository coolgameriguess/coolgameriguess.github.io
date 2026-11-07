var consoleEl = document.getElementById('console');
try { Error.stackTraceLimit = 400; } catch (e) {}
var gdQuality = new URLSearchParams(location.search).get('quality');
var gdLowMemory = gdQuality === 'low' || (gdQuality !== 'high' && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
if (gdLowMemory) {
var gdCanvas = document.getElementById('canvas');
gdCanvas.width = 1280; gdCanvas.height = 720;
}

var GD_DEBUG = /[?&]debug(=|&|$)/.test(location.search);
if (!GD_DEBUG) {
try { console.log = console.info = console.debug = function () {}; }
catch (e) {}
consoleEl.style.display = 'none';
}
var logQueue = [], logScheduled = false;
window.gdLogRaw = [];
var GD_LOG_DOM_MAX = 500;
window.gdLogDump = function () { return window.gdLogRaw.join('\n'); };
function flushLog() {
logScheduled = false;
if (!logQueue.length) return;
var frag = document.createDocumentFragment();
for (var i = 0; i < logQueue.length; i++) {
var line = document.createElement('div');
line.textContent = logQueue[i];
frag.appendChild(line);
}
logQueue = [];
var nearBottom =
consoleEl.scrollHeight - consoleEl.scrollTop - consoleEl.clientHeight < 40;
consoleEl.appendChild(frag);
while (consoleEl.childNodes.length > GD_LOG_DOM_MAX)
consoleEl.removeChild(consoleEl.firstChild);
if (nearBottom) consoleEl.scrollTop = consoleEl.scrollHeight;
}
var seenDep = Object.create(null);
var QUIET = ['[frame]', '[webgl]', '[io]', '[tex]', '[pngc]',
'[pngd]', '[fmtf]', '[sink]', '[htb]', '[disp]', '[rawin]',
'[touch]', '[cte]', '[list]', '[drs]', '[tex2]'];
function isQuiet(str) {
for (var i = 0; i < QUIET.length; ++i) {
if (str.lastIndexOf(QUIET[i], 0) === 0) return true;
}
return false;
}
function say(s) {
if (!GD_DEBUG) return;
var str = String(s);
if (/[?&]hostlog(=|&|$)/.test(location.search) &&
    /^\[(autosave|zlib|persist|thread|gd)\]/.test(str))
fetch('__debug_log', {method: 'POST', body: str, keepalive: true}).catch(function () {});
if (!isQuiet(str)) console.log(s);
if (str.indexOf('dependency: ') === 0 ||
str.indexOf('still waiting on run dependencies') === 0 ||
str === '(end of list)') {
if (seenDep[str]) return;
seenDep[str] = 1;
}
window.gdLogRaw.push(str);
if (window.gdLogRaw.length > 10000)
window.gdLogRaw.splice(0, 2000);
logQueue.push(str);
if (!logScheduled) {
logScheduled = true;
requestAnimationFrame(flushLog);
}
}
var gdProg = 0, gdProgDone = false;
var gdAssetDone = { wasm: false, data: false };
var gdAssetsFell = false;
var wasmFill = document.getElementById('wasmFill');
var dataFill = document.getElementById('dataFill');
var wasmPct = document.getElementById('wasmPct');
var dataPct = document.getElementById('dataPct');
var wasmLabel = document.getElementById('wasmLabel');
var dataLabel = document.getElementById('dataLabel');
var bootFill = document.getElementById('bootFill');
var bootPct = document.getElementById('bootPct');
function gdFmtSize(n) {
if (!n) return '0 MB';
if (n < 1048576) return Math.round(n / 1024) + ' KB';
return (n / 1048576).toFixed(1) + ' MB';
}
var GD_SIZE_HINT = { wasm: 123481510, data: 322237583 };
var GD_BUILD_ID = '9274beaaad27e3fbd46ebce7';
var GD_ASSET_CACHE = 'gdwasm-assets';
function gdClearCache() {
if (!confirm('Clear saved progress and login on this site?\n' +
'The game reloads afterwards.'))
return;
try { if (Module && Module._gd_autosave_set) Module._gd_autosave_set(0); }
catch (e) {}
var jobs = [];
if (window.caches) jobs.push(caches.delete(GD_ASSET_CACHE));
jobs.push(new Promise(function (res) {
try {
var r = indexedDB.deleteDatabase('gdwasm_saves');
r.onsuccess = r.onerror = r.onblocked = function () { res(); };
} catch (e) { res(); }
}));
try {
localStorage.removeItem('gdWasmSize');
localStorage.removeItem('gdDataSize');
} catch (e) {}
Promise.all(jobs).then(function () { location.reload(); },
function () { location.reload(); });
}
function gdSizeHint(which) {
return which === 'wasm' ? GD_SIZE_HINT.wasm : GD_SIZE_HINT.data;
}
function gdLearnedSize(which) {
try {
return Number(localStorage.getItem(
which === 'wasm' ? 'gdWasmSize' : 'gdDataSize')) || 0;
} catch (e) { return 0; }
}
function setAssetBar(which, loaded, total) {
var fill = which === 'wasm' ? wasmFill : dataFill;
var pctEl = which === 'wasm' ? wasmPct : dataPct;
var label = which === 'wasm' ? wasmLabel : dataLabel;
if (!fill) return;
var name = which === 'wasm' ? 'WASM' : 'DATA';
var learned = gdLearnedSize(which);
var hint = gdSizeHint(which);
var known = hint > 0 ? hint
: (learned > 0 ? learned : (total > 0 ? total : 0));
var exact = known > 0;
if (label) {
var fallback = which === 'wasm' ? 110 * 1024 * 1024 : 320 * 1024 * 1024;
label.textContent = name + ' (' + (exact ? '' : '~') +
gdFmtSize(known > 0 ? known : fallback) + ')';
}
var p;
if (known > 0) {
p = Math.min(100, loaded / known * 100);
} else {
var est = which === 'wasm' ? 110 * 1024 * 1024 : 320 * 1024 * 1024;
p = Math.min(95, loaded / est * 95);
}
fill.style.width = p.toFixed(1) + '%';
if (loaded <= 0) pctEl.textContent = '0%';
else if (known > 0) {
pctEl.textContent = p.toFixed(0) + '% (' + gdFmtSize(loaded) + ')';
} else {
pctEl.textContent = gdFmtSize(loaded);
}
if (known > 0 && loaded >= known) {
gdAssetDone[which] = true;
try {
localStorage.setItem(which === 'wasm' ? 'gdWasmSize' : 'gdDataSize',
String(Math.max(loaded, known)));
} catch (e) {}
}
if (gdAssetDone.wasm && gdAssetDone.data) assetsDone();
}
function forceAssetsDone() {
gdAssetDone.wasm = true;
gdAssetDone.data = true;
setAssetBar('wasm', 1, 1);
setAssetBar('data', 1, 1);
assetsDone();
}
function assetsDone() {
if (gdAssetsFell) return;
gdAssetsFell = true;
var bars = document.getElementById('bars');
var boot = document.getElementById('bootbars');
if (bars) bars.classList.add('fall');
setTimeout(function () {
if (bars) bars.style.display = 'none';
if (boot) boot.classList.add('on');
}, 520);
}
function bootDone() {
var boot = document.getElementById('bootbars');
if (!boot || boot.classList.contains('done')) return;
boot.classList.add('done');
setTimeout(function () { boot.style.display = 'none'; }, 520);
}
function setProgress(p, exact) {
if (gdProgDone && p < 100) return;
p = Math.max(0, Math.min(100, p));
if (p < gdProg && !exact) return;
gdProg = p;
if (bootFill) bootFill.style.width = p.toFixed(1) + '%';
if (bootPct) bootPct.textContent = p.toFixed(0) + '%';
if (p >= 100) { gdProgDone = true; bootDone(); }
}
function resetProgress() {
gdProgDone = false;
gdProg = 0;
gdAssetsFell = false;
gdAssetDone = { wasm: false, data: false };
var bars = document.getElementById('bars');
var boot = document.getElementById('bootbars');
if (bars) { bars.style.display = ''; bars.classList.remove('fall'); }
if (boot) { boot.classList.remove('on'); boot.classList.remove('done'); }
setAssetBar('wasm', 0, gdLearnedSize('wasm'));
setAssetBar('data', 0, gdLearnedSize('data'));
if (bootFill) bootFill.style.width = '0%';
if (bootPct) bootPct.textContent = '0%';
}
window.gdFirstFrame = function () {
forceAssetsDone();
setProgress(100);
};
var gdSaveTimer = null;
var gdLastSave = 0;
var gdSavePromise = null;
var gdSavePending = false;
function performSave() {
try {
if (Module._gd_request_save) Module._gd_request_save();
} catch (e) { console.error('Failed to save progress:', e); }
if (gdSavePromise) {
gdSavePending = true;
return gdSavePromise;
}
function runSave() {
gdSavePending = false;
gdSavePromise = saveAppData().then(function () {
gdLastSave = Date.now();
}, function (e) {
console.error('Failed to save AppData:', e);
}).then(function () {
gdSavePromise = null;
if (gdSavePending) return runSave();
});
return gdSavePromise;
}
return runSave();
}
function scheduleSave(now) {
if (!window.__gdRuntimeReady || !window.__gdSavesRestored) return;
if (gdSaveTimer) clearTimeout(gdSaveTimer);
gdSaveTimer = setTimeout(function () {
gdSaveTimer = null;
if (!now && Date.now() - gdLastSave < 180000) return;
performSave();
}, now ? 0 : 4000);
}
document.addEventListener('visibilitychange', function () {
if (document.hidden) scheduleSave(true);
});
function gdProgressTick() {
if (!window.__gdLoadStarted || gdProgDone) return;
if (!gdAssetsFell) {
var df = Module.dataFileDownloads;
if (df) {
for (var k in df) {
var e = df[k];
var which = /wasm/i.test(k) ? 'wasm'
: (/\.data/i.test(k) ? 'data' : null);
if (which) setAssetBar(which, e.loaded || 0, e.total || 0);
}
}
} else if (gdProg < 78) {
setProgress(gdProg + 0.35);
}
}
setInterval(gdProgressTick, 200);
document.addEventListener('visibilitychange', function () {
if (!document.hidden) gdProgressTick();
});
(function () {
var fpsEl = document.getElementById('fpsval');
var benchmarkButton, benchmarkResult;
if (/[?&]perf(=|&|$)/.test(location.search)) {
benchmarkButton = document.createElement('button');
benchmarkButton.textContent = '20s test';
benchmarkButton.disabled = true;
benchmarkButton.title = 'Measure gameplay FPS, frame pacing and queued input for 20 seconds. Keep the game focused.';
benchmarkButton.style.cssText = 'font:12px monospace;color:#ccc;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:4px;padding:4px 8px;cursor:pointer';
benchmarkResult = document.createElement('span');
benchmarkResult.id = 'benchmarkResult';
benchmarkResult.style.fontSize = '11px';
document.getElementById('midbar').appendChild(benchmarkButton);
document.getElementById('midbar').appendChild(benchmarkResult);
benchmarkButton.addEventListener('click', function () {
if (!Module.gdBeginBenchmark) return;
benchmarkResult.textContent = '';
Module.gdBeginBenchmark(20000);
Module.canvas.focus({preventScroll:true});
});
}
var lastT = performance.now(), lastN = 0, primed = false;
function tick(now) {
if (now - lastT >= 500) {
if (!window.__gdRuntimeReady) {
lastT = now;
requestAnimationFrame(tick);
return;
}
var n = 0;
if (benchmarkButton) {
var result = Module.gdBenchmark;
benchmarkButton.disabled = !Module.gdBeginBenchmark || !!(result && result.running);
benchmarkButton.textContent = result && result.running ? 'Testing '+Math.max(0,20-Math.floor(result.elapsedMs/1000))+'s' : '20s test';
if (result && !result.running) {
benchmarkResult.textContent = result.error || (result.meanFps.toFixed(1)+' fps · p95 '+result.frameP95Ms.toFixed(1)+' ms · max '+result.frameMaxMs.toFixed(1)+' ms · heap '+Math.round(result.heapMiB)+' MiB'+(result.inputP95Ms === null ? '' : ' · input '+result.inputP95Ms.toFixed(1)+' ms'));
}
}
try {
if (Module._gd_frames_get) n = Module._gd_frames_get() | 0;
} catch (e) {}
if (n > 0) {
if (primed)
fpsEl.textContent =
Math.round((n - lastN) * 1000 / (now - lastT)) + ' fps';
var perf = document.getElementById('perfval');
if(perf && /[?&]perf(=|&|$)/.test(location.search) && Module.gdInputStats){
var stats=Module.gdInputStats;
var details='Frame p95 '+stats.frameP95Ms.toFixed(1)+' ms';
if(stats.samples) details+=' | input queue p95 '+stats.queueP95Ms.toFixed(1)+' ms';
if(Module.HEAPU8) details+=' | WASM '+Math.round(Module.HEAPU8.byteLength/1048576)+' MiB';
var audio=Module.__gdAudio;
var render=Module.gdRenderStats;
if(render) details+=' | GL matrices '+render.matrixUploads+' ('+render.matrixSkipped+' cached), empty draws '+render.emptyDrawsSkipped;
if(audio && audio.ctx){
details+=' | audio '+audio.ctx.state;
if(audio.metrics) details+=' (starts '+audio.metrics.starts+', seeks '+audio.metrics.seeks+')';
}
perf.textContent=details;
if(stats.pointerClient) perf.title='Pointer client '+stats.pointerClient.join(',')+'; game '+stats.pointerGame.join(',');
}
lastN = n;
primed = true;
if (!window.__gdGotFrame) {
window.__gdGotFrame = true;
window.__gdInputReady = true;
if (window.__gdAckFocus) window.__gdAckFocus();
document.body.classList.add('playing');
setProgress(100);
}
} else if (!primed) {
fpsEl.textContent = '-- fps';
}
lastT = now;
}
requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
})();
function dumpTrace() {
if (!window.__gdRuntimeReady) { say('runtime not initialized; no trace'); return; }
try {
if (!Module._gd_trace_count) { say('no trace exports'); return; }
var n = Module._gd_trace_count();
var m = Math.min(48, n);
var out = [];
for (var i = 0; i < m; ++i) {
var va = Module._gd_trace_at(i);
if (typeof va === 'bigint') va = Number(va & 0xffffffffn);
else va = va >>> 0;
out.push('0x' + va.toString(16));
}
say('TRACE total=' + n + ' newest-first: ' + out.join(' '));
} catch (e) { say('trace dump failed: ' + e); }
}
function dumpRegs() {
if (!window.__gdRuntimeReady) return;
try {
if (!Module._gd_reg) { say('no register export'); return; }
var names = ['RAX', 'RCX', 'RDX', 'RBX', 'RSP', 'RBP', 'RSI', 'RDI',
'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15'];
var out = [];
for (var i = 0; i < names.length; ++i) {
var v = Module._gd_reg(i);
var hex = (typeof v === 'bigint')
? (v & 0xffffffffffffffffn).toString(16).padStart(16, '0')
: (v >>> 0).toString(16).padStart(8, '0');
out.push(names[i] + '=0x' + hex);
}
say('REGS ' + out.join(' '));
if (Module._gd_where) {
var w = Module._gd_where();
say('WHERE va=0x' + (typeof w === 'bigint'
? (w & 0xffffffffn).toString(16) : (w >>> 0).toString(16)));
}
} catch (e) { say('register dump failed: ' + e); }
}
function gdErrStack(what, e, reason) {
  var msg = what + (reason || '');
  if (e && e.stack) msg += '\n' + e.stack;
  else if (reason && reason.stack) msg += '\n' + reason.stack;
  say(msg);
  dumpRegs();
  dumpTrace();
}
window.addEventListener('error', function (e) {
  gdErrStack('ERROR: ', e.error, e.message);
});
window.addEventListener('unhandledrejection', function (e) {
  gdErrStack('REJECT: ', e.reason, e.reason);
});
function restoreSaves(then) {
var called = false;
var db = null;
function finish() {
if (called) return;
called = true;
if (db) db.close();
then();
}
try {
var req = indexedDB.open('gdwasm_saves', 1);
req.onupgradeneeded = function () {
if (!req.result.objectStoreNames.contains('files'))
req.result.createObjectStore('files');
};
req.onerror = function () { say('[persist] idb open failed: ' + req.error); finish(); };
req.onblocked = function () {
say('[persist] idb open blocked; starting without restored data');
finish();
};
req.onsuccess = function () {
if (called) { req.result.close(); return; }
var store, keysReq;
try {
db = req.result;
store = db.transaction('files', 'readonly').objectStore('files');
keysReq = store.getAllKeys();
} catch (e) { say('[persist] restore transaction failed: ' + e); finish(); return; }
keysReq.onerror = function () {
say('[persist] restore keys failed: ' + keysReq.error);
finish();
};
keysReq.onsuccess = function () {
var keys = keysReq.result || [];
say('[persist] restore: ' + keys.length + ' file(s) in DB' +
(keys.length ? ': ' + keys.join(', ') : ''));
if (!keys.length) { finish(); return; }
var pending = keys.length;
function one() { if (--pending === 0) finish(); }
keys.forEach(function (k) {
var g = store.get(k);
g.onerror = function () {
say('[persist] restore read ' + k + ': ' + g.error);
one();
};
g.onsuccess = function () {
try {
if (g.result !== undefined && g.result !== null) {
var s = String(k);
var base = s.indexOf('AppData/') === 0 ? '/' : '/Resources/';
var parts = s.split('/'), cur = base.replace(/\/$/, '');
for (var pi = 0; pi < parts.length - 1; ++pi) {
cur += '/' + parts[pi];
try { Module.FS.stat(cur); } catch (e2) { Module.FS.mkdir(cur); }
}
Module.FS.writeFile(base + s, new Uint8Array(g.result));
say('[persist] restored ' + s + ' (' + g.result.byteLength + ' bytes)');
}
} catch (e) { say('[persist] restore ' + k + ': ' + e); }
one();
};
});
};
};
} catch (e) { finish(); }
}
function saveAppData() {
return saveAppDataAsync();
}
function saveYield() {
return new Promise(function (resolve) { setTimeout(resolve, 0); });
}
function idbRequestResult(tx, request) {
return new Promise(function (resolve, reject) {
var result, settled = false;
function fail(error) {
if (settled) return;
settled = true;
reject(error);
}
request.onsuccess = function () { result = request.result; };
request.onerror = function () { fail(request.error || new Error('IndexedDB request failed')); };
tx.oncomplete = function () {
if (settled) return;
settled = true;
resolve(result);
};
tx.onerror = function () { fail(tx.error || new Error('IndexedDB transaction failed')); };
tx.onabort = function () { fail(tx.error || new Error('IndexedDB transaction aborted')); };
});
}
async function saveAppDataAsync() {
var fs = Module.FS, files = [], paths = Object.create(null);
if (!fs || !fs.analyzePath || !fs.analyzePath('/AppData').exists) return;
async function scan(directory, keyPrefix) {
var entries = fs.readdir(directory);
for (var i = 0; i < entries.length; ++i) {
var name = entries[i];
if (name === '.' || name === '..') continue;
var path = directory === '/' ? '/' + name : directory + '/' + name;
var key = keyPrefix + '/' + name;
var stat = fs.lstat ? fs.lstat(path) : fs.stat(path);
if (fs.isLink && fs.isLink(stat.mode)) continue;
if (fs.isDir(stat.mode)) {
await scan(path, key);
} else if (fs.isFile(stat.mode)) {
var bytes = fs.readFile(path);
var copy = new Uint8Array(bytes.length);
for (var offset = 0; offset < bytes.length; offset += 65536) {
copy.set(bytes.subarray(offset, Math.min(offset + 65536, bytes.length)), offset);
await saveYield();
}
files.push({ key: key, bytes: copy.buffer });
paths[key] = true;
await saveYield();
}
}
}
try {
await scan('/AppData', 'AppData');
} catch (e) {
console.error('Failed to read AppData for saving:', e);
return;
}
var db;
try {
db = await new Promise(function (resolve, reject) {
var request = indexedDB.open('gdwasm_saves', 1);
request.onupgradeneeded = function () {
if (!request.result.objectStoreNames.contains('files'))
request.result.createObjectStore('files');
};
request.onerror = function () {
reject(request.error || new Error('IndexedDB open failed'));
};
request.onsuccess = function () { resolve(request.result); };
});
} catch (e) {
console.error('Failed to open save database:', e);
return;
}
var savedKeys;
try {
var keysTx = db.transaction('files', 'readonly');
savedKeys = await idbRequestResult(keysTx, keysTx.objectStore('files').getAllKeys());
} catch (e) {
console.error('Failed to read saved file list:', e);
db.close();
return;
}
var written = [];
for (var fi = 0; fi < files.length; ++fi) {
var file = files[fi], saved;
try {
var readTx = db.transaction('files', 'readonly');
saved = await idbRequestResult(readTx, readTx.objectStore('files').get(file.key));
} catch (e) {
console.error('Failed to read saved file ' + file.key + ':', e);
continue;
}
var savedBytes = saved instanceof ArrayBuffer
? new Uint8Array(saved)
: (ArrayBuffer.isView(saved)
? new Uint8Array(saved.buffer, saved.byteOffset, saved.byteLength) : null);
var unchanged = savedBytes && savedBytes.length === file.bytes.byteLength;
if (unchanged) {
var currentBytes = new Uint8Array(file.bytes);
for (var compareOffset = 0; compareOffset < currentBytes.length; compareOffset += 65536) {
var compareEnd = Math.min(compareOffset + 65536, currentBytes.length);
for (var bi = compareOffset; bi < compareEnd; ++bi) {
if (currentBytes[bi] !== savedBytes[bi]) {
unchanged = false;
break;
}
}
if (!unchanged) break;
await saveYield();
}
}
if (!unchanged) {
try {
var writeTx = db.transaction('files', 'readwrite');
await idbRequestResult(writeTx, writeTx.objectStore('files').put(file.bytes, file.key));
written.push(file.key);
} catch (e) {
console.error('Failed to save AppData file ' + file.key + ':', e);
}
}
await saveYield();
}
for (var ki = 0; ki < savedKeys.length; ++ki) {
var oldKey = savedKeys[ki];
if (typeof oldKey !== 'string' || oldKey.indexOf('AppData/') !== 0 || paths[oldKey]) continue;
try {
var deleteTx = db.transaction('files', 'readwrite');
await idbRequestResult(deleteTx, deleteTx.objectStore('files').delete(oldKey));
} catch (e) {
console.error('Failed to delete saved AppData file ' + oldKey + ':', e);
}
await saveYield();
}
say('[persist] saved ' + written.length + ' changed AppData file(s): ' +
written.join(', '));
db.close();
}
var Module = {
canvas: document.getElementById('canvas'),
gdInputQueue: [],
gdCursorPos: [0, 0],
locateFile: function (p) { return p + '?v=' + GD_BUILD_ID; },
get dataFileDownloads() { return this.__dfd; },
set dataFileDownloads(v) {
if (this.__dfd === v) return;
this.__dfd = new Proxy(v || {}, {
set: function (t, k, val) {
t[k] = val;
try {
var which = /wasm/i.test(k) ? 'wasm'
: (/\.data/i.test(k) ? 'data' : null);
if (which) setAssetBar(which, (val && val.loaded) || 0,
(val && val.total) || 0);
} catch (e) {}
return true;
}
});
},
instantiateWasm: function (imports, success) {
return GDAssets.instantiateWasm(imports, success);
},
print: function (s) { say(s); },
printErr: function (s) { say(s); },
setStatus: function (t) {
if (!t) return;
var m = /\((\d+)\/(\d+)\)/.exec(t);
if (m) {
var total = +m[2] || 1;
setProgress(+m[1] / total * 78);
} else if (t.indexOf('Downloading') === 0) {
setProgress(4);
} else if (t.indexOf('Running') === 0) {
forceAssetsDone();
setProgress(80);
} else if (t.indexOf('Compiling') === 0) {
setProgress(76);
}
},
onRuntimeInitialized: function () {
window.__gdRuntimeReady = true;
if (!/[?&]noauto/.test(location.search))
setInterval(function () { scheduleSave(false); }, 30000);
if (Module._gd_log_set) Module._gd_log_set(GD_DEBUG ? 1 : 0);
if (/[?&]noauto/.test(location.search) && Module._gd_autosave_set)
Module._gd_autosave_set(0);
setProgress(82);
try {
Module.FS.chdir('/Resources');
} catch (e) {
say('FS.chdir failed: ' + e);
}
setTimeout(function () {
restoreSaves(function () {
window.__gdSavesRestored = true;
setProgress(88);
try {
const r = Module._gd_boot();
setProgress(92);
if (r && typeof r.then === 'function') {
r.then(function () { say('gd_boot resolved'); setProgress(100); })
.catch(function (e) {
try {
var ov = document.getElementById('errOverlay');
if (ov) {
ov.textContent = 'The game crashed (' + e + '). Reload the page to ' +
'keep playing. Open it with ?debug to see logs.';
ov.classList.add('on');
}
} catch (e2) {}
say('gd_boot rejected: ' + e);
if (e && e.stack) say('STACK: ' + e.stack);
dumpRegs();
dumpTrace();
});
} else {
say('gd_boot returned (sync)');
setProgress(100);
}
} catch (e) {
say('gd_boot exception: ' + e);
}
});
}, 100);
}
};
(function () {
var nativeFetch = window.fetch;
var nativeXhrOpen = XMLHttpRequest.prototype.open;
var audioObjectUrls = new WeakMap();
function audioFilename(url) {
var path = String(url).replace(/\\/g, '/');
try { path = decodeURIComponent(path); }
catch (e) {
say('[audio] invalid encoded song path: ' + url);
return null;
}
path = path.replace(/\\/g, '/').split(/[?#]/)[0];
var match = /(?:^|\/)([^/]+\.mp3)$/i.exec(path);
return match ? match[1] : null;
}
function normalizeFsPath(path) {
return String(path).replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}
function readLocalSong(url) {
var filename = audioFilename(url);
var fs = Module.FS;
if (!filename || !fs || !fs.analyzePath || !fs.readFile) return null;
var cwd = typeof fs.cwd === 'function' ? fs.cwd() : '/';
var roots = ['/Resources', '/', '/AppData', cwd];
var tried = [];
var scanErrors = [];
var checked = Object.create(null);
function readPath(path) {
path = normalizeFsPath(path);
if (checked[path]) return null;
checked[path] = true;
tried.push(path);
if (!fs.analyzePath(path).exists) return null;
try {
return { path: path, bytes: fs.readFile(path) };
} catch (e) {
console.error('[audio] failed to read saved song ' + path, e);
throw e;
}
}
for (var i = 0; i < roots.length; ++i) {
var direct = readPath(normalizeFsPath(roots[i]) + '/' + filename);
if (direct) return direct;
}
var mp3Files = [];
var visited = Object.create(null);
function scan(directory) {
directory = normalizeFsPath(directory);
if (visited[directory]) return null;
visited[directory] = true;
tried.push(directory);
var entries;
try {
entries = fs.readdir(directory);
} catch (e) {
scanErrors.push({ path: directory, error: String(e) });
return null;
}
for (var j = 0; j < entries.length; ++j) {
var name = entries[j];
if (name === '.' || name === '..') continue;
var path = directory === '/' ? '/' + name : directory + '/' + name;
var stat;
try {
stat = fs.lstat ? fs.lstat(path) : fs.stat(path);
} catch (e) {
scanErrors.push({ path: path, error: String(e) });
continue;
}
if (fs.isLink && fs.isLink(stat.mode)) continue;
if (fs.isDir(stat.mode)) {
var found = scan(path);
if (found) return found;
} else if (/\.mp3$/i.test(name)) {
if (name.toLowerCase() === filename.toLowerCase()) {
var song = readPath(path);
if (song) return song;
}
mp3Files.push(path);
}
}
return null;
}
var recursive = scan('/');
if (recursive) return recursive;
console.warn('[audio] song not found in virtual FS', {
filename: filename,
tried: tried,
mp3Files: mp3Files,
scanErrors: scanErrors
});
return null;
}
window.fetch = function (input, init) {
var url = typeof input === 'string' ? input : input && (input.url || input.href);
var method = (init && init.method) || (input && input.method) || 'GET';
var normalizedUrl = typeof input === 'string' ? input.replace(/\\/g, '/') : input;
if (url && String(method).toUpperCase() === 'GET') {
var song = readLocalSong(url);
if (song) return Promise.resolve(new Response(song.bytes, {
status: 200,
headers: { 'Content-Type': 'audio/mpeg' }
}));
}
if (normalizedUrl !== input) return nativeFetch.call(this, normalizedUrl, init);
return nativeFetch.apply(this, arguments);
};
function releaseAudioUrl(xhr) {
var url = audioObjectUrls.get(xhr);
if (url) {
URL.revokeObjectURL(url);
audioObjectUrls.delete(xhr);
}
}
XMLHttpRequest.prototype.open = function (method, url) {
releaseAudioUrl(this);
var args = Array.prototype.slice.call(arguments);
var song = /^GET$/i.test(method) ? readLocalSong(url) : null;
if (song) {
var blobUrl = URL.createObjectURL(new Blob([song.bytes], { type: 'audio/mpeg' }));
audioObjectUrls.set(this, blobUrl);
var xhr = this;
function cleanup() {
if (audioObjectUrls.get(xhr) === blobUrl) releaseAudioUrl(xhr);
}
['loadend', 'abort', 'error', 'timeout'].forEach(function (event) {
xhr.addEventListener(event, cleanup, { once: true });
});
args[1] = blobUrl;
} else if (typeof url === 'string') {
args[1] = url.replace(/\\/g, '/');
}
try {
return nativeXhrOpen.apply(this, args);
} catch (e) {
releaseAudioUrl(this);
throw e;
}
};
})();
var started = false;
function gdStart() {
if (started) return;
try {
var AC = window.AudioContext || window.webkitAudioContext;
if (AC && !Module.gdAudioContext) Module.gdAudioContext = new AC({latencyHint:'interactive'});
if (Module.gdAudioContext) Module.gdAudioContext.resume().catch(function(){});
} catch (_) {}
started = true;
window.__gdLoadStarted = true;
resetProgress();
var startEl = document.getElementById('start');
var flyEl = document.getElementById('logoFly');
var s = 0.32;
try {
var dh = document.querySelector('#logoDock img').getBoundingClientRect().height;
var fh = flyEl.querySelector('img').getBoundingClientRect().height;
if (dh > 0 && fh > 0 && dh / fh < 1) s = dh / fh;
} catch (e) {}
flyEl.style.transform = 'translateY(-13vh) scale(' + s + ')';
document.getElementById('loadFly').classList.add('down');
setTimeout(function () { startEl.classList.add('hide'); }, 420);
setTimeout(function () { document.getElementById('logoDock').classList.add('in'); }, 420);
setTimeout(function () { document.getElementById('stage').classList.add('in'); }, 430);
setTimeout(function () { document.getElementById('midbar').classList.add('in'); }, 480);
setTimeout(function () { document.getElementById('console').classList.add('in'); }, 540);
setTimeout(function () {
startEl.style.display = 'none';

}, 1700);
function loadModule() {
GDAssets.loadScript().then(function (code) {
// Discord's CSP blocks inline <script> execution (even ones created via
// DOM APIs at runtime) unless nonced — but it explicitly allows
// 'unsafe-eval'. Indirect eval (the (0, eval) form) runs the code in
// global scope, matching how an injected <script> tag would behave.
(0, eval)(code);
}).catch(function (e) {
GDAssets.fail(e);
});
}
loadModule();
}

document.getElementById('saveBtn').addEventListener('click', function (e) {
e.preventDefault(); e.stopPropagation();
if (!window.__gdRuntimeReady) return;
scheduleSave(true);
this.textContent = 'Save requested';
var button = this; setTimeout(function () { button.textContent = 'Save progress'; }, 3000);
});
document.getElementById('clearBtn').addEventListener('click', function (e) {
e.preventDefault();
e.stopPropagation();
gdClearCache();
});
document.addEventListener('keydown', function (e) {
if (!started && (e.code === 'Space' || e.key === ' ' || e.code === 'Enter' ||
e.key === 'Enter' || e.code === 'NumpadEnter')) {
e.preventDefault();
gdStart();
}
});