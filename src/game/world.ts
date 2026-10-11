import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { kitClone, kitHas, kitKeys, kitSize } from './kit';
import { PUFF } from './scenery';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BASE_SPEED, CHUNK_COUNT, CHUNK_LEN, COLORS, GRAVITY, JUMP_V, LANES, MAX_SPEED, ObstacleKind, RECYCLE_Z } from './constants';

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
  paverA: std(0xa58b80, 0.85),
  paverB: std(0x9a8075, 0.85),
  paverC: std(0xae9488, 0.85),
  curb: std(0xc7ab97, 0.8),
  grout: std(0x5e463d, 0.95),
  under: new THREE.MeshBasicMaterial({ color: 0x5a3a30 }),
  water: std(0x3d8aa8, 0.22, { clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  hull: std(0x8a4b2e, 0.6),
  hullTrim: std(0xf3e6cf, 0.6),
  sail: std(0xfff3df, 0.8),
  bollard: std(0x4a4f57, 0.5),
  leaf: std(0x6fa04e, 0.75),
  leafDark: std(0x4f8040, 0.75),
  trunk: std(0x6b4a33, 0.8),
  terrace: std(0xb59a7a, 0.85),
  flowerPink: std(0xf090b0, 0.6),
  flowerWhite: std(0xfff4ef, 0.6),
  vine: std(0x4f8a3e, 0.7),
  lanternWarm: new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffd890, emissiveIntensity: 0.9, roughness: 0.4 }),
  lanternTeal: new THREE.MeshStandardMaterial({ color: 0x48c6bd, emissive: 0x20a8a0, emissiveIntensity: 0.9, roughness: 0.4 }),
  roofTealA: std(0x3f6c72, 0.55),
  roofTealB: std(0x335a60, 0.55),
  roofMossA: std(0x6d7c40, 0.7),
  roofMossB: std(0x5a6a36, 0.7),
  roofTileA: std(0x6f4a3c, 0.6),
  roofTileB: std(0x5e3d32, 0.6),
  pole: std(0x5a3a28, 0.7),
  gateRed: std(0xb8321f, 0.55),
  lanternRed: new THREE.MeshStandardMaterial({ color: 0xd8301f, emissive: 0xff2a10, emissiveIntensity: 1.0, roughness: 0.4 }),
  lanternGold: new THREE.MeshStandardMaterial({ color: 0xff9a1a, emissive: 0xff8a10, emissiveIntensity: 0.95, roughness: 0.4 }),
};
/** District looks. Index matches Game's DISTRICTS (one district every DISTRICT_LEN metres). */
export const DISTRICT_LEN = 700;
/** Matches the scene fog's far distance (Game). */
export const FOG_END = 110;
export const districtAt = (dist: number) => Math.floor(Math.max(0, dist) / DISTRICT_LEN) % 3;
const BLEND = 90; // metres either side of a boundary where the two looks mix
const smooth = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
/** Which two districts mix at this distance and how far along (t 0..1) the change is. */
export function districtMix(dist: number) {
  const d = Math.max(0, dist), n = Math.round(d / DISTRICT_LEN), B = n * DISTRICT_LEN;
  if (n > 0 && Math.abs(d - B) < BLEND) return { a: (n - 1) % 3, b: n % 3, t: smooth((d - B + BLEND) / (2 * BLEND)) };
  const i = districtAt(d);
  return { a: i, b: i, t: 0 };
}
/** Stable 0..1 noise per ~9 m block, so the mix comes in clumps rather than salt and pepper. */
const blockHash = (dist: number) => { const x = Math.sin(Math.floor(dist / 9) * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
interface Theme { roof: [THREE.Material, THREE.Material]; kits: string[]; lanterns: THREE.Material[]; far: 'town' | 'sea' | 'garden'; chimneys: number; curb: 'none' | 'bollard' | 'pot' }
const THEMES: Theme[] = [
  { roof: [M.roofTileA, M.roofTileB], kits: ['bld_noodle', 'bld_tower', 'bld_teal'], lanterns: [M.lanternRed, M.lanternGold, M.lanternRed], far: 'town', chimneys: 2, curb: 'none' },
  { roof: [M.roofTealA, M.roofTealB], kits: ['bld_teal', 'bld_teal', 'bld_tower'], lanterns: [M.lanternWarm, M.lanternTeal, M.lanternWarm], far: 'sea', chimneys: 1, curb: 'bollard' },
  { roof: [M.roofMossA, M.roofMossB], kits: ['bld_noodle', 'bld_tower', 'bld_teal'], lanterns: [M.flowerPink, M.flowerWhite, M.flowerPink], far: 'garden', chimneys: 1, curb: 'pot' },
];

const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material) => {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), m);
  mesh.castShadow = true;
  return mesh;
};
const geo = {
  coin: new THREE.CylinderGeometry(0.36, 0.36, 0.12, 32),
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

/** Coin face: warm gold with an embossed noodle-bowl emblem, notched rim (drawn once on a canvas). */
function coinFace() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const R = S / 2;
  let gr = g.createRadialGradient(R * 0.8, R * 0.7, 10, R, R, R);
  gr.addColorStop(0, '#fff2a8'); gr.addColorStop(0.55, '#ffc93a'); gr.addColorStop(1, '#e09412');
  g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  // notched rim
  g.strokeStyle = '#b86a08'; g.lineWidth = 14; g.beginPath(); g.arc(R, R, R - 9, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#ffe48a'; g.lineWidth = 3;
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; g.beginPath(); g.moveTo(R + Math.cos(a) * (R - 15), R + Math.sin(a) * (R - 15)); g.lineTo(R + Math.cos(a) * (R - 3), R + Math.sin(a) * (R - 3)); g.stroke(); }
  g.strokeStyle = '#c97a0c'; g.lineWidth = 4; g.beginPath(); g.arc(R, R, R - 24, 0, Math.PI * 2); g.stroke();
  // emblem: noodle bowl with chopsticks and steam
  const ink = '#a85a06', hi = '#ffe9a0';
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.fillStyle = ink;
  g.beginPath(); g.moveTo(R - 62, R + 4); g.lineTo(R + 62, R + 4); g.quadraticCurveTo(R + 58, R + 66, R, R + 70); g.quadraticCurveTo(R - 58, R + 66, R - 62, R + 4); g.fill();
  g.fillRect(R - 24, R + 66, 48, 10);
  g.strokeStyle = hi; g.lineWidth = 5; g.beginPath(); g.moveTo(R - 44, R + 20); g.quadraticCurveTo(R - 36, R + 46, R - 12, R + 56); g.stroke();
  g.strokeStyle = ink; g.lineWidth = 8;
  g.beginPath(); g.moveTo(R + 8, R - 2); g.lineTo(R + 58, R - 62); g.stroke();
  g.beginPath(); g.moveTo(R + 22, R - 2); g.lineTo(R + 72, R - 54); g.stroke();
  g.lineWidth = 6;
  for (const dx of [-36, -12, 12]) { g.beginPath(); g.moveTo(R + dx, R - 8); g.bezierCurveTo(R + dx - 12, R - 24, R + dx + 12, R - 34, R + dx, R - 52); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const COIN_TEX = coinFace();

/** Hand-painted pun signs along the route, per district. */
const GATE_NAMES = ['NOODLE ROOFS', 'HARBOUR LIGHTS', 'GARDEN TERRACES'];
const SIGNS: string[][] = [
  ['WOK THIS WAY →', 'PHO-NOMENAL NOODLES', 'NO RUNNING ON ROOFS (lol)', 'RACCOONS: PLEASE KNOCK', 'LOST: 1 CHOPSTICK', 'DUMPLING SUPPORT GROUP — TUE', 'HONK IF HANGRY', 'SOUP OF THE DAY: YES', 'TIPS MAKE FOXES FAST', 'CAUTION: SPICY ZONE'],
  ['FISH & TIPS', 'THE KRAKEN IS ON BREAK', 'SEAGULLS ARE NOT WAITERS', 'BOATS: NO DELIVERY', 'SHRIMPLY THE BEST', 'ANCHOVY? AN-CHO-VERY!', 'DO NOT FEED THE CAPTAIN'],
  ['PLEASE DON\'T EAT THE BONSAI', 'THIS HEDGE IS ON A DIET', 'SNAIL LANE (SLOW)', 'LETTUCE PASS', 'BEE-HAVE YOURSELF', 'GRASS IS GREENER → HERE', 'WEED IT AND REAP'],
];
const signTex = new Map<string, THREE.Texture>();
function signTexture(text: string) {
  let t = signTex.get(text);
  if (t) return t;
  const W = 512, H = 200, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#f4dfb8'; g.fillRect(12, 12, W - 24, H - 24);
  g.strokeStyle = 'rgba(122,74,42,.25)'; g.lineWidth = 2;
  for (let y = 40; y < H - 12; y += 34) { g.beginPath(); g.moveTo(14, y); g.lineTo(W - 14, y); g.stroke(); } // planks
  g.fillStyle = '#7b2a18';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = text.split(' ');
  let size = 64, lines: string[] = [];
  do { // fit in at most 2 lines
    g.font = `900 ${size}px system-ui, sans-serif`;
    lines = []; let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (g.measureText(n).width > W - 60 && cur) { lines.push(cur); cur = w; } else cur = n; }
    lines.push(cur); size -= 4;
  } while ((lines.length > 2 || lines.some((l) => g.measureText(l).width > W - 60)) && size > 22);
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * (size + 8)));
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  signTex.set(text, t);
  return t;
}
const signFace = new Map<string, THREE.Material>();
const signWood = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.8 });
const signGeo = new THREE.BoxGeometry(2.4, 0.94, 0.08);
const gateBoardGeo = new THREE.BoxGeometry(3.6, 1.4, 0.16);
const coinFaceMat = new THREE.MeshPhysicalMaterial({ map: COIN_TEX, bumpMap: COIN_TEX, bumpScale: 2.5, emissive: 0x6a3d00, emissiveIntensity: 0.25, roughness: 0.32, metalness: 0.6, clearcoat: 0.8, clearcoatRoughness: 0.15 });
const coinEdgeMat = new THREE.MeshPhysicalMaterial({ color: 0xe9a21c, emissive: 0x6a3d00, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.65, clearcoat: 0.8 });

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
    const stat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => {
      let gg = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(gg.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') gg.deleteAttribute(k);
      gg = gg.applyMatrix4(_m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, 0, rz)), _s.set(1, 1, 1)));
      (stat.get(m) ?? stat.set(m, []).get(m)!).push(gg);
    };
    // path: big stone pavers in staggered rows, like the key art
    const rows = 20, rl = CHUNK_LEN / rows, mats = [M.paverA, M.paverB, M.paverC];
    let n = 0;
    for (let i = 0; i < rows; i++) {
      const widths = i % 2 ? [1.25, 2.45, 2.45, 1.25] : [2.45, 2.5, 2.45];
      let x = -3.7;
      for (const w of widths) {
        add(new RoundedBoxGeometry(w - 0.08, 0.4, rl - 0.08, 2, 0.07), mats[(n++ * 7 + i) % 3], x + w / 2, -0.2, -(i + 0.5) * rl);
        x += w;
      }
    }
    // grout bed under the pavers, and a dark "town below" floor so the sky never shows through
    add(new THREE.BoxGeometry(8.2, 0.3, CHUNK_LEN), M.grout, 0, -0.22, -CHUNK_LEN / 2);
    add(new THREE.PlaneGeometry(60, CHUNK_LEN), M.under, 0, -4.2, -CHUNK_LEN / 2, -Math.PI / 2);
    // stone curbs in blocks on both edges
    for (const sd of [-1, 1]) {
      for (let i = 0; i < 20; i++) add(new RoundedBoxGeometry(0.75, 0.6, rl - 0.1, 2, 0.12), M.curb, 4.1 * sd, 0.1, -(i + 0.5) * rl);
      // roofs sloping away from the ridge path: courses of rounded clay tiles
      for (let k = 0; k < 6; k++) {
        const t = k / 5;
        add(new THREE.CapsuleGeometry(0.32, CHUNK_LEN - 0.7, 2, 8), k % 2 ? M.roofTileB : M.roofTileA, sd * (4.75 + t * 2.6), -0.35 - t * 1.9, -CHUNK_LEN / 2, Math.PI / 2, 0);
      }
    }
    for (const [m, list] of stat) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false)!, m);
      mesh.receiveShadow = true; mesh.castShadow = m === M.curb;
      if (m === M.roofTileA) this.roofA = mesh;
      if (m === M.roofTileB) this.roofB = mesh;
      this.group.add(mesh);
      list.forEach((g) => g.dispose());
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
      mesh.castShadow = false; mesh.receiveShadow = true; // roadside decor: lit, but not drawn into the shadow map
      mesh.userData.own = true;
      this.dyn.add(mesh);
    }
    this.parts.clear();
  }

  private building(s: number, z: number, w: number, h: number, len: number, rnd: () => number, near = 5.2, base = -1.4) {
    const wallM = rnd() > 0.5 ? M.roof : M.wallPlaster;
    const roofM = rnd() > 0.7 ? M.tileTeal : M.tile;
    const cx = (near + w / 2) * s, cz = z - len / 2, face = near * s;
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

  smoke: THREE.Sprite[] = [];
  boats: THREE.Object3D[] = [];
  private roofA!: THREE.Mesh;
  private roofB!: THREE.Mesh;
  /** Distance (m) at which the player crosses this chunk's local z = 0. */
  startDist = 0;
  /** Which district look to use at local z, blending randomly near a boundary. */
  private themeAt(z: number, _rnd?: () => number) {
    const dist = this.startDist - z;
    const m = districtMix(dist);
    return THEMES[m.t > 0 && blockHash(dist) < m.t ? m.b : m.a];
  }
  private roofMats = [M.roofTileA.clone(), M.roofTileB.clone()] as THREE.MeshStandardMaterial[];

  /** Paifang-style arch with the new district's name, the hand-over point between two looks. */
  private gate(z: number, idx: number) {
    const name = GATE_NAMES[idx];
    for (const sd of [-1, 1]) {
      this.box(0.55, 7.4, 0.55, 0.12, M.gateRed, sd * 4.3, 3.7, z);
      this.box(0.95, 0.5, 0.95, 0.12, M.terrace, sd * 4.3, 0.25, z);
    }
    this.box(10.2, 0.45, 0.6, 0.15, M.gateRed, 0, 6.3, z);
    this.box(11.4, 0.35, 1.5, 0.15, THEMES[idx].roof[0], 0, 7.6, z);
    this.box(10.4, 0.3, 1.2, 0.12, THEMES[idx].roof[1], 0, 7.95, z);
    this.box(9.6, 0.4, 0.5, 0.12, M.gateRed, 0, 7.15, z);
    let face = signFace.get(name);
    if (!face) signFace.set(name, (face = new THREE.MeshStandardMaterial({ map: signTexture(name), roughness: 0.75 })));
    const board = new THREE.Mesh(gateBoardGeo, [signWood, signWood, signWood, signWood, face, signWood]);
    board.position.set(0, 6.8, z + 0.36);
    this.dyn.add(board);
    for (const sd of [-1, 1]) this.put(geo.lantern.clone(), M.lanternRed, sd * 3.2, 5.65, z + 0.1, 0, 0, 0, 1.1, 1.3, 1.1);
  }

  private garland(z: number, rnd: () => number, th: Theme) {
    const hl = 8.4 + rnd() * 0.6, hr = 8.4 + rnd() * 0.6, sag = 0.7 + rnd() * 0.3; // lowest lantern ~6.5: well above a jump
    for (const [sd, h] of [[-1, hl], [1, hr]] as const) {
      this.put(new THREE.CylinderGeometry(0.09, 0.12, h + 0.6, 8), M.pole, 4.1 * sd, h / 2 + 0.1, z);
      this.put(new THREE.SphereGeometry(0.14, 8, 6), M.pole, 4.1 * sd, h + 0.45, z);
    }
    const pt = (u: number) => new THREE.Vector3(-4.1 + 8.2 * u, hl + (hr - hl) * u - sag * 4 * u * (1 - u), z);
    const curve = new THREE.CatmullRomCurve3([0, 0.25, 0.5, 0.75, 1].map(pt));
    this.put(new THREE.TubeGeometry(curve, 24, 0.025, 4, false), M.string, 0, 0, 0);
    const nl = 7;
    for (let i = 1; i <= nl; i++) {
      const p = pt(i / (nl + 1));
      const m = th.lanterns[i % 3];
      if (th.far === 'garden') { // flower garland: blossoms and leaves instead of lanterns
        this.put(geo.sphere, m, p.x, p.y - 0.15, p.z, 0, 0, 0, 0.55, 0.45, 0.55, false);
        this.put(geo.sphere, M.vine, p.x + 0.35, p.y - 0.1, p.z, 0, 0, 0, 0.4, 0.25, 0.3, false);
        continue;
      }
      this.put(geo.lantern, m, p.x, p.y - 0.5, p.z, 0, 0, 0, 1.15, 1.35, 1.15, false);
      this.put(geo.cap, M.lanternCap, p.x, p.y - 0.12, p.z, 0, 0, 0, 0.9, 1, 0.9, false);
      this.put(geo.cap, M.lanternCap, p.x, p.y - 0.92, p.z, 0, 0, 0, 1.1, 1, 1.1, false);
    }
  }

  private boat(x: number, z: number, rnd: () => number) {
    if (kitHas('boat')) {
      const b = kitClone('boat')!;
      const sz = kitSize('boat')!;
      if (sz.x > sz.z) b.rotation.y = Math.PI / 2; // lie along the quay
      b.rotation.y += (rnd() - 0.5) * 0.5 + (rnd() < 0.5 ? Math.PI : 0);
      b.scale.multiplyScalar(0.85 + rnd() * 0.3);
      b.position.set(x, -2.55, z);
      b.userData.bob = rnd() * 6;
      this.dyn.add(b);
      this.boats.push(b);
      return;
    }
    const L = 3.5 + rnd() * 2;
    this.box(1.5, 0.8, L, 0.35, M.hull, x, -2.2, z);
    this.box(1.6, 0.18, L + 0.1, 0.08, M.hullTrim, x, -1.78, z);
    this.put(new THREE.CylinderGeometry(0.06, 0.08, 4, 6), M.trunk, x, 0.2, z);
    const sail = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(0, 0.2, -L * 0.45)]);
    sail.computeVertexNormals();
    this.put(sail, M.sail, x + 0.05, -1.4, z, 0, 0, 0);
    this.put(sail.clone(), M.sail, x - 0.05, -1.4, z, 0, Math.PI, 0, 1, 1, -1);
  }
  private tree(x: number, y: number, z: number, k: number, rnd: () => number) {
    if (kitHas('tree')) {
      const t = kitClone('tree')!;
      t.scale.multiplyScalar(k * (0.8 + rnd() * 0.4));
      t.rotation.y = rnd() * Math.PI * 2;
      t.position.set(x, y, z);
      this.dyn.add(t);
      return;
    }
    this.put(new THREE.CylinderGeometry(0.14 * k, 0.2 * k, 1.6 * k, 6), M.trunk, x, y + 0.8 * k, z);
    this.put(geo.sphere.clone(), rnd() > 0.5 ? M.leaf : M.leafDark, x, y + 2 * k, z, 0, 0, 0, 2.2 * k, 1.8 * k, 2.2 * k);
    this.put(geo.sphere.clone(), M.leaf, x + 0.5 * k, y + 2.6 * k, z + 0.3 * k, 0, 0, 0, 1.4 * k, 1.2 * k, 1.4 * k);
    if (rnd() > 0.5) this.put(geo.sphere.clone(), M.flowerPink, x - 0.6 * k, y + 2.3 * k, z, 0, 0, 0, 0.35 * k, 0.35 * k, 0.35 * k);
  }

  /** Drift chimney smoke upward (call every frame with the world clock). */
  animateSmoke(time: number) {
    for (const b of this.boats) { const ph = b.userData.bob as number; b.position.y = -2.55 + Math.sin(time * 1.3 + ph) * 0.08; b.rotation.z = Math.sin(time * 1.1 + ph) * 0.04; }
    for (const sp of this.smoke) {
      const u = sp.userData as { x: number; y: number; z: number; ph: number };
      const f = (time * 0.35 + u.ph) % 1;
      sp.position.set(u.x + f * 1.6, u.y + f * 5.5, u.z - f * 0.6);
      const sc = 1.3 + f * 3.2;
      sp.scale.set(sc, sc, 1);
      (sp.material as THREE.SpriteMaterial).opacity = 0.95 * (1 - f * f) * Math.min(1, f * 8);
    }
  }

  /** Rebuild decorative and gameplay content for a chunk starting at difficulty d (0..1). */
  fill(d: number, safe: boolean, rnd: () => number) {
    this.speed = Math.min(MAX_SPEED, BASE_SPEED + d * 2500 * 0.006); // matches Game's speed ramp
    for (const c of [...this.dyn.children]) {
      this.dyn.remove(c);
      c.traverse((o) => { if (o instanceof THREE.Mesh && o.userData.own) o.geometry.dispose(); });
    }
    this.obstacles = [];
    this.coins = [];
    this.pickups = [];

    this.smoke = [];
    this.boats = [];
    const mid = this.themeAt(-CHUNK_LEN / 2, () => 0.5);
    // roof tiles shade gradually through a district change instead of snapping per chunk
    const mm = districtMix(this.startDist + CHUNK_LEN / 2);
    for (let r = 0; r < 2; r++) {
      const ca = (THEMES[mm.a].roof[r] as THREE.MeshStandardMaterial).color, cb = (THEMES[mm.b].roof[r] as THREE.MeshStandardMaterial).color;
      this.roofMats[r].color.copy(ca).lerp(cb, mm.t);
    }
    this.roofA.material = this.roofMats[0];
    this.roofB.material = this.roofMats[1];
    // a gate over the street where one district hands over to the next
    const gateD = Math.round((this.startDist + CHUNK_LEN / 2) / DISTRICT_LEN) * DISTRICT_LEN;
    if (gateD > 0 && gateD >= this.startDist && gateD < this.startDist + CHUNK_LEN) this.gate(-(gateD - this.startDist), districtAt(gateD));
    const have = new Set(kitKeys('bld_'));
    for (const s of [-1, 1]) {
      // near row: Tripo houses below the roofline, varied size/turn, with the odd gap
      let z = -1 - rnd() * 2;
      while (z > -CHUNK_LEN + 2) {
        const th = this.themeAt(z, rnd);
        if (th.far === 'sea' && s < 0) { // harbour: open water right below the roofs, boats moored close
          const len = 6;
          this.flat(40, 0.2, len + 0.05, M.water, s * 26, -2.3, z - len / 2);
          this.flat(0.8, 1.6, len + 0.05, M.terrace, s * 6.4, -2.4, z - len / 2); // quay wall
          if (rnd() < 0.5) this.boat(s * (9 + rnd() * 6), z - len / 2, rnd);
          z -= len;
          continue;
        }
        if (th.far === 'garden' && rnd() < 0.55) { // garden: trees and hedges between the houses
          const len = 3 + rnd() * 3;
          this.box(3.2, 1.2, len, 0.5, M.leafDark, s * 7.8, -1.6, z - len / 2);
          this.tree(s * (7.4 + rnd() * 2), -1.2, z - len / 2, 1.1 + rnd() * 0.6, rnd);
          z -= len;
          continue;
        }
        const kits = th.kits.filter((k) => have.has(k));
        if (!kits.length) break;
        if (rnd() < 0.12) { z -= 2 + rnd() * 2; continue; }
        const key = kits[Math.floor(rnd() * kits.length)];
        const b = kitClone(key)!, sz = kitSize(key)!;
        const k = 0.95 + rnd() * 0.4;
        b.scale.setScalar(k);
        b.rotation.y = (s > 0 ? -Math.PI / 2 : Math.PI / 2) + (rnd() - 0.5) * 0.5;
        const along = sz.x * k, across = sz.z * k;
        b.position.set((7.2 + across / 2 + rnd() * 1.2) * s, -2.9 + rnd() * 1.0, z - along / 2);
        this.dyn.add(b);
        z -= along * 0.85 + rnd() * 0.6;
      }
      // far row: town houses / open harbour with boats (left side) / garden terraces with trees
      z = -rnd() * 3;
      while (z > -CHUNK_LEN + 3) {
        const th = this.themeAt(z, rnd);
        const far = th.far === 'sea' && s > 0 ? 'town' : th.far; // harbour: sea on the left, town on the right
        if (far === 'sea') {
          const len = 8;
          if (rnd() < 0.4) this.boat(s * (18 + rnd() * 10), z - len / 2, rnd);
          z -= len;
        } else if (far === 'garden') {
          const len = 4 + rnd() * 3;
          const tx = s * (13 + rnd() * 5), ty = -2 + rnd() * 2;
          this.box(5, 1.6, len, 0.3, M.terrace, tx, ty - 0.8, z - len / 2); // terrace step
          this.box(5.2, 0.3, len + 0.2, 0.12, M.leafDark, tx, ty + 0.05, z - len / 2);
          const n = 1 + Math.floor(rnd() * 3);
          for (let i = 0; i < n; i++) this.tree(tx + (rnd() - 0.5) * 3, ty + 0.1, z - rnd() * len, 0.8 + rnd() * 0.7, rnd);
          z -= len + rnd() * 0.5;
        } else {
          const w = 4 + rnd() * 3, h = 4 + rnd() * 6, len = 4 + rnd() * 4;
          this.building(s, z, w, h, len, rnd, 13 + rnd() * 4, -2.5 + rnd() * 2);
          z -= len + rnd() * 1.5;
        }
      }
      // chimneys poking out of the near roofs, each with a smoke column
      const nc = Math.floor(rnd() * (mid.chimneys + 1));
      for (let i = 0; i < nc; i++) {
        const t = 0.25 + rnd() * 0.5, cz = -4 - rnd() * (CHUNK_LEN - 8);
        const cx = s * (4.75 + t * 2.6), cy = -0.35 - t * 1.9;
        this.box(0.9, 2.6, 0.9, 0.12, M.brick, cx, cy + 1.2, cz);
        this.box(1.15, 0.28, 1.15, 0.1, M.trim, cx, cy + 2.5, cz);
        for (let p = 0; p < 6; p++) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: PUFF(), transparent: true, depthWrite: false, opacity: 0.8 }));
          const ph = p / 6 + rnd() * 0.05;
          sp.userData = { x: cx, y: cy + 2.8, z: cz, ph };
          this.dyn.add(sp);
          this.smoke.push(sp);
        }
      }
      // curb dressing: harbour bollards with rope, garden flower pots
      for (let z2 = -3 - rnd() * 4; z2 > -CHUNK_LEN + 2; z2 -= 6 + rnd() * 6) {
        const th = this.themeAt(z2, rnd);
        if (th.curb === 'bollard') {
          this.put(geo.cyl.clone(), M.bollard, s * 4.1, 0.75, z2, 0, 0, 0, 0.42, 0.7, 0.42);
          this.put(geo.sphere.clone(), M.bollard, s * 4.1, 1.1, z2, 0, 0, 0, 0.5, 0.3, 0.5);
          this.put(new THREE.TorusGeometry(0.26, 0.06, 6, 14), M.rope, s * 4.1, 0.62, z2, Math.PI / 2, 0, 0);
        } else if (th.curb === 'pot') {
          this.put(geo.cyl.clone(), M.pot, s * 4.1, 0.6, z2, 0, 0, 0, 0.55, 0.45, 0.55);
          this.put(geo.sphere.clone(), M.leaf, s * 4.1, 1.0, z2, 0, 0, 0, 0.75, 0.6, 0.75);
          for (let f = 0; f < 3; f++) this.put(geo.sphere.clone(), f % 2 ? M.flowerWhite : M.flowerPink, s * 4.1 + (rnd() - 0.5) * 0.4, 1.2 + rnd() * 0.15, z2 + (rnd() - 0.5) * 0.4, 0, 0, 0, 0.16, 0.16, 0.16);
        }
      }
    }
    // a funny sign on a post at the curb, now and then
    if (rnd() < 0.45) {
      const sd = rnd() < 0.5 ? -1 : 1, sz = -6 - rnd() * (CHUNK_LEN - 12);
      const th = THEMES.indexOf(this.themeAt(sz, rnd));
      const list = SIGNS[th] ?? SIGNS[0];
      const text = list[Math.floor(rnd() * list.length)];
      let face = signFace.get(text);
      if (!face) signFace.set(text, (face = new THREE.MeshStandardMaterial({ map: signTexture(text), roughness: 0.75 })));
      const board = new THREE.Mesh(signGeo, [signWood, signWood, signWood, signWood, face, signWood]);
      board.position.set(sd * 4.25, 2.6, sz);
      board.rotation.y = -sd * 0.45;
      this.dyn.add(board);
      this.put(new THREE.CylinderGeometry(0.07, 0.09, 2.3, 6), M.pole, sd * 4.25, 1.15, sz);
    }
    // a garland strung across the street between two posts, roughly one every ~100 m
    if (rnd() < 0.4) { const gz = -8 - rnd() * 24; this.garland(gz, rnd, this.themeAt(gz, rnd)); }
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
        // washing line across one lane only: dodge it, hop it or slide under, whatever feels right
        this.addObstacle('laundry', lane, base);
        this.addCoinLine((lane + 1 + Math.floor(rnd() * 2)) % 3, base - 4, 5, 1);
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
  private speed = BASE_SPEED;
  /** Coins along the actual jump path, apex over z: up with g*0.85, down with g*1.35 (see Game). */
  private addCoinArc(lane: number, z: number) {
    const gUp = GRAVITY * 0.85, gDn = GRAVITY * 1.35, H = (JUMP_V * JUMP_V) / (2 * gUp);
    const tUp = JUMP_V / gUp, tDn = Math.sqrt((2 * H) / gDn);
    for (let i = -3; i <= 3; i++) {
      const t = i < 0 ? (i / 3) * tUp * 0.92 : (i / 3) * tDn * 0.92;
      const h = H - 0.5 * (t < 0 ? gUp : gDn) * t * t;
      this.addCoin(lane, z - this.speed * t, 1.0 + h);
    }
  }
  private addCoin(lane: number, z: number, y: number) {
    const m = new THREE.Mesh(geo.coin, [coinEdgeMat, coinFaceMat, coinFaceMat]);
    m.rotation.x = Math.PI / 2;
    m.position.set(LANES[lane], y, z);
    this.dyn.add(m);
    this.coins.push({ lane, z, mesh: m, taken: false });
  }

  private addObstacle(kind: ObstacleKind, lane: number, z: number) {
    const g = new THREE.Group();
    const add = (mesh: THREE.Mesh, x: number, y: number, zz: number) => { mesh.position.set(x, y, zz); mesh.userData.own = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
    let depth = 1;
    if (kind === 'laundry' && kitHas(kind)) {
      // one-lane washing line at head height: dodge, jump or slide under it
      const l = kitClone(kind)!;
      l.scale.multiplyScalar(1.3);
      l.position.y = 0.45;
      g.add(l);
      for (const sx of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.6, 8), M.pole), sx * 1.45, 0.3, 0).castShadow = true;
      depth = 0.3;
    } else if ((kind === 'chimney' || kind === 'crate') && kitHas(kind)) {
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
      c.startDist = i * CHUNK_LEN - 20;
      c.fill(0, i < 2, this.rnd);
      this.spawned++;
    });
  }

  private clock = 0;
  /** Per-frame ambient animation (smoke), independent of scrolling. */
  tick(dt: number) {
    this.clock += dt;
    for (const c of this.chunks) c.animateSmoke(this.clock);
  }

  /** Move the world toward the camera by dz and recycle chunks that passed. */
  advance(dz: number, difficulty: number) {
    for (const c of this.chunks) {
      c.group.position.z += dz;
      c.group.visible = c.group.position.z > -FOG_END; // beyond the fog it is all fog colour anyway
    }
    let minZ = Infinity;
    for (const c of this.chunks) minZ = Math.min(minZ, c.group.position.z);
    for (const c of this.chunks) {
      if (c.group.position.z > RECYCLE_Z) {
        const lead = this.chunks.reduce((a, b) => (a.group.position.z < b.group.position.z ? a : b));
        c.startDist = lead.startDist + CHUNK_LEN;
        c.group.position.z = minZ - CHUNK_LEN;
        minZ = c.group.position.z;
        c.fill(difficulty, false, this.rnd);
        this.spawned++;
      }
    }
  }
}
