import * as THREE from 'three';
import { createRaccoon, animateRaccoon, Raccoon, loadRaccoonGLB, raccoonInstance } from './raccoon';
import { Scenery, PUFF } from './scenery';
import { newRunStats, type RunStats } from './progress';
import { track } from './stats';
import { Ticker } from './ticker';
import { districtAt, districtMix, FOG_END } from './world';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Audio, SfxName } from './audio';
import { BASE_SPEED, COLORS, GRAVITY, HIT_WINDOW, JUMP_V, LANES, MAX_SPEED, SLIDE_TIME, speedAt } from './constants';
import { FoxActor } from './actor';
import { loadKit } from './kit';
import { World } from './world';

type State = 'menu' | 'run' | 'crash' | 'over';

const BARKS = {
  start: ['Order up!', 'Fresh and hot!', 'Run, Marm, run!'],
  coin: ['Tip!', 'Cha-ching!', 'Nice tip!'],
  hit: ['Ouch!', 'Not the noodles!', 'Whoa!'],
  chimney: ['Pancake mode.', 'Chimney: 1, Marm: 0.'],
  laundry: ['Boo? Nope, just Marm.', 'Free bedsheet!'],
  gap: ['Wheeeee... oh no.', 'Gravity, rude.'],
  crate: ['Seeing stars, and tips.', 'Who put that there?'],
  over: ['Order delayed!', 'The Crowd wins this one.'],
};
/** Marm's running commentary (text bubbles) and the Crowd's heckles. */
const QUIPS = [
  'Extra spicy, extra fast!', 'Note to self: buy a scooter.', 'Five-star delivery, zero-star cardio.',
  'Is this roof load-bearing?', 'Smells like victory. And garlic.', 'My legs are noodles now.',
  'Do raccoons even tip?', 'Rooftops: the original shortcut.', 'Keep calm and carry noodles.',
  'If I drop it, it\'s a salad.', 'Cardio? I prefer "delivery".', 'Grandma Pim would be proud.',
  'Nobody touches the dumplings.', 'This counts as a workout, right?', 'Who builds a chimney THERE?',
];
const HECKLES = ['🦝 Share the noodles!', '🦝 Just ONE bite!', '🦝 We have coupons!', '🦝 Free samples?!', '🦝 Is that extra spicy?', '🦝 We\'re not hangry, YOU\'RE hangry!'];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const A = (n: string) => `${import.meta.env.BASE_URL}art/${n}.webp`;
const LIGHT = [
  { sun: 0xffd9a0, si: 2.2, sky: 0xfff0d6, gr: 0xb07a55, hi: 0.7 },
  { sun: 0xd8d0ff, si: 1.7, sky: 0xd6d2ff, gr: 0x5e6f86, hi: 0.95 },
  { sun: 0xffe6c2, si: 1.95, sky: 0xf4f6e4, gr: 0x9a9a6a, hi: 0.8 },
];
const DISTRICTS = [
  // sky = horizon colour, top = overhead colour of the gradient dome (as in the district art)
  { name: 'Noodle Roofs', img: 'world_01_noodle_roofs', sky: 0xf9c98a, top: 0xe58a5c, fog: 0xf6b46b },
  { name: 'Harbour Lights', img: 'world_02_harbour_lights', sky: 0xd9b8d6, top: 0x7f86c8, fog: 0xb8a6d2 },
  { name: 'Garden Terraces', img: 'world_03_garden_terraces', sky: 0xf2ddd0, top: 0xbfe3cb, fog: 0xe8e0cf },
];
const FOODS = ['food_01_noodles', 'food_02_pizza', 'food_03_bubbletea'];
const CUSTOMERS = [
  { img: 'npc_01_grandma', say: ['Oh, lovely, dear!', 'Still warm? Wonderful!'] },
  { img: 'npc_02_student', say: ['Finally! I have an exam!', 'You are a legend.'] },
  { img: 'npc_03_opera', say: ['Bravissimo!', 'My voice thanks you!'] },
  { img: 'npc_04_baker', say: ['Ha! Better than my bread!', 'Fresh! Almost like mine.'] },
  { img: 'npc_05_gardener', say: ['Hmph. On time.', 'Fine. Take a tip.'] },
];
const CRASH_ART: Record<string, string> = { chimney: 'fox_06_pancake', laundry: 'fox_08_ghost', crate: 'fox_07_dizzy', gap: 'fox_09_pigeons' };
const DELIVERY_EVERY = 350; // metres between deliveries

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 9 / 16, 0.1, 500);
  readonly world = new World();
  readonly scenery = new Scenery();
  readonly fox = new FoxActor();
  readonly audio = new Audio();
  private chasers: THREE.Group[] = [];
  private quipT = 12;
  private raccoons: Raccoon[] = [];
  private raccoonMixers: (THREE.AnimationMixer | null)[] = [];
  private stars: THREE.Group;
  private sheet: THREE.Mesh;

  state: State = 'menu';
  private last = 0;
  private acc = 0;
  private time = 0;
  distance = 0;
  coins = 0;
  speed = BASE_SPEED;
  private lane = 1;
  private x = 0;
  private y = 0;
  private vy = 0;
  private slideT = 0;
  private lastHit = -99;
  private shield = false;
  private dashT = 0;
  private floatT = 0;
  private power: HTMLElement | null = null;
  ticker!: Ticker;
  private graceT = 0;
  private chaseGap = 14;
  private crashT = 0;
  private crashKind = 'chimney';
  private bubbleT = 0;
  private districtIdx = -1;
  private foodIdx = 0;
  private nextDelivery = DELIVERY_EVERY;
  private customerT = 0;
  private districtT = 0;
  private skyFrom = new THREE.Color(COLORS.sky);
  private skyTo = new THREE.Color(COLORS.sky);
  private skyK = 1;

  constructor(private canvas: HTMLCanvasElement, private ui: {
    score: HTMLElement; coins: HTMLElement; bubble: HTMLElement;
    menu: HTMLElement; over: HTMLElement; overTitle: HTMLElement; overText: HTMLElement;
    card: HTMLImageElement; orderImg: HTMLImageElement;
    district: HTMLElement; districtImg: HTMLImageElement; districtName: HTMLElement;
    customer: HTMLElement; customerImg: HTMLImageElement; customerText: HTMLElement;
  }) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // phones: 1.5x is visually close to 2x/3x at a fraction of the fill cost
    this.basePR = Math.min(window.devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.5 : 2);
    this.renderer.setPixelRatio(this.basePR);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 30, FOG_END);

    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.4;
    const hemi = new THREE.HemisphereLight(0xfff0d6, 0xb07a55, 0.7);
    this.scene.add(hemi);
    this.hemi = hemi;
    const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
    sun.position.set(-6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.radius = 5; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    this.scene.add(sun, sun.target);
    try { this.autoQ = Number(localStorage.getItem('tf_q') || 0) || 0; } catch { /* storage may be unavailable */ }
    this.sun = sun;

    this.scene.add(this.world.group);
    this.scene.add(this.scenery.group);
    this.scenery.setHorizon(this.scene.background as THREE.Color);
    loadKit().then(() => { if (this.state === 'menu') this.world.reset(1); });
    this.scene.add(this.fox.group);
    const pw = document.createElement('div');
    pw.style.cssText = 'position:absolute;left:14px;top:58px;display:flex;gap:6px;pointer-events:none;font:800 14px system-ui;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35)';
    this.ui.score.parentElement?.parentElement?.appendChild(pw);
    this.power = pw;
    // news crawl along the bottom: ambient headlines + the gag set pieces as BREAKING items
    this.ticker = new Ticker(this.ui.score.parentElement!.parentElement!, A);

    // three Hangry Crowd raccoons chasing behind the fox
    for (let i = 0; i < 3; i++) {
      const r = createRaccoon();
      r.group.position.set(LANES[i], 0, 20);
      r.group.scale.setScalar(0.9);
      this.scene.add(r.group);
      this.chasers.push(r.group);
      this.raccoons.push(r);
    }
    loadRaccoonGLB().then((src) => {
      if (!src) return;
      this.chasers.forEach((g, i) => {
        // swap the code-built body for the Tripo model, keep the group (position/visibility logic)
        g.clear();
        g.scale.setScalar(1);
        const inst = raccoonInstance(src, i * 0.33);
        g.add(inst.root);
        this.raccoonMixers[i] = inst.mixer;
      });
    });

    // dizzy stars ring and ghost sheet for crash animations
    this.stars = new THREE.Group();
    const sm = new THREE.MeshBasicMaterial({ color: 0xffe24a });
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), sm);
      s.userData.a = (i / 5) * Math.PI * 2;
      this.stars.add(s);
    }
    this.stars.visible = false;
    this.scene.add(this.stars);
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const sheetG = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14), sheetMat); dome.position.y = 0.9;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.25, 1.8, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x111111 })); e.position.set(0.28 * sx, 1.0, -0.78); sheetG.add(e); }
    sheetG.add(dome, skirt); skirt.position.y = 0;
    this.sheet = sheetG as unknown as THREE.Mesh;
    this.sheet.visible = false;
    this.scene.add(this.sheet);

    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.resetRun();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((t) => this.loop(t));
  }
  private sun: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;

  // ---- small juice: dust puffs, coin sparkles, camera shake, phone buzz
  private shakeT = 0; private shakeA = 0;
  private fx: { s: THREE.Sprite; v: THREE.Vector3; life: number; max: number; grow: number }[] = [];
  private fxPool: THREE.Sprite[] = [];
  private dustMat = new THREE.SpriteMaterial({ map: PUFF(), color: 0xe8d2b4, transparent: true, depthWrite: false, opacity: 0.8 });
  private sparkMat = new THREE.SpriteMaterial({ map: PUFF(), color: 0xffd34a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  private emit(mat: THREE.SpriteMaterial, x: number, y: number, z: number, v: THREE.Vector3, life: number, size: number, grow: number) {
    if (this.fx.length > 60) return;
    const s = this.fxPool.pop() ?? new THREE.Sprite();
    s.material = mat.clone(); s.position.set(x, y, z); s.scale.setScalar(size);
    this.scene.add(s);
    this.fx.push({ s, v, life, max: life, grow });
  }
  private dust(x: number, n: number) {
    if (this.q === 2) n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      this.emit(this.dustMat, x + Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3, new THREE.Vector3(Math.cos(a) * 1.6, 0.5 + Math.random() * 0.6, Math.sin(a) * 1.2 + 2), 0.45 + Math.random() * 0.2, 0.45, 1.8);
    }
  }
  private sparkle(x: number, y: number, z: number) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      this.emit(this.sparkMat, x, y, z, new THREE.Vector3(Math.cos(a) * 2.2, Math.sin(a) * 2.2 + 1, 1.5), 0.3, 0.32, -0.6);
    }
  }
  private updateFx(dt: number) {
    if (this.shakeT > 0) this.shakeT -= dt;
    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.life -= dt;
      if (f.life <= 0) { this.scene.remove(f.s); (f.s.material as THREE.Material).dispose(); this.fxPool.push(f.s); this.fx.splice(i, 1); continue; }
      f.s.position.addScaledVector(f.v, dt);
      f.v.multiplyScalar(1 - dt * 3);
      const k = f.life / f.max;
      (f.s.material as THREE.SpriteMaterial).opacity = k * 0.85;
      f.s.scale.multiplyScalar(1 + f.grow * dt);
    }
  }
  private buzz(p: number | number[]) { try { navigator.vibrate?.(p); } catch { /* not supported */ } }

  /**
   * Quality: 0 full, 1 lighter (lower resolution, smaller shadow map), 2 battery saver
   * (1x resolution, no shadows). Steps down by itself when the phone can't keep ~50 fps;
   * the "Battery saver" switch in Settings forces level 2.
   */
  private basePR = 1;
  private autoQ = 0;
  private saver = false;
  private q = -1;
  private ftAcc = 0; private ftN = 0;
  setSaver(on: boolean) { this.saver = on; this.applyQuality(); }
  get qualityLevel() { return this.q; }
  private applyQuality() {
    const q = this.saver ? 2 : this.autoQ;
    if (q === this.q) return;
    this.q = q;
    this.renderer.setPixelRatio(q === 0 ? this.basePR : q === 1 ? Math.min(this.basePR, 1.25) : 1);
    this.sun.castShadow = q < 2;
    const ms = q === 0 ? 1536 : 1024;
    if (this.sun.shadow.mapSize.x !== ms) { this.sun.shadow.mapSize.set(ms, ms); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    this.resize();
  }
  /** Average frame time while running; two slow 3-second windows in a row step quality down. */
  private watchFrames(dt: number) {
    if (this.state !== 'run' || this.saver || this.autoQ >= 2) { this.ftAcc = 0; this.ftN = 0; return; }
    this.ftAcc += dt; this.ftN++;
    if (this.ftAcc < 3) return;
    const avg = this.ftAcc / this.ftN;
    this.ftAcc = 0; this.ftN = 0;
    if (avg > 1 / 48) { this.slowWin++; if (this.slowWin >= 2) { this.slowWin = 0; this.autoQ++; this.applyQuality(); try { localStorage.setItem('tf_q', String(this.autoQ)); } catch { /* private mode */ } } }
    else this.slowWin = 0;
  }
  private slowWin = 0;

  resize() {
    const p = this.canvas.parentElement!;
    const w = p.clientWidth, h = p.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private sfx(n: SfxName, rate = 1) { this.audio.play(n, rate); }

  say(text: string, ms = 1400) {
    this.audio.voice(text);
    this.ui.bubble.textContent = text;
    this.ui.bubble.classList.add('on');
    this.bubbleT = ms / 1000;
  }

  /** Per-run counters for daily tasks and achievements. */
  run: RunStats = newRunStats();
  private cleanFrom = 0;
  private runT = 0; private slowK = 1; private speedStep = 0; private fovKick = 0;
  private speedEl: HTMLElement | null = null;
  private speedUp() {
    this.sfx('chilli_whoosh', 1.5);
    this.fovKick = 1;
    if (!this.speedEl) {
      const el = document.createElement('div');
      el.className = 'speedup';
      this.ui.score.parentElement!.parentElement!.appendChild(el);
      this.speedEl = el;
    }
    this.speedEl.textContent = `⚡ Faster! ${this.speedStep * 500} m`;
    this.speedEl.classList.remove('on'); void this.speedEl.offsetWidth; this.speedEl.classList.add('on');
  }
  resetRun() {
    this.run = newRunStats(); this.cleanFrom = 0;
    this.runT = 0; this.slowK = 1; this.speedStep = 0; this.fovKick = 0;
    this.world.reset((Math.random() * 1e9) | 0);
    this.distance = 0; this.coins = 0; this.speed = BASE_SPEED;
    this.lane = 1; this.x = 0; this.y = 0; this.vy = 0; this.slideT = 0;
    this.lastHit = -99; this.chaseGap = 14; this.crashT = 0;
    this.shield = false; this.dashT = 0; this.floatT = 0; this.showPower();
    this.graceT = 0;
    this.fox.reset();
    this.stars.visible = false; this.sheet.visible = false;
    this.districtIdx = -1; this.foodIdx = 0; this.nextDelivery = DELIVERY_EVERY;
    this.ui.card.classList.remove('on'); this.ui.customer.classList.remove('on'); this.ui.district.classList.remove('on');
    this.setDistrict(0, false);
    this.ui.orderImg.src = A(FOODS[0]);
    this.updateHud();
  }

  private setDistrict(i: number, announce: boolean) {
    if (i === this.districtIdx) return;
    this.districtIdx = i;
    const d = DISTRICTS[i];
    this.skyFrom.copy(this.scene.background as THREE.Color);
    this.skyTo.set(d.sky);
    this.skyK = announce ? 0 : 1;
    this.fogTo = d.fog;
    if (!announce) { (this.scene.background as THREE.Color).set(d.sky); (this.scene.fog as THREE.Fog).color.set(d.fog); this.scenery?.setHorizon(this.scene.background as THREE.Color); }
    if (announce) {
      // name ribbon only: a picture of another scene popping over the run read as a glitch
      this.ui.districtName.textContent = d.name;
      this.ui.district.classList.add('on'); this.districtT = 2.4;
      this.sfx('slide_whistle_up', 1.2);
    }
  }
  private fogTo = COLORS.fog;
  private _ca = new THREE.Color(); private _cb = new THREE.Color();
  /** Light follows the street: through a district change the sky and fog shift with every metre run. */
  private blendSky() {
    const m = districtMix(this.distance + 25); // a little ahead, where the eye is
    const bg = this.scene.background as THREE.Color, fog = (this.scene.fog as THREE.Fog).color;
    bg.copy(this._ca.set(DISTRICTS[m.a].sky)).lerp(this._cb.set(DISTRICTS[m.b].sky), m.t);
    fog.copy(this._ca.set(DISTRICTS[m.a].fog)).lerp(this._cb.set(DISTRICTS[m.b].fog), m.t).lerp(bg, 0.6);
    this.scenery.setHorizon(bg, this._cb.set(DISTRICTS[m.a].top).lerp(this._ca.set(DISTRICTS[m.b].top), m.t));
    this.scenery.setMix(m.a, m.b, m.t);
    this.audio.ambience?.mix(m.a, m.b, m.t);
    // light per district: warm sunset roofs, cool dusk harbour, fresh green gardens
    const L = LIGHT[m.a], R = LIGHT[m.b], k = m.t;
    this.sun.color.setHex(L.sun).lerp(this._ca.setHex(R.sun), k);
    this.sun.intensity = L.si + (R.si - L.si) * k;
    this.hemi.color.setHex(L.sky).lerp(this._ca.setHex(R.sky), k);
    this.hemi.groundColor.setHex(L.gr).lerp(this._ca.setHex(R.gr), k);
    this.hemi.intensity = L.hi + (R.hi - L.hi) * k;
  }

  private deliver() {
    const c = pick(CUSTOMERS);
    this.coins += 5;
    this.ui.customerImg.src = A(c.img);
    const line = pick(c.say);
    this.ui.customerText.textContent = line + ' +5 tips';
    this.audio.voice(line);
    this.ui.customer.classList.add('on'); this.customerT = 3;
    this.sfx('coin', 1.3); this.sfx('pop');
    this.foodIdx = (this.foodIdx + 1) % FOODS.length;
    this.ui.orderImg.src = A(FOODS[this.foodIdx]);
  }

  start() {
    track('start');
    this.paused = false; this.audio.pausedByGame = false;
    this.audio.unlock();
    this.resetRun();
    this.state = 'run';
    this.ui.menu.classList.add('hidden');
    this.ui.over.classList.add('hidden');
    this.sfx('run_start');
    this.audio.startMusic();
    this.say(pick(BARKS.start));
    this.ticker.show(true);
  }

  // ---- input
  moveLane(d: number) {
    if (this.state !== 'run' || this.paused) return;
    const n = Math.max(0, Math.min(2, this.lane + d));
    if (n !== this.lane) { this.lane = n; this.sfx('swipe'); }
  }
  /** Jump/slide pressed slightly early (just before landing) still count. */
  private jumpBuf = 0;
  private slideBuf = 0;
  jump() {
    if (this.state !== 'run' || this.paused) return;
    if (this.y > 0.01) { this.jumpBuf = 0.16; return; }
    this.doJump();
  }
  private doJump() {
    this.vy = JUMP_V; this.slideT = 0; this.jumpBuf = 0; this.sfx('jump');
    if (this.state === 'run') this.run.jumps++;
  }
  slide() {
    if (this.state !== 'run' || this.paused) return;
    if (this.y > 0.01) { this.vy = Math.min(this.vy, -JUMP_V * 1.2); this.slideBuf = 0.3; return; } // fast-fall, slide on landing
    this.slideT = SLIDE_TIME; this.sfx('swipe', 0.8); this.run.slides++;
  }

  // ---- loop
  /** Set while a full-screen overlay hides the game. */
  hold = false;

  /** Pause menu open: nothing moves, the frame stays on screen. */
  paused = false;
  pause() {
    if (this.paused || (this.state !== 'run' && this.state !== 'crash')) return false;
    this.paused = true;
    this.audio.pausedByGame = true; this.audio.suspend();
    this.ticker.pause();
    return true;
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.audio.pausedByGame = false; this.audio.resume();
    this.ticker.resume();
  }
  /** Leave the run and go back to the title screen. */
  toMenu() {
    this.paused = false;
    this.audio.pausedByGame = false; this.audio.resume();
    this.audio.stopMusic();
    this.resetRun();
    this.state = 'menu';
    this.ticker.show(false);
    this.ui.over.classList.add('hidden');
    this.ui.card.classList.remove('on');
    this.ui.menu.classList.remove('hidden');
  }

  private loop(now: number) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
    this.last = now;
    if (this.hold || this.paused) return;
    if (this.q < 0) this.applyQuality();
    this.watchFrames(dt); // full-screen overlay (story intro) covers the canvas: save the GPU/battery
    this.acc += dt;
    const step = 1 / 60;
    while (this.acc >= step) { this.update(step); this.acc -= step; }
    this.render();
  }

  private update(dt: number) {
    this.time += dt;
    this.world.tick(dt);
    if (this.bubbleT > 0 && (this.bubbleT -= dt) <= 0) this.ui.bubble.classList.remove('on');
    if (this.customerT > 0 && (this.customerT -= dt) <= 0) this.ui.customer.classList.remove('on');
    if (this.districtT > 0 && (this.districtT -= dt) <= 0) this.ui.district.classList.remove('on');
    if (this.state === 'run' || this.state === 'crash') this.blendSky();
    const amb = this.audio.ambience;
    if (amb) {
      const run = this.state === 'run';
      if (run !== amb.on) amb.set(this.audio.vol.sfx, run);
      amb.tick(dt);
    }
    this.updateFx(dt);
    if (this.state === 'run') { this.run.dist = this.distance; this.run.bestClean = Math.max(this.run.bestClean, this.distance - this.cleanFrom); }

    if (this.state === 'run') this.updateRun(dt);
    else if (this.state === 'crash') this.updateCrash(dt);
    else if (this.state === 'menu') {
      this.world.advance(BASE_SPEED * 0.5 * dt, 0);
      this.fox.animate(this.time, dt, 0.3, false, false);
    }
  }

  private updateRun(dt: number) {
    if (this.graceT > 0) this.graceT -= dt;
    // a gag set piece coming into view: it breaks into the news crawl, the run keeps going
    for (const c of this.world.chunks) for (const g of c.gags as { z: number; cap: string; img: string; shown?: boolean }[]) {
      const wz = c.group.position.z + g.z;
      if (!g.shown && wz > -70 && wz < -14) { g.shown = true; this.ticker.breaking(g.cap, g.img); this.sfx('slide_whistle_up', 1.3); }
    }
    const difficulty = Math.min(1, this.distance / 2500);
    // speed: the distance ramp, a short sprint-up at the start, a stumble after a bump that wears off
    this.runT += dt;
    this.slowK += (1 - this.slowK) * Math.min(1, dt * 0.9);
    const ease = Math.min(1, 0.55 + this.runT * 0.25);
    const base = speedAt(this.distance);
    this.speed = base * ease * this.slowK;
    this.audio.setMusicRate(1 + ((base - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 0.14);
    if (this.dashT > 0) { this.dashT -= dt; this.speed *= 1.4; if (this.dashT <= 0) this.showPower(); }
    // every 500 m: it gets faster, and the game says so
    const step = Math.floor(this.distance / 500);
    if (step > this.speedStep) { this.speedStep = step; this.speedUp(); }
    if (this.floatT > 0 && (this.floatT -= dt) <= 0) this.showPower();
    const dz = this.speed * dt;
    this.world.advance(dz, difficulty);
    this.distance += dz;
    this.setDistrict(districtAt(this.distance), true);
    if (this.distance >= this.nextDelivery) { this.nextDelivery += DELIVERY_EVERY; this.deliver(); }

    // fox motion
    const tx = LANES[this.lane];
    this.x += (tx - this.x) * Math.min(1, dt * 14);
    // snappier arc: lighter going up, heavier coming down; float pickup halves it
    const gMul = (this.vy > 0 ? 0.85 : 1.35) * (this.floatT > 0 ? 0.5 : 1);
    this.vy -= GRAVITY * gMul * dt;
    this.y += this.vy * dt;
    if (this.jumpBuf > 0) this.jumpBuf -= dt;
    if (this.slideBuf > 0) this.slideBuf -= dt;
    if (this.y <= 0) {
      if (this.y < -0.001 && this.vy < -6) { this.sfx('land'); this.dust(this.x, 6); }
      this.y = 0; this.vy = 0;
      if (this.jumpBuf > 0) this.doJump();
      else if (this.slideBuf > 0) { this.slideBuf = 0; this.slideT = SLIDE_TIME; this.sfx('swipe', 0.8); this.run.slides++; }
    }
    if (this.slideT > 0) this.slideT -= dt;
    const sliding = this.slideT > 0 && this.y < 0.05;
    this.fox.group.position.set(this.x, this.y, 0);
    this.fox.group.rotation.z = (tx - this.x) * -0.08;
    this.fox.animate(this.time, dt, this.speed / MAX_SPEED, this.y > 0.05, sliding);
    this.fox.body.scale.y = 1;

    // collisions
    for (const c of this.world.chunks) {
      const cz = c.group.position.z;
      if (cz - 45 > 0 || cz < -45) continue;
      for (const o of c.obstacles) {
        const z = cz + o.z;
        if (o.hit || Math.abs(z) > o.depth / 2 + 0.35) continue; // ~fox half-depth, a touch forgiving
        if (o.lane !== this.nearestLane()) continue;
        let hit = false;
        if (o.kind === 'chimney') hit = true;
        else if (o.kind === 'crate') hit = this.y < 1.2;
        else if (o.kind === 'laundry') hit = !sliding && this.y < 1.2;
        else if (o.kind === 'gap') hit = this.y < 0.15 && Math.abs(z) < o.depth / 2 - 0.3;
        if (hit) {
          o.hit = true;
          if (this.graceT > 0) { /* grace after a cutaway */ }
          else if (this.dashT > 0) { o.mesh.visible = false; this.sfx('crash_thud', 1.4); }
          else this.onHit(o.kind);
        }
      }
      for (const k of c.coins) {
        if (k.taken) continue;
        const z = cz + k.z;
        k.mesh.rotation.z += dt * 4;
        if (Math.abs(z) < 0.8 && k.lane === this.nearestLane() && Math.abs(k.mesh.position.y - (this.y + 1.0)) < 1.3) {
          k.taken = true; k.mesh.visible = false; this.coins++; this.sfx('coin', 1 + (this.coins % 8) * 0.04);
          this.sparkle(k.mesh.position.x, k.mesh.position.y, z);
          this.run.tips++; this.run.tipsD[districtAt(this.distance)]++;
          if (this.coins % 15 === 0) this.say(pick(BARKS.coin));
        }
      }
      for (const p of c.pickups) {
        if (p.taken) continue;
        p.mesh.position.y = 1.6 + Math.sin(this.time * 4) * 0.15;
        if (Math.abs(cz + p.z) < 1.0 && p.lane === this.nearestLane() && this.y < 2.2) {
          p.taken = true; p.mesh.visible = false; this.collect(p.kind);
        }
      }
    }

    // chasers recover gap
    this.chaseGap = Math.min(14, this.chaseGap + dt * 2.2);
    // a quip every ~15-25 s; the Crowd heckles when it's close behind
    if ((this.quipT -= dt) <= 0 && this.bubbleT <= 0) {
      this.quipT = 15 + Math.random() * 10;
      this.say(this.chaseGap < 7 ? pick(HECKLES) : pick(QUIPS), 2200);
    }
    this.updateChasers();
    this.updateHud();
  }


  private collect(kind: 'hotbag' | 'chilli' | 'umbrella') {
    this.buzz(25); this.run.pickups++;
    if (kind === 'hotbag') { this.shield = true; this.sfx('hot_bag'); this.say('Hot bag! Shielded.'); }
    else if (kind === 'chilli') { this.dashT = 4; this.sfx('chilli_whoosh'); this.say('Chilli dash!'); this.shakeT = 0.4; this.shakeA = 0.12; }
    else { this.floatT = 8; this.sfx('umbrella_open'); this.say('Floaty umbrella!'); }
    this.showPower();
  }
  private showPower() {
    if (!this.power) return;
    const parts: string[] = [];
    if (this.shield) parts.push('🛡 Hot bag');
    if (this.dashT > 0) parts.push('🌶 Dash');
    if (this.floatT > 0) parts.push('☂ Float');
    this.power.textContent = parts.join('  ');
  }

  private nearestLane() {
    let best = 0, bd = 99;
    LANES.forEach((l, i) => { const d = Math.abs(l - this.x); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  private onHit(kind: string) {
    if (this.shield) {
      this.shield = false; this.showPower();
      this.sfx('pop'); this.say('Hot bag saved me!');
      return;
    }
    if (this.time - this.lastHit < HIT_WINDOW) { this.crash(kind); return; }
    this.lastHit = this.time; this.cleanFrom = this.distance;
    this.buzz(70); this.shakeT = 0.35; this.shakeA = 0.22; this.dust(this.x, 8);
    this.chaseGap = 2.2;
    this.slowK = 0.7;
    this.sfx('boing'); this.sfx('slide_whistle_down');
    this.say(pick(BARKS.hit));
  }

  private crash(kind: string) {
    this.state = 'crash'; this.crashT = 0; this.crashKind = kind;
    this.buzz([90, 40, 120]); this.shakeT = 0.5; this.shakeA = 0.3;
    this.audio.stopMusic();
    this.sfx(kind === 'chimney' ? 'crash_thud' : kind === 'laundry' ? 'pop' : kind === 'gap' ? 'slide_whistle_down' : 'dizzy_stars');
    this.sfx('dust_dogpile');
    const art = CRASH_ART[kind] ?? 'fox_07_dizzy';
    this.ui.card.src = A(art);
    this.ui.card.classList.remove('on'); void this.ui.card.offsetWidth; this.ui.card.classList.add('on');
    if (kind === 'crate') this.stars.visible = true;
    if (kind === 'laundry') { this.sheet.visible = true; this.sheet.position.set(this.x, 0.9, 0); }
    this.say(pick((BARKS as any)[kind] ?? BARKS.hit), 2000);
    this.chaseGap = 1.5;
  }

  private updateCrash(dt: number) {
    this.crashT += dt;
    const t = this.crashT, f = this.fox;
    if (this.crashKind === 'chimney') {
      const k = Math.min(1, t / 0.15);
      f.group.scale.z = 1 - 0.8 * k; f.group.scale.y = 1 + 0.1 * k; f.group.scale.x = 1 + 0.5 * k;
      f.group.position.y = Math.max(0, 1 - t * 1.5);
    } else if (this.crashKind === 'gap') {
      f.group.position.y -= dt * (3 + t * 14);
      f.group.rotation.z += dt * 7;
    } else if (this.crashKind === 'laundry') {
      f.group.visible = t > 0.4 ? false : true;
      this.sheet.position.y = 0.9 + Math.abs(Math.sin(t * 8)) * 0.12;
      this.sheet.rotation.z = Math.sin(t * 10) * 0.12;
    } else {
      if (f.has('fall')) { f.act('fall', dt); f.group.position.y = Math.max(0, f.group.position.y - dt * 4); }
      else { f.group.rotation.z = Math.min(1.4, t * 5); f.group.position.y = Math.max(0, 0.5 - t); }
      this.stars.position.set(f.group.position.x, 2.6, 0);
      this.stars.children.forEach((s) => {
        const a = s.userData.a + t * 5;
        s.position.set(Math.cos(a) * 0.8, Math.sin(t * 6 + s.userData.a) * 0.1, Math.sin(a) * 0.8);
        s.rotation.y += dt * 6;
      });
    }
    if (t > 1.2 && this.chaseGap > 0.5) this.chaseGap -= dt * 2;
    this.updateChasers();
    if (t > 1.9) this.end();
  }

  private updateChasers() {
    this.chasers.forEach((c, i) => {
      const z = this.chaseGap + 2 + (i === 1 ? 0.8 : 0);
      c.position.set(LANES[i] * 0.8 + Math.sin(this.time * 3 + i) * 0.2, Math.abs(Math.sin(this.time * 10 + i)) * 0.2, Math.min(z, 18));
      c.visible = z < 16;
      if (c.visible) {
        const mx = this.raccoonMixers[i];
        if (mx) mx.update(1 / 60); else animateRaccoon(this.raccoons[i], this.time, i * 2.1);
      }
    });
  }

  private end() {
    this.state = 'over';
    this.ticker.show(false);
    track('end', this.crashKind, this.distance, districtAt(this.distance));
    this.ui.card.classList.remove('on');
    this.sfx('game_over');
    const overLine = pick(BARKS.over);
    this.ui.overTitle.textContent = overLine;
    this.audio.voice(overLine);
    this.ui.overText.textContent = `${Math.floor(this.distance)} m  ·  ${this.coins} tips  ·  score ${this.score()}`;
    this.onOver?.(this.score(), this.distance, this.coins);
    this.ui.over.classList.remove('hidden');
    this.stars.visible = false;
    try {
      const best = Number(localStorage.getItem('tf_best') || 0);
      if (this.score() > best) localStorage.setItem('tf_best', String(this.score()));
    } catch { /* storage may be unavailable */ }
  }

  /** UI hook: a run just ended (score, metres, tips). */
  onOver: ((score: number, dist: number, tips: number) => void) | null = null;
  score() { return Math.floor(this.distance * (1 + this.coins * 0.02)); }

  private updateHud() {
    this.ui.score.textContent = `${Math.floor(this.distance)} m`;
    this.ui.coins.textContent = `${this.coins} tips`;
  }

  /** Debug: when set, the camera uses this pose instead of following the fox. */
  photo: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;

  private render() {
    if (this.photo) {
      this.camera.position.copy(this.photo.pos);
      this.camera.lookAt(this.photo.look);
      this.world.syncInstances(this.camera);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const f = this.fox.group;
    const cx = f.position.x * 0.5;
    // low, close chase cam like the district art: Marm big in frame, houses close either side.
    // At speed it eases up and back a touch so obstacles still show ~1.5 s ahead.
    const k = THREE.MathUtils.clamp((this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED), 0, 1);
    const wide = this.camera.aspect > 1 ? 1 : 0;
    this.camera.position.set(cx, 3.25 + k * 0.45 + wide * 0.5, 6.3 + k * 0.9 + wide * 0.8);
    this.camera.lookAt(cx * 0.7, 1.75 + k * 0.1, -18);
    // the view widens with speed, plus a short punch when a speed-up lands
    this.fovKick = Math.max(0, this.fovKick - 0.03);
    const fov = 55 + k * 7 + this.fovKick * 4 + (this.dashT > 0 ? 4 : 0);
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov += (fov - this.camera.fov) * 0.15; this.camera.updateProjectionMatrix(); }
    if (this.shakeT > 0) {
      const a = this.shakeA * Math.min(1, this.shakeT / 0.25);
      this.camera.position.x += (Math.random() - 0.5) * a; this.camera.position.y += (Math.random() - 0.5) * a * 0.6;
    }
    this.sun.position.set(f.position.x - 6, 14, 8);
    this.sun.target.position.set(f.position.x, 0, 0);
    this.world.syncInstances(this.camera);
    this.renderer.render(this.scene, this.camera);
  }
}
