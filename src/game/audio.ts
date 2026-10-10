const SFX = [
  'slide_whistle_up', 'slide_whistle_down', 'boing', 'pop', 'coin', 'chilli_whoosh', 'hot_bag', 'umbrella_open',
  'swipe', 'jump', 'land', 'crash_thud', 'glass_break', 'dust_dogpile', 'dizzy_stars', 'pigeon_coo', 'game_over', 'ui_click', 'run_start',
] as const;
const VOICE: Record<string, string> = {
  'Order up!': 'order_up', 'Fresh and hot!': 'fresh_and_hot', 'Run, Marm, run!': 'run_marm_run',
  'Tip!': 'tip', 'Cha-ching!': 'cha_ching', 'Nice tip!': 'nice_tip',
  'Ouch!': 'ouch', 'Not the noodles!': 'not_the_noodles', 'Whoa!': 'whoa',
  'Pancake mode.': 'pancake_mode', 'Chimney: 1, Marm: 0.': 'chimney_one_marm_zero',
  'Boo? Nope, just Marm.': 'boo_nope_just_marm', 'Free bedsheet!': 'free_bedsheet',
  'Wheeeee... oh no.': 'wheee_oh_no', 'Gravity, rude.': 'gravity_rude',
  'Seeing stars, and tips.': 'seeing_stars_and_tips', 'Who put that there?': 'who_put_that_there',
  'Oh, lovely, dear!': 'grandma_1', 'Still warm? Wonderful!': 'grandma_2',
  'Finally! I have an exam!': 'student_1', 'You are a legend.': 'student_2',
  'Bravissimo!': 'opera_1', 'My voice thanks you!': 'opera_2',
  'Ha! Better than my bread!': 'baker_1', 'Fresh! Almost like mine.': 'baker_2',
  'Hmph. On time.': 'gardener_1', 'Fine. Take a tip.': 'gardener_2',
  'Order delayed!': 'order_delayed', 'The Crowd wins this one.': 'crowd_wins',
};
export type SfxName = (typeof SFX)[number];

export class Audio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private musicSrc: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private loading: Promise<void> | null = null;
  muted = false;

  /** Call from a user gesture (first tap or key). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.ctx.destination);
      this.loading = this.loadAll();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private async load(path: string) {
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'audio/' + path + '.ogg');
      const buf = await this.ctx!.decodeAudioData(await res.arrayBuffer());
      this.buffers.set(path, buf);
    } catch (e) {
      console.warn('audio load failed', path, e);
    }
  }
  private async loadAll() {
    await Promise.all([...SFX.map((n) => this.load('sfx/' + n)), ...Object.values(VOICE).map((n) => this.load('voice/' + n)), this.load('music/run_loop')]);
  }

  play(name: SfxName, rate = 1) {
    if (!this.ctx || this.muted) return;
    const b = this.buffers.get('sfx/' + name);
    if (!b) return;
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    s.connect(this.sfxGain!);
    s.start();
  }

  private voiceSrc: AudioBufferSourceNode | null = null;
  /** Marm's bark for a text bubble line; cuts off the previous one. */
  voice(text: string) {
    const key = VOICE[text];
    if (!key || !this.ctx || this.muted) return;
    const b = this.buffers.get('voice/' + key);
    if (!b) return;
    try { this.voiceSrc?.stop(); } catch { /* already ended */ }
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.connect(this.sfxGain!);
    s.start();
    this.voiceSrc = s;
  }

  async startMusic() {
    if (!this.ctx) return;
    await this.loading;
    const b = this.buffers.get('music/run_loop');
    if (!b || this.musicSrc) return;
    const s = this.ctx.createBufferSource();
    s.buffer = b;
    s.loop = true;
    s.connect(this.musicGain!);
    s.start();
    this.musicSrc = s;
  }
  setMusicRate(r: number) { if (this.musicSrc) this.musicSrc.playbackRate.value = r; }
  stopMusic() {
    this.musicSrc?.stop();
    this.musicSrc = null;
  }
}
