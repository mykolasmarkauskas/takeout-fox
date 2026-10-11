import * as THREE from 'three';
import { kitParts, kitSize } from './kit';

/**
 * Static decoration (houses, planters, docks...) drawn as one InstancedMesh per model part
 * instead of one draw call per copy. Chunks only record where each copy goes; every frame
 * the visible copies are culled against the camera and written into the instance buffers.
 */
export interface Placed { key: string; m: THREE.Matrix4; r: number; cy: number }

interface Slot { meshes: THREE.InstancedMesh[]; cap: number; n: number }

const _w = new THREE.Matrix4(), _t = new THREE.Matrix4(), _c = new THREE.Matrix4();
const SMALL_FAR = 55;
const _sph = new THREE.Sphere(), _f = new THREE.Frustum(), _pv = new THREE.Matrix4();

export class Instancer {
  readonly group = new THREE.Group();
  private slots = new Map<string, Slot>();
  private pool: THREE.Matrix4[] = [];
  private lists = new Map<string, THREE.Matrix4[]>();

  /** Bounding radius and centre height for a placed copy (from the kit's fitted size). */
  static place(key: string, m: THREE.Matrix4, k: number): Placed {
    const s = kitSize(key);
    const r = s ? 0.5 * Math.hypot(s.x, s.y, s.z) * k : 4 * k;
    return { key, m, r, cy: s ? (s.y * k) / 2 : 2 };
  }

  private slot(key: string, need: number): Slot | null {
    let s = this.slots.get(key);
    if (s && s.cap >= need) return s;
    const parts = kitParts(key);
    if (!parts) return null;
    const cap = Math.max(64, Math.ceil(need * 1.5));
    if (s) for (const im of s.meshes) { this.group.remove(im); im.dispose(); }
    const meshes = parts.map((p) => {
      const im = new THREE.InstancedMesh(p.geo, p.mat, cap);
      im.frustumCulled = false; // culled per copy below
      im.receiveShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.count = 0;
      this.group.add(im);
      return im;
    });
    s = { meshes, cap, n: 0 };
    this.slots.set(key, s);
    return s;
  }

  /** Rebuild instance buffers from the chunks' placed copies (chunk z offsets + camera culling). */
  sync(chunks: { group: THREE.Group; placed: Placed[] }[], camera: THREE.Camera, maxDist: number) {
    camera.updateMatrixWorld();
    _f.setFromProjectionMatrix(_pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const lists = this.lists;
    for (const l of lists.values()) l.length = 0;
    let used = 0;
    for (const c of chunks) {
      if (!c.group.visible) continue;
      _c.makeTranslation(c.group.position.x, c.group.position.y, c.group.position.z);
      for (const p of c.placed) {
        _w.multiplyMatrices(_c, p.m);
        _sph.center.setFromMatrixPosition(_w); _sph.center.y += p.cy; _sph.radius = p.r;
        // small props fade into the fog early: past ~55 m they are a few pixels wide anyway
        const far = p.r < 2.2 ? SMALL_FAR : maxDist;
        if (_sph.center.z < -far - p.r || !_f.intersectsSphere(_sph)) continue;
        const m = this.pool[used] ?? (this.pool[used] = new THREE.Matrix4());
        used++;
        (lists.get(p.key) ?? lists.set(p.key, []).get(p.key)!).push(m.copy(_w));
      }
    }
    for (const [key, s] of this.slots) if (!lists.get(key)?.length) { for (const im of s.meshes) im.count = 0; s.n = 0; }
    for (const [key, ms] of lists) {
      if (!ms.length) continue;
      const s = this.slot(key, ms.length);
      if (!s) continue;
      const parts = kitParts(key)!;
      s.meshes.forEach((im, pi) => {
        const local = parts[pi].local;
        for (let i = 0; i < ms.length; i++) im.setMatrixAt(i, _t.multiplyMatrices(ms[i], local));
        im.count = ms.length;
        im.instanceMatrix.needsUpdate = true;
      });
      s.n = ms.length;
    }
  }
}
