import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { animateRun, createFox, Fox } from './fox';

/** Extra yaw applied to the loaded model so it faces -Z. */
const MODEL_YAW = Math.PI;

export type Move = 'idle' | 'run' | 'jump' | 'slide';

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
    const url = import.meta.env.BASE_URL + 'models/marm.glb';
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
          const key: Move | null = n.includes('run') || n.includes('walk') ? 'run' : n.includes('jump') ? 'jump' : n.includes('slide') || n.includes('crouch') || n.includes('roll') ? 'slide' : n.includes('idle') || n.includes('stand') ? 'idle' : null;
          if (key && !this.clips.has(key)) { this.clips.set(key, this.mixer.clipAction(clip)); this.own.add(key); }
        }
        if (!this.clips.has('idle') && this.clips.has('run')) this.clips.set('idle', this.clips.get('run')!);
      }
      if (this.placeholder) { this.body.remove(this.placeholder.group); this.placeholder = null; }
      this.model = pose;
      this.body.add(pose);
      this.play(this.current, true);
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
    if (move === 'jump' || move === 'slide') { next.setLoop(THREE.LoopRepeat, Infinity); }
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
      // no dedicated jump/slide clips yet: slow the run cycle right down mid-air so the legs read as a leap
      if (run && (move === 'jump' || move === 'slide') && !this.hasOwn(move)) run.timeScale = move === 'jump' ? 0.25 : 0.6;
      this.mixer.update(dt);
    }
    // procedural accents on top of (or instead of) clips
    const m = this.model!;
    const w = time * (9 + speedFactor * 6);
    const hasClips = this.clips.size > 0;
    m.position.y = (hasClips ? 0 : (airborne || sliding ? 0 : Math.abs(Math.sin(w)) * 0.12));
    m.rotation.x = sliding ? -1.1 : airborne ? 0.12 : hasClips ? 0.05 : 0.12;
    m.rotation.z = hasClips ? 0 : Math.sin(w * 0.5) * 0.03;
  }

  /** Reset transforms after a crash. */
  reset() {
    this.group.scale.set(1, 1, 1); this.group.rotation.set(0, 0, 0); this.group.position.set(0, 0, 0); this.group.visible = true;
    this.body.scale.set(1, 1, 1);
    if (this.model) { this.model.rotation.set(0, 0, 0); }
  }
}
