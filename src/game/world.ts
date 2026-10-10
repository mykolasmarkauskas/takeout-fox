import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { kitClone, kitHas, kitKeys, kitSize } from './kit';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CHUNK_COUNT, CHUNK_LEN, COLORS, LANES, ObstacleKind, RECYCLE_Z } from './constants';

// Standard (not physical) for the city: it covers most pixels, so keep the shader cheap on phones.
const std = (c: number, rough = 0.7, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
  Object.keys(extra).length
    ? new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, metalness: 0, ...extra })
    : new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });
const M = {
  path: std(0xe2a874, 0.8),
  pathAlt: std(0xd18f5c, 0.8),
  roof: std(COLORS.roof, 0.65),
  roofDark: std(COLORS.roofDark, 0.65),
  tile: std(0x7a3322, 0.45, { clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  tileTeal: std(0x2b7f78, 0.45, { clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  wall: std(0xf0cf9c, 0.8),
  wallPlaster: std(0xf6dfb8, 0.85),
  brick: std(COLORS.brick, 0.75),
  trim: std(0x5a2a1c, 0.6),
  window: new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffa93a, emissiveIntensity: 0.9, roughness: 0.4 }),
  windowDark: std(0x3a2018, 0.4),
  awningA: std(0xe5392b, 0.7),
  awningB: std(0xfff1d6, 0.7),
  lantern: new THREE.MeshStandardMaterial({ color: COLORS.lantern, emissive: 0xd8301f, emissiveIntensity: 0.75, roughness: 0.4 }),
  lanternCap: std(0x3a2418, 0.5),
  coin: new THREE.MeshPhysicalMaterial({ color: COLORS.coin, emissive: 0x8a5a00, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.1 }),
  crate: std(0xc08a55, 0.75),
  crateBand: std(0x8a5a30, 0.7),
  cloth: std(0xffffff, 0.9, { sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xdfe8ff) }),
  rope: std(0x6b5a4a, 0.8),
  gap: new THREE.MeshBasicMaterial({ color: 0x3a1f17 }),
  plant: std(0x3f9a52, 0.6),
  pot: std(0xc0613a, 0.6),
  string: new THREE.MeshBasicMaterial({ color: 0x3a2418 }),
};
const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material) => {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), m);
  mesh.castShadow = true;
  return mesh;
};
const geo = {
  coin: new THREE.CylinderGeometry(0.34, 0.34, 0.1, 24),
  coinRim: new THREE.TorusGeometry(0.31, 0.04, 8, 24),
  lantern: new THREE.SphereGeometry(0.3, 16, 12),
  cap: new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10),
  sphere: new THREE.SphereGeometry(0.5, 12, 9),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
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

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

export class Chunk {
  group = new THREE.Group();
  obstacles: Obstacle[] = [];
  coins: Coin[] = [];
  pickups: Pickup[] = [];
  private dyn = new THREE.Group(); // per-use content, rebuilt on recycle
  private parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  constructor() {
    this.group.add(this.dyn);
    // path: rounded stone slabs with thin joints
    const rows = 10, rl = CHUNK_LEN / rows;
    for (let i = 0; i < rows; i++) {
      const t = rbox(7.5, 0.4, rl - 0.08, 0.1, i % 2 ? M.path : M.pathAlt);
      t.position.set(0, -0.2, -(i + 0.5) * rl);
      t.castShadow = false; t.receiveShadow = true;
      this.group.add(t);
    }
    // parapets with a rounded cap
    for (const s of [-1, 1]) {
      const w = rbox(0.6, 0.9, CHUNK_LEN - 0.1, 0.22, M.wallPlaster);
      w.position.set(4.2 * s, 0.25, -CHUNK_LEN / 2);
      this.group.add(w);
    }
  }

  /** Queue a decorative piece; merged per material after the chunk is built (few draw calls). */
  private put(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, own = true) {
    let geo2 = own ? g : g.clone();
    if (geo2.index) { const ni = geo2.toNonIndexed(); geo2.dispose(); geo2 = ni; } // merge needs uniform (non-indexed) geometry
    for (const k of Object.keys(geo2.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo2.deleteAttribute(k);
    _q.setFromEuler(_e.set(rx, ry, rz));
    _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
    geo2.applyMatrix4(_m);
    let list = this.parts.get(m);
    if (!list) this.parts.set(m, (list = []));
    list.push(geo2);
  }
  private box(w: number, h: number, d: number, r: number, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    this.put(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), m, x, y, z, rx, ry, rz);
  }
  private flat(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    this.put(new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
  }
  private flush() {
    for (const [m, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.own = true;
      this.dyn.add(mesh);
    }
    this.parts.clear();
  }

  private building(s: number, z: number, w: number, h: number, len: number, rnd: () => number) {
    const wallM = rnd() > 0.5 ? M.roof : M.wallPlaster;
    const roofM = rnd() > 0.5 ? M.tile : M.tileTeal;
    const cx = (5.2 + w / 2) * s, cz = z - len / 2, face = 5.2 * s, base = -1.4;
    // body
    this.box(w, h, len, 0.35, wallM, cx, base + h / 2, cz);
    // layered curved roof: wide slab + upturned eave corners + ridge
    this.box(w + 0.9, 0.34, len + 0.9, 0.17, roofM, cx, base + h + 0.1, cz);
    this.box(w + 0.1, 0.5, len + 0.1, 0.2, roofM, cx, base + h + 0.45, cz);
    for (const ex of [-1, 1]) for (const ez of [-1, 1]) {
      this.flat(0.6, 0.22, 0.6, roofM, cx + ex * (w / 2 + 0.4), base + h + 0.34, cz + ez * (len / 2 + 0.4), 0, 0, ex * 0.35);
    }
    this.put(new THREE.CapsuleGeometry(0.14, len - 0.4, 3, 8), roofM, cx, base + h + 0.76, cz, Math.PI / 2, 0, 0);
    // windows on the path-facing wall
    const floors = Math.max(1, Math.floor((h - 0.6) / 1.5));
    for (let f = 0; f < floors; f++) for (let k = 0; k < Math.max(1, Math.floor(len / 2.4)); k++) {
      const lit = rnd() > 0.35;
      const wz = z - 1.2 - k * 2.4;
      this.flat(0.1, 0.8, 0.7, lit ? M.window : M.windowDark, face - s * 0.14, base + 1.6 + f * 1.5, wz);
      this.flat(0.14, 0.96, 0.86, M.trim, face - s * 0.06, base + 1.6 + f * 1.5, wz);
    }
    // striped awning over the ground floor on some buildings
    if (rnd() > 0.45) {
      const n = Math.max(2, Math.floor(len / 0.8));
      for (let i = 0; i < n; i++) {
        this.flat(0.9, 0.12, len / n - 0.03, i % 2 ? M.awningA : M.awningB, face - s * 0.45, base + 1.15, z - (i + 0.5) * (len / n), 0, 0, s * 0.25);
      }
    }
    // rooftop extras
    if (rnd() > 0.55) this.box(0.9, 2, 0.9, 0.3, M.brick, cx + (rnd() - 0.5) * w * 0.4, base + h + 1.4, cz + (rnd() - 0.5) * len * 0.4);
    if (rnd() > 0.6) {
      this.put(geo.cyl.clone(), M.pot, cx - s * w * 0.25, base + h + 0.9, cz, 0, 0, 0, 0.5, 0.45, 0.5);
      this.put(geo.sphere.clone(), M.plant, cx - s * w * 0.25, base + h + 1.3, cz, 0, 0, 0, 0.8, 0.7, 0.8);
    }
  }

  /** Rebuild decorative and gameplay content for a chunk starting at difficulty d (0..1). */
  fill(d: number, safe: boolean, rnd: () => number) {
    for (const c of [...this.dyn.children]) {
      this.dyn.remove(c);
      c.traverse((o) => { if (o instanceof THREE.Mesh && o.userData.own) o.geometry.dispose(); });
    }
    this.obstacles = [];
    this.coins = [];
    this.pickups = [];

    for (const s of [-1, 1]) {
      let z = -1.5;
      while (z > -CHUNK_LEN + 3) {
        const kits = kitKeys('bld_');
        if (kits.length) {
          // Tripo building, front (+Z) turned to face the street
          const key = kits[Math.floor(rnd() * kits.length)];
          const b = kitClone(key)!, sz = kitSize(key)!;
          const k = 0.9 + rnd() * 0.2;
          b.scale.setScalar(k);
          b.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
          const along = sz.x * k, across = sz.z * k;
          b.position.set((4.9 + across / 2) * s, -0.9, z - along / 2);
          this.dyn.add(b);
          z -= along + 0.25;
          continue;
        }
        const w = 3 + rnd() * 3, h = 2.4 + rnd() * 5, len = 4 + rnd() * 4.5;
        this.building(s, z, w, h, len, rnd);
        // hanging lantern with cap and tassel on the street side
        if (rnd() > 0.35) {
          const ly = 2.5 + rnd() * 0.6, lz = z - len / 2;
          this.put(geo.lantern, M.lantern, 4.55 * s, ly, lz, 0, 0, 0, 1, 1.25, 1, false);
          this.put(geo.cap, M.lanternCap, 4.55 * s, ly + 0.38, lz, 0, 0, 0, 1, 1, 1, false);
          this.put(geo.cap, M.lanternCap, 4.55 * s, ly - 0.38, lz, 0, 0, 0, 1, 1, 1, false);
          this.put(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), M.string, 4.55 * s, ly + 0.8, lz);
        }
        z -= len + 0.4;
      }
    }
    this.flush();

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
    m.castShadow = true;
    const rim = new THREE.Mesh(geo.coinRim, M.coin);
    m.add(rim);
    rim.position.y = 0;
    rim.rotation.x = Math.PI / 2;
    m.rotation.x = Math.PI / 2;
    m.position.set(LANES[lane], y, z);
    this.dyn.add(m);
    this.coins.push({ lane, z, mesh: m, taken: false });
  }

  private addObstacle(kind: ObstacleKind, lane: number, z: number) {
    const g = new THREE.Group();
    const add = (mesh: THREE.Mesh, x: number, y: number, zz: number) => { mesh.position.set(x, y, zz); mesh.userData.own = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
    let depth = 1;
    if ((kind === 'chimney' || kind === 'crate' || kind === 'laundry') && kitHas(kind)) {
      g.add(kitClone(kind)!);
      depth = kind === 'chimney' ? 1.5 : kind === 'crate' ? 1.4 : 0.3;
    } else if (kind === 'chimney') {
      add(rbox(1.5, 3.2, 1.5, 0.24, M.brick), 0, 1.6, 0);
      for (const y of [0.9, 1.9, 2.7]) add(rbox(1.58, 0.1, 1.58, 0.05, M.trim), 0, y, 0);
      add(rbox(1.95, 0.4, 1.95, 0.16, M.trim), 0, 3.4, 0);
      add(rbox(1.2, 0.2, 1.2, 0.08, M.windowDark), 0, 3.62, 0);
      depth = 1.5;
    } else if (kind === 'crate') {
      add(rbox(1.7, 1.1, 1.4, 0.14, M.crate), 0, 0.55, 0);
      for (const x of [-0.55, 0.55]) add(rbox(0.14, 1.14, 1.44, 0.06, M.crateBand), x, 0.55, 0);
      add(rbox(1.74, 0.14, 1.44, 0.06, M.crateBand), 0, 1.08, 0);
      depth = 1.4;
    } else if (kind === 'laundry') {
      const w = 2.2;
      const cg = new THREE.PlaneGeometry(w, 1.1, 28, 10);
      const p = cg.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 4.2) * 0.07 + Math.sin(p.getY(i) * 5) * 0.03);
      cg.computeVertexNormals();
      const sheet = add(new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xdfe8ff) })), 0, 1.5, 0);
      sheet.castShadow = true;
      for (const s of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 2.3, 6, 12), M.rope);
        add(pole, s * (w / 2 + 0.1), 1.2, 0).castShadow = true;
      }
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, w + 0.3, 8), M.rope), 0, 2.08, 0).rotation.z = Math.PI / 2;
      for (const x of [-0.7, 0, 0.7]) add(rbox(0.1, 0.18, 0.1, 0.03, M.awningA), x, 2.02, 0);
      depth = 0.3;
    } else {
      add(rbox(2.2, 0.05, 2.4, 0.02, M.gap), 0, 0.01, 0);
      for (const s of [-1, 1]) {
        add(rbox(0.22, 0.14, 2.5, 0.06, M.pathAlt), s * 1.2, 0.04, 0);
      }
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
