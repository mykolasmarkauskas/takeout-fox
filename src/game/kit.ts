import * as THREE from 'three';
import { modelUrl } from './assetUrl';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Static GLB props (buildings, obstacles) made in Tripo in the same style as Marm.
 * Each entry is normalised once (centred on x/z, base on y=0, front facing +Z) and
 * then cloned cheaply (geometry and materials are shared between clones).
 * Missing files are fine: the world keeps its procedural fallback for that piece.
 */
export interface KitSpec { url: string; fit: 'height' | 'width' | 'depth' | 'max'; size: number }

export const KIT: Record<string, KitSpec> = {
  bld_noodle: { url: 'models/bld_noodle.glb', fit: 'height', size: 6.2 },
  bld_teal: { url: 'models/bld_teal.glb', fit: 'height', size: 5.6 },
  bld_tower: { url: 'models/bld_tower.glb', fit: 'height', size: 6.4 },
  chimney: { url: 'models/chimney.glb', fit: 'height', size: 3.6 },
  crate: { url: 'models/crate.glb', fit: 'width', size: 1.75 },
  laundry: { url: 'models/laundry.glb', fit: 'width', size: 2.4 },
  boat: { url: 'models/boat.glb', fit: 'max', size: 6.5 },
  tree: { url: 'models/tree.glb', fit: 'height', size: 4.2 },
  // district versions of the jump-over crate
  barrels: { url: 'models/barrels.glb', fit: 'height', size: 1.35 },
  cart: { url: 'models/cart.glb', fit: 'width', size: 2.1 },
  // Harbour Lights
  dock: { url: 'models/dock.glb', fit: 'width', size: 3.4 },
  crane: { url: 'models/crane.glb', fit: 'height', size: 6 },
  lighthouse: { url: 'models/lighthouse.glb', fit: 'height', size: 22 },
  rowboat: { url: 'models/rowboat.glb', fit: 'max', size: 3.4 },
  // Garden Terraces
  gardenhouse_a: { url: 'models/gardenhouse_a.glb', fit: 'height', size: 8 },
  gardenhouse_b: { url: 'models/gardenhouse_b.glb', fit: 'height', size: 6.8 },
  pergola: { url: 'models/pergola.glb', fit: 'height', size: 3.6 },
  fountain: { url: 'models/fountain.glb', fit: 'width', size: 2.4 },
  planter: { url: 'models/planter.glb', fit: 'max', size: 2.2 },
  trellis: { url: 'models/trellis.glb', fit: 'height', size: 2.8 },
  balloon: { url: 'models/balloon.glb', fit: 'height', size: 7 },
  // Noodle Roofs extras
  noodlehouse_b: { url: 'models/noodlehouse_b.glb', fit: 'height', size: 6.2 },
  noodlehouse_c: { url: 'models/noodlehouse_c.glb', fit: 'height', size: 6.2 },
  // gag set pieces
  pigeons: { url: 'models/pigeons.glb', fit: 'width', size: 3.8 },
  seagull: { url: 'models/seagull.glb', fit: 'height', size: 4.2 },
  chimneytherapy: { url: 'models/chimneytherapy.glb', fit: 'width', size: 4 },
  raccoonmirror: { url: 'models/raccoonmirror.glb', fit: 'height', size: 3.2 },
};

const ready = new Map<string, THREE.Object3D>();
const sizes = new Map<string, THREE.Vector3>();
let loading: Promise<void> | null = null;

/**
 * Models load in two waves: the Noodle Roofs street (and every obstacle) first, so the first
 * run can start after ~10 MB; the harbour and garden models follow in the background
 * (`loadRest`), long before a run reaches them at 700 m.
 */
const FIRST = ['bld_noodle', 'bld_teal', 'bld_tower', 'noodlehouse_b', 'noodlehouse_c', 'chimney', 'crate', 'laundry', 'tree', 'pigeons', 'chimneytherapy', 'barrels', 'cart'];
let loader: GLTFLoader | null = null;
async function loadOne(key: string, spec: KitSpec) {
    loader ??= new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(modelUrl(spec.url));
      const root = gltf.scene;
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3(); box.getSize(size);
      const ref = spec.fit === 'height' ? size.y : spec.fit === 'width' ? size.x : spec.fit === 'depth' ? size.z : Math.max(size.x, size.z);
      const s = spec.size / ref;
      root.scale.setScalar(s);
      box.setFromObject(root);
      root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          // houses sit away from the path: no need to draw them into the shadow map
          o.castShadow = !key.startsWith('bld_'); o.receiveShadow = !key.startsWith('bld_');
          const m = o.material as THREE.MeshStandardMaterial;
          if (m && 'metalness' in m) { m.metalness = 0; m.roughness = Math.max(0.45, m.roughness); }
        }
      });
      const wrap = new THREE.Group();
      wrap.add(root);
      wrap.matrixAutoUpdate = true;
      const out = new THREE.Vector3(); new THREE.Box3().setFromObject(wrap).getSize(out);
      ready.set(key, wrap);
      sizes.set(key, out);
    } catch {
      /* optional asset */
    }
}
export function loadKit() {
  if (loading) return loading;
  loading = Promise.all(FIRST.filter((k) => KIT[k]).map((k) => loadOne(k, KIT[k]))).then(() => undefined);
  return loading;
}
let rest: Promise<void> | null = null;
/** Second wave: everything not needed on the first street. Safe to call more than once. */
export function loadRest() {
  rest ??= (loading ?? Promise.resolve()).then(() => Promise.all(Object.entries(KIT).filter(([k]) => !FIRST.includes(k)).map(([k, s]) => loadOne(k, s)))).then(() => undefined);
  return rest;
}

/** A fresh placeable copy, or null when the asset isn't available. */
export function kitClone(key: string): THREE.Object3D | null {
  const src = ready.get(key);
  return src ? src.clone(true) : null;
}
export function kitSize(key: string) { return sizes.get(key) ?? null; }
export function kitHas(key: string) { return ready.has(key); }
export function kitKeys(prefix: string) { return [...ready.keys()].filter((k) => k.startsWith(prefix)); }

/** Mesh parts of a kit entry (geometry, material, transform relative to the placed object), for instancing. */
export interface KitPart { geo: THREE.BufferGeometry; mat: THREE.Material; local: THREE.Matrix4 }
const partsCache = new Map<string, KitPart[]>();
export function kitParts(key: string): KitPart[] | null {
  const src = ready.get(key);
  if (!src) return null;
  let p = partsCache.get(key);
  if (!p) {
    src.updateMatrixWorld(true);
    p = [];
    src.traverse((o) => { if (o instanceof THREE.Mesh) p!.push({ geo: o.geometry, mat: o.material as THREE.Material, local: o.matrixWorld.clone() }); });
    partsCache.set(key, p);
  }
  return p;
}
