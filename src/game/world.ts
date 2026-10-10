import * as THREE from 'three';
import { CHUNK_COUNT, CHUNK_LEN, COLORS, LANES, ObstacleKind, RECYCLE_Z } from './constants';

const lambert = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
const M = {
  path: lambert(COLORS.path),
  pathAlt: lambert(0xdba979),
  roof: lambert(COLORS.roof),
  roofDark: lambert(COLORS.roofDark),
  wall: lambert(COLORS.wall),
  brick: lambert(COLORS.brick),
  lantern: new THREE.MeshStandardMaterial({ color: COLORS.lantern, emissive: 0xaa2211, emissiveIntensity: 0.6 }),
  coin: new THREE.MeshStandardMaterial({ color: COLORS.coin, emissive: 0x7a5200, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.3 }),
  crate: lambert(0xb98250),
  cloth: lambert(0xffffff),
  rope: lambert(0x6b5a4a),
  gap: new THREE.MeshBasicMaterial({ color: 0x3a1f17 }),
};
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  coin: new THREE.CylinderGeometry(0.32, 0.32, 0.1, 18),
  lantern: new THREE.SphereGeometry(0.3, 10, 8),
};

export interface Obstacle {
  kind: ObstacleKind;
  lane: number;
  z: number; // local to chunk (negative = ahead)
  depth: number;
  mesh: THREE.Object3D;
  hit: boolean;
}
export type PickupKind = 'hotbag' | 'chilli' | 'umbrella';
export interface Pickup { kind: PickupKind; lane: number; z: number; mesh: THREE.Sprite; taken: boolean }
const pickTex: Record<string, THREE.Texture> = {};
const pickMat = (k: PickupKind) => {
  if (!pickTex[k]) {
    pickTex[k] = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}art/pick_${k}.webp`);
    pickTex[k].colorSpace = THREE.SRGBColorSpace;
  }
  return new THREE.SpriteMaterial({ map: pickTex[k], transparent: true, fog: false });
};
export interface Coin { lane: number; z: number; mesh: THREE.Mesh; taken: boolean }

export class Chunk {
  group = new THREE.Group();
  obstacles: Obstacle[] = [];
  coins: Coin[] = [];
  pickups: Pickup[] = [];
  private dyn = new THREE.Group(); // per-use content, rebuilt on recycle

  constructor() {
    this.group.add(this.dyn);
    // path tiles (static)
    const tiles = 8;
    for (let i = 0; i < tiles; i++) {
      const t = new THREE.Mesh(geo.box, i % 2 ? M.path : M.pathAlt);
      t.scale.set(7.6, 0.4, CHUNK_LEN / tiles);
      t.position.set(0, -0.2, -(i + 0.5) * (CHUNK_LEN / tiles));
      t.receiveShadow = true;
      this.group.add(t);
    }
    // low parapet walls
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(geo.box, M.wall);
      w.scale.set(0.6, 0.9, CHUNK_LEN);
      w.position.set(4.2 * s, 0.25, -CHUNK_LEN / 2);
      this.group.add(w);
    }
  }

  /** Rebuild decorative and gameplay content for a chunk starting at difficulty d (0..1). */
  fill(d: number, safe: boolean, rnd: () => number) {
    while (this.dyn.children.length) this.dyn.remove(this.dyn.children[0]);
    this.obstacles = [];
    this.coins = [];
    this.pickups = [];

    // side buildings and lanterns
    for (const s of [-1, 1]) {
      let z = -2;
      while (z > -CHUNK_LEN) {
        const w = 3 + rnd() * 3, h = 2 + rnd() * 5, len = 4 + rnd() * 5;
        const b = new THREE.Mesh(geo.box, rnd() > 0.5 ? M.roof : M.roofDark);
        b.scale.set(w, h, len);
        b.position.set((5.2 + w / 2) * s, h / 2 - 1.4, z - len / 2);
        this.dyn.add(b);
        if (rnd() > 0.55) {
          const chim = new THREE.Mesh(geo.box, M.brick);
          chim.scale.set(0.8, 1.8, 0.8);
          chim.position.set(b.position.x, h - 1.4 + 0.9, z - len / 2);
          this.dyn.add(chim);
        }
        if (rnd() > 0.5) {
          const l = new THREE.Mesh(geo.lantern, M.lantern);
          l.position.set(4.6 * s, 2.2 + rnd() * 0.6, z - len / 2);
          this.dyn.add(l);
        }
        z -= len + 0.4;
      }
    }

    if (safe) {
      this.addCoinLine(1, -8, 8, 1);
      return;
    }
    // one pattern per 20 m half-chunk
    for (let half = 0; half < 2; half++) {
      const base = -half * (CHUNK_LEN / 2) - 8;
      const r = rnd();
      const lane = Math.floor(rnd() * 3);
      if (r < 0.28) {
        this.addObstacle('chimney', lane, base);
        this.addCoinLine((lane + 1 + Math.floor(rnd() * 2)) % 3, base - 4, 5, 1);
      } else if (r < 0.5) {
        this.addObstacle('crate', lane, base);
        this.addCoinArc(lane, base);
      } else if (r < 0.7) {
        for (let l = 0; l < 3; l++) this.addObstacle('laundry', l, base);
        this.addCoinLine(1, base - 5, 4, 1);
      } else if (r < 0.88 + d * 0.05) {
        for (let l = 0; l < 3; l++) this.addObstacle('gap', l, base);
        this.addCoinArc(1, base);
      } else {
        const a = lane, b = (lane + 1 + Math.floor(rnd() * 2)) % 3;
        this.addObstacle('chimney', a, base);
        this.addObstacle('chimney', b, base - 2);
        const free = [0, 1, 2].find((x) => x !== a && x !== b)!;
        this.addCoinLine(free, base - 3, 6, 1);
      }
    }
    this.maybePickup(rnd);
  }

  private maybePickup(rnd: () => number) {
    if (rnd() > 0.38) return;
    const kinds: PickupKind[] = ['hotbag', 'chilli', 'umbrella'];
    const kind = kinds[Math.floor(rnd() * 3)];
    const lane = Math.floor(rnd() * 3);
    const z = -CHUNK_LEN / 2 + 2 - rnd() * 3;  // between the two 20 m patterns
    const mesh = new THREE.Sprite(pickMat(kind));
    mesh.scale.set(1.5, 1.5, 1);
    mesh.position.set(LANES[lane], 1.6, z);
    this.dyn.add(mesh);
    this.pickups.push({ kind, lane, z, mesh, taken: false });
  }

  private addCoinLine(lane: number, z0: number, n: number, step: number) {
    for (let i = 0; i < n; i++) this.addCoin(lane, z0 - i * step * 1.4, 1.0);
  }
  private addCoinArc(lane: number, z: number) {
    for (let i = -3; i <= 3; i++) this.addCoin(lane, z + i * 1.1, 1.0 + (3 - Math.abs(i)) * 0.55);
  }
  private addCoin(lane: number, z: number, y: number) {
    const m = new THREE.Mesh(geo.coin, M.coin);
    m.rotation.x = Math.PI / 2;
    m.position.set(LANES[lane], y, z);
    this.dyn.add(m);
    this.coins.push({ lane, z, mesh: m, taken: false });
  }

  private addObstacle(kind: ObstacleKind, lane: number, z: number) {
    const g = new THREE.Group();
    let depth = 1;
    if (kind === 'chimney') {
      const m = new THREE.Mesh(geo.box, M.brick);
      m.scale.set(1.5, 3.4, 1.5);
      m.position.y = 1.7;
      g.add(m);
      const cap = new THREE.Mesh(geo.box, M.roofDark);
      cap.scale.set(1.9, 0.3, 1.9);
      cap.position.y = 3.5;
      g.add(cap);
      depth = 1.5;
    } else if (kind === 'crate') {
      const m = new THREE.Mesh(geo.box, M.crate);
      m.scale.set(1.7, 1.1, 1.4);
      m.position.y = 0.55;
      g.add(m);
      depth = 1.4;
    } else if (kind === 'laundry') {
      const w = 2.2;
      const sheet = new THREE.Mesh(geo.box, M.cloth);
      sheet.scale.set(w, 1.1, 0.06);
      sheet.position.y = 1.55;
      g.add(sheet);
      for (const s of [-1, 1]) {
        const pole = new THREE.Mesh(geo.box, M.rope);
        pole.scale.set(0.08, 2.4, 0.08);
        pole.position.set(s * (w / 2 + 0.05), 1.2, 0);
        g.add(pole);
      }
      depth = 0.3;
    } else {
      const m = new THREE.Mesh(geo.box, M.gap);
      m.scale.set(2.2, 0.05, 2.4);
      m.position.y = 0.01;
      g.add(m);
      depth = 2.4;
    }
    g.position.set(LANES[lane], 0, z);
    this.dyn.add(g);
    this.obstacles.push({ kind, lane, z, depth, mesh: g, hit: false });
  }
}

export class World {
  group = new THREE.Group();
  chunks: Chunk[] = [];
  private seed = 1;
  private spawned = 0;
  rnd = () => {
    // mulberry32
    this.seed |= 0; this.seed = (this.seed + 0x6d2b79f5) | 0;
    let t = Math.imul(this.seed ^ (this.seed >>> 15), 1 | this.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  constructor() {
    for (let i = 0; i < CHUNK_COUNT; i++) {
      const c = new Chunk();
      this.chunks.push(c);
      this.group.add(c.group);
    }
    this.reset(1);
  }

  reset(seed: number) {
    this.seed = seed;
    this.spawned = 0;
    this.chunks.forEach((c, i) => {
      c.group.position.z = 20 - i * CHUNK_LEN;
      c.fill(0, i < 2, this.rnd);
      this.spawned++;
    });
  }

  /** Move the world toward the camera by dz and recycle chunks that passed. */
  advance(dz: number, difficulty: number) {
    for (const c of this.chunks) c.group.position.z += dz;
    let minZ = Infinity;
    for (const c of this.chunks) minZ = Math.min(minZ, c.group.position.z);
    for (const c of this.chunks) {
      if (c.group.position.z > RECYCLE_Z) {
        c.group.position.z = minZ - CHUNK_LEN;
        minZ = c.group.position.z;
        c.fill(difficulty, false, this.rnd);
        this.spawned++;
      }
    }
  }
}
