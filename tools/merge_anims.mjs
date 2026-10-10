// Copy animations from a second Tripo export (same rig) into an existing GLB.
// usage: node tools/merge_anims.mjs base.glb anims.glb out.glb [--only=jump,fall,...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [, , basePath, animPath, outPath, ...flags] = process.argv;
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, '').split('=')));
const only = opt.only ? opt.only.split(',') : null;
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const base = await io.read(basePath);
const src = await io.read(animPath);
const root = base.getRoot();
const byName = new Map(root.listNodes().map((n) => [n.getName(), n]));
const buf = root.listBuffers()[0];
const have = new Set(root.listAnimations().map((a) => a.getName()));
const copyAcc = (a) => base.createAccessor(a.getName()).setType(a.getType()).setArray(a.getArray().slice()).setBuffer(buf);
for (const anim of src.getRoot().listAnimations()) {
  const name = anim.getName();
  if (only && !only.some((o) => name.toLowerCase().includes(o))) continue;
  if (have.has(name)) { console.log('skip existing', name); continue; }
  const out = base.createAnimation(name);
  let n = 0, miss = 0;
  for (const ch of anim.listChannels()) {
    const target = byName.get(ch.getTargetNode()?.getName());
    if (!target) { miss++; continue; }
    const s = ch.getSampler();
    const ns = base.createAnimationSampler().setInput(copyAcc(s.getInput())).setOutput(copyAcc(s.getOutput())).setInterpolation(s.getInterpolation());
    out.addSampler(ns).addChannel(base.createAnimationChannel().setTargetNode(target).setTargetPath(ch.getTargetPath()).setSampler(ns));
    n++;
  }
  const dur = Math.max(...anim.listSamplers().map((s) => s.getInput().getMax([])[0]));
  console.log('added', name, n, 'channels', miss ? `(${miss} unmatched)` : '', dur.toFixed(2) + 's');
}
await io.write(outPath, base);
