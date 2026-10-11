import * as THREE from 'three';
import { modelUrl } from './assetUrl';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { animateRun, createFox, Fox } from './fox';

/** Extra yaw applied to the loaded model so it faces -Z. */
const MODEL_YAW = Math.PI;

const _q = new THREE.Quaternion(), _eul = new THREE.Euler();
/** Slide pose: drop, lean and per-bone offsets (local radians) applied over the run clip. */
export const SLIDE = {
  drop: 0.3, lean: -0.38,
  bones: [
    ['Spine', -0.35, 0, 0], ['Spine1', -0.2, 0, 0],
    ['LeftUpLeg', -1.5, 0, 0.1], ['LeftLeg', 0.15, 0, 0],
    ['RightUpLeg', -0.7, 0, -0.15], ['RightLeg', 1.9, 0, 0],
    ['LeftArm', 0, 0, 0.6], ['RightArm', 0, 0, -0.6],
  ] as [string, number, number, number][],
};

export type Move = 'idle' | 'run' | 'jump' | 'slide' | 'fall';

/**
 * The fox on screen. Starts as the code-built placeholder and swaps to the GLB model
 * (public/models/marm.glb) once it loads. `group` is what the game moves; `body` is
 * a child the game may squash/tilt. Animation clips, when the GLB has them, are
 * matched by name (idle/run/jump/slide); otherwise the model gets a procedural bob.
 */
export class FoxActor {
  readonly group = new THREE.Group();
  readonly body = new THREE.Group();
  private placeholder: Fox | null = createFox();
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clips = new Map<Move, THREE.AnimationAction>();
  private current: Move = 'idle';
  private speedFactor = 0;

  constructor() {
    this.group.add(this.body);
    this.body.add(this.placeholder!.group);
    this.load();
  }

  get ready() { return !!this.model; }
  private own = new Set<Move>();
  private hasOwn(m: Move) { return this.own.has(m); }

  private async load() {
    const url = modelUrl('models/marm.glb');
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      const m = gltf.scene;
      // normalise: feet on y=0, height ~2.7 world units, facing -Z
      const box = new THREE.Box3().setFromObject(m);
      const size = new THREE.Vector3(); box.getSize(size);
      const s = 2.75 / size.y;
      m.scale.setScalar(s);
      box.setFromObject(m);
      m.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
      // pose (procedural lean/bob) > yaw (generated models face +Z, the game runs toward -Z) > model
      const yaw = new THREE.Group();
      yaw.rotation.y = MODEL_YAW;
      yaw.add(m);
      const pose = new THREE.Group();
      pose.add(yaw);
      m.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true; o.receiveShadow = false;
          const mat = o.material as THREE.MeshStandardMaterial;
          if (mat && 'roughness' in mat) { mat.roughness = Math.min(mat.roughness, 0.75); mat.metalness = 0; }
        }
      });
      if (gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(m);
        for (const clip of gltf.animations) {
          const n = clip.name.toLowerCase();
          const key: Move | null = n.includes('run') || n.includes('walk') ? 'run' : n.includes('jump') ? 'jump' : n.includes('fall') ? 'fall' : n.includes('slide') || n.includes('crouch') || n.includes('roll') ? 'slide' : n.includes('idle') || n.includes('stand') ? 'idle' : null;
          if (!key || this.clips.has(key)) continue;
          let c = clip;
          if (key === 'jump') c = oneHop(clip);
          const a = this.mixer.clipAction(c);
          if (key === 'jump' || key === 'fall') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
          if (key === 'fall') a.timeScale = 1.6;
          this.clips.set(key, a); this.own.add(key);
        }
        if (!this.clips.has('idle') && this.clips.has('run')) this.clips.set('idle', this.clips.get('run')!);
      }
      this.bones = new Map();
      m.traverse((o) => { if ((o as THREE.Bone).isBone) this.bones!.set(o.name.replace(/^mixamorig:?/, ''), o); });
      if (this.placeholder) { this.body.remove(this.placeholder.group); this.placeholder = null; }
      this.model = pose;
      this.body.add(pose);
      this.play(this.current, true);
      this.mixer?.update(0);
      this.applyLook();
    } catch (e) {
      console.warn('fox model not loaded, keeping placeholder', e);
    }
  }

  private play(move: Move, force = false) {
    if (!force && move === this.current) return;
    const prev = this.clips.get(this.current);
    const next = this.clips.get(move) ?? this.clips.get('run');
    this.current = move;
    if (!next) return;
    if (prev === next && !force) return; // same clip (fallback) keeps playing, only its speed changes
    if (prev && prev !== next) prev.fadeOut(0.12);
    next.reset().setEffectiveWeight(1).fadeIn(0.12).play();
    if (move === 'slide' && !this.hasOwn('slide')) next.setLoop(THREE.LoopRepeat, Infinity);
    if (move === 'jump' && !this.hasOwn('jump')) next.setLoop(THREE.LoopRepeat, Infinity);
  }

  /** Has a real (non-fallback) clip for this move. */
  has(move: Move) { return this.own.has(move); }

  /** Drive a one-off clip (e.g. 'fall' during a crash) without the run logic. */
  act(move: Move, dt: number) {
    if (!this.model || !this.mixer) return;
    this.play(move);
    this.mixer.update(dt);
  }

  /** Per-frame animation. speedFactor 0..1. */
  animate(time: number, dt: number, speedFactor: number, airborne: boolean, sliding: boolean) {
    this.speedFactor = speedFactor;
    if (this.placeholder) { animateRun(this.placeholder, time, speedFactor, airborne, sliding); return; }
    const move: Move = airborne ? 'jump' : sliding ? 'slide' : speedFactor > 0.05 ? 'run' : 'idle';
    this.play(move);
    if (this.mixer) {
      const run = this.clips.get('run');
      if (run && move === 'run') run.timeScale = 0.9 + speedFactor * 0.8;
      // one hop spread over the real airtime (~0.7 s): tuck on the way up, legs out for landing
      const jump = this.clips.get('jump');
      if (jump && move === 'jump' && this.hasOwn('jump')) jump.timeScale = jump.getClip().duration / 0.62;
      // no dedicated jump/slide clips yet: slow the run cycle right down mid-air so the legs read as a leap
      if (run && (move === 'jump' || move === 'slide') && !this.hasOwn(move)) run.timeScale = move === 'jump' ? 0.25 : 0.6;
      this.mixer.update(dt);
    }
    // procedural accents on top of (or instead of) clips
    const m = this.model!;
    const w = time * (9 + speedFactor * 6);
    const hasClips = this.clips.size > 0;
    // baseball slide: ease into a low, leaning-back pose with one leg out front (bones posed on top of the clip)
    this.slideK += ((sliding ? 1 : 0) - this.slideK) * Math.min(1, dt * 14);
    const k = this.slideK;
    m.position.y = (hasClips ? 0 : (airborne || sliding ? 0 : Math.abs(Math.sin(w)) * 0.12)) - k * SLIDE.drop;
    m.rotation.x = (airborne ? 0.12 : hasClips ? 0.05 : 0.12) * (1 - k) + k * SLIDE.lean;
    if (k > 0.01 && this.bones) {
      for (const [name, rx, ry, rz] of SLIDE.bones) {
        const b = this.bones.get(name);
        if (!b) continue;
        _q.setFromEuler(_eul.set(rx, ry, rz));
        b.quaternion.slerp(_q.premultiply(b.quaternion.clone()), k);
      }
    }
    m.rotation.z = hasClips ? 0 : Math.sin(w * 0.5) * 0.03;
  }

  private slideK = 0;
  private bones: Map<string, THREE.Object3D> | null = null;
  // ---- shop look: bag colour (recoloured texture) and an accessory attached to a bone
  private look: { bag: number | null; acc: string } = { bag: null, acc: 'acc_none' };
  private origMap: THREE.Texture | null = null;
  private bagMaps = new Map<number, THREE.Texture>();
  private accObj: THREE.Object3D | null = null;
  setLook(bag: number | null, acc: string) { this.look = { bag, acc }; this.applyLook(); }
  private skinMat(): THREE.MeshStandardMaterial | null {
    let m: THREE.MeshStandardMaterial | null = null;
    this.model?.traverse((o) => { if (!m && o instanceof THREE.Mesh && (o.material as THREE.MeshStandardMaterial).map) m = o.material as THREE.MeshStandardMaterial; });
    return m;
  }
  private applyLook() {
    if (!this.model) return;
    const mat = this.skinMat();
    if (mat) {
      this.origMap ??= mat.map;
      const want = this.look.bag == null ? this.origMap : this.bagMap(this.look.bag);
      if (want && mat.map !== want) { mat.map = want; mat.needsUpdate = true; }
    }
    if (this.accObj) { this.accObj.removeFromParent(); this.accObj = null; }
    const head = this.bones?.get('Head'), neck = this.bones?.get('Neck');
    const acc = accessory(this.look.acc);
    if (!acc || !head || !neck) return;
    this.group.updateMatrixWorld(true);
    const at = (this.look.acc === 'acc_scarf' ? neck : head).getWorldPosition(new THREE.Vector3());
    acc.position.add(this.group.worldToLocal(at));
    this.group.add(acc);
    (this.look.acc === 'acc_scarf' ? neck : head).attach(acc);
    this.accObj = acc;
  }
  /** The model's texture with the teal bag pixels turned to another colour (cached per colour). */
  private bagMap(color: number) {
    const hit = this.bagMaps.get(color);
    if (hit) return hit;
    const src = this.origMap!, img = src.image as CanvasImageSource & { width: number; height: number };
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, c.width, c.height), d = data.data;
    const tgt = new THREE.Color(color), th = { h: 0, s: 0, l: 0 }; tgt.getHSL(th);
    const px = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 };
    for (let i = 0; i < d.length; i += 4) {
      px.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, THREE.SRGBColorSpace);
      px.getHSL(hsl, THREE.SRGBColorSpace);
      // the bag (and its darker straps) is the only teal/cyan in Marm's texture
      if (hsl.h < 0.42 || hsl.h > 0.56 || hsl.s < 0.18 || hsl.l < 0.06) continue;
      px.setHSL(th.h, Math.min(1, th.s * (0.6 + hsl.s * 0.6)), Math.min(0.95, hsl.l * (th.l / 0.4)), THREE.SRGBColorSpace);
      const o = { r: 0, g: 0, b: 0 }; px.getRGB(o, THREE.SRGBColorSpace);
      d[i] = o.r * 255; d[i + 1] = o.g * 255; d[i + 2] = o.b * 255;
    }
    g.putImageData(data, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.flipY = src.flipY; t.colorSpace = src.colorSpace; t.wrapS = src.wrapS; t.wrapT = src.wrapT;
    t.anisotropy = src.anisotropy; t.channel = src.channel;
    this.bagMaps.set(color, t);
    return t;
  }

  /** Debug/look helpers: bone by name. */
  bone(name: string) { return this.bones?.get(name) ?? null; }

  /** Reset transforms after a crash. */
  reset() {
    this.group.scale.set(1, 1, 1); this.group.rotation.set(0, 0, 0); this.group.position.set(0, 0, 0); this.group.visible = true;
    this.body.scale.set(1, 1, 1);
    if (this.model) { this.model.rotation.set(0, 0, 0); }
  }
}

/**
 * Tripo's "jump" preset is a few hops in place. Keep one hop (take-off crouch to
 * landing) and drop the hips' vertical travel: the game already moves the fox up.
 */
function oneHop(clip: THREE.AnimationClip) {
  const hips = clip.tracks.find((t) => /hips\.position$/i.test(t.name));
  let t0 = 0.42, t1 = 0.92;
  if (hips) {
    // find the 2nd local minimum of hips height (crouch before a hop) and the next one
    const tt = hips.times, v = hips.values, mins: number[] = [];
    for (let i = 1; i < tt.length - 1; i++) if (v[i * 3 + 1] <= v[i * 3 - 2] && v[i * 3 + 1] < v[i * 3 + 4]) mins.push(tt[i]);
    if (mins.length >= 2) { t0 = mins[0]; t1 = mins[1]; }
  }
  const out = clip.clone();
  out.name = 'jump_hop';
  out.tracks = out.tracks.filter((t) => !/hips\.position$/i.test(t.name)).map((t) => {
    const tr = t.clone();
    tr.trim(t0, t1); tr.shift(-t0);
    return tr;
  });
  out.resetDuration();
  return out;
}

/** Shop extras, built in fox space (y up, facing -Z) relative to the joint they hang from. */
function accessory(id: string): THREE.Object3D | null {
  const std = (c: number, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const g = new THREE.Group();
  if (id === 'acc_scarf') {
    const red = std(0xe2452f, 0.8), stripe = std(0xf6e3c0, 0.8);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.085, 10, 28), red);
    ring.rotation.x = Math.PI / 2; ring.scale.set(1.12, 0.98, 1); ring.position.y = 0.1;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.06), red);
    tail.position.set(0.12, -0.16, -0.24); tail.rotation.z = 0.25;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.065), stripe);
    band.position.set(0.105, -0.26, -0.24); band.rotation.z = 0.25;
    g.add(ring, tail, band);
  } else if (id === 'acc_shades') {
    const black = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.15, metalness: 0.3 });
    for (const sx of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), black);
      lens.rotation.x = Math.PI / 2; lens.scale.set(1.15, 1, 0.85); lens.position.set(sx * 0.12, 0, 0);
      g.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.025), black);
    g.add(bridge);
    g.position.set(0, 0.27, -0.64); g.scale.setScalar(1.05);
  } else if (id === 'acc_chef') {
    const white = std(0xfdfbf6, 0.7);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.16, 24), white);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 14), white);
    puff.scale.set(1, 0.75, 1); puff.position.y = 0.2;
    g.add(band, puff);
    g.position.set(0, 0.66, 0.06); g.rotation.x = -0.12; g.scale.setScalar(1.3);
  } else return null;
  g.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return g;
}
