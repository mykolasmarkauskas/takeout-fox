import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS } from './constants';

const mat = (c: number, rough = 0.55, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0, ...extra });

export interface Fox {
  group: THREE.Group; // moves in the world
  body: THREE.Group; // squash and stretch / tilt target
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  tail: THREE.Group;
  head: THREE.Group;
  eyes: THREE.Mesh[];
}

function ball(r: number, m: THREE.Material, sx = 1, sy = 1, sz = 1, seg = 28) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.65)), m);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
}
function capsule(r: number, len: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 18), m);
  mesh.castShadow = true;
  return mesh;
}
function rbox(w: number, h: number, d: number, rad: number, m: THREE.Material) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 5, rad), m);
  mesh.castShadow = true;
  return mesh;
}

/** Chunky toy-like fox, matching the Gemini art (ART_FOX_01). Faces -Z, the run direction. */
export function createFox(): Fox {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);

  const fur = mat(COLORS.fur, 0.5);
  const furDark = mat(0xd9691a, 0.55);
  const cream = mat(COLORS.cream, 0.55);
  const hoodie = mat(COLORS.hoodie, 0.7);
  const hoodieDark = mat(0xcf8d24, 0.75);
  const shorts = mat(COLORS.shorts, 0.8);
  const cap = mat(COLORS.cap, 0.5);
  const capDark = mat(0x74291c, 0.55);
  const teal = mat(COLORS.teal, 0.45);
  const tealDark = mat(0x23796f, 0.5);
  const white = mat(0xffffff, 0.35);
  const sole = mat(0xd9d4cc, 0.6);
  const dark = mat(0x2a1a14, 0.35);

  // ---- torso: hoodie capsule, cream cuffs, hood, pocket
  const torso = capsule(0.46, 0.38, hoodie);
  torso.position.y = 1.3;
  torso.scale.set(1.08, 1, 0.9);
  body.add(torso);
  const hem = ball(0.5, hoodieDark, 1.06, 0.22, 0.92);
  hem.position.y = 0.98;
  body.add(hem);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.14, 12, 24), hoodieDark);
  hood.position.set(0, 1.78, 0.14);
  hood.rotation.x = Math.PI / 2 - 0.35;
  hood.scale.set(1.15, 1, 1);
  hood.castShadow = true;
  body.add(hood);
  const pocket = rbox(0.62, 0.26, 0.1, 0.05, hoodieDark);
  pocket.position.set(0, 1.0, -0.4);
  body.add(pocket);

  // shorts
  const hips = capsule(0.4, 0.06, shorts);
  hips.position.y = 0.9;
  hips.rotation.z = Math.PI / 2;
  hips.scale.set(1, 1.1, 1);
  body.add(hips);

  // ---- head (big, chibi)
  const head = new THREE.Group();
  head.position.y = 2.2;
  head.scale.setScalar(1.12);
  body.add(head);
  head.add(ball(0.54, fur, 1.08, 0.98, 1.0));
  // lower cheek tufts and a pointed cream snout
  for (const s of [-1, 1]) {
    const cheek = ball(0.24, cream, 1, 0.75, 0.9);
    cheek.position.set(0.3 * s, -0.24, -0.26);
    head.add(cheek);
  }
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.55, 20), fur);
  snout.rotation.x = -Math.PI / 2;
  snout.position.set(0, -0.12, -0.62);
  snout.scale.set(1, 1, 0.8);
  snout.castShadow = true;
  head.add(snout);
  const chin = ball(0.2, cream, 1.0, 0.55, 1.5);
  chin.position.set(0, -0.26, -0.5);
  head.add(chin);
  const nose = ball(0.075, dark, 1.2, 0.9, 1);
  nose.position.set(0, -0.08, -0.9);
  head.add(nose);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 6, 16, Math.PI), dark);
  mouth.position.set(0, -0.2, -0.78);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
  const eyes: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const eye = ball(0.125, white, 0.85, 1.2, 0.6);
    eye.position.set(0.23 * s, 0.06, -0.5);
    const iris = ball(0.1, mat(0x6b3a1c, 0.3), 1, 1.1, 0.6);
    iris.position.set(-0.01 * s, 0, -0.1);
    const pupil = ball(0.058, dark, 1, 1.1, 0.6);
    pupil.position.set(0, 0, -0.085);
    const gl = ball(0.03, white, 1, 1, 1, 10);
    gl.position.set(0.03, 0.05, -0.1);
    iris.add(pupil, gl);
    eye.add(iris);
    head.add(eye);
    eyes.push(eye);
    const brow = rbox(0.18, 0.035, 0.04, 0.012, furDark);
    brow.position.set(0.23 * s, 0.27, -0.5);
    brow.rotation.z = -0.15 * s;
    head.add(brow);
    // ear: tall, dark back, cream inner
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.85, 4, 1), furDark);
    ear.position.set(0.4 * s, 0.7, 0.1);
    ear.rotation.set(-0.05, Math.PI / 4, -0.28 * s);
    ear.castShadow = true;
    head.add(ear);
    const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.6, 4, 1), cream);
    earIn.position.set(0.4 * s, 0.66, 0.03);
    earIn.rotation.set(-0.05, Math.PI / 4, -0.28 * s);
    head.add(earIn);
  }
  // flat cap, set back so the eyes stay visible
  const capG = new THREE.Group();
  capG.position.set(0, 0.38, 0.1);
  capG.rotation.x = 0.28;
  head.add(capG);
  const dome = ball(0.52, cap, 1.1, 0.55, 1.08);
  dome.position.set(0, 0.06, 0);
  capG.add(dome);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 32), capDark);
  band.position.set(0, -0.06, 0);
  band.rotation.x = Math.PI / 2;
  band.scale.set(1.1, 1.06, 1);
  capG.add(band);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.07, 28, 1, false, -Math.PI / 2, Math.PI), capDark);
  brim.rotation.y = Math.PI;
  brim.position.set(0, -0.06, -0.4);
  brim.scale.set(1.0, 1, 0.85);
  capG.add(brim);
  const button = ball(0.05, capDark);
  button.position.set(0, 0.34, 0);
  capG.add(button);

  // ---- delivery bag: rounded box, flap, strap, stripe, badge
  const bag = rbox(1.0, 1.1, 0.62, 0.13, teal);
  bag.position.set(0, 1.45, 0.6);
  body.add(bag);
  const flap = rbox(1.02, 0.34, 0.66, 0.1, tealDark);
  flap.position.set(0, 1.86, 0.6);
  body.add(flap);
  const stripe = rbox(0.18, 1.14, 0.66, 0.05, cream);
  stripe.position.set(0, 1.45, 0.6);
  body.add(stripe);
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 18), cream);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0.3, 1.5, 0.93);
  body.add(badge);
  for (const s of [-1, 1]) {
    const strap = rbox(0.1, 0.9, 0.05, 0.02, tealDark);
    strap.position.set(0.3 * s, 1.5, -0.37);
    strap.rotation.z = 0.05 * s;
    body.add(strap);
    const strapB = rbox(0.1, 0.6, 0.12, 0.02, tealDark);
    strapB.position.set(0.5 * s, 1.55, 0.28);
    body.add(strapB);
  }

  // ---- arms: sleeve + cuff + hand
  const makeArm = (s: number) => {
    const g = new THREE.Group();
    g.position.set(0.58 * s, 1.6, 0);
    const sleeve = capsule(0.17, 0.38, hoodie);
    sleeve.position.y = -0.36;
    g.add(sleeve);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 18), cream);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.7;
    g.add(cuff);
    const hand = ball(0.15, fur);
    hand.position.y = -0.84;
    g.add(hand);
    body.add(g);
    return g;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- legs: fur, shorts hem, sneaker with sole
  const makeLeg = (s: number) => {
    const g = new THREE.Group();
    g.position.set(0.24 * s, 0.9, 0);
    const hem2 = capsule(0.19, 0.08, shorts);
    hem2.position.y = -0.04;
    g.add(hem2);
    const l = capsule(0.12, 0.4, fur);
    l.position.y = -0.38;
    g.add(l);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 14), white);
    sock.position.y = -0.7;
    g.add(sock);
    const shoe = ball(0.2, white, 1, 0.62, 1.55);
    shoe.position.set(0, -0.8, -0.1);
    g.add(shoe);
    const sl = rbox(0.38, 0.08, 0.72, 0.04, sole);
    sl.position.set(0, -0.91, -0.1);
    g.add(sl);
    body.add(g);
    return g;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // ---- tail: tapered, curling up to the side so the bag stays visible from behind
  const tail = new THREE.Group();
  tail.position.set(0.1, 1.0, 0.4);
  const segs: [number, number, number, number, number, THREE.Material][] = [
    [0.2, 0.0, 0.0, 0.25, 0.9, fur],
    [0.3, 0.12, 0.06, 0.62, 1.0, fur],
    [0.36, 0.3, 0.2, 1.0, 1.0, fur],
    [0.34, 0.5, 0.45, 1.35, 1.0, furDark],
    [0.26, 0.64, 0.8, 1.6, 1.05, cream],
  ];
  for (const [r, x, y, z, sc, m] of segs) {
    const b2 = ball(r, m, sc * 0.95, sc, 1.2);
    b2.position.set(x, y, z);
    tail.add(b2);
  }
  body.add(tail);

  return { group, body, legL, legR, armL, armR, tail, head, eyes };
}

export function animateRun(f: Fox, time: number, speedFactor: number, airborne: boolean, sliding: boolean) {
  const w = time * (9 + speedFactor * 6);
  if (airborne) {
    f.legL.rotation.x = -0.9;
    f.legR.rotation.x = 0.5;
    f.armL.rotation.x = -2.4;
    f.armR.rotation.x = -2.4;
  } else {
    f.legL.rotation.x = Math.sin(w) * 0.9;
    f.legR.rotation.x = -Math.sin(w) * 0.9;
    f.armL.rotation.x = -Math.sin(w) * 0.8;
    f.armR.rotation.x = Math.sin(w) * 0.8;
  }
  f.tail.rotation.y = Math.sin(w * 0.5) * 0.3;
  f.tail.rotation.x = -0.25 + Math.sin(w) * 0.05;
  f.head.rotation.z = Math.sin(w * 0.5) * 0.04;
  f.body.position.y = airborne || sliding ? 0 : Math.abs(Math.sin(w)) * 0.12;
  f.body.rotation.x = sliding ? -1.25 : airborne ? 0.15 : 0.12;
}
