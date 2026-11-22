# SFX Forge

A browser-based sound effects generator for games. Instead of a single oscillator through a single envelope (the sfxr/jsfxr approach), every sound is a stack of layers (transient, body, mechanism, tail…) mixed through a master bus, the way real game audio is built.

Everything runs client-side in plain JavaScript: no build step, no dependencies, no server.

## Features

**Synthesis layers**
- **Tone**: band-limited sine / triangle / saw / square, pitch sweeps with shape control, pitch jumps, FM, unison detune, vibrato
- **Noise**: white, pink, brown and crackle (sparse impulse bursts)
- **Metal**: modal synthesis with bar, bell, plate, glass, tube and random partial sets for pings, casings, shards and bells
- **String**: Karplus-Strong plucked string

Every layer has an attack/hold/decay envelope, a resonant state-variable filter with its own envelope, tremolo, drive, bitcrush/downsample, repeats (bursts, rattles, arpeggios), pan and start time.

**Master bus**: pitch, time stretch, saturation, low/high cut, compressor, echo (with ping-pong), reverb, stereo width, peak normalize and mono output.

**24 generators** in five groups: weapons (rifle, pistol, sniper, shotgun, laser, explosion, reload), feedback (hitmarker, headshot, kill confirm, impact, ricochet, shatter), movement (footstep, jump, dash), abilities (ability cast, pickup, coin, shutdown, low health) and interface (click, confirm, deny, countdown, round start).

**Built for competitive games**
- **Variations**: subtly different takes of one design (pitch, timing, filter, noise) so repeated sounds never machine-gun identically; export them as a pack
- **Rapid-fire test**: plays the takes round-robin at a set RPM to hear how a weapon stacks under automatic fire
- **Level readouts**: peak dBFS and loudest-100 ms RMS for consistent loudness across your sound set
- **Mono output** for sounds your engine positions in 3D

**Workflow**: undo/redo, mutate, deterministic seeds, waveform and spectrogram views, layer timeline, solo/mute, saved library (browser localStorage), JSON preset import/export.

## Keyboard

| Key | Action |
| --- | --- |
| Space | Play |
| G | New take from the current generator |
| M | Mutate |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y | Redo |

Double-click any slider to reset it to its default.

## Exports

- **WAV**: 44.1 or 48 kHz, 16-bit, 24-bit or 32-bit float, mono or stereo
- **Variation pack**: the sound plus N takes as a .zip of WAVs
- **Game kit**: a .zip with `sfx-engine.js`, your presets as `sounds.json` / `sounds.js`, a `demo.html` and usage notes, so a web game can synthesize its sounds at load time instead of downloading audio files

## Using the engine in a game

`js/sfx-engine.js` is standalone and works in browsers, Web Workers and Node.

```html
<script src="sfx-engine.js"></script>
<script src="sounds.js"></script>
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
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = bank[key][rr++ % bank[key].length];
    g.gain.value = gain;
    src.connect(g).connect(ctx.destination);
    src.start();
  }
</script>
```

Rendering takes roughly 1–150 ms per sound, so do it at load time (or in a Worker), not in the hot path.

Baking WAVs in Node:

```js
const fs = require('fs');
const SFXEngine = require('./js/sfx-engine.js');
const preset = JSON.parse(fs.readFileSync('my-sound.json', 'utf8'));
const res = SFXEngine.render(preset, { sr: 48000 });
fs.writeFileSync('my-sound.wav', SFXEngine.encodeWav(res, { bits: 16, mono: true }));
```

### Engine API

| Function | Returns |
| --- | --- |
| `render(preset, { sr })` | `{ L, R, sr, duration, peak, rms, mono, spans }` with Float32Array channels |
| `vary(preset, n, amount)` | Take number `n` of the preset, nudged by `amount` (0–1) |
| `toAudioBuffer(audioContext, result)` | A Web Audio `AudioBuffer` |
| `encodeWav(result, { bits, mono })` | `Uint8Array` WAV file (16, 24 or 32-bit float) |
| `zip([{ name, data }])` | `Uint8Array` uncompressed .zip |
| `newSound(o)`, `newLayer(type, o)` | Preset and layer objects filled with defaults |

Same preset + same seed always renders the same audio.

## Deploying to GitHub Pages

1. Create a new repository on GitHub and push these files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "SFX Forge"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

The `.nojekyll` file tells GitHub Pages to serve the files as-is.

To run locally, serve the folder with any static server (e.g. `python3 -m http.server`) and open `http://localhost:8000`. Opening `index.html` directly from disk works too, except the game-kit export, which needs to fetch `js/sfx-engine.js` over HTTP.

## Project layout

```
index.html          app markup
css/style.css       styles (light and dark themes)
js/sfx-engine.js    synthesis engine, WAV and ZIP encoders (standalone)
js/generators.js    the 24 sound generators
js/app.js           user interface
```
