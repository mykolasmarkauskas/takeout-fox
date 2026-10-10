import * as THREE from 'three';
import { modelUrl } from './assetUrl';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS } from './constants';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/** Tripo raccoon (rigged, in-place run). Resolves null if the file isn't there. */
let glbPromise: Promise<{ scene: THREE.Object3D; clip: THREE.AnimationClip | null } | null> | null = null;
export function loadRaccoonGLB() {
  if (!glbPromise) glbPromise = new GLTFLoader().loadAsync(modelUrl('models/raccoon.glb'))
    .then((g) => ({ scene: g.scene, clip: g.animations[0] ?? null }))
    .catch(() => null);
  return glbPromise;
}
/** One placed, animated copy of the GLB raccoon, ~2.3 units tall, facing -Z. */
export function raccoonInstance(src: { scene: THREE.Object3D; clip: THREE.AnimationClip | null }, phase: number) {
  const m = SkeletonUtils.clone(src.scene);
  const box = new THREE.Box3().setFromObject(m);
  const size = new THREE.Vector3(); box.getSize(size);
  m.scale.setScalar(2.3 / size.y);
  box.setFromObject(m);
  m.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  m.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.frustumCulled = false; } });
  const yaw = new THREE.Group();
  yaw.rotation.y = Math.PI; // generated models face +Z
  yaw.add(m);
  let mixer: THREE.AnimationMixer | null = null;
  if (src.clip) {
    mixer = new THREE.AnimationMixer(m);
    const a = mixer.clipAction(src.clip);
    a.play();
    a.time = phase * src.clip.duration;
    a.timeScale = 1.15;
  }
  return { root: yaw, mixer };
}

const plush = (c: number, sheen: number, rough = 0.65) =>
  new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: 0, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(sheen) });
const glossy = (c: number) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 });

const MAT = {
  grey: plush(COLORS.raccoon, 0xc9ccd2),
  greyDark: plush(0x4f545b, 0x9aa0a8),
  cream: plush(COLORS.cream, 0xffffff),
  apron: plush(0xf7e7c8, 0xffffff, 0.7),
  mask: plush(0x2b2b2e, 0x6a6a70, 0.5),
  white: glossy(0xffffff),
  dark: glossy(0x1d1316),
  tongue: plush(0xe7646b, 0xffb0b4, 0.5),
};
const ball = (r: number, m: THREE.Material, sx = 1, sy = 1, sz = 1) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), m);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
};

export interface Raccoon { group: THREE.Group; body: THREE.Group; legs: THREE.Group[]; tail: THREE.Group; arms: THREE.Group[] }

/** Chunky Hangry Crowd raccoon in a cream apron. Faces -Z like the fox (it runs behind her). */
export function createRaccoon(): Raccoon {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const torso = ball(0.5, MAT.grey, 1.05, 1.0, 0.9);
  torso.position.y = 0.95;
  body.add(torso);
  const belly = ball(0.36, MAT.cream, 1, 0.95, 0.6);
  belly.position.set(0, 0.85, -0.3);
  body.add(belly);
  // apron: bib + skirt + neck strap
  const bib = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.5, 0.12, 3, 0.06), MAT.apron);
  bib.position.set(0, 1.0, -0.47);
  bib.castShadow = true;
  body.add(bib);
  const skirt = ball(0.42, MAT.apron, 1.0, 0.7, 0.55);
  skirt.position.set(0, 0.62, -0.28);
  body.add(skirt);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 20, Math.PI), MAT.apron);
  strap.position.set(0, 1.26, -0.25);
  strap.rotation.x = Math.PI / 2 + 0.3;
  body.add(strap);

  // head
  const head = new THREE.Group();
  head.position.y = 1.55;
  body.add(head);
  head.add(ball(0.4, MAT.grey, 1.08, 0.95, 1));
  const mask = ball(0.3, MAT.mask, 1.45, 0.62, 0.55);
  mask.position.set(0, 0.04, -0.3);
  head.add(mask);
  const muzzle = ball(0.2, MAT.cream, 1.05, 0.7, 0.9);
  muzzle.position.set(0, -0.15, -0.36);
  head.add(muzzle);
  const nose = ball(0.065, MAT.dark);
  nose.position.set(0, -0.06, -0.52);
  head.add(nose);
  const tongue = ball(0.06, MAT.tongue, 1, 0.6, 1.2);
  tongue.position.set(0.02, -0.26, -0.46);
  head.add(tongue);
  for (const s of [-1, 1]) {
    const eye = ball(0.085, MAT.white, 1, 1.15, 0.6);
    eye.position.set(0.15 * s, 0.07, -0.42);
    head.add(eye);
    const pupil = ball(0.045, MAT.dark, 1, 1.1, 0.6);
    pupil.position.set(0.15 * s, 0.07, -0.47);
    head.add(pupil);
    // angry brow
    const brow = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.035, 0.04, 2, 0.015), MAT.dark);
    brow.position.set(0.15 * s, 0.2, -0.41);
    brow.rotation.z = 0.45 * s;
    head.add(brow);
    const ear = ball(0.12, MAT.greyDark, 1, 1.1, 0.5);
    ear.position.set(0.3 * s, 0.34, 0.02);
    head.add(ear);
    const earIn = ball(0.07, MAT.cream, 1, 1.1, 0.5);
    earIn.position.set(0.3 * s, 0.33, -0.03);
    head.add(earIn);
  }

  // arms and legs
  const arms: THREE.Group[] = [];
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(0.52 * s, 1.1, 0);
    const up = ball(0.12, MAT.grey, 1, 1.6, 1);
    up.position.y = -0.18;
    a.add(up);
    const paw = ball(0.11, MAT.greyDark);
    paw.position.y = -0.4;
    a.add(paw);
    body.add(a);
    arms.push(a);
    const l = new THREE.Group();
    l.position.set(0.24 * s, 0.5, 0);
    const leg = ball(0.14, MAT.grey, 1, 1.5, 1);
    leg.position.y = -0.18;
    l.add(leg);
    const foot = ball(0.14, MAT.greyDark, 1, 0.6, 1.4);
    foot.position.set(0, -0.4, -0.06);
    l.add(foot);
    body.add(l);
    legs.push(l);
  }

  // striped tail curling up behind
  const tail = new THREE.Group();
  tail.position.set(0, 0.8, 0.42);
  const rings: [number, number, number, THREE.Material][] = [
    [0.17, 0.05, 0.12, MAT.grey], [0.2, 0.22, 0.3, MAT.greyDark], [0.21, 0.45, 0.42, MAT.grey],
    [0.19, 0.7, 0.46, MAT.greyDark], [0.15, 0.92, 0.42, MAT.grey], [0.1, 1.08, 0.34, MAT.greyDark],
  ];
  for (const [r, y, z, m] of rings) {
    const b = ball(r, m, 1, 1.15, 1);
    b.position.set(0, y, z);
    tail.add(b);
  }
  body.add(tail);

  return { group, body, legs, tail, arms };
}

export function animateRaccoon(r: Raccoon, time: number, phase: number) {
  const w = time * 13 + phase;
  r.legs[0].rotation.x = Math.sin(w) * 1.0;
  r.legs[1].rotation.x = -Math.sin(w) * 1.0;
  r.arms[0].rotation.x = -2.2 + Math.sin(w) * 0.5; // arms reaching forward, grabbing
  r.arms[1].rotation.x = -2.2 - Math.sin(w) * 0.5;
  r.tail.rotation.x = -0.1 + Math.sin(w * 0.5) * 0.15;
  r.body.position.y = Math.abs(Math.sin(w)) * 0.1;
  r.body.rotation.x = 0.2;
}
