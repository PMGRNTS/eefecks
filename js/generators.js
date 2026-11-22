/* SFX Forge generators — each builds a layered design with randomness inside musically sane ranges. */
(function (root) {
  'use strict';
  var E = root.SFXEngine;
  function O(o) { return E.newLayer('osc', o); }
  function Nz(o) { return E.newLayer('noise', o); }
  function Mt(o) { return E.newLayer('metal', o); }
  function St(o) { return E.newLayer('string', o); }
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function H(r) {
    return {
      n: function (a, b) { return a + (b - a) * r(); },
      lg: function (a, b) { return a * Math.pow(b / a, r()); },
      pick: function (a) { return a[Math.floor(r() * a.length)]; },
      ch: function (p) { return r() < p; },
      i: function (a, b) { return a + Math.floor(r() * (b - a + 1)); }
    };
  }

  function gun(h, c) {
    return {
      layers: [
        Nz({ name: 'Crack', color: 'white', atk: 0.05, hold: h.n(1, 3), dec: h.n(15, 32) * (0.7 + c * 0.5), curve: 4, fType: 'hp', cut: h.lg(1600, 3200), q: 0.8, drive: 0.3, gain: 0 }),
        Nz({ name: 'Blast', color: 'pink', atk: 0.1, hold: h.n(3, 8), dec: h.n(80, 160) * (0.6 + c * 0.8), curve: 4.5, fType: 'lp', cut: h.lg(900, 2000), q: 1.1, fEnv: h.n(1.5, 2.6), fEnvT: h.n(20, 50), drive: 0.35, gain: -1 }),
        O({ name: 'Body', wave: 'sine', f0: h.lg(140, 220) * (1.3 - c * 0.4), f1: h.lg(40, 58), sweep: h.n(40, 80), sweepCurve: 2.5, atk: 0.1, hold: 2, dec: h.n(100, 200) * (0.6 + c * 0.7), curve: 3, drive: 0.25, gain: -3 + c * 3 }),
        Mt({ name: 'Mechanism', mode: h.pick(['plate', 'random']), f0: h.lg(1800, 3600), partials: 6, ring: h.n(35, 80), damp: 1.2, tilt: 0.8, spread: 0.02, atk: 0.1, dec: 120, curve: 2, delay: h.n(1, 5), gain: h.n(-20, -13), pan: h.n(-0.2, 0.2) }),
        Nz({ name: 'Tail', color: 'brown', atk: h.n(6, 15), dec: h.n(300, 700) * (0.5 + c), curve: 2.5, fType: 'lp', cut: h.lg(350, 800), q: 0.7, delay: h.n(8, 20), gain: h.n(-14, -8) })
      ],
      master: { lowcut: 35, highcut: 16000, drive: 0.2, compThr: -16, compRatio: 5, compAtk: 0.5, compRel: 90, revMix: h.n(0.06, 0.14) + c * 0.04, revSize: h.n(0.5, 0.75), revDamp: 0.5, revPre: 10, echoMix: h.n(0.05, 0.12), echoTime: h.n(160, 320), echoFb: h.n(0.15, 0.3), width: 0.8 }
    };
  }

  var LIST = [
    /* ---------------- weapons ---------------- */
    { id: 'rifle', label: 'Rifle', group: 'Weapons', fn: function (h) { return gun(h, h.n(0.55, 0.85)); } },
    { id: 'pistol', label: 'Pistol', group: 'Weapons', fn: function (h) {
      var g = gun(h, h.n(0.15, 0.4));
      g.layers[3].gain = h.n(-12, -8); g.layers[3].ring = h.n(50, 110);
      g.master.echoMix *= 0.7; return g;
    } },
    { id: 'sniper', label: 'Sniper', group: 'Weapons', fn: function (h) {
      return {
        layers: [
          Nz({ name: 'Supersonic crack', color: 'white', atk: 0.05, hold: 1, dec: h.n(14, 24), curve: 5, fType: 'hp', cut: h.lg(2400, 4200), q: 0.9, drive: 0.55, gain: 1 }),
          Nz({ name: 'Snap', color: 'white', atk: 0.05, dec: h.n(6, 10), curve: 3, fType: 'bp', cut: h.lg(4500, 7000), q: 2, gain: -4 }),
          Nz({ name: 'Blast', color: 'pink', atk: 0.1, hold: h.n(6, 12), dec: h.n(220, 320), curve: 4, fType: 'lp', cut: h.lg(1100, 1800), q: 1, fEnv: h.n(2, 3), fEnvT: h.n(30, 60), drive: 0.4, gain: -1 }),
          O({ name: 'Body', wave: 'sine', f0: h.lg(110, 140), f1: h.lg(30, 40), sweep: h.n(100, 150), sweepCurve: 2.5, atk: 0.1, hold: 4, dec: h.n(300, 420), curve: 2.8, drive: 0.35, gain: 0 }),
          Nz({ name: 'Distant tail', color: 'brown', atk: h.n(20, 40), dec: h.n(1300, 2000), curve: 2.2, fType: 'lp', cut: h.lg(320, 600), q: 0.7, delay: 20, gain: h.n(-10, -7) }),
          Mt({ name: 'Bolt ring', mode: 'plate', f0: h.lg(1500, 2400), partials: 7, ring: 90, damp: 1, delay: 3, dec: 160, gain: -18 })
        ],
        master: { lowcut: 28, highcut: 16000, drive: 0.25, compThr: -18, compRatio: 6, compAtk: 0.4, compRel: 140, revMix: h.n(0.16, 0.24), revSize: h.n(0.8, 0.92), revDamp: 0.55, revPre: 25, echoMix: h.n(0.12, 0.2), echoTime: h.n(380, 650), echoFb: h.n(0.28, 0.4), width: 0.9 }
      };
    } },
    { id: 'shotgun', label: 'Shotgun', group: 'Weapons', fn: function (h) {
      var pump = h.n(420, 520);
      return {
        layers: [
          Nz({ name: 'Crack', color: 'white', atk: 0.05, hold: 2, dec: h.n(30, 50), curve: 4, fType: 'hp', cut: h.lg(1100, 1800), q: 0.7, drive: 0.4, gain: -1 }),
          Nz({ name: 'Blast', color: 'pink', atk: 0.1, hold: h.n(8, 14), dec: h.n(240, 340), curve: 4, fType: 'lp', cut: h.lg(1100, 1700), q: 1, fEnv: 2, fEnvT: h.n(40, 70), drive: 0.45, gain: 0 }),
          O({ name: 'Body', wave: 'sine', f0: h.lg(115, 150), f1: h.lg(34, 44), sweep: h.n(90, 130), sweepCurve: 2.5, atk: 0.1, hold: 3, dec: h.n(260, 360), curve: 3, drive: 0.4, gain: -1 }),
          Nz({ name: 'Pellets', color: 'crackle', density: h.lg(2500, 5000), atk: 1, dec: h.n(70, 110), curve: 3, fType: 'bp', cut: h.lg(2500, 4000), q: 0.8, gain: h.n(-12, -8) }),
          Nz({ name: 'Tail', color: 'brown', atk: 10, dec: h.n(800, 1200), curve: 2.4, fType: 'lp', cut: h.lg(450, 700), delay: 15, gain: -9 }),
          Mt({ name: 'Pump', mode: 'plate', f0: h.lg(1200, 1800), partials: 6, ring: 50, damp: 1.2, dec: 70, delay: pump, rep: 2, repInt: h.n(120, 160), repPitch: -3, repDecay: 1.1, gain: -14 }),
          Nz({ name: 'Pump slide', color: 'white', atk: 15, dec: 40, fType: 'bp', cut: 1800, q: 1.4, delay: pump + 20, rep: 2, repInt: 140, gain: -22 })
        ],
        master: { lowcut: 32, highcut: 15000, drive: 0.25, compThr: -16, compRatio: 5, compAtk: 0.5, compRel: 110, revMix: h.n(0.1, 0.18), revSize: 0.7, revDamp: 0.5, revPre: 12, echoMix: 0.1, echoTime: h.n(200, 300), echoFb: 0.25, width: 0.85 }
      };
    } },
    { id: 'laser', label: 'Laser', group: 'Weapons', fn: function (h) {
      var plasma = h.ch(0.35);
      if (plasma) return {
        layers: [
          O({ name: 'Plasma', wave: 'square', pw: h.n(0.25, 0.5), f0: h.lg(500, 1100), f1: h.lg(70, 180), sweep: h.n(200, 320), sweepCurve: 1.6, fmRatio: h.pick([0.5, 1.5, 2.01]), fmIndex: h.n(5, 11), fmDecay: h.n(120, 220), uni: 2, detune: 20, atk: 0.5, hold: 20, dec: h.n(260, 380), curve: 2.4, trem: 0.4, tremRate: h.n(25, 45), tremShape: 'square', fType: 'lp', cut: h.lg(2500, 4500), q: 3, fEnv: 1.5, fEnvT: 90, gain: 0 }),
          Nz({ name: 'Crackle', color: 'crackle', density: 3000, dec: 200, fType: 'hp', cut: 3000, gain: -14 }),
          O({ name: 'Sub', wave: 'sine', f0: 180, f1: 50, sweep: 120, dec: 200, gain: -4 })
        ],
        master: { drive: 0.15, compThr: -12, compRatio: 3, echoMix: 0.14, echoTime: h.n(70, 130), echoFb: 0.3, revMix: 0.12, revSize: 0.55, width: 1.2 }
      };
      return {
        layers: [
          O({ name: 'Beam', wave: h.pick(['saw', 'square']), f0: h.lg(1200, 3200), f1: h.lg(150, 450), sweep: h.n(90, 220), sweepCurve: h.n(1.2, 3), uni: h.pick([1, 2, 3]), detune: h.n(8, 25), fmRatio: h.pick([0.5, 1, 2, 3.5]), fmIndex: h.n(0, 4), fmDecay: h.n(40, 150), atk: 0.3, hold: h.n(5, 30), dec: h.n(120, 260), curve: 2.5, fType: 'lp', cut: h.lg(3000, 8000), q: 2, fEnv: 1, fEnvT: 60, gain: 0 }),
          Nz({ name: 'Zap', color: 'white', dec: 25, fType: 'bp', cut: h.lg(3000, 6000), q: 3, gain: -10 }),
          O({ name: 'Sub', wave: 'sine', f0: 220, f1: 60, sweep: 80, dec: 120, gain: -6 })
        ],
        master: { drive: 0.1, compThr: -12, compRatio: 3, echoMix: 0.15, echoTime: h.n(60, 140), echoFb: 0.3, revMix: 0.1, revSize: 0.5, width: 1.1 }
      };
    } },
    { id: 'explosion', label: 'Explosion', group: 'Weapons', fn: function (h) {
      var s = h.n(0.6, 1.2);
      return {
        layers: [
          Nz({ name: 'Initial crack', color: 'white', atk: 0.05, hold: 3, dec: 45, curve: 4, fType: 'hp', cut: h.lg(1200, 2200), drive: 0.5, gain: -2 }),
          O({ name: 'Boom', wave: 'sine', f0: h.lg(70, 110), f1: h.lg(25, 34), sweep: h.n(250, 400), sweepCurve: 2, atk: 0.5, hold: 10, dec: h.n(900, 1400) * s, curve: 2.5, drive: 0.4, gain: 0 }),
          Nz({ name: 'Rumble', color: 'brown', atk: 5, hold: 60, dec: h.n(1500, 2500) * s, curve: 2, fType: 'lp', cut: h.lg(220, 420), q: 0.8, fEnv: 3, fEnvT: h.n(150, 260), drive: 0.35, gain: -2 }),
          Nz({ name: 'Blast body', color: 'pink', atk: 0.5, hold: 20, dec: h.n(500, 800) * s, curve: 3, fType: 'lp', cut: h.lg(1000, 1800), fEnv: 2, fEnvT: 120, drive: 0.3, gain: -3 }),
          Nz({ name: 'Debris', color: 'crackle', density: h.lg(400, 1200), atk: 50, dec: h.n(1200, 2000) * s, curve: 2.2, fType: 'bp', cut: h.lg(1800, 3200), q: 0.8, delay: h.n(70, 150), gain: -11, pan: h.n(-0.3, 0.3) })
        ],
        master: { lowcut: 25, highcut: 14000, drive: 0.3, compThr: -18, compRatio: 6, compAtk: 1, compRel: 200, revMix: h.n(0.18, 0.28), revSize: h.n(0.8, 0.9), revDamp: 0.6, revPre: 20, echoMix: h.n(0.1, 0.16), echoTime: h.n(300, 500), echoFb: 0.3, width: 1.2 }
      };
    } },
    { id: 'reload', label: 'Reload', group: 'Weapons', fn: function (h) {
      var tIn = h.n(220, 340), tR = tIn + h.n(220, 320);
      return {
        layers: [
          Mt({ name: 'Mag release', mode: 'plate', f0: h.lg(1800, 3000), partials: 6, ring: 50, damp: 1.3, dec: 70, gain: -2 }),
          Nz({ name: 'Release click', color: 'white', dec: 12, fType: 'hp', cut: 2500, gain: -4 }),
          Mt({ name: 'Mag seat', mode: 'random', f0: h.lg(900, 1600), partials: 7, ring: 70, damp: 1, dec: 100, delay: tIn, gain: 0 }),
          Nz({ name: 'Seat thud', color: 'pink', dec: 40, fType: 'lp', cut: 1200, delay: tIn, gain: -4 }),
          O({ name: 'Seat body', f0: 170, f1: 95, sweep: 25, dec: 45, delay: tIn, gain: -8 }),
          Nz({ name: 'Charging handle', color: 'white', atk: 30, dec: 60, fType: 'bp', cut: 2400, q: 1.5, fEnv: -1.5, fEnvT: 60, delay: tR - 90, gain: -10 }),
          Mt({ name: 'Bolt home', mode: 'plate', f0: h.lg(2200, 3200), partials: 6, ring: 45, damp: 1.2, dec: 70, delay: tR, gain: 1 })
        ],
        master: { lowcut: 80, compThr: -12, compRatio: 3, revMix: 0.06, revSize: 0.25, revDamp: 0.6 }
      };
    } },

    /* ---------------- combat feedback ---------------- */
    { id: 'hitmarker', label: 'Hitmarker', group: 'Feedback', fn: function (h) {
      var f = h.lg(1800, 2800);
      return {
        layers: [
          Nz({ name: 'Tick', color: 'white', dec: h.n(6, 12), curve: 4, fType: 'hp', cut: h.lg(3500, 6000), q: 0.7, gain: 0 }),
          Mt({ name: 'Ping', mode: h.pick(['plate', 'bar']), f0: h.lg(2800, 4500), partials: 4, ring: h.n(40, 80), dec: 90, gain: -4 }),
          O({ name: 'Body', f0: f, f1: f * 0.9, sweep: 20, dec: h.n(25, 45), curve: 3, gain: -6 })
        ],
        master: { lowcut: 300, highcut: 18000, compThr: -10, compRatio: 3 }
      };
    } },
    { id: 'headshot', label: 'Headshot', group: 'Feedback', fn: function (h) {
      return {
        layers: [
          Mt({ name: 'Ding', mode: 'bell', f0: h.lg(1400, 2200), partials: 9, ring: h.n(350, 600), damp: 0.8, dec: 700, curve: 1.3, gain: 0 }),
          Nz({ name: 'Tick', color: 'white', dec: 10, fType: 'hp', cut: 4000, gain: -2 }),
          O({ name: 'Thump', f0: 180, f1: 80, sweep: 40, dec: 60, gain: -4 }),
          Nz({ name: 'Crunch', color: 'crackle', density: 6000, dec: 40, fType: 'bp', cut: 2500, gain: -10 })
        ],
        master: { lowcut: 60, compThr: -12, compRatio: 3, revMix: 0.12, revSize: 0.4 }
      };
    } },
    { id: 'kill', label: 'Kill confirm', group: 'Feedback', fn: function (h) {
      var root0 = h.i(76, 84), step = h.pick([5, 7, 12, 4]), reps = h.pick([2, 3]), ri = h.n(60, 90), f = midi(root0);
      return {
        layers: [
          O({ name: 'Chime', wave: 'triangle', f0: f, f1: f, rep: reps, repInt: ri, repPitch: step, repDecay: 0.92, atk: 1, hold: 20, dec: 220, curve: 3, fmRatio: h.pick([2, 3.5]), fmIndex: h.n(1, 2), fmDecay: 100, gain: 0 }),
          Mt({ name: 'Bell', mode: 'bell', f0: f * Math.pow(2, step * (reps - 1) / 12) * 2, partials: 6, ring: 400, dec: 500, delay: ri * (reps - 1), gain: -10 }),
          Nz({ name: 'Sparkle', color: 'white', dec: 150, fType: 'hp', cut: 6000, trem: 0.6, tremRate: 30, tremShape: 'random', gain: -18 })
        ],
        master: { lowcut: 150, revMix: 0.2, revSize: 0.6, echoMix: 0.1, echoTime: 110, echoFb: 0.2 }
      };
    } },
    { id: 'impact', label: 'Impact', group: 'Feedback', fn: function (h) {
      var mat = h.pick(['metal', 'concrete', 'wood', 'dirt']), L;
      if (mat === 'metal') L = [
        Nz({ name: 'Snap', color: 'white', dec: 15, fType: 'hp', cut: 2500, gain: 0 }),
        Mt({ name: 'Metal ring', mode: h.pick(['bar', 'plate']), f0: h.lg(400, 1600), partials: 8, ring: h.n(250, 700), spread: 0.02, dec: 900, gain: -4 }),
        O({ name: 'Body', f0: 180, f1: 90, sweep: 30, dec: 60, gain: -6 })];
      else if (mat === 'concrete') L = [
        Nz({ name: 'Chip', color: 'pink', dec: 60, fType: 'bp', cut: h.lg(900, 1800), q: 1.2, drive: 0.3, gain: 0 }),
        Nz({ name: 'Debris', color: 'crackle', density: 1500, dec: 200, fType: 'hp', cut: 2000, delay: 5, gain: -12 }),
        O({ name: 'Thump', f0: 140, f1: 70, sweep: 30, dec: 50, gain: -4 })];
      else if (mat === 'wood') { var wf = h.lg(250, 450); L = [
        O({ name: 'Knock', f0: wf, f1: wf * 0.7, sweep: 30, dec: 60, gain: 0 }),
        Nz({ name: 'Grain', color: 'pink', dec: 40, fType: 'bp', cut: h.lg(700, 1300), q: 3, gain: -4 }),
        St({ name: 'Resonance', f0: h.lg(180, 320), ring: 120, bright: 0.3, dec: 200, gain: -10 })]; }
      else L = [
        Nz({ name: 'Thud', color: 'brown', dec: 90, fType: 'lp', cut: 600, drive: 0.3, gain: 0 }),
        O({ name: 'Thump', f0: 100, f1: 55, sweep: 40, dec: 80, gain: -2 }),
        Nz({ name: 'Spray', color: 'pink', dec: 40, fType: 'lp', cut: 1500, gain: -8 })];
      return { name: 'Impact (' + mat + ')', layers: L, master: { lowcut: 40, compThr: -14, compRatio: 3, revMix: 0.12, revSize: 0.45 } };
    } },
    { id: 'ricochet', label: 'Ricochet', group: 'Feedback', fn: function (h) {
      return {
        layers: [
          O({ name: 'Whine', wave: h.pick(['sine', 'triangle']), f0: h.lg(3000, 5000), f1: h.lg(900, 1800), sweep: h.n(250, 500), sweepCurve: h.n(0.6, 1.2), vibDepth: h.n(10, 40), vibRate: h.n(15, 30), atk: 3, hold: 20, dec: h.n(300, 500), curve: 2, gain: -2 }),
          Mt({ name: 'Ping', mode: 'bar', f0: h.lg(2000, 3500), ring: 80, dec: 120, gain: -6 }),
          Nz({ name: 'Snap', color: 'white', dec: 10, fType: 'hp', cut: 3000, gain: 0 })
        ],
        master: { lowcut: 200, echoMix: 0.12, echoTime: 200, echoFb: 0.25, revMix: 0.15, revSize: 0.6 }
      };
    } },
    { id: 'shield', label: 'Shatter', group: 'Feedback', fn: function (h) {
      return {
        layers: [
          Mt({ name: 'Shards', mode: 'glass', f0: h.lg(2200, 3800), partials: 10, ring: h.n(250, 500), spread: 0.04, dec: 600, curve: 1.5, rep: h.i(4, 7), repInt: h.n(15, 35), repJit: 12, repDecay: 0.82, repPitch: h.pick([-1, 1, 0.5, -0.5]), gain: 0 }),
          Nz({ name: 'Crash', color: 'white', dec: 350, curve: 3, fType: 'hp', cut: 3000, gain: -6 }),
          O({ name: 'Energy zap', wave: 'square', f0: h.lg(600, 1200), f1: h.lg(60, 120), sweep: 250, fmRatio: 1.5, fmIndex: 5, fmDecay: 120, fType: 'lp', cut: 3000, dec: 300, gain: -6 }),
          O({ name: 'Thump', f0: 200, f1: 55, sweep: 60, dec: 120, gain: -2 })
        ],
        master: { lowcut: 40, revMix: 0.2, revSize: 0.6, width: 1.3, compThr: -14, compRatio: 3 }
      };
    } },

    /* ---------------- movement ---------------- */
    { id: 'footstep', label: 'Footstep', group: 'Movement', fn: function (h) {
      var surf = h.pick(['concrete', 'metal', 'gravel', 'wood']), ri = h.n(25, 50), rd = h.n(0.4, 0.7), rp = h.n(1, 3);
      var L = [
        Nz({ name: 'Heel', color: 'pink', dec: h.n(40, 70), curve: 3, fType: 'bp', cut: h.lg(500, 1100), q: 1.2, rep: 2, repInt: ri, repDecay: rd, repPitch: rp, gain: 0 }),
        O({ name: 'Weight', f0: 130, f1: 70, sweep: 25, dec: 35, rep: 2, repInt: ri, repDecay: rd, gain: -4 }),
        Nz({ name: 'Grit', color: 'crackle', density: surf === 'gravel' ? 8000 : 3000, dec: surf === 'gravel' ? 120 : 50, fType: 'hp', cut: 2500, gain: surf === 'gravel' ? -6 : -14 })];
      if (surf === 'metal') L.push(Mt({ name: 'Grate', mode: 'plate', f0: h.lg(600, 1200), ring: 150, partials: 6, dec: 220, rep: 2, repInt: ri, repDecay: rd, gain: -10 }));
      if (surf === 'wood') L.push(St({ name: 'Boards', f0: h.lg(120, 220), ring: 80, bright: 0.2, dec: 150, gain: -8 }));
      return { name: 'Footstep (' + surf + ')', layers: L, master: { lowcut: 60, compThr: -14, compRatio: 3, revMix: 0.08, revSize: 0.3 } };
    } },
    { id: 'jump', label: 'Jump', group: 'Movement', fn: function (h) {
      return {
        layers: [
          O({ name: 'Spring', wave: h.pick(['square', 'sine']), pw: 0.4, f0: h.lg(180, 300), f1: h.lg(500, 900), sweep: h.n(80, 150), sweepCurve: 1, dec: h.n(120, 200), fType: 'lp', cut: 3000, gain: -2 }),
          Nz({ name: 'Air', color: 'pink', dec: 120, fType: 'bp', cut: 2000, fEnv: -1.5, fEnvT: 60, gain: -10 }),
          O({ name: 'Push', f0: 120, f1: 60, sweep: 30, dec: 40, gain: -6 })
        ],
        master: { revMix: 0.06, revSize: 0.3 }
      };
    } },
    { id: 'whoosh', label: 'Dash', group: 'Movement', fn: function (h) {
      var a = h.n(60, 140), d = h.n(150, 300);
      return {
        layers: [
          Nz({ name: 'Air', color: 'pink', atk: a, hold: 10, dec: d, curve: 2, fType: 'bp', cut: h.lg(1500, 3000), q: h.n(0.8, 1.6), fEnv: -h.n(1.5, 2.5), fEnvT: h.n(80, 160), gain: 0 }),
          Nz({ name: 'Hiss', color: 'white', atk: a, dec: d * 0.8, fType: 'hp', cut: h.lg(4000, 7000), trem: 0.3, tremRate: 14, tremShape: 'random', gain: -10 }),
          O({ name: 'Body', f0: 120, f1: 60, sweep: 200, atk: a, dec: 200, gain: -12 })
        ],
        master: { revMix: 0.12, revSize: 0.5, width: 1.4 }
      };
    } },

    /* ---------------- abilities & items ---------------- */
    { id: 'ability', label: 'Ability cast', group: 'Abilities', fn: function (h) {
      var a = h.n(300, 600), T = a + 100;
      return {
        layers: [
          O({ name: 'Riser', wave: 'saw', f0: h.lg(110, 220), f1: h.lg(600, 1200), sweep: T, sweepCurve: h.n(0.5, 0.9), uni: 3, detune: 18, atk: a, hold: 100, dec: 150, curve: 2, fType: 'lp', cut: h.lg(1500, 3000), q: 3, fEnv: -2, fEnvT: 400, trem: 0.35, tremRate: h.lg(8, 16), gain: -2 }),
          Mt({ name: 'Shimmer', mode: 'glass', f0: h.lg(2500, 4000), partials: 6, ring: 1500, atk: a, dec: 900, trem: 0.5, tremRate: 20, tremShape: 'random', gain: -14 }),
          Nz({ name: 'Release burst', color: 'white', dec: 200, fType: 'bp', cut: 2000, fEnv: 2, fEnvT: 60, drive: 0.3, delay: T, gain: 0 }),
          O({ name: 'Release boom', f0: 200, f1: 50, sweep: 80, dec: 250, delay: T, gain: -2 }),
          O({ name: 'FM hit', f0: 800, f1: 200, sweep: 120, fmRatio: 1.41, fmIndex: 8, fmDecay: 60, dec: 200, delay: T, gain: -6 })
        ],
        master: { lowcut: 35, revMix: 0.25, revSize: 0.7, echoMix: 0.1, echoTime: 150, echoFb: 0.25, compThr: -14, compRatio: 3 }
      };
    } },
    { id: 'pickup', label: 'Pickup', group: 'Abilities', fn: function (h) {
      var f = midi(h.i(72, 79)), reps = h.pick([3, 4]), ri = h.n(45, 70), st = h.pick([4, 5, 7]);
      return {
        layers: [
          O({ name: 'Arp', wave: h.pick(['sine', 'triangle']), f0: f, f1: f, rep: reps, repInt: ri, repPitch: st, repDecay: 0.95, atk: 2, hold: 15, dec: 140, curve: 3, fmRatio: 2, fmIndex: 0.6, gain: 0 }),
          Mt({ name: 'Sparkle', mode: 'glass', f0: f * 4, partials: 4, ring: 300, dec: 350, rep: reps, repInt: ri, repPitch: st, gain: -14 }),
          Nz({ name: 'Air', color: 'white', atk: 40, dec: 250, fType: 'hp', cut: 6000, gain: -20 })
        ],
        master: { lowcut: 150, revMix: 0.25, revSize: 0.6, echoMix: 0.12, echoTime: 90, echoFb: 0.25 }
      };
    } },
    { id: 'coin', label: 'Coin', group: 'Abilities', fn: function (h) {
      var f = h.lg(900, 1300), jt = h.n(50, 80), js = h.pick([5, 7]);
      return {
        layers: [
          O({ name: 'Blip', wave: 'square', f0: f, f1: f, jumpT: jt, jumpSemi: js, atk: 0.5, hold: h.n(60, 100), dec: h.n(250, 400), curve: 2.5, fType: 'lp', cut: 6000, gain: 0 }),
          Mt({ name: 'Bell', mode: 'bell', f0: f * Math.pow(2, js / 12) * 2, ring: 400, dec: 500, delay: jt, gain: -10 })
        ],
        master: { revMix: 0.1, revSize: 0.4, echoMix: 0.08, echoTime: 80, echoFb: 0.2 }
      };
    } },
    { id: 'death', label: 'Shutdown', group: 'Abilities', fn: function (h) {
      return {
        layers: [
          O({ name: 'Fall', wave: 'saw', f0: h.lg(500, 900), f1: h.lg(40, 80), sweep: h.n(700, 1200), sweepCurve: h.n(0.5, 0.9), uni: 2, detune: 20, vibDepth: 30, vibRate: 6, atk: 5, hold: 100, dec: 900, curve: 1.5, fType: 'lp', cut: 3000, q: 4, bits: h.pick([0, 8, 6]), ds: h.pick([1, 2]), gain: 0 }),
          Nz({ name: 'Rumble', color: 'brown', dec: 800, fType: 'lp', cut: 400, gain: -12 })
        ],
        master: { revMix: 0.2, revSize: 0.6 }
      };
    } },
    { id: 'heartbeat', label: 'Low health', group: 'Abilities', fn: function (h) {
      var ri = h.n(150, 220);
      return {
        layers: [
          O({ name: 'Beat', f0: 70, f1: 45, sweep: 60, dec: 130, curve: 3, rep: 2, repInt: ri, repDecay: 0.7, drive: 0.3, fType: 'lp', cut: 300, gain: 0 }),
          Nz({ name: 'Thud', color: 'brown', dec: 100, fType: 'lp', cut: 150, rep: 2, repInt: ri, repDecay: 0.7, gain: -8 })
        ],
        master: { lowcut: 25 }
      };
    } },

    /* ---------------- interface ---------------- */
    { id: 'click', label: 'UI click', group: 'Interface', fn: function (h) {
      var f = h.lg(1200, 3000);
      return {
        layers: [
          O({ name: 'Tone', f0: f, f1: f * 0.8, sweep: 10, atk: 0.1, dec: h.n(10, 25), curve: 4, gain: 0 }),
          Nz({ name: 'Tick', color: 'white', dec: h.n(2, 5), fType: 'hp', cut: 3000, gain: -6 }),
          Mt({ name: 'Edge', mode: 'plate', f0: 4000, ring: 20, dec: 30, gain: -12 })
        ],
        master: { lowcut: 200 }
      };
    } },
    { id: 'confirm', label: 'Confirm', group: 'Interface', fn: function (h) {
      return {
        layers: [
          O({ name: 'Two-note', wave: h.pick(['triangle', 'sine']), f0: midi(h.i(74, 81)), f1: 1, rep: 2, repInt: h.n(55, 85), repPitch: h.pick([5, 7, 12]), atk: 1, hold: 10, dec: 160, curve: 3, fmRatio: h.pick([2, 3]), fmIndex: 0.8, fmDecay: 80, gain: 0 }),
          Nz({ name: 'Air', color: 'white', dec: 20, fType: 'hp', cut: 5000, gain: -18 })
        ],
        master: { lowcut: 150, revMix: 0.12, revSize: 0.4 }
      };
    } },
    { id: 'deny', label: 'Deny', group: 'Interface', fn: function (h) {
      return {
        layers: [
          O({ name: 'Buzz', wave: 'square', pw: 0.3, f0: midi(h.i(57, 64)), f1: 1, rep: 2, repInt: h.n(80, 110), repPitch: -h.pick([3, 5, 6]), hold: 50, dec: 90, fType: 'lp', cut: 1800, q: 1.5, gain: 0 })
        ],
        master: { lowcut: 120, revMix: 0.06, revSize: 0.3 }
      };
    } },
    { id: 'countdown', label: 'Countdown', group: 'Interface', fn: function (h) {
      var f = h.pick([880, 988, 1047, 1175]);
      return {
        layers: [
          O({ name: 'Beep', wave: h.pick(['sine', 'square']), f0: f, f1: f, atk: 2, hold: h.n(80, 140), dec: 60, curve: 2, fType: 'lp', cut: 3500, gain: 0 }),
          O({ name: 'Overtone', f0: f * 2, f1: f * 2, atk: 2, hold: 60, dec: 60, gain: -14 })
        ],
        master: { lowcut: 200, revMix: 0.08, revSize: 0.35 }
      };
    } },
    { id: 'roundstart', label: 'Round start', group: 'Interface', fn: function (h) {
      var root0 = midi(h.i(45, 52)), shared = { wave: 'saw', uni: 5, detune: 15, atk: 30, hold: 300, dec: 700, curve: 2, fType: 'lp', cut: 1200, q: 1.2, fEnv: 1.5, fEnvT: 200 };
      function chord(name, semis, g) { var o = { name: name, f0: root0 * Math.pow(2, semis / 12), gain: g }; o.f1 = o.f0; for (var k in shared) o[k] = shared[k]; return O(o); }
      return {
        layers: [
          chord('Root', 0, 0), chord('Fifth', 7, -3), chord('Octave', 12, -5),
          O({ name: 'Impact', f0: 120, f1: 40, sweep: 120, dec: 400, drive: 0.3, gain: -1 }),
          Nz({ name: 'Hit', color: 'pink', dec: 300, fType: 'lp', cut: 2500, fEnv: 1.5, fEnvT: 80, gain: -6 })
        ],
        master: { lowcut: 35, revMix: 0.28, revSize: 0.75, compThr: -14, compRatio: 3, width: 1.3 }
      };
    } }
  ];

  function generate(id, seed) {
    var g = LIST.filter(function (x) { return x.id === id; })[0] || LIST[0];
    var r = E.rng(seed), d = g.fn(H(r));
    d.layers.forEach(function (l) { if (l.f1 === 1) l.f1 = l.f0; });
    return E.newSound({ name: d.name || g.label, cat: g.id, seed: seed, layers: d.layers, master: d.master });
  }
  var api = { LIST: LIST, generate: generate };
  root.SFXGen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
