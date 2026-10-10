import * as THREE from 'three';
import { createRaccoon, animateRaccoon, Raccoon, loadRaccoonGLB, raccoonInstance } from './raccoon';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Audio, SfxName } from './audio';
import { BASE_SPEED, COLORS, GRAVITY, HIT_WINDOW, JUMP_V, LANES, MAX_SPEED, SLIDE_TIME } from './constants';
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
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const A = (n: string) => `${import.meta.env.BASE_URL}art/${n}.webp`;
const DISTRICTS = [
  { name: 'Noodle Roofs', img: 'world_01_noodle_roofs', sky: 0xf9c98a, fog: 0xf6b46b },
  { name: 'Harbour Lights', img: 'world_02_harbour_lights', sky: 0xa9a4d8, fog: 0x9a93c9 },
  { name: 'Garden Terraces', img: 'world_03_garden_terraces', sky: 0xcfe9c4, fog: 0xbfe0b8 },
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
const GAGS = [
  { img: 'gag_01_chimney_therapy', cap: 'Meanwhile, at Chimney Therapy...' },
  { img: 'gag_02_pigeon_union', cap: 'Meanwhile, the Pigeon Union votes...' },
  { img: 'gag_03_raccoon_mirror', cap: 'Meanwhile, the Crowd rehearses menace...' },
];
const GAG_FREEZE = 2.6; // seconds the cutaway holds the game
const GAG_GRACE = 1.2;  // invulnerable seconds after it ends
const DELIVERY_EVERY = 350; // metres between deliveries

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 9 / 16, 0.1, 140);
  readonly world = new World();
  readonly fox = new FoxActor();
  readonly audio = new Audio();
  private chasers: THREE.Group[] = [];
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
  private gagEl: HTMLElement | null = null;
  private gagImg: HTMLImageElement | null = null;
  private gagCap: HTMLElement | null = null;
  private gagT = 0;
  private graceT = 0;
  private nextGag = 450;
  private gagIdx = 0;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 30, 110);

    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.4;
    const hemi = new THREE.HemisphereLight(0xfff0d6, 0xb07a55, 0.7);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
    sun.position.set(-6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.radius = 5; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    this.scene.add(sun, sun.target);
    this.sun = sun;

    this.scene.add(this.world.group);
    loadKit().then(() => { if (this.state === 'menu') this.world.reset(1); });
    this.scene.add(this.fox.group);
    const pw = document.createElement('div');
    pw.style.cssText = 'position:absolute;left:14px;top:58px;display:flex;gap:6px;pointer-events:none;font:800 14px system-ui;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.35)';
    this.ui.score.parentElement?.parentElement?.appendChild(pw);
    this.power = pw;
    const gg = document.createElement('div');
    gg.style.cssText = 'position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(20,10,5,.78);z-index:5;pointer-events:none;padding:16px';
    const gi = document.createElement('img');
    gi.style.cssText = 'width:100%;border-radius:18px;box-shadow:0 8px 30px rgba(0,0,0,.5);border:4px solid #fff7e6';
    const gc = document.createElement('div');
    gc.style.cssText = 'color:#fff7e6;font:800 clamp(15px,4.2vw,22px) system-ui;text-align:center;text-shadow:0 2px 0 rgba(0,0,0,.5)';
    gg.append(gi, gc);
    this.ui.score.parentElement?.parentElement?.appendChild(gg);
    this.gagEl = gg; this.gagImg = gi; this.gagCap = gc;

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

  resetRun() {
    this.world.reset((Math.random() * 1e9) | 0);
    this.distance = 0; this.coins = 0; this.speed = BASE_SPEED;
    this.lane = 1; this.x = 0; this.y = 0; this.vy = 0; this.slideT = 0;
    this.lastHit = -99; this.chaseGap = 14; this.crashT = 0;
    this.shield = false; this.dashT = 0; this.floatT = 0; this.showPower();
    this.gagT = 0; this.graceT = 0; this.nextGag = 450; if (this.gagEl) this.gagEl.style.display = 'none';
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
    if (!announce) { (this.scene.background as THREE.Color).set(d.sky); (this.scene.fog as THREE.Fog).color.set(d.fog); }
    if (announce) {
      this.ui.districtImg.src = A(d.img); this.ui.districtName.textContent = d.name;
      this.ui.district.classList.add('on'); this.districtT = 3;
      this.sfx('slide_whistle_up', 1.2);
    }
  }
  private fogTo = COLORS.fog;

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
    this.audio.unlock();
    this.resetRun();
    this.state = 'run';
    this.ui.menu.classList.add('hidden');
    this.ui.over.classList.add('hidden');
    this.sfx('run_start');
    this.audio.startMusic();
    this.say(pick(BARKS.start));
  }

  // ---- input
  moveLane(d: number) {
    if (this.state !== 'run') return;
    const n = Math.max(0, Math.min(2, this.lane + d));
    if (n !== this.lane) { this.lane = n; this.sfx('swipe'); }
  }
  /** Jump/slide pressed slightly early (just before landing) still count. */
  private jumpBuf = 0;
  private slideBuf = 0;
  jump() {
    if (this.state !== 'run') return;
    if (this.y > 0.01) { this.jumpBuf = 0.16; return; }
    this.doJump();
  }
  private doJump() {
    this.vy = JUMP_V; this.slideT = 0; this.jumpBuf = 0; this.sfx('jump');
  }
  slide() {
    if (this.state !== 'run') return;
    if (this.y > 0.01) { this.vy = Math.min(this.vy, -JUMP_V * 1.2); this.slideBuf = 0.3; return; } // fast-fall, slide on landing
    this.slideT = SLIDE_TIME; this.sfx('swipe', 0.8);
  }

  // ---- loop
  /** Set while a full-screen overlay hides the game. */
  hold = false;

  private loop(now: number) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.1, (now - this.last) / 1000 || 0);
    this.last = now;
    if (this.hold) return; // full-screen overlay (story intro) covers the canvas: save the GPU/battery
    this.acc += dt;
    const step = 1 / 60;
    while (this.acc >= step) { this.update(step); this.acc -= step; }
    this.render();
  }

  private update(dt: number) {
    this.time += dt;
    if (this.bubbleT > 0 && (this.bubbleT -= dt) <= 0) this.ui.bubble.classList.remove('on');
    if (this.customerT > 0 && (this.customerT -= dt) <= 0) this.ui.customer.classList.remove('on');
    if (this.districtT > 0 && (this.districtT -= dt) <= 0) this.ui.district.classList.remove('on');
    if (this.skyK < 1) {
      this.skyK = Math.min(1, this.skyK + dt / 2);
      (this.scene.background as THREE.Color).copy(this.skyFrom).lerp(this.skyTo, this.skyK);
      (this.scene.fog as THREE.Fog).color.copy(this.scene.background as THREE.Color).lerp(new THREE.Color(this.fogTo), 0.4);
    }

    if (this.state === 'run') this.updateRun(dt);
    else if (this.state === 'crash') this.updateCrash(dt);
    else if (this.state === 'menu') {
      this.world.advance(BASE_SPEED * 0.5 * dt, 0);
      this.fox.animate(this.time, dt, 0.3, false, false);
    }
  }

  private updateRun(dt: number) {
    if (this.gagT > 0) {
      this.gagT -= dt;
      if (this.gagT <= 0 && this.gagEl) { this.gagEl.style.display = 'none'; this.graceT = GAG_GRACE; this.audio.startMusic(); }
      return;
    }
    if (this.graceT > 0) this.graceT -= dt;
    if (this.distance >= this.nextGag) this.startGag();
    const difficulty = Math.min(1, this.distance / 2500);
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + this.distance * 0.006);
    this.audio.setMusicRate(1 + ((this.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 0.12);
    if (this.dashT > 0) { this.dashT -= dt; this.speed *= 1.4; if (this.dashT <= 0) this.showPower(); }
    if (this.floatT > 0 && (this.floatT -= dt) <= 0) this.showPower();
    const dz = this.speed * dt;
    this.world.advance(dz, difficulty);
    this.distance += dz;
    this.setDistrict(Math.floor(this.distance / 700) % DISTRICTS.length, true);
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
      if (this.y < -0.001 && this.vy < -6) this.sfx('land');
      this.y = 0; this.vy = 0;
      if (this.jumpBuf > 0) this.doJump();
      else if (this.slideBuf > 0) { this.slideBuf = 0; this.slideT = SLIDE_TIME; this.sfx('swipe', 0.8); }
    }
    if (this.slideT > 0) this.slideT -= dt;
    const sliding = this.slideT > 0 && this.y < 0.05;
    this.fox.group.position.set(this.x, this.y, 0);
    this.fox.group.rotation.z = (tx - this.x) * -0.08;
    this.fox.animate(this.time, dt, this.speed / MAX_SPEED, this.y > 0.05, sliding);
    this.fox.body.scale.y = sliding ? 0.75 : 1;

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
        else if (o.kind === 'crate') hit = this.y < 1.05;
        else if (o.kind === 'laundry') hit = !sliding;
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
    this.updateChasers();
    this.updateHud();
  }

  private startGag() {
    const gag = GAGS[this.gagIdx++ % GAGS.length];
    this.nextGag = this.distance + 500 + Math.random() * 400;
    if (!this.gagEl || !this.gagImg || !this.gagCap) return;
    this.gagImg.src = A(gag.img);
    this.gagCap.textContent = gag.cap;
    this.gagEl.style.display = 'flex';
    this.gagT = GAG_FREEZE;
    this.audio.stopMusic();
    this.sfx('slide_whistle_up', 1.1);
    this.ui.bubble.classList.remove('on');
  }

  private collect(kind: 'hotbag' | 'chilli' | 'umbrella') {
    if (kind === 'hotbag') { this.shield = true; this.sfx('hot_bag'); this.say('Hot bag! Shielded.'); }
    else if (kind === 'chilli') { this.dashT = 4; this.sfx('chilli_whoosh'); this.say('Chilli dash!'); }
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
    this.lastHit = this.time;
    this.chaseGap = 2.2;
    this.speed *= 0.8;
    this.sfx('boing'); this.sfx('slide_whistle_down');
    this.say(pick(BARKS.hit));
  }

  private crash(kind: string) {
    this.state = 'crash'; this.crashT = 0; this.crashKind = kind;
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
    this.ui.card.classList.remove('on');
    this.sfx('game_over');
    const overLine = pick(BARKS.over);
    this.ui.overTitle.textContent = overLine;
    this.audio.voice(overLine);
    this.ui.overText.textContent = `${Math.floor(this.distance)} m  ·  ${this.coins} tips  ·  score ${this.score()}`;
    this.ui.over.classList.remove('hidden');
    this.stars.visible = false;
    try {
      const best = Number(localStorage.getItem('tf_best') || 0);
      if (this.score() > best) localStorage.setItem('tf_best', String(this.score()));
    } catch { /* storage may be unavailable */ }
  }

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
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const f = this.fox.group;
    const cx = f.position.x * 0.5;
    this.camera.position.set(cx, 6.4, 10.5);
    this.camera.lookAt(cx * 0.7, 1.2, -9);
    this.sun.position.set(f.position.x - 6, 14, 8);
    this.sun.target.position.set(f.position.x, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
