import { Ambience } from './ambience';
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
  'Extra spicy, extra fast!': 'q_extra_spicy', 'Note to self: buy a scooter.': 'q_scooter', 'Five-star delivery, zero-star cardio.': 'q_fivestar',
  'Is this roof load-bearing?': 'q_roof', 'Smells like victory. And garlic.': 'q_garlic', 'My legs are noodles now.': 'q_noodle_legs',
  'Do raccoons even tip?': 'q_raccoon_tip', 'Rooftops: the original shortcut.': 'q_shortcut', 'Keep calm and carry noodles.': 'q_keep_calm',
  "If I drop it, it's a salad.": 'q_salad', 'Cardio? I prefer "delivery".': 'q_cardio', 'Grandma Pim would be proud.': 'q_grandma',
  'Nobody touches the dumplings.': 'q_dumplings', 'This counts as a workout, right?': 'q_workout', 'Who builds a chimney THERE?': 'q_chimney_there',
  'Hot bag! Shielded.': 'hotbag_shield', 'Chilli dash!': 'chilli_dash', 'Floaty umbrella!': 'floaty_umbrella', 'Hot bag saved me!': 'hotbag_saved',
  '🦝 Share the noodles!': 'h_share', '🦝 Just ONE bite!': 'h_one_bite', '🦝 We have coupons!': 'h_coupons',
  '🦝 Free samples?!': 'h_samples', '🦝 Is that extra spicy?': 'h_spicy', "🦝 We're not hangry, YOU'RE hangry!": 'h_hangry',
};
export type SfxName = (typeof SFX)[number];

export class Audio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private musicSrc: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private loading: Promise<void> | null = null;
  muted = false;
  /** User volume settings 0..1 (applied on top of the mix levels). */
  vol = { music: 0.8, sfx: 0.8, voice: 1 };
  private readonly MUSIC = 0.35;
  setVolumes(v: Partial<{ music: number; sfx: number; voice: number }>) {
    Object.assign(this.vol, v);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain!.gain.setTargetAtTime(this.MUSIC * this.vol.music, t, 0.05);
    this.sfxGain!.gain.setTargetAtTime(0.9 * this.vol.sfx, t, 0.05);
    this.voiceGain!.gain.setTargetAtTime(1.0 * this.vol.voice, t, 0.05);
    this.ambience?.set(this.vol.sfx, this.ambience.on);
  }
  /** Freeze/unfreeze every sound (pause menu, tab hidden). */
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  /** Call from a user gesture (first tap or key). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.MUSIC * this.vol.music;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9 * this.vol.sfx;
      this.sfxGain.connect(this.ctx.destination);
      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = this.vol.voice;
      this.voiceGain.connect(this.ctx.destination);
      this.ambience = new Ambience(this.ctx, this.ctx.destination);
      this.loading = this.loadAll();
    }
    if (this.ctx.state === 'suspended' && !this.pausedByGame) this.ctx.resume();
  }
  pausedByGame = false;
  ambience: Ambience | null = null;

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
    s.connect(this.voiceGain!);
    s.start();
    this.voiceSrc = s;
    // duck the music under the line so speech stays clear
    const g = this.musicGain!.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.12 * this.vol.music, t, 0.03);
    g.setTargetAtTime(this.MUSIC * this.vol.music, t + b.duration + 0.1, 0.25);
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
