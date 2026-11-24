{
const E = window.SFXEngine, G = window.SFXGen;
const $ = s => document.querySelector(s);
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const p = (l, min, max, s, u, st) => ({ l, min, max, s, u, st });

/* ---------- parameter schema ---------- */
const PL = {
  gain: p('Gain', -36, 12, 'lin', 'dB', 0.1), pan: p('Pan', -1, 1, 'lin', 'pan', 0.01), delay: p('Start at', 0, 2000, 'pow', 'ms'),
  atk: p('Attack', 0, 2000, 'pow', 'ms'), hold: p('Hold', 0, 2000, 'pow', 'ms'), dec: p('Decay', 1, 6000, 'pow', 'ms'), curve: p('Curve', 0.3, 8, 'log', 'n2'),
  cut: p('Cutoff', 20, 20000, 'log', 'Hz'), q: p('Resonance', 0.3, 20, 'log', 'n2'), fEnv: p('Env amount', -6, 6, 'lin', 'oct', 0.1), fEnvT: p('Env time', 1, 3000, 'pow', 'ms'),
  trem: p('Depth', 0, 1, 'lin', '%'), tremRate: p('Rate', 0.5, 80, 'log', 'Hz'),
  drive: p('Drive', 0, 1, 'lin', '%'), bits: p('Bit depth', 0, 16, 'lin', 'bits', 1), ds: p('Downsample', 1, 40, 'lin', 'xi', 1),
  rep: p('Count', 1, 16, 'lin', 'xi', 1), repInt: p('Interval', 5, 1000, 'pow', 'ms'), repDecay: p('Falloff', 0, 1.5, 'lin', 'x'), repPitch: p('Pitch step', -12, 12, 'lin', 'st', 0.5), repJit: p('Jitter', 0, 100, 'pow', 'ms'),
  wave: null, f0: p('Start pitch', 20, 12000, 'log', 'Hz'), f1: p('End pitch', 20, 12000, 'log', 'Hz'), sweep: p('Sweep time', 1, 3000, 'pow', 'ms'), sweepCurve: p('Sweep shape', 0.2, 8, 'log', 'n2'),
  pw: p('Pulse width', 0.05, 0.95, 'lin', '%'), jumpT: p('Jump at', 0, 1000, 'pow', 'ms'), jumpSemi: p('Jump', -24, 24, 'lin', 'st', 1),
  fmRatio: p('FM ratio', 0.25, 12, 'log', 'n2'), fmIndex: p('FM index', 0, 20, 'pow', 'n2'), fmDecay: p('FM decay', 5, 5000, 'log', 'ms'),
  uni: p('Unison', 1, 7, 'lin', 'v', 1), detune: p('Detune', 0, 100, 'lin', 'ct'), vibRate: p('Vibrato rate', 0.5, 30, 'log', 'Hz'), vibDepth: p('Vibrato', 0, 200, 'pow', 'ct'),
  density: p('Crackle rate', 10, 20000, 'log', '/s'),
  partials: p('Partials', 1, 16, 'lin', 'n', 1), ring: p('Ring', 5, 6000, 'pow', 'ms'), damp: p('HF damping', 0, 2, 'lin', 'n2'), tilt: p('Tilt', 0, 2, 'lin', 'n2'), spread: p('Inharmonic', 0, 0.1, 'lin', 'n3'),
  bright: p('Brightness', 0, 1, 'lin', '%'), pick: p('Pick tone', 0, 1, 'lin', '%'),
  fMod: p('Motion', 0, 4, 'lin', 'oct', 0.05), fModRate: p('Motion rate', 0.05, 40, 'log', 'Hz'),
  width: p('Pulse length', 0.05, 100, 'log', 'ms'), tone: p('Pulse tone', 20, 8000, 'log', 'Hz'), pJit: p('Irregular', 0, 1, 'lin', '%'), accent: p('Accent', 0, 1, 'lin', '%'),
  scatter: p('Pitch spread', 0, 4, 'lin', 'oct', 0.05), rise: p('Rise', 0, 3, 'lin', 'oct', 0.05)
};
/* per-type overrides of a shared key's label and range */
const PT = {
  metal: { f0: { l: 'Pitch' } }, string: { f0: { l: 'Pitch' } },
  pulse: { f0: p('Start rate', 0.5, 2000, 'log', '/s'), f1: p('End rate', 0.5, 2000, 'log', '/s'), sweep: { l: 'Rate sweep' }, sweepCurve: { l: 'Sweep shape' } },
  bubble: { f0: p('Pitch', 60, 8000, 'log', 'Hz'), density: p('Bubbles', 0.5, 500, 'log', '/s'), ring: p('Bubble length', 2, 400, 'log', 'ms') }
};
const pdef = (t, k) => { const o = (PT[t] || {})[k]; return o ? Object.assign({}, PL[k], o) : PL[k]; };
const PM = {
  pitch: p('Pitch', -24, 24, 'lin', 'st', 0.1), time: p('Time', 0.25, 4, 'log', 'x'), gain: p('Input', -24, 24, 'lin', 'dB', 0.1), drive: p('Saturate', 0, 1, 'lin', '%'),
  lowcut: p('Low cut', 20, 2000, 'log', 'Hz'), highcut: p('High cut', 1000, 20000, 'log', 'Hz'),
  compThr: p('Threshold', -40, 0, 'lin', 'dB', 0.1), compRatio: p('Ratio', 1, 20, 'log', ':1'), compAtk: p('Attack', 0.1, 100, 'log', 'ms'), compRel: p('Release', 10, 1000, 'log', 'ms'),
  echoMix: p('Echo', 0, 1, 'lin', '%'), echoTime: p('Time', 10, 1000, 'log', 'ms'), echoFb: p('Feedback', 0, 0.9, 'lin', '%'),
  revMix: p('Reverb', 0, 1, 'lin', '%'), revSize: p('Size', 0, 1, 'lin', '%'), revDamp: p('Damping', 0, 1, 'lin', '%'), revPre: p('Pre-delay', 0, 200, 'pow', 'ms'),
  width: p('Width', 0, 2, 'lin', '%'), norm: p('Peak', -24, 0, 'lin', 'dB', 0.1)
};
const OPTS = {
  wave: [['sine', 'Sine'], ['triangle', 'Tri'], ['saw', 'Saw'], ['square', 'Square']],
  color: [['white', 'White'], ['pink', 'Pink'], ['brown', 'Brown'], ['crackle', 'Crackle']],
  mode: [['bar', 'Bar'], ['bell', 'Bell'], ['plate', 'Plate'], ['glass', 'Glass'], ['tube', 'Tube'], ['random', 'Rand']],
  fType: [['off', 'Off'], ['lp', 'LP'], ['hp', 'HP'], ['bp', 'BP'], ['notch', 'Notch']],
  tremShape: [['sine', 'Sine'], ['square', 'Gate'], ['saw', 'Saw'], ['random', 'Random']],
  fModShape: [['sine', 'Sine'], ['wander', 'Wander'], ['step', 'Step']],
  vibShape: [['sine', 'Sine'], ['wander', 'Wander']],
  pShape: [['click', 'Click'], ['noise', 'Noise'], ['tone', 'Tone']],
  dir: [['fwd', 'Forward'], ['rev', 'Reversed']]
};
const SRC = {
  osc: ['seg:wave', 'f0', 'f1', 'sweep', 'sweepCurve', 'jumpT', 'jumpSemi', 'pw'],
  noise: ['seg:color', 'density'],
  metal: ['seg:mode', 'f0', 'partials', 'ring', 'damp', 'tilt', 'spread'],
  string: ['f0', 'ring', 'bright', 'pick'],
  pulse: ['seg:pShape', 'f0', 'f1', 'sweep', 'sweepCurve', 'width', 'tone', 'pJit', 'accent'],
  bubble: ['f0', 'scatter', 'density', 'rise', 'ring']
};
const TNAME = { osc: 'Tone', noise: 'Noise', metal: 'Metal', string: 'String', pulse: 'Pulse', bubble: 'Bubble' };
const LSEC = t => [['Source', SRC[t]]].concat(t === 'osc' ? [['FM and unison', ['fmRatio', 'fmIndex', 'fmDecay', 'uni', 'detune', 'seg:vibShape', 'vibRate', 'vibDepth']]] : [],
  [['Envelope', ['seg:dir', 'atk', 'hold', 'dec', 'curve']], ['Filter', ['seg:fType', 'cut', 'q', 'fEnv', 'fEnvT', 'seg:fModShape', 'fMod', 'fModRate']], ['Tremolo', ['seg:tremShape', 'trem', 'tremRate']],
   ['Grit', ['drive', 'bits', 'ds']], ['Repeat', ['rep', 'repInt', 'repDecay', 'repPitch', 'repJit']], ['Mix', ['gain', 'pan', 'delay']]]);
const MSEC = [['Character', ['pitch', 'time', 'gain', 'drive']], ['Tone', ['lowcut', 'highcut']], ['Dynamics', ['compThr', 'compRatio', 'compAtk', 'compRel']],
  ['Echo', ['echoMix', 'echoTime', 'echoFb', 'tog:echoPP']], ['Space', ['revMix', 'revSize', 'revDamp', 'revPre']], ['Output', ['width', 'norm', 'tog:mono']]];
const TOGL = { echoPP: 'Ping-pong', mono: 'Mono output' };
const UX = { vamt: p('Amount', 0, 1, 'lin', '%'), vn: p('Takes', 2, 9, 'lin', 'n', 1), rpm: p('Fire rate', 60, 1200, 'lin', 'rpm', 10), shots: p('Shots', 2, 16, 'lin', 'n', 1) };

/* ---------- formatting & slider mapping ---------- */
const hz = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 1 : 2) + ' kHz' : (v < 100 ? v.toFixed(1) : Math.round(v)) + ' Hz';
const ms = v => v >= 1000 ? (v / 1000).toFixed(2) + ' s' : (v < 10 ? v.toFixed(1) : Math.round(v)) + ' ms';
const sg = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
function fmt(v, u) {
  switch (u) {
    case 'Hz': return hz(v); case 'ms': return ms(v);
    case 'dB': return sg(+v.toFixed(1)) + ' dB'; case '%': return Math.round(v * 100) + '%';
    case 'pan': return Math.abs(v) < 0.01 ? 'C' : (v < 0 ? 'L' : 'R') + Math.round(Math.abs(v) * 100);
    case 'st': return sg(Math.round(v * 10) / 10) + ' st'; case 'oct': return sg(+v.toFixed(1)) + ' oct';
    case 'bits': return v < 1 ? 'Off' : v + '-bit'; case 'x': return v.toFixed(2) + '×'; case 'xi': return '×' + v;
    case 'n': return String(Math.round(v)); case 'n3': return v.toFixed(3); case 'ct': return Math.round(v) + ' ct';
    case '/s': return (v < 10 ? +v.toFixed(1) : Math.round(v)) + '/s'; case 'v': return v + (v == 1 ? ' voice' : ' voices'); case ':1': return v.toFixed(1) + ':1';
    case 'rpm': return Math.round(v) + ' rpm'; default: return (+v).toFixed(2);
  }
}
function toX(d, v) {
  let x;
  if (d.s === 'log') x = Math.log(Math.max(v, d.min) / d.min) / Math.log(d.max / d.min);
  else if (d.s === 'pow') x = Math.cbrt(Math.max(0, v - d.min) / (d.max - d.min));
  else x = (v - d.min) / (d.max - d.min);
  return Math.round(clamp(x, 0, 1) * 1000);
}
function fromX(d, x) {
  x /= 1000;
  let v = d.s === 'log' ? d.min * Math.pow(d.max / d.min, x) : d.s === 'pow' ? d.min + (d.max - d.min) * x * x * x : d.min + (d.max - d.min) * x;
  if (d.st) v = Math.round(v / d.st) * d.st;
  return +v.toFixed(d.st ? 4 : 6);
}

/* ---------- state ---------- */
const S = { sound: null, res: null, view: 'wave', open: new Set(), auto: true, vamt: 0.5, vn: 6, vbase: 0, vars: [], rpm: 600, shots: 8, xsr: 48000, xbits: 16, vol: 0.7 };
const hist = [], fut = [];
let lib = [];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
function cleanSound(o) {
  if (!o || !Array.isArray(o.layers)) throw new Error('Not an SFX Forge preset');
  const s = E.newSound(o);
  s.layers = o.layers.filter(l => l && E.TYPE_DEFAULTS[l.type]).map(l => E.newLayer(l.type, Object.assign({}, l, { id: undefined })));
  s.layers.forEach(l => { if (!l.id) l.id = E.newLayer(l.type).id; });
  s.seed = (s.seed >>> 0) || 1;
  return s;
}
function snap() { hist.push(JSON.stringify(S.sound)); if (hist.length > 120) hist.shift(); fut.length = 0; updUndo(); }
function updUndo() { $('#undo').disabled = !hist.length; $('#redo').disabled = !fut.length; }
function undo() { if (!hist.length) return; fut.push(JSON.stringify(S.sound)); S.sound = JSON.parse(hist.pop()); afterLoad(true); updUndo(); }
function redo() { if (!fut.length) return; hist.push(JSON.stringify(S.sound)); S.sound = JSON.parse(fut.pop()); afterLoad(true); updUndo(); }

/* ---------- control markup ---------- */
function ctl(scope, id, key, d, v, label) {
  const x = toX(d, v);
  return `<div class="ctl"><span title="${esc(label || d.l)}">${esc(label || d.l)}</span><input type="range" min="0" max="1000" value="${x}" style="--p:${x / 10}%" id="${scope}-${id}-${key}" data-s="${scope}" data-i="${id}" data-k="${key}" aria-label="${esc(label || d.l)}"><output>${fmt(v, d.u)}</output></div>`;
}
function seg(scope, id, key, opts, v) {
  return `<div class="seg" role="group" data-s="${scope}" data-i="${id}" data-k="${key}">${opts.map(o => `<button type="button" data-v="${o[0]}" aria-pressed="${o[0] === v}">${o[1]}</button>`).join('')}</div>`;
}
function summary(l) {
  const parts = [];
  if (l.type === 'osc') parts.push(l.wave + ' ' + (Math.abs(l.f0 - l.f1) < 0.5 ? hz(l.f0) : hz(l.f0) + '→' + hz(l.f1)));
  else if (l.type === 'noise') parts.push(l.color);
  else if (l.type === 'metal') parts.push(l.mode + ' ' + hz(l.f0));
  else if (l.type === 'pulse') parts.push(l.pShape + ' ' + fmt(l.f0, '/s') + (Math.abs(l.f0 - l.f1) < 0.05 ? '' : '→' + fmt(l.f1, '/s')));
  else if (l.type === 'bubble') parts.push(hz(l.f0) + ' · ' + fmt(l.density, '/s'));
  else parts.push(hz(l.f0));
  if (l.dir === 'rev') parts.push('reversed');
  if (l.fType !== 'off') parts.push(l.fType.toUpperCase() + ' ' + hz(l.cut) + (l.fMod > 0 ? ' ~' : ''));
  parts.push(ms(l.atk + l.hold + l.dec));
  if (l.rep > 1) parts.push('×' + l.rep);
  if (l.delay > 0.5) parts.push('@' + ms(l.delay));
  return parts.join(' · ');
}
const ICON = {
  chev: '<svg class="chev" width="12" height="12" viewBox="0 0 12 12"><path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  dup: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4.5" y="4.5" width="8" height="8" rx="1.5"/><path d="M2.5 10V3.5a1 1 0 011-1H10"/></svg>',
  del: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 4.5h9M6 4.5V3h3v1.5M4.2 4.5l.6 8h5.4l.6-8"/></svg>',
  pow: '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7.5 2v5"/><path d="M4.4 4.2a4.6 4.6 0 106.2 0"/></svg>'
};
function layerHTML(l) {
  const open = S.open.has(l.id);
  const body = LSEC(l.type).map(([h, keys]) => `<div class="sec"><h3>${h}</h3>${keys.map(k => {
    if (k.startsWith('seg:')) { const kk = k.slice(4); return seg('l', l.id, kk, OPTS[kk], l[kk]); }
    return ctl('l', l.id, k, pdef(l.type, k), l[k]);
  }).join('')}</div>`).join('');
  return `<article class="layer${open ? ' open' : ''}${l.on ? '' : ' muted'}" data-id="${l.id}" style="--lc:var(--c-${l.type})">
    <div class="lh">
      <button class="ib" data-a="toggle" aria-expanded="${open}" aria-label="Expand layer">${ICON.chev}</button>
      <span class="chip"></span><span class="tb">${TNAME[l.type]}</span>
      <input class="lname" value="${esc(l.name || TNAME[l.type])}" data-a="name" aria-label="Layer name">
      <span class="sum" data-a="toggle">${esc(summary(l))}</span>
      <button class="ib" data-a="solo" aria-pressed="${!!l.solo}" title="Solo" aria-label="Solo">S</button>
      <button class="ib${l.on ? '' : ' off'}" data-a="mute" title="${l.on ? 'Mute' : 'Unmute'}" aria-label="Mute">${ICON.pow}</button>
      <button class="ib" data-a="dup" title="Duplicate" aria-label="Duplicate">${ICON.dup}</button>
      <button class="ib" data-a="del" title="Delete" aria-label="Delete">${ICON.del}</button>
    </div>
    <div class="lb">${body}</div></article>`;
}
function buildLayers() {
  const ls = S.sound.layers;
  $('#layers').innerHTML = ls.length ? ls.map(layerHTML).join('') : '<p class="empty">No layers yet. Add one above, or pick a generator.</p>';
}
function buildMaster() {
  const m = S.sound.master;
  $('#master').innerHTML = MSEC.map(([h, keys]) => `<h3>${h}</h3>${keys.map(k => k.startsWith('tog:') ?
    `<label class="chk"><input type="checkbox" data-s="m" data-k="${k.slice(4)}" ${m[k.slice(4)] ? 'checked' : ''}> ${TOGL[k.slice(4)]}</label>` :
    ctl('m', 'm', k, PM[k], m[k])).join('')}`).join('');
}
function buildUX() {
  $('#varctl').innerHTML = ctl('u', 'u', 'vamt', UX.vamt, S.vamt) + ctl('u', 'u', 'vn', UX.vn, S.vn);
  $('#rfctl').innerHTML = ctl('u', 'u', 'rpm', UX.rpm, S.rpm) + ctl('u', 'u', 'shots', UX.shots, S.shots);
  setSeg('#xsr', S.xsr); setSeg('#xbits', S.xbits);
}
function setSeg(sel, v) { document.querySelectorAll(sel + ' button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v == v))); }
function buildGens() {
  const groups = [];
  G.LIST.forEach(g => { let gr = groups.find(x => x.n === g.group); if (!gr) groups.push(gr = { n: g.group, items: [] }); gr.items.push(g); });
  $('#groups').innerHTML = groups.map(gr => `<div><h3>${gr.n}</h3><div class="ggrid">${gr.items.map(g =>
    `<button class="gbtn" data-g="${g.id}" aria-pressed="${S.sound && S.sound.cat === g.id}">${g.label}</button>`).join('')}</div></div>`).join('');
}
function markGen() { document.querySelectorAll('.gbtn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === S.sound.cat))); }
function buildLib() {
  $('#lib').innerHTML = lib.length ? lib.map((s, i) => `<div class="libi"><button data-li="${i}">${esc(s.name)}</button><button class="ib" data-ld="${i}" aria-label="Delete ${esc(s.name)}">${ICON.del}</button></div>`).join('')
    : '<p class="empty">Sounds you save stay in this browser.</p>';
}
function afterLoad(keepOpen) {
  if (!keepOpen) { S.open.clear(); if (S.sound.layers[0]) S.open.add(S.sound.layers[0].id); }
  $('#sname').value = S.sound.name; $('#seed').value = S.sound.seed;
  buildLayers(); buildMaster(); markGen(); doRender();
}

/* ---------- rendering & drawing ---------- */
let rT = 0, pending = false;
function sched() { pending = true; clearTimeout(rT); rT = setTimeout(doRender, 35); }
function flush() { if (pending) { clearTimeout(rT); doRender(); } }
function doRender() {
  pending = false;
  S.res = E.render(S.sound, { sr: 48000 }); S.res.buf = null;
  drawAll(); readout(); persist(); varsDirty();
}
const base = document.createElement('canvas');
function sizeCanvas(c) {
  const r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return d;
}
function mixMono(res) { const n = res.L.length, m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = (res.L[i] + res.R[i]) * 0.5; return m; }
function niceStep(dur, W) { const target = dur / Math.max(2, W / 120); const st = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2]; return st.find(s => s >= target) || 2; }
function drawWave(g, m, W, H, color, fill) {
  const n = m.length, mid = H / 2, amp = H * 0.44;
  g.fillStyle = color; g.beginPath();
  const top = [], bot = [];
  for (let x = 0; x < W; x++) {
    const a = Math.floor(x / W * n), b = Math.max(a + 1, Math.floor((x + 1) / W * n));
    let lo = 0, hi = 0; for (let i = a; i < b && i < n; i++) { const v = m[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    top.push(mid - hi * amp); bot.push(mid - lo * amp);
  }
  g.moveTo(0, mid); top.forEach((y, x) => g.lineTo(x, Math.min(y, mid - 0.5)));
  for (let x = W - 1; x >= 0; x--) g.lineTo(x, Math.max(bot[x], mid + 0.5));
  g.closePath(); g.fill();
  if (fill) { g.fillStyle = fill; g.fillRect(0, mid - 0.5, W, 1); }
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < h; k++) { const a = i + k, b = a + h, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nc; } }
  }
}
const CMAP = (() => {
  const st = [[0, [6, 7, 8]], [0.3, [52, 20, 10]], [0.55, [170, 48, 4]], [0.75, [255, 79, 0]], [0.9, [255, 176, 120]], [1, [255, 246, 236]]], out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) { const t = i / 255; let k = 0; while (k < st.length - 2 && t > st[k + 1][0]) k++; const [t0, c0] = st[k], [t1, c1] = st[k + 1], u = clamp((t - t0) / (t1 - t0), 0, 1); for (let c = 0; c < 3; c++) out[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * u; }
  return out;
})();
function drawSpec(g, m, W, H, sr) {
  const N = 2048, win = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N), img = g.createImageData(W, H), n = m.length;
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const fmin = 30, fmax = Math.min(20000, sr / 2), rowBin = new Float32Array(H + 1);
  for (let y = 0; y <= H; y++) rowBin[y] = fmin * Math.pow(fmax / fmin, 1 - y / H) / sr * N;
  const cols = Math.min(W, 900), mag = new Float32Array(N / 2);
  for (let c = 0; c < cols; c++) {
    const center = Math.floor((c + 0.5) / cols * n), s0 = center - N / 2;
    for (let i = 0; i < N; i++) { const j = s0 + i; re[i] = j >= 0 && j < n ? m[j] * win[i] : 0; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) mag[k] = Math.hypot(re[k], im[k]);
    const x0 = Math.floor(c / cols * W), x1 = Math.floor((c + 1) / cols * W);
    for (let y = 0; y < H; y++) {
      const b0 = rowBin[y + 1], b1 = rowBin[y]; let v = 0;
      if (b1 - b0 < 1) { const k = Math.floor(b0), f = b0 - k; v = mag[k] * (1 - f) + mag[Math.min(k + 1, N / 2 - 1)] * f; }
      else for (let k = Math.floor(b0); k <= Math.ceil(b1) && k < N / 2; k++) v = Math.max(v, mag[k]);
      const db = 20 * Math.log10(v / (N / 4) + 1e-9), t = clamp((db + 96) / 96, 0, 1), ci = Math.round(t * 255) * 3;
      for (let x = x0; x < x1; x++) { const o = (y * W + x) * 4; img.data[o] = CMAP[ci]; img.data[o + 1] = CMAP[ci + 1]; img.data[o + 2] = CMAP[ci + 2]; img.data[o + 3] = 255; }
    }
  }
  g.putImageData(img, 0, 0);
  g.font = `${12 * DPR}px "Geist Mono",monospace`; g.fillStyle = 'rgba(233,234,236,.75)';
  [100, 1000, 10000].forEach(f => { const y = (1 - Math.log(f / fmin) / Math.log(fmax / fmin)) * H; g.fillRect(0, y, 6 * DPR, 1); g.fillText(f >= 1000 ? f / 1000 + 'k' : String(f), 9 * DPR, y + 4 * DPR); });
}
let DPR = 1;
function drawAll() {
  const cv = $('#cv'); DPR = sizeCanvas(cv);
  const W = cv.width, H = cv.height; base.width = W; base.height = H;
  const g = base.getContext('2d'), res = S.res, m = mixMono(res);
  g.fillStyle = '#060708'; g.fillRect(0, 0, W, H);
  if (S.view === 'spec') drawSpec(g, m, W, H, res.sr);
  else {
    g.fillStyle = '#16181c'; [0.25, 0.75].forEach(f => g.fillRect(0, Math.round(H * (0.5 - 0.44 * (f - 0.5) * 2)), W, 1));
    drawWave(g, m, W, H, '#ff4f00', '#ff4f00');
  }
  const step = niceStep(res.duration, W / DPR);
  g.font = `${12 * DPR}px "Geist Mono",monospace`; g.fillStyle = 'rgba(233,234,236,.55)';
  for (let t = step; t < res.duration; t += step) { const x = Math.round(t / res.duration * W); g.fillRect(x, H - 6 * DPR, 1, 6 * DPR); if (x < W - 40 * DPR) g.fillText(t < 1 ? Math.round(t * 1000) + '' : t.toFixed(t % 1 ? 2 : 0) + 's', x + 3 * DPR, H - 5 * DPR); }
  blit(-1); drawLanes();
}
function blit(ph) {
  const cv = $('#cv'), g = cv.getContext('2d');
  g.drawImage(base, 0, 0);
  if (ph >= 0 && ph <= 1) { g.fillStyle = '#ffffff'; g.fillRect(Math.round(ph * cv.width), 0, Math.max(1, DPR), cv.height); }
}
function drawLanes() {
  const wrap = $('#lanesw'), ls = S.sound.layers, rowH = 20;
  wrap.style.height = Math.max(24, ls.length * rowH + 4) + 'px';
  const c = $('#lanes'), d = sizeCanvas(c), g = c.getContext('2d'), W = c.width, dur = S.res.duration;
  g.clearRect(0, 0, W, c.height);
  const css = getComputedStyle(document.documentElement), spans = {};
  S.res.spans.forEach(s => spans[s.id] = s);
  g.font = `500 ${12.5 * d}px Geist,sans-serif`; g.textBaseline = 'middle';
  ls.forEach((l, i) => {
    const y = (i * rowH + 3) * d, h = (rowH - 5) * d, s = spans[l.id];
    g.fillStyle = '#16181c'; g.fillRect(0, y, W, h);
    if (s) {
      const x0 = s.start / dur * W, x1 = Math.max(x0 + 3 * d, s.end / dur * W);
      const col = css.getPropertyValue('--c-' + l.type).trim() || '#ff4f00';
      const gr = g.createLinearGradient(x0, 0, x1, 0), rv = l.dir === 'rev'; gr.addColorStop(rv ? 1 : 0, col); gr.addColorStop(rv ? 0 : 1, col + '22');
      g.fillStyle = gr; g.fillRect(x0, y, x1 - x0, h);
    }
    const label = l.name || TNAME[l.type], tx = s ? s.start / dur * W + 6 * d : 6 * d;
    const tw = g.measureText(label).width;
    const lx = tx + tw > W - 4 * d ? Math.max(4 * d, W - tw - 6 * d) : tx;
    g.lineJoin = 'round'; g.lineWidth = 3 * d; g.strokeStyle = '#0c0d0f'; g.strokeText(label, lx, y + h / 2);
    g.fillStyle = s ? '#f3f3f3' : '#6b6f76'; g.fillText(label, lx, y + h / 2);
  });
}
function readout() {
  const r = S.res, db = x => x > 0 ? (20 * Math.log10(x)).toFixed(1) : '−∞';
  const on = S.sound.layers.filter(l => l.on).length;
  $('#ro').innerHTML = `<span>Peak <b>${db(r.peak).replace('-', '−')} dBFS</b></span><span>Loudest 100 ms <b>${db(r.rms).replace('-', '−')} dB RMS</b></span><span>Length <b>${ms(r.duration * 1000)}</b></span><span>Layers <b>${on}/${S.sound.layers.length}</b></span><span>${r.mono ? 'Mono' : 'Stereo'}</span>`;
}

/* ---------- audio ---------- */
let AC = null, out = null, cur = null, t0 = 0, raf = 0;
function ac() {
  if (!AC) { const C = window.AudioContext || window.webkitAudioContext; AC = new C(); out = AC.createGain(); out.gain.value = S.vol; out.connect(AC.destination); }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function bufOf(res) { if (!res.buf) res.buf = E.toAudioBuffer(ac(), res); return res.buf; }
function playRes(res, when, track) {
  const c = ac(), src = c.createBufferSource();
  src.buffer = bufOf(res); src.connect(out);
  const at = c.currentTime + (when || 0) + 0.005; src.start(at);
  if (track) { if (cur) try { cur.stop(); } catch (e) {} cur = src; t0 = at; anim(res.duration); }
  return src;
}
function anim(dur) {
  cancelAnimationFrame(raf);
  const step = () => { const ph = (AC.currentTime - t0) / dur; blit(ph); if (ph < 1) raf = requestAnimationFrame(step); else blit(-1); };
  raf = requestAnimationFrame(step);
}
function play() { flush(); try { playRes(S.res, 0, true); } catch (e) { toast('Audio could not start in this view'); } }

/* ---------- variations ---------- */
let vTok = 0;
function varsDirty() {
  const tok = ++vTok; S.vars = [];
  $('#tiles').innerHTML = Array.from({ length: S.vn }, (_, i) => `<button class="tile" data-vi="${i}" aria-label="Play take ${i + 1}"><canvas></canvas><span>${i + 1}</span><b class="use" data-use="${i}">Use</b></button>`).join('');
  let i = 0;
  const step = () => {
    if (tok !== vTok || i >= S.vn) return;
    makeVar(i); drawTile(i); i++; setTimeout(step, 0);
  };
  setTimeout(step, 300);
}
function makeVar(i) { if (!S.vars[i]) { const vs = E.vary(S.sound, S.vbase + i + 1, S.vamt); S.vars[i] = { sound: vs, res: E.render(vs, { sr: 48000 }) }; } return S.vars[i]; }
function drawTile(i) {
  const t = document.querySelector(`.tile[data-vi="${i}"] canvas`); if (!t) return;
  const d = sizeCanvas(t), g = t.getContext('2d'); g.fillStyle = '#0c0d0f'; g.fillRect(0, 0, t.width, t.height);
  drawWave(g, mixMono(S.vars[i].res), t.width, t.height, '#ff4f00');
}
function burst() {
  flush();
  const takes = Math.min(S.vn, 4); for (let i = 0; i < takes; i++) makeVar(i);
  const iv = 60 / S.rpm;
  try { for (let k = 0; k < S.shots; k++) playRes(S.vars[k % takes].res, k * iv, k === 0); } catch (e) { toast('Audio could not start in this view'); }
}

/* ---------- mutate ---------- */
const NOMUT = new Set(['rep', 'bits', 'ds', 'uni', 'jumpSemi', 'partials', 'gain', 'pan']);
function mutate() {
  snap();
  const r = E.rng((Math.random() * 2 ** 31) >>> 0), amt = 0.06 + S.vamt * 0.12;
  S.sound.layers.forEach(l => LSEC(l.type).forEach(([, keys]) => keys.forEach(k => {
    if (k.includes(':') || NOMUT.has(k) || r() > 0.45) return;
    if ((k === 'delay' || k === 'fMod') && !l[k]) return;
    const d = pdef(l.type, k); l[k] = fromX(d, clamp(toX(d, l[k]) + (r() * 2 - 1) * amt * 1000, 0, 1000));
  })));
  S.sound.seed = (Math.random() * 2 ** 31) >>> 0;
  afterLoad(true); play();
}
function generate(id) {
  snap();
  S.sound = G.generate(id, (Math.random() * 2 ** 31) >>> 0);
  afterLoad(false); play();
}

/* ---------- files ---------- */
let DL = null;
const slug = s => (s || 'sound').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'sound';
async function offer(name, data) {
  if (DL) {
    try { await DL.save({ filename: name, data: new Blob([data]) }); toast('Saved ' + name); }
    catch (e) { const c = e && e.code; if (c !== 'declined') toast(c === 'rate_limited' ? 'A save prompt is already open' : c === 'too_large' ? 'That file is too large to save here' : 'Downloads are not available in this view'); }
    return;
  }
  try {
    const url = URL.createObjectURL(new Blob([data])), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000); toast('Downloading ' + name);
  } catch (e) { toast('Downloads are not available in this view'); }
}
function offerAudio(files, zipName) { return !DL && files.length === 1 ? offer(files[0].name, files[0].data) : offer(zipName, E.zip(files)); }
const wav = s => E.encodeWav(E.render(s, { sr: S.xsr }), { bits: S.xbits });
function exportWav() { toast('Rendering…'); setTimeout(() => { const n = slug(S.sound.name); offerAudio([{ name: n + '.wav', data: wav(S.sound) }], n + '_wav.zip'); }, 30); }
function exportPack() {
  toast('Rendering ' + (S.vn + 1) + ' takes…');
  setTimeout(() => {
    const n = slug(S.sound.name), files = [{ name: n + '_01.wav', data: wav(S.sound) }];
    for (let i = 0; i < S.vn; i++) files.push({ name: n + '_' + String(i + 2).padStart(2, '0') + '.wav', data: wav(E.vary(S.sound, S.vbase + i + 1, S.vamt)) });
    offer(n + '_variations.zip', E.zip(files));
  }, 30);
}
async function engineSource() {
  const el = document.getElementById('engine-src');
  if (el && el.textContent.trim()) return el.textContent.trim();
  const r = await fetch('js/sfx-engine.js'); if (!r.ok) throw new Error('engine file not found'); return (await r.text()).trim();
}
async function exportKit() {
  const all = {}, add = s => { let k = slug(s.name), j = 2; while (all[k]) k = slug(s.name) + '_' + j++; all[k] = s; };
  add(S.sound); lib.forEach(add);
  const json = JSON.stringify(all, null, 1);
  let engine;
  try { engine = await engineSource(); } catch (e) { toast('Could not read the engine file'); return; }
  const readme = `SFX Forge game kit

sfx-engine.js   The synthesis engine. No dependencies; works in browsers, Web Workers and Node.
sounds.json     Your presets (the current sound plus your saved library).
sounds.js       The same presets as a script that sets window.SFX_SOUNDS.
demo.html       Open in a browser to hear every preset.

Render at load time, then play buffers (rendering takes about 1-150 ms per sound):

  <script src="sfx-engine.js"><\/script>
  <script src="sounds.js"><\/script>
  <script>
    const ctx = new AudioContext();
    const bank = {};
    for (const [key, preset] of Object.entries(SFX_SOUNDS)) {
      // four takes per sound, so repeated shots never sound identical
      bank[key] = [0, 1, 2, 3].map(i =>
        SFXEngine.toAudioBuffer(ctx, SFXEngine.render(SFXEngine.vary(preset, i, 0.5), { sr: ctx.sampleRate })));
    }
    let rr = 0;
    function playSfx(key, gain = 1) {
      const takes = bank[key], src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = takes[rr++ % takes.length]; g.gain.value = gain;
      src.connect(g).connect(ctx.destination); src.start();
    }
  <\/script>

Node (e.g. to bake WAVs in a build step):
  const SFXEngine = require('./sfx-engine.js');
  const res = SFXEngine.render(preset, { sr: 48000 });   // { L, R, sr, duration, peak }
  fs.writeFileSync('out.wav', SFXEngine.encodeWav(res, { bits: 16, mono: true }));

vary(preset, n, amount) gives take number n: same design, nudged pitch, timing, filter and noise.
`;
  const demo = `<!DOCTYPE html><meta charset="utf-8"><title>SFX kit demo</title><style>body{font:15px system-ui;margin:24px}button{margin:4px;padding:8px 12px}</style>
<h1>SFX kit demo</h1><div id="b"></div><script src="sfx-engine.js"><\/script><script src="sounds.js"><\/script>
<script>let ctx,bank={},rr=0;for(const k in SFX_SOUNDS){const b=document.createElement('button');b.textContent=k;b.onclick=()=>{ctx=ctx||new AudioContext();
bank[k]=bank[k]||[0,1,2,3].map(i=>SFXEngine.toAudioBuffer(ctx,SFXEngine.render(SFXEngine.vary(SFX_SOUNDS[k],i,0.5),{sr:ctx.sampleRate})));
const s=ctx.createBufferSource();s.buffer=bank[k][rr++%4];s.connect(ctx.destination);s.start()};document.getElementById('b').appendChild(b)}<\/script>`;
  offer('sfx_forge_game_kit.zip', E.zip([
    { name: 'sfx-engine.js', data: engine + '\n' }, { name: 'sounds.json', data: json },
    { name: 'sounds.js', data: 'window.SFX_SOUNDS = ' + json + ';\n' }, { name: 'demo.html', data: demo }, { name: 'README.txt', data: readme }
  ]));
}
function openModal(text, canLoad) { $('#mtext').value = text; $('#mload').hidden = !canLoad; $('#mtitle').textContent = canLoad ? 'Import preset JSON' : 'Preset JSON'; $('#modal').classList.add('on'); $('#mtext').focus(); if (!canLoad) $('#mtext').select(); }
function closeModal() { $('#modal').classList.remove('on'); }

/* ---------- toast & persistence ---------- */
let tT = 0;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tT); tT = setTimeout(() => t.classList.remove('on'), 2200); }
let pT = 0;
function persist() { clearTimeout(pT); pT = setTimeout(() => store.set('sfxforge.cur', S.sound), 400); }

/* ---------- events ---------- */
let dragSnap = false;
function setVal(el) {
  const { s, i, k } = el.dataset;
  if (s === 'u') { const v = fromX(UX[k], +el.value); S[k] = v; el.nextElementSibling.textContent = fmt(v, UX[k].u); el.style.setProperty('--p', el.value / 10 + '%'); if (k === 'vamt' || k === 'vn') { S.vbase = S.vbase; varsDirty(); } return false; }
  if (!dragSnap) { snap(); dragSnap = true; }
  const d = s === 'm' ? PM[k] : pdef(S.sound.layers.find(x => x.id === i).type, k), v = fromX(d, +el.value);
  if (s === 'm') S.sound.master[k] = v;
  else { const l = S.sound.layers.find(x => x.id === i); l[k] = v; const sm = el.closest('.layer').querySelector('.sum'); sm.textContent = summary(l); }
  el.nextElementSibling.textContent = fmt(v, d.u); el.style.setProperty('--p', el.value / 10 + '%');
  return true;
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.type === 'range' && el.dataset.k) { if (setVal(el)) sched(); }
  else if (el.id === 'vol') { S.vol = el.value / 1000; if (out) out.gain.value = S.vol; el.style.setProperty('--p', el.value / 10 + '%'); }
  else if (el.dataset.a === 'name') { const l = S.sound.layers.find(x => x.id === el.closest('.layer').dataset.id); l.name = el.value; drawLanes(); persist(); }
  else if (el.id === 'sname') { S.sound.name = el.value; persist(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.type === 'range' && el.dataset.k) { dragSnap = false; if (el.dataset.s !== 'u' && S.auto) play(); }
  else if (el.type === 'checkbox' && el.dataset.s === 'm') { snap(); S.sound.master[el.dataset.k] = el.checked; doRender(); if (S.auto) play(); }
  else if (el.id === 'auto') S.auto = el.checked;
  else if (el.id === 'seed') { const v = parseInt(el.value, 10); if (v > 0) { snap(); S.sound.seed = v >>> 0; doRender(); if (S.auto) play(); } else el.value = S.sound.seed; }
});
document.addEventListener('dblclick', e => {
  const el = e.target; if (el.type !== 'range' || !el.dataset.k || el.dataset.s === 'u') return;
  const { s, i, k } = el.dataset;
  let def;
  if (s === 'm') def = E.MASTER[k]; else { const l = S.sound.layers.find(x => x.id === i); def = (E.TYPE_DEFAULTS[l.type][k] ?? E.COMMON[k]); }
  if (def == null) return;
  const d = s === 'm' ? PM[k] : pdef(S.sound.layers.find(x => x.id === i).type, k); el.value = toX(d, def); dragSnap = false; setVal(el); dragSnap = false;
  if (s === 'm') S.sound.master[k] = def; else S.sound.layers.find(x => x.id === i)[k] = def;
  el.nextElementSibling.textContent = fmt(def, d.u); doRender(); if (S.auto) play();
});
document.addEventListener('click', e => {
  const t = e.target.closest('button,[data-a="toggle"]'); if (!t) return;
  if (t.dataset.g) return generate(t.dataset.g);
  if (t.closest('.seg[data-k]') && t.dataset.v) {
    const sg2 = t.closest('.seg'), { s, i, k } = sg2.dataset; snap();
    const l = S.sound.layers.find(x => x.id === i); l[k] = t.dataset.v;
    sg2.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === t)));
    t.closest('.layer').querySelector('.sum').textContent = summary(l);
    doRender(); if (S.auto) play(); return;
  }
  const card = t.closest('.layer');
  if (card && t.dataset.a) {
    const id = card.dataset.id, ls = S.sound.layers, idx = ls.findIndex(x => x.id === id), l = ls[idx];
    switch (t.dataset.a) {
      case 'toggle': S.open.has(id) ? S.open.delete(id) : S.open.add(id); card.classList.toggle('open'); card.querySelector('[aria-expanded]').setAttribute('aria-expanded', String(S.open.has(id))); return;
      case 'solo': snap(); l.solo = !l.solo; break;
      case 'mute': snap(); l.on = !l.on; break;
      case 'dup': { snap(); const c = E.newLayer(l.type, Object.assign({}, l, { id: undefined, name: (l.name || TNAME[l.type]) + ' copy' })); c.id = E.newLayer(l.type).id; ls.splice(idx + 1, 0, c); S.open.add(c.id); break; }
      case 'del': snap(); ls.splice(idx, 1); toast('Layer deleted. Ctrl+Z brings it back.'); break;
    }
    buildLayers(); doRender(); if (S.auto && t.dataset.a !== 'del') play(); return;
  }
  if (t.closest('#add')) { snap(); const l = E.newLayer(t.dataset.t, { name: TNAME[t.dataset.t] }); S.sound.layers.push(l); S.open.add(l.id); buildLayers(); doRender(); if (S.auto) play(); return; }
  if (t.closest('#view')) { S.view = t.dataset.v; setSeg('#view', S.view); drawAll(); return; }
  if (t.closest('#xsr')) { S.xsr = +t.dataset.v; setSeg('#xsr', S.xsr); return; }
  if (t.closest('#xbits')) { S.xbits = +t.dataset.v; setSeg('#xbits', S.xbits); return; }
  if (t.classList.contains('tile')) {
    const i = +t.dataset.vi, v = makeVar(i);
    if (e.target.dataset.use) { snap(); S.sound = JSON.parse(JSON.stringify(v.sound)); S.sound.name = S.sound.name.replace(/ \(take \d+\)$/, '') + ' (take ' + (i + 1) + ')'; afterLoad(true); play(); }
    else { try { playRes(v.res, 0, false); } catch (er) {} }
    return;
  }
  if (t.dataset.li) { snap(); S.sound = cleanSound(JSON.parse(JSON.stringify(lib[+t.dataset.li]))); afterLoad(false); play(); return; }
  if (t.dataset.ld) { const n = lib[+t.dataset.ld].name; lib.splice(+t.dataset.ld, 1); store.set('sfxforge.lib', lib); buildLib(); toast('Removed ' + n); return; }
  switch (t.id) {
    case 'play': return play();
    case 'regen': return generate(S.sound.cat || 'rifle');
    case 'mutate': return mutate();
    case 'undo': return undo();
    case 'redo': return redo();
    case 'newtakes': S.vbase += 100; varsDirty(); return;
    case 'burst': return burst();
    case 'save': { const c = JSON.parse(JSON.stringify(S.sound)); const at = lib.findIndex(x => x.name === c.name); if (at >= 0) lib[at] = c; else lib.unshift(c); store.set('sfxforge.lib', lib); buildLib(); toast('Saved “' + c.name + '”'); return; }
    case 'xwav': return exportWav();
    case 'xpack': return exportPack();
    case 'xkit': return exportKit();
    case 'xcopy': { const j = JSON.stringify(S.sound, null, 1); const ok = () => toast('Preset JSON copied'); try { navigator.clipboard.writeText(j).then(ok, () => openModal(j, false)); } catch (er) { openModal(j, false); } return; }
    case 'ximp': return openModal('', true);
    case 'mclose': return closeModal();
    case 'mload': try { const s = cleanSound(JSON.parse($('#mtext').value)); snap(); S.sound = s; closeModal(); afterLoad(false); play(); } catch (er) { toast('That isn’t a valid preset: ' + er.message); } return;
  }
});
$('#fig').addEventListener('click', play);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') return closeModal();
  const tag = e.target.tagName, typing = (tag === 'INPUT' && e.target.type !== 'range' && e.target.type !== 'checkbox') || tag === 'TEXTAREA';
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { if (typing) return; e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { if (typing) return; e.preventDefault(); redo(); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space' && tag !== 'BUTTON') { e.preventDefault(); play(); }
  else if (e.key === 'g' || e.key === 'G') generate(S.sound.cat || 'rifle');
  else if (e.key === 'm' || e.key === 'M') mutate();
});
const ro = new ResizeObserver(() => { if (S.res) { drawAll(); S.vars.forEach((v, i) => v && drawTile(i)); } });

/* ---------- boot ---------- */
function start(data) {
  lib = store.get('sfxforge.lib', []);
  let s = data && data.sound;
  if (!s) s = store.get('sfxforge.cur', null);
  try { S.sound = s ? cleanSound(s) : null; } catch (e) { S.sound = null; }
  if (!S.sound) S.sound = G.generate('rifle', 20261121);
  buildGens(); buildLib(); buildUX();
  $('#vol').style.setProperty('--p', '70%');
  afterLoad(false); updUndo();
  ro.observe($('#fig'));
  if (window.claude && window.claude.use) window.claude.use('downloads').then(d => { DL = d; if (d) { $('#xwav').textContent = 'Download WAV (.zip)'; $('#xnote').textContent = 'Here, audio arrives zipped. Channels follow the Mono switch on the master bus; mono is usually right for sounds your engine positions in 3D.'; } }, () => {});
}
const hot = window.claude && window.claude.hot;
if (hot && hot.snapshot) hot.snapshot(() => ({ sound: S.sound }));
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
}
