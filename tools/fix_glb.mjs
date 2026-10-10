// Post-process a Tripo GLB for the game:
//  1. make rigid parts (backpack) follow ONE bone (no "fluid" skin deformation)
//  2. shrink textures (1024 WebP), drop the metallic/roughness map
// usage: node tools/fix_glb.mjs in.glb out.glb [--rigid=teal] [--bone=Spine2]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, prune, dedup, resample, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [, , inPath, outPath, ...flags] = process.argv;
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, '').split('=')));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inPath);
const root = doc.getRoot();

const skin = root.listSkins()[0];
const joints = skin ? skin.listJoints() : [];
if (opt.list) { joints.forEach((j, i) => console.log(i, j.getName())); }

if (skin && opt.rigid) {
  const boneName = (opt.bone || 'Spine2').toLowerCase();
  const boneIdx = joints.findIndex((j) => j.getName().toLowerCase().includes(boneName));
  if (boneIdx < 0) throw new Error('bone not found: ' + boneName);
  const mat = root.listMaterials()[0];
  const tex = mat.getBaseColorTexture();
  const img = sharp(Buffer.from(tex.getImage()));
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const px = (u, v) => {
    const x = Math.min(info.width - 1, Math.max(0, Math.floor(u * info.width)));
    const y = Math.min(info.height - 1, Math.max(0, Math.floor(v * info.height)));
    const o = (y * info.width + x) * info.channels;
    return [data[o], data[o + 1], data[o + 2]];
  };
  // teal backpack: hue ~170-190, saturated
  const isTeal = ([r, g, b]) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx - mn < 35) return false;
    let h;
    if (mx === r) h = ((g - b) / (mx - mn)) * 60; else if (mx === g) h = (2 + (b - r) / (mx - mn)) * 60; else h = (4 + (r - g) / (mx - mn)) * 60;
    if (h < 0) h += 360;
    return h > 150 && h < 205 && g > 60;
  };
  for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), uv = prim.getAttribute('TEXCOORD_0');
    const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
    const n = pos.getCount();
    const teal = new Uint8Array(n);
    let zmin = Infinity, zmax = -Infinity, ymin = Infinity, ymax = -Infinity, xmin = Infinity, xmax = -Infinity, cnt = 0;
    const p = [0, 0, 0], t = [0, 0];
    for (let i = 0; i < n; i++) {
      uv.getElement(i, t);
      if (isTeal(px(t[0], t[1]))) { teal[i] = 1; }
    }
    // bag = teal verts behind the body centre (the straps in front stay soft)
    let zc = 0; for (let i = 0; i < n; i++) { pos.getElement(i, p); zc += p[2]; } zc /= n;
    const bag = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      pos.getElement(i, p);
      if (teal[i] && p[2] < zc - 0.02) { bag[i] = 1; cnt++; xmin = Math.min(xmin, p[0]); xmax = Math.max(xmax, p[0]); ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); zmin = Math.min(zmin, p[2]); zmax = Math.max(zmax, p[2]); }
    }
    // include everything inside the bag's box that is behind it (cream stripe, rim)
    for (let i = 0; i < n; i++) {
      if (bag[i]) continue;
      pos.getElement(i, p);
      if (p[0] > xmin + 0.01 && p[0] < xmax - 0.01 && p[1] > ymin + 0.01 && p[1] < ymax - 0.01 && p[2] < zmax - 0.03 && p[2] >= zmin - 0.01) { bag[i] = 1; cnt++; }
    }
    const one = [boneIdx, 0, 0, 0], w = [1, 0, 0, 0];
    for (let i = 0; i < n; i++) if (bag[i]) { J.setElement(i, one); W.setElement(i, w); }
    console.log(`rigid verts: ${cnt}/${n} -> joint ${boneIdx} ${joints[boneIdx].getName()}  (z centre ${zc.toFixed(3)}, bag box x ${xmin.toFixed(2)}..${xmax.toFixed(2)} y ${ymin.toFixed(2)}..${ymax.toFixed(2)} z ${zmin.toFixed(2)}..${zmax.toFixed(2)})`);
  }
}

for (const m of root.listMaterials()) {
  const mr = m.getMetallicRoughnessTexture();
  if (mr) { m.setMetallicRoughnessTexture(null); }
  m.setMetallicFactor(0); m.setRoughnessFactor(0.7); m.setDoubleSided(false);
}
// drop stray pieces Tripo sometimes adds (flat background cards beside the object):
// keep the largest connected component plus anything whose centre lies inside its x/z footprint
if (opt.clean) {
  for (const m of root.listMeshes()) for (const pr of m.listPrimitives()) {
    const idx = pr.getIndices(), pos = pr.getAttribute('POSITION');
    if (!idx) continue;
    const nv = pos.getCount(), parent = new Int32Array(nv).map((_, i) => i);
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const ia = idx.getArray();
    // weld by position first so UV seams don't split components
    const key = new Map(), p = [0, 0, 0];
    for (let i = 0; i < nv; i++) { pos.getElement(i, p); const k = p.map((v) => Math.round(v * 1e4)).join(','); const j = key.get(k); if (j === undefined) key.set(k, i); else parent[find(i)] = find(j); }
    for (let t = 0; t < ia.length; t += 3) { const a = find(ia[t]), b = find(ia[t + 1]), c = find(ia[t + 2]); parent[b] = a; parent[find(c)] = a; }
    const comp = new Map();
    for (let t = 0; t < ia.length; t += 3) {
      const r = find(ia[t]); let c = comp.get(r);
      if (!c) comp.set(r, (c = { n: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], sum: [0, 0, 0] }));
      c.n++;
      for (let k = 0; k < 3; k++) { pos.getElement(ia[t + k], p); for (let d = 0; d < 3; d++) { c.min[d] = Math.min(c.min[d], p[d]); c.max[d] = Math.max(c.max[d], p[d]); c.sum[d] += p[d]; } }
    }
    const big = [...comp.values()].sort((a, b) => b.n - a.n)[0];
    const keep = new Set();
    for (const [r, c] of comp) {
      const cx = c.sum[0] / (c.n * 3), cz = c.sum[2] / (c.n * 3);
      if (c === big || (cx > big.min[0] && cx < big.max[0] && cz > big.min[2] && cz < big.max[2])) keep.add(r);
    }
    const out = [];
    for (let t = 0; t < ia.length; t += 3) if (keep.has(find(ia[t]))) out.push(ia[t], ia[t + 1], ia[t + 2]);
    const dropped = ia.length / 3 - out.length / 3;
    idx.setArray(nv > 65535 ? new Uint32Array(out) : new Uint16Array(out));
    console.log(`clean: ${comp.size} components, dropped ${dropped} stray triangles`);
  }
}

// static props: decimate to roughly --tris triangles (Tripo HD meshes are ~1-2 M)
if (opt.tris) {
  await MeshoptSimplifier.ready;
  let tris = 0;
  for (const m of root.listMeshes()) for (const pr of m.listPrimitives()) tris += (pr.getIndices() ? pr.getIndices().getCount() : pr.getAttribute('POSITION').getCount()) / 3;
  const ratio = Math.min(1, Number(opt.tris) / tris);
  console.log(`triangles ${Math.round(tris)} -> target ${opt.tris} (ratio ${ratio.toFixed(4)})`);
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error: Number(opt.err || 0.05), lockBorder: false }));
}
await doc.transform(
  prune(), dedup(), resample(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
);
await io.write(outPath, doc);
console.log('wrote', outPath);
