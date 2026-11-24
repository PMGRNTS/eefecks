/* SFX Forge engine — deterministic layered sound synthesis in plain JS.
   render(sound, {sr}) -> {L, R, sr, spans, peak, rms}. No dependencies. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;

  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dbToLin(d) { return Math.pow(10, d / 20); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) t[k] = s[k]; } return t; }

  var COMMON = {
    on: true, solo: false, name: '', gain: 0, pan: 0, delay: 0,
    atk: 0.5, hold: 0, dec: 250, curve: 3,
    dir: 'fwd',
    fType: 'off', cut: 4000, q: 0.707, fEnv: 0, fEnvT: 80, fMod: 0, fModRate: 2, fModShape: 'sine',
    trem: 0, tremRate: 12, tremShape: 'sine',
    drive: 0, bits: 0, ds: 1,
    rep: 1, repInt: 80, repDecay: 0.7, repPitch: 0, repJit: 0
  };
  var TYPE_DEFAULTS = {
    osc: { wave: 'sine', f0: 440, f1: 440, sweep: 100, sweepCurve: 2, pw: 0.5, jumpT: 0, jumpSemi: 0, fmRatio: 2, fmIndex: 0, fmDecay: 200, uni: 1, detune: 12, vibRate: 6, vibDepth: 0, vibShape: 'sine' },
    noise: { color: 'white', density: 2000 },
    metal: { mode: 'bar', f0: 800, partials: 6, ring: 500, damp: 1, tilt: 1, spread: 0.01, dec: 800, curve: 1.5 },
    string: { f0: 220, ring: 800, bright: 0.5, pick: 0.7, dec: 1200, curve: 1.2 },
    pulse: { f0: 30, f1: 30, sweep: 300, sweepCurve: 2, pShape: 'noise', width: 4, tone: 180, pJit: 0, accent: 0, dec: 600, curve: 1.5 },
    bubble: { f0: 600, scatter: 1, density: 12, rise: 0.8, ring: 40, dec: 600, curve: 1.5 }
  };
  var MASTER = {
    pitch: 0, time: 1, gain: 0, drive: 0, lowcut: 20, highcut: 20000,
    compThr: 0, compRatio: 1, compAtk: 2, compRel: 120,
    revMix: 0, revSize: 0.5, revDamp: 0.5, revPre: 10,
    echoMix: 0, echoTime: 180, echoFb: 0.3, echoPP: true,
    width: 1, norm: -1, mono: false
  };
  var uid = 0;
  function newLayer(type, o) {
    var id = 'L' + Date.now().toString(36) + (uid++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    return assign({ id: id, type: type }, COMMON, TYPE_DEFAULTS[type], o);
  }
  function newSound(o) {
    o = o || {};
    var s = assign({ name: 'Untitled', cat: '', seed: 1, layers: [] }, o);
    s.master = assign({}, MASTER, o.master);
    return s;
  }

  /* ---------- filters ---------- */
  function SVF() { this.ic1 = 0; this.ic2 = 0; this.a1 = 0; this.a2 = 0; this.a3 = 0; this.k = 1; }
  SVF.prototype.set = function (fc, Q, sr) {
    var g = Math.tan(Math.PI * clamp(fc, 10, sr * 0.49) / sr);
    this.k = 1 / Math.max(0.05, Q);
    this.a1 = 1 / (1 + g * (g + this.k)); this.a2 = g * this.a1; this.a3 = g * this.a2;
  };
  SVF.prototype.run = function (v0, mode) {
    var v3 = v0 - this.ic2;
    var v1 = this.a1 * this.ic1 + this.a2 * v3;
    var v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1; this.ic2 = 2 * v2 - this.ic2;
    if (mode === 'lp') return v2;
    if (mode === 'hp') return v0 - this.k * v1 - v2;
    if (mode === 'bp') return v1 * this.k;
    return v0 - this.k * v1; // notch
  };
  function blep(t, dt) {
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  }

  /* modulation source: sine, smooth random 'wander', or stepped random 'step'. Returns t -> -1..1 */
  function lfo(shape, rate, rr) {
    if (shape !== 'wander' && shape !== 'step') return function (t) { return Math.sin(TAU * rate * t); };
    var k = -1, a = 0, b = rr() * 2 - 1;
    return function (t) {
      var ph = t * rate, kk = Math.floor(ph);
      while (k < kk) { k++; a = b; b = rr() * 2 - 1; }
      if (shape === 'step') return a;
      var f = ph - kk; f = f * f * (3 - 2 * f);
      return a + (b - a) * f;
    };
  }

  /* ---------- sources ---------- */
  function srcOsc(l, out, sr, pm, tm, r) {
    var N = out.length, f0 = l.f0 * pm, f1 = l.f1 * pm;
    var sw = Math.max(0.0005, l.sweep * tm / 1000), sc = l.sweepCurve, lr = Math.log(f1 / f0);
    var jT = l.jumpT > 0 ? l.jumpT * tm / 1000 : -1, jM = Math.pow(2, l.jumpSemi / 12);
    var U = clamp(l.uni | 0, 1, 7), ph = new Float64Array(U), det = new Float64Array(U), v;
    for (v = 0; v < U; v++) { ph[v] = U > 1 ? r() : 0; det[v] = U > 1 ? Math.pow(2, l.detune * (v / (U - 1) * 2 - 1) / 1200) : 1; }
    var norm = 1 / Math.sqrt(U), mp = 0, fmD = Math.max(0.005, l.fmDecay * tm / 1000);
    var wave = l.wave, pw = clamp(l.pw, 0.02, 0.98), vr = l.vibRate, vd = l.vibDepth / 1200, fmI = l.fmIndex, fmR = l.fmRatio;
    var dc = 2 * pw - 1, nyq = sr * 0.45;
    var vib = vd > 0 ? lfo(l.vibShape, vr, l.vibShape === 'wander' || l.vibShape === 'step' ? rng((r() * 4294967296) >>> 0) : null) : null;
    for (var i = 0; i < N; i++) {
      var t = i / sr, p = t < sw ? t / sw : 1;
      var f = f0 * Math.exp(lr * (1 - Math.pow(1 - p, sc)));
      if (jT >= 0 && t >= jT) f *= jM;
      if (vib) f *= Math.pow(2, vd * vib(t));
      if (f > nyq) f = nyq;
      var pmod = 0;
      if (fmI > 0) {
        pmod = fmI * Math.exp(-t / fmD) * Math.sin(TAU * mp) / TAU;
        mp += f * fmR / sr; mp -= Math.floor(mp);
      }
      var acc = 0;
      for (v = 0; v < U; v++) {
        var dt = Math.min(0.45, f * det[v] / sr);
        var p2 = ph[v] + pmod; p2 -= Math.floor(p2);
        var y;
        if (wave === 'sine') y = Math.sin(TAU * p2);
        else if (wave === 'triangle') y = 1 - 4 * Math.abs(p2 - 0.5);
        else if (wave === 'saw') y = 2 * p2 - 1 - blep(p2, dt);
        else {
          y = (p2 < pw ? 1 : -1) + blep(p2, dt);
          var q2 = p2 - pw; if (q2 < 0) q2 += 1;
          y -= blep(q2, dt); y -= dc;
        }
        acc += y;
        ph[v] += dt; if (ph[v] >= 1) ph[v] -= 1;
      }
      out[i] = acc * norm;
    }
  }

  function srcNoise(l, out, sr, pm, tm, r) {
    var N = out.length, c = l.color;
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0, ce = 0;
    var pd = l.density * pm / sr, cd = Math.exp(-1 / (0.0006 * sr * tm));
    for (var i = 0; i < N; i++) {
      var w = r() * 2 - 1, y;
      if (c === 'white') y = w;
      else if (c === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        y = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.12; b6 = w * 0.115926;
      } else if (c === 'brown') { br = (br + 0.02 * w) / 1.02; y = br * 3.5; }
      else { ce *= cd; if (r() < pd) ce = Math.max(ce, 0.25 + 0.75 * r()); y = ce * w; }
      out[i] = y;
    }
  }

  var RATIOS = {
    bar: [1, 2.756, 5.404, 8.933, 13.344, 18.64, 24.81, 31.87, 39.8, 48.6, 58.3, 68.9, 80.3, 92.6, 105.8, 119.9],
    bell: [0.5, 1, 1.19, 1.5, 2, 2.5, 2.66, 3.01, 4.17, 5.43, 6.8, 8.21, 9.7, 11.2, 12.8, 14.5],
    plate: [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.6, 3.652, 4.06, 4.15, 4.6, 5.1, 5.4, 6],
    glass: [1, 2.32, 4.25, 6.63, 9.38, 12.5, 15.9, 19.7, 23.8, 28.2, 32.9, 37.9, 43.2, 48.8, 54.7, 60.9],
    tube: [1, 2.01, 3.03, 4.06, 5.1, 6.15, 7.21, 8.28, 9.36, 10.45, 11.55, 12.66, 13.78, 14.91, 16.05, 17.2]
  };
  function srcMetal(l, out, sr, pm, tm, r) {
    var N = out.length, ratios = RATIOS[l.mode], k;
    if (!ratios) { ratios = [1]; var x = 1; for (k = 1; k < 16; k++) { x += 0.3 + r() * 1.4; ratios.push(x); } }
    var K = clamp(l.partials | 0, 1, ratios.length), ring = Math.max(0.005, l.ring * tm / 1000), sum = 0, r0 = ratios[0];
    for (k = 0; k < K; k++) {
      var ratio = ratios[k] * (1 + l.spread * (r() * 2 - 1));
      var f = l.f0 * pm * ratio, ph = r() * TAU;
      if (f >= sr * 0.45 || f < 15) continue;
      var a = 1 / Math.pow(k + 1, l.tilt), tau = ring / Math.pow(Math.max(1, ratio / r0), l.damp);
      var d = Math.exp(-1 / (tau * sr)), w = TAU * f / sr, cw = Math.cos(w) * d, sw = Math.sin(w) * d;
      var re = Math.cos(ph) * a, im = Math.sin(ph) * a;
      for (var i = 0; i < N; i++) { out[i] += im; var nr = re * cw - im * sw; im = re * sw + im * cw; re = nr; }
      sum += a;
    }
    if (sum > 0) { var g = 1.5 / sum; for (var j = 0; j < N; j++) out[j] *= g; }
  }

  function srcString(l, out, sr, pm, tm, r) {
    var N = out.length, f = clamp(l.f0 * pm, 20, sr * 0.3), D = sr / f, ring = Math.max(0.01, l.ring * tm / 1000);
    var g = Math.pow(10, -3 / (f * ring)), s = 0.5 * (1 - clamp(l.bright, 0, 1)), Dn = Math.ceil(D), lp = 0, pc = 0.05 + 0.95 * clamp(l.pick, 0, 1);
    for (var i = 0; i < N; i++) {
      var y = 0;
      if (i < Dn) { lp += pc * ((r() * 2 - 1) - lp); y = lp; }
      var m = i - D;
      if (m >= 1) {
        var mi = Math.floor(m), fr = m - mi;
        var a = out[mi] * (1 - fr) + out[mi + 1] * fr, b = out[mi - 1] * (1 - fr) + out[mi] * fr;
        y += g * ((1 - s) * a + s * b);
      }
      out[i] = y;
    }
  }
  /* Pulse: a train of short events whose rate sweeps f0 -> f1. Engines, ratchets, motors, Geiger counters, creaks. */
  function srcPulse(l, out, sr, pm, tm, r) {
    var N = out.length, f0 = Math.max(0.1, l.f0 * pm), f1 = Math.max(0.1, l.f1 * pm), lr = Math.log(f1 / f0);
    var sw = Math.max(0.0005, l.sweep * tm / 1000), sc = l.sweepCurve, jit = clamp(l.pJit, 0, 1), acc = clamp(l.accent, 0, 1);
    var tau = Math.max(0.05, l.width) / 1000, shape = l.pShape, w = TAU * clamp(l.tone * pm, 10, sr * 0.45) / sr;
    var E = Math.min(N, Math.ceil(tau * (shape === 'click' ? 8 : 6) * sr) + 2), ev = new Float32Array(E), k;
    var dk = Math.exp(-1 / (tau * sr));
    if (shape === 'click') { for (k = 0; k < E; k++) { var x = k / (tau * sr); ev[k] = Math.exp(-x) * (1 - x); } }
    else if (shape === 'tone') { var a = 1; for (k = 0; k < E; k++) { ev[k] = Math.sin(w * k) * a; a *= dk; } }
    var i = 0;
    while (i < N) {
      var t = i / sr, p = t < sw ? t / sw : 1, f = f0 * Math.exp(lr * (1 - Math.pow(1 - p, sc)));
      var g = (1 - acc * r()) / Math.sqrt(1 + f * tau * 2), m = Math.min(E, N - i);
      if (shape === 'noise') { var b = g; for (k = 0; k < m; k++) { out[i + k] += (r() * 2 - 1) * b; b *= dk; } }
      else for (k = 0; k < m; k++) out[i + k] += ev[k] * g;
      var per = (1 - jit) + jit * -Math.log(1 - r() * 0.999);
      i += Math.max(1, Math.round(per * sr / f));
    }
  }

  /* Bubble: scattered sine chirps that rise as they decay (Minnaert resonance). Water, potions, lava, slime. */
  function srcBubble(l, out, sr, pm, tm, r) {
    var N = out.length, f0 = l.f0 * pm, sc = clamp(l.scatter, 0, 4), rate = Math.max(0.05, l.density / tm);
    var ring = Math.max(1, l.ring) * tm / 1000, rise = l.rise, norm = 1 / Math.sqrt(1 + rate * ring), t = 0;
    while (t * sr < N) {
      var fi = clamp(f0 * Math.pow(2, (r() * 2 - 1) * sc * 0.5), 20, sr * 0.4), q = Math.sqrt(f0 / fi);
      var tau = ring * clamp(q, 0.3, 3), a = (0.35 + 0.65 * r()) * Math.min(2, q) * norm;
      var i0 = Math.round(t * sr), len = Math.min(N - i0, Math.ceil(tau * 5 * sr)), ph = 0, at = Math.max(1, 0.0004 * sr);
      var dk = Math.exp(-1 / (tau * sr)), env = a, kr = rise / (tau * 3 * sr);
      for (var k = 0; k < len; k++) {
        var f = fi * Math.pow(2, Math.min(rise * 2, k * kr));
        if (f > sr * 0.45) break;
        ph += TAU * f / sr;
        out[i0 + k] += Math.sin(ph) * env * (k < at ? k / at : 1);
        env *= dk;
      }
      t += -Math.log(1 - r() * 0.999) / rate;
    }
  }
  var SOURCES = { osc: srcOsc, noise: srcNoise, metal: srcMetal, string: srcString, pulse: srcPulse, bubble: srcBubble };

  /* ---------- one hit of a layer ---------- */
  function hit(l, sr, pm, tm, seed) {
    var r = rng(seed);
    var atk = Math.max(0.05, l.atk) * tm / 1000, hold = Math.max(0, l.hold) * tm / 1000, dec = Math.max(1, l.dec) * tm / 1000;
    var N = Math.max(8, Math.ceil((atk + hold + dec) * sr) + 1);
    var out = new Float32Array(N);
    SOURCES[l.type](l, out, sr, pm, tm, r);
    var svf = l.fType && l.fType !== 'off' ? new SVF() : null, mode = l.fType;
    var cut0 = l.cut * pm, fT = Math.max(1, l.fEnvT) * tm / 1000, fA = l.fEnv, Q = l.q;
    var fM = svf && l.fMod ? l.fMod : 0, fLfo = fM ? lfo(l.fModShape, Math.max(0.01, l.fModRate) / tm, rng((seed ^ 0x5BD1E995) >>> 0)) : null;
    var drv = l.drive > 0 ? 1 + l.drive * 16 : 0, drvN = drv ? 1 / Math.tanh(drv) : 1;
    var qz = l.bits > 0 ? Math.pow(2, clamp(l.bits, 1, 16) - 1) : 0, ds = Math.max(1, l.ds | 0), hs = 0;
    var tr = l.trem, trR = l.tremRate, trS = 1, trLast = -1, shape = l.tremShape, curve = l.curve;
    for (var i = 0; i < N; i++) {
      var t = i / sr, x = out[i];
      if (svf) {
        if ((i & 3) === 0) svf.set(cut0 * (fA ? Math.pow(2, fA * Math.exp(-t / fT)) : 1) * (fM ? Math.pow(2, fM * fLfo(t)) : 1), Q, sr);
        x = svf.run(x, mode);
      }
      var e;
      if (t < atk) e = t / atk;
      else if (t < atk + hold) e = 1;
      else { var u = (t - atk - hold) / dec; e = u >= 1 ? 0 : Math.pow(1 - u, curve); }
      if (tr > 0) {
        var phs = t * trR, m;
        if (shape === 'square') m = (phs % 1) < 0.5 ? 1 : 0;
        else if (shape === 'saw') m = 1 - (phs % 1);
        else if (shape === 'random') { var kk = Math.floor(phs); if (kk !== trLast) { trLast = kk; trS = r(); } m = trS; }
        else m = 0.5 + 0.5 * Math.cos(TAU * phs);
        e *= 1 - tr * (1 - m);
      }
      x *= e;
      if (drv) x = Math.tanh(x * drv) * drvN;
      if (qz) x = Math.round(x * qz) / qz;
      if (ds > 1) { if (i % ds === 0) hs = x; x = hs; }
      out[i] = x;
    }
    if (l.dir === 'rev') out.reverse();
    return out;
  }

  /* ---------- master effects ---------- */
  function freeverb(L, R, sr, size, damp, mix, pre) {
    var sc = sr / 44100, CT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AT = [556, 441, 341, 225];
    var fb = 0.7 + 0.28 * size, d1 = damp * 0.4, d2 = 1 - d1, N = L.length;
    function mk(t, sp) { return t.map(function (x) { return { b: new Float32Array(Math.round((x + sp) * sc)), i: 0, f: 0 }; }); }
    var cL = mk(CT, 0), cR = mk(CT, 23), aL = mk(AT, 0), aR = mk(AT, 23);
    var P = Math.max(1, Math.round(pre / 1000 * sr)), pb = new Float32Array(P), pi = 0, j, c;
    var dryG = 1 - mix * 0.35, wetG = mix * 2.2;
    for (var n = 0; n < N; n++) {
      var inp = pb[pi]; pb[pi] = (L[n] + R[n]) * 0.5 * 0.015; pi = (pi + 1) % P;
      var oL = 0, oR = 0, y;
      for (j = 0; j < 8; j++) {
        c = cL[j]; y = c.b[c.i]; c.f = y * d2 + c.f * d1; c.b[c.i] = inp + c.f * fb; if (++c.i >= c.b.length) c.i = 0; oL += y;
        c = cR[j]; y = c.b[c.i]; c.f = y * d2 + c.f * d1; c.b[c.i] = inp + c.f * fb; if (++c.i >= c.b.length) c.i = 0; oR += y;
      }
      for (j = 0; j < 4; j++) {
        c = aL[j]; y = c.b[c.i]; c.b[c.i] = oL + y * 0.5; oL = y - oL; if (++c.i >= c.b.length) c.i = 0;
        c = aR[j]; y = c.b[c.i]; c.b[c.i] = oR + y * 0.5; oR = y - oR; if (++c.i >= c.b.length) c.i = 0;
      }
      L[n] = L[n] * dryG + oL * wetG; R[n] = R[n] * dryG + oR * wetG;
    }
  }
  function echo(L, R, sr, time, fbk, mix, pp) {
    var D = Math.max(1, Math.round(time / 1000 * sr)), bL = new Float32Array(D), bR = new Float32Array(D), idx = 0, lL = 0, lR = 0;
    for (var n = 0; n < L.length; n++) {
      var dl = bL[idx], dr = bR[idx];
      lL += 0.45 * (dl - lL); lR += 0.45 * (dr - lR);
      if (pp) { bL[idx] = (L[n] + R[n]) * 0.5 + fbk * lR; bR[idx] = fbk * lL; }
      else { bL[idx] = L[n] + fbk * lL; bR[idx] = R[n] + fbk * lR; }
      L[n] += mix * dl; R[n] += mix * dr;
      if (++idx >= D) idx = 0;
    }
  }

  /* ---------- render ---------- */
  function render(sound, opt) {
    opt = opt || {};
    var sr = opt.sr || 48000, M = assign({}, MASTER, sound.master);
    var pm = Math.pow(2, M.pitch / 12), tm = clamp(M.time, 0.1, 8), seed = sound.seed >>> 0;
    var layers = sound.layers || [], anySolo = layers.some(function (l) { return l.solo && l.on; });
    var tracks = [], spans = [], end = 0;
    layers.forEach(function (l, li) {
      if (!l.on || (anySolo && !l.solo) || !SOURCES[l.type]) return;
      var base = ((seed ^ Math.imul(li + 1, 0x9E3779B1)) >>> 0), r = rng(base + 17);
      var reps = clamp(l.rep | 0, 1, 32), hits = [], len = 0;
      for (var k = 0; k < reps; k++) {
        var off = k === 0 ? 0 : Math.max(0, (k * l.repInt + (r() * 2 - 1) * l.repJit) * tm / 1000);
        var h = hit(l, sr, pm * Math.pow(2, k * l.repPitch / 12), tm, (base + k * 101) >>> 0);
        var o = Math.round(off * sr);
        hits.push([h, o, Math.pow(l.repDecay, k)]); len = Math.max(len, o + h.length);
      }
      var buf = new Float32Array(len);
      hits.forEach(function (hh) { var hb = hh[0], ho = hh[1], hg = hh[2]; for (var i = 0; i < hb.length; i++) buf[ho + i] += hb[i] * hg; });
      var start = Math.round(Math.max(0, l.delay) * tm / 1000 * sr), gl = dbToLin(l.gain), ang = (clamp(l.pan, -1, 1) + 1) * Math.PI / 4;
      tracks.push({ buf: buf, start: start, gL: gl * Math.cos(ang) * Math.SQRT2, gR: gl * Math.sin(ang) * Math.SQRT2 });
      end = Math.max(end, start + len);
      spans.push({ id: l.id, type: l.type, start: start / sr, end: (start + len) / sr });
    });
    var revTail = M.revMix > 0.001 ? 0.25 + M.revSize * 4.5 + M.revPre / 1000 : 0;
    var echoTail = M.echoMix > 0.001 ? Math.min(4, M.echoTime / 1000 * Math.log(0.001) / Math.log(clamp(M.echoFb, 0.01, 0.95))) : 0;
    var total = Math.min(Math.round(sr * 10), Math.max(Math.round(sr * 0.02), end + Math.round((Math.max(revTail, echoTail) + 0.03) * sr)));
    var L = new Float32Array(total), R = new Float32Array(total), n, i;
    tracks.forEach(function (t) { for (var i = 0; i < t.buf.length && t.start + i < total; i++) { var x = t.buf[i]; L[t.start + i] += x * t.gL; R[t.start + i] += x * t.gR; } });

    var pk = 0;
    for (n = 0; n < total; n++) pk = Math.max(pk, Math.abs(L[n]), Math.abs(R[n]));
    if (pk > 0) {
      var pre = 0.9 / pk * dbToLin(M.gain);
      for (n = 0; n < total; n++) { L[n] *= pre; R[n] *= pre; }
      if (M.lowcut > 20.5 || M.highcut < 19999) {
        [L, R].forEach(function (ch) {
          var hp = M.lowcut > 20.5 ? new SVF() : null, lp = M.highcut < 19999 ? new SVF() : null;
          if (hp) hp.set(M.lowcut, 0.707, sr); if (lp) lp.set(M.highcut, 0.707, sr);
          for (var i = 0; i < ch.length; i++) { var x = ch[i]; if (hp) x = hp.run(x, 'hp'); if (lp) x = lp.run(x, 'lp'); ch[i] = x; }
        });
      }
      if (M.drive > 0.001) { var d = 1 + M.drive * 8, dn = 1 / Math.tanh(d); for (n = 0; n < total; n++) { L[n] = Math.tanh(L[n] * d) * dn; R[n] = Math.tanh(R[n] * d) * dn; } }
      if (M.compRatio > 1.01) {
        var att = Math.exp(-1 / (Math.max(0.05, M.compAtk) / 1000 * sr)), rel = Math.exp(-1 / (Math.max(1, M.compRel) / 1000 * sr)), env = 0, sl = 1 - 1 / M.compRatio;
        for (n = 0; n < total; n++) {
          var lv = Math.max(Math.abs(L[n]), Math.abs(R[n])), over = 20 * Math.log10(lv + 1e-9) - M.compThr, gr = over > 0 ? over * sl : 0;
          env = gr > env ? att * env + (1 - att) * gr : rel * env + (1 - rel) * gr;
          var g = Math.pow(10, -env / 20); L[n] *= g; R[n] *= g;
        }
      }
      if (M.echoMix > 0.001) echo(L, R, sr, M.echoTime, clamp(M.echoFb, 0, 0.95), M.echoMix, M.echoPP);
      if (M.revMix > 0.001) freeverb(L, R, sr, clamp(M.revSize, 0, 1), clamp(M.revDamp, 0, 1), clamp(M.revMix, 0, 1), M.revPre);
      if (Math.abs(M.width - 1) > 0.001) { for (n = 0; n < total; n++) { var mid = (L[n] + R[n]) * 0.5, side = (L[n] - R[n]) * 0.5 * M.width; L[n] = mid + side; R[n] = mid - side; } }
    }
    if (M.mono) for (n = 0; n < total; n++) { L[n] = R[n] = (L[n] + R[n]) * 0.5; }
    pk = 0;
    for (n = 0; n < total; n++) pk = Math.max(pk, Math.abs(L[n]), Math.abs(R[n]));
    if (pk > 0 && M.norm != null) { var ng = dbToLin(M.norm) / pk; for (n = 0; n < total; n++) { L[n] *= ng; R[n] *= ng; } pk = dbToLin(M.norm); }
    var th = pk * dbToLin(-70), last = 0;
    for (n = total - 1; n >= 0; n--) if (Math.abs(L[n]) > th || Math.abs(R[n]) > th) { last = n; break; }
    var len2 = Math.min(total, Math.max(last + Math.round(0.01 * sr), Math.round(end * 1)));
    len2 = Math.max(len2, Math.round(0.02 * sr));
    L = L.slice(0, len2); R = R.slice(0, len2);
    var fade = Math.min(len2, Math.round(0.008 * sr));
    for (i = 0; i < fade; i++) { var fg = i / fade; L[len2 - 1 - i] *= fg; R[len2 - 1 - i] *= fg; }
    // short-term level: loudest 100 ms RMS window
    var W = Math.round(0.1 * sr), acc = 0, best = 0;
    for (n = 0; n < len2; n++) { var sq = (L[n] * L[n] + R[n] * R[n]) * 0.5; acc += sq; if (n >= W) { var o2 = n - W; acc -= (L[o2] * L[o2] + R[o2] * R[o2]) * 0.5; } best = Math.max(best, acc); }
    var rms = Math.sqrt(best / Math.min(W, len2));
    return { L: L, R: R, sr: sr, spans: spans, peak: pk, rms: rms, mono: !!M.mono, duration: len2 / sr };
  }

  /* ---------- variation: a subtly different take, for round-robin playback ---------- */
  function vary(sound, vseed, amt) {
    if (amt == null) amt = 0.5;
    var r = rng((vseed >>> 0) * 2654435761 + 7), s = JSON.parse(JSON.stringify(sound));
    function j(x) { return (r() * 2 - 1) * x * amt; }
    s.seed = ((sound.seed >>> 0) + Math.imul(vseed + 1, 7919)) >>> 0;
    s.master = assign({}, MASTER, s.master);
    s.master.pitch += j(1.6);
    s.master.time *= 1 + j(0.12);
    s.layers.forEach(function (l) {
      l.gain += j(2.5);
      l.cut *= 1 + j(0.25);
      var fm = 1 + j(0.035); if (l.f0) l.f0 *= fm; if (l.f1) l.f1 *= fm;
      l.dec *= 1 + j(0.15);
      if (l.delay > 0) l.delay = Math.max(0, l.delay * (1 + j(0.1)));
    });
    return s;
  }

  /* ---------- file encoders ---------- */
  function encodeWav(res, opt) {
    opt = opt || {};
    var bits = opt.bits || 16, ch = opt.mono || res.mono ? 1 : 2, N = res.L.length, bps = bits / 8;
    var data = N * ch * bps, buf = new ArrayBuffer(44 + data), v = new DataView(buf), p = 0;
    function s4(x) { for (var i = 0; i < 4; i++) v.setUint8(p++, x.charCodeAt(i)); }
    function u32(x) { v.setUint32(p, x, true); p += 4; } function u16(x) { v.setUint16(p, x, true); p += 2; }
    s4('RIFF'); u32(36 + data); s4('WAVE'); s4('fmt '); u32(16); u16(bits === 32 ? 3 : 1); u16(ch); u32(res.sr);
    u32(res.sr * ch * bps); u16(ch * bps); u16(bits); s4('data'); u32(data);
    for (var n = 0; n < N; n++) {
      for (var c = 0; c < ch; c++) {
        var x = ch === 1 ? (res.L[n] + res.R[n]) * 0.5 : (c ? res.R[n] : res.L[n]);
        x = clamp(x, -1, 1);
        if (bits === 32) { v.setFloat32(p, x, true); p += 4; }
        else if (bits === 24) { var q = Math.round(x * 8388607); v.setUint8(p++, q & 255); v.setUint8(p++, (q >> 8) & 255); v.setUint8(p++, (q >> 16) & 255); }
        else { v.setInt16(p, Math.round(x * 32767), true); p += 2; }
      }
    }
    return new Uint8Array(buf);
  }
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(d) { var c = 0xFFFFFFFF; for (var i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    var now = new Date(), dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
    var dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
      h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, csize, true); e.setUint32(16, off, true);
    var all = parts.concat(central, [new Uint8Array(e.buffer)]), total = all.reduce(function (a, b) { return a + b.length; }, 0);
    var outb = new Uint8Array(total), q = 0;
    all.forEach(function (a) { outb.set(a, q); q += a.length; });
    return outb;
  }
  function toAudioBuffer(ctx, res) {
    var ch = res.mono ? 1 : 2, b = ctx.createBuffer(ch, res.L.length, res.sr);
    b.copyToChannel(res.L, 0); if (ch === 2) b.copyToChannel(res.R, 1);
    return b;
  }

  var api = { render: render, vary: vary, newLayer: newLayer, newSound: newSound, rng: rng, encodeWav: encodeWav, zip: zip, toAudioBuffer: toAudioBuffer, COMMON: COMMON, TYPE_DEFAULTS: TYPE_DEFAULTS, MASTER: MASTER, version: '1.1' };
  root.SFXEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
