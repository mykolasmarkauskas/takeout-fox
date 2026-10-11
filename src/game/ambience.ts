/**
 * Procedural district ambience (no audio files): harbour waves and gulls, garden fountain
 * and birds, a soft town murmur with wind chimes. Each district has its own bus; the game
 * cross-fades them with the same mix weights it uses for the sky.
 */
export class Ambience {
  private buses: GainNode[] = [];
  private master: GainNode;
  private next = [3, 4, 5]; // seconds until the next one-shot per district
  private w = [1, 0, 0];
  on = false;

  constructor(private ctx: AudioContext, out: AudioNode) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(out);
    for (let i = 0; i < 3; i++) { const g = ctx.createGain(); g.gain.value = i === 0 ? 1 : 0; g.connect(this.master); this.buses.push(g); }
    const noise = this.noise();
    // town: low crowd murmur (band-passed noise with a slow swell)
    this.bed(noise, this.buses[0], 'bandpass', 520, 0.7, 0.05, 0.07, 0.05);
    // harbour: surf (low-passed noise breathing at wave speed) + a little hiss on top
    this.bed(noise, this.buses[1], 'lowpass', 480, 0.6, 0.16, 0.13, 0.12);
    this.bed(noise, this.buses[1], 'highpass', 3200, 0.5, 0.025, 0.13, 0.02);
    // garden: fountain trickle (band-passed noise, quick flutter)
    this.bed(noise, this.buses[2], 'bandpass', 2600, 1.2, 0.05, 3.1, 0.025);
  }

  private noise() {
    const len = this.ctx.sampleRate * 3, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.04 * w) / 1.04; d[i] = w * 0.5 + last * 3; } // white + brownish
    return b;
  }
  /** A looping noise bed through a filter with an LFO on its level. */
  private bed(buf: AudioBuffer, out: GainNode, type: BiquadFilterType, f: number, q: number, level: number, lfoHz: number, lfoDepth: number) {
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const flt = this.ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = level;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = lfoHz;
    const lg = this.ctx.createGain(); lg.gain.value = lfoDepth;
    lfo.connect(lg).connect(g.gain);
    src.connect(flt).connect(g).connect(out);
    src.start(); lfo.start();
  }

  /** Volume (0..1) and whether a run is on (ambience fades out on menus/pause). */
  set(level: number, running: boolean) {
    this.on = running;
    this.master.gain.setTargetAtTime(running ? 0.55 * level : 0, this.ctx.currentTime, 0.4);
  }
  /** District weights (a, b, t from districtMix). */
  mix(a: number, b: number, t: number) {
    for (let i = 0; i < 3; i++) this.w[i] = (i === a ? 1 - t : 0) + (i === b ? t : 0);
    const now = this.ctx.currentTime;
    this.buses.forEach((g, i) => g.gain.setTargetAtTime(this.w[i], now, 0.3));
  }
  /** Call every frame: schedules the occasional chime / gull / bird call. */
  tick(dt: number) {
    if (!this.on) return;
    for (let i = 0; i < 3; i++) {
      if ((this.next[i] -= dt) > 0) continue;
      if (this.w[i] > 0.2) (i === 0 ? this.chime() : i === 1 ? this.gull() : this.birds());
      this.next[i] = i === 0 ? 5 + Math.random() * 6 : i === 1 ? 4 + Math.random() * 7 : 2.5 + Math.random() * 4;
    }
  }

  private voiceOut(bus: number, pan: number, level: number) {
    const g = this.ctx.createGain(); g.gain.value = level;
    const p = this.ctx.createStereoPanner(); p.pan.value = pan;
    g.connect(p).connect(this.buses[bus]);
    return g;
  }
  /** Wind chimes: a few bell partials, pentatonic, slow decay. */
  private chime() {
    const t0 = this.ctx.currentTime, out = this.voiceOut(0, Math.random() * 1.4 - 0.7, 0.05);
    const scale = [1046.5, 1174.7, 1318.5, 1568, 1760];
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const f = scale[Math.floor(Math.random() * scale.length)], t = t0 + k * (0.12 + Math.random() * 0.2);
      for (const [m, a] of [[1, 1], [2.76, 0.35], [5.4, 0.12]] as const) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.frequency.value = f * m; o.type = 'sine';
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / m);
        o.connect(g).connect(out); o.start(t); o.stop(t + 2.4);
      }
    }
  }
  /** A gull: two or three falling, wobbly cries. */
  private gull() {
    const t0 = this.ctx.currentTime, out = this.voiceOut(1, Math.random() * 1.6 - 0.8, 0.035);
    const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      const t = t0 + k * 0.32, o = this.ctx.createOscillator(), g = this.ctx.createGain(), v = this.ctx.createOscillator(), vg = this.ctx.createGain();
      o.type = 'sawtooth';
      const f = 1500 + Math.random() * 300;
      o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.26);
      v.frequency.value = 28; vg.gain.value = 60; v.connect(vg).connect(o.frequency);
      const flt = this.ctx.createBiquadFilter(); flt.type = 'bandpass'; flt.frequency.value = 1600; flt.Q.value = 2.5;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(flt).connect(g).connect(out); o.start(t); v.start(t); o.stop(t + 0.3); v.stop(t + 0.3);
    }
  }
  /** Small birds: quick rising chirps. */
  private birds() {
    const t0 = this.ctx.currentTime, out = this.voiceOut(2, Math.random() * 1.6 - 0.8, 0.03);
    const n = 3 + Math.floor(Math.random() * 4), base = 3200 + Math.random() * 1500;
    for (let k = 0; k < n; k++) {
      const t = t0 + k * (0.08 + Math.random() * 0.06), o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(base * (0.8 + Math.random() * 0.2), t); o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.06);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.08);
    }
  }
}
