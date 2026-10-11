import * as THREE from 'three';

/**
 * Backdrop that matches the key art: a warm gradient sky dome, hazy layers of distant
 * Lanternfall rooftops with chimneys, and drifting chimney smoke puffs.
 * Everything here ignores fog and stays put while the street scrolls (it's "far away").
 */

const rand = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/** One layer of rooftop silhouettes, tiled horizontally, drawn on a canvas. */
function skylineTexture(seed: number, peak: number) {
  const W = 2048, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const r = rand(seed);
  g.fillStyle = '#fff';
  let x = 0;
  while (x < W) {
    const w = 40 + r() * 90;
    const h = H * (0.25 + r() * peak);
    const y = H - h;
    // house body + pitched roof with upturned eaves
    g.fillRect(x + 4, y, w - 8, h);
    g.beginPath();
    g.moveTo(x - 6, y + 6);
    g.quadraticCurveTo(x + w * 0.25, y - 2, x + w / 2, y - 18 - r() * 16);
    g.quadraticCurveTo(x + w * 0.75, y - 2, x + w + 6, y + 6);
    g.closePath();
    g.fill();
    if (r() > 0.45) g.fillRect(x + w * (0.2 + r() * 0.5), y - 30 - r() * 14, 10, 30); // chimney
    if (r() > 0.85) { // little pagoda tower
      g.fillRect(x + w * 0.35, y - 60, w * 0.3, 60);
      g.beginPath(); g.moveTo(x + w * 0.2, y - 56); g.lineTo(x + w * 0.5, y - 78); g.lineTo(x + w * 0.8, y - 56); g.fill();
    }
    x += w - 4;
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function puffTexture() {
  const s = 64, c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.55, 'rgba(255,250,244,0.75)');
  grd.addColorStop(1, 'rgba(255,245,235,0)');
  g.fillStyle = grd; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const PUFF = (() => { let t: THREE.Texture | null = null; return () => (t ??= puffTexture()); })();

export class Scenery {
  readonly group = new THREE.Group();
  private sky: THREE.ShaderMaterial;
  private layers: { mat: THREE.MeshBasicMaterial; k: number }[] = [];

  constructor() {
    // gradient dome: warm peach overhead fading to the golden horizon colour
    this.sky = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0xe7926b) }, bottom: { value: new THREE.Color(0xf9c98a) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y * 2.2 + 0.05, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0);\n#include <colorspace_fragment>\n}',
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), this.sky);
    dome.renderOrder = -10;
    this.group.add(dome);

    // two hazy skyline bands, the nearer one a bit darker and taller
    const bands: [number, number, number, number][] = [
      // radius, height, y, haze mix (0 = rooftop colour, 1 = horizon colour)
      [230, 46, -12, 0.62],
      [170, 40, -14, 0.38],
    ];
    bands.forEach(([radius, h, y, k], i) => {
      const tex = skylineTexture(7 + i * 13, i ? 0.55 : 0.45);
      tex.repeat.set(i ? 5 : 4, 1);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false, side: THREE.BackSide, color: 0xb27a62 });
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, h, 64, 1, true), mat);
      ring.position.y = y + h / 2;
      ring.renderOrder = -9 + i;
      this.group.add(ring);
      this.layers.push({ mat, k });
    });
  }

  /** Follow the scene's horizon colour (districts fade it). */
  setHorizon(c: THREE.Color) {
    this.sky.uniforms.bottom.value.copy(c);
    const top = this.sky.uniforms.top.value as THREE.Color;
    top.copy(c).lerp(new THREE.Color(0xd98a7a), 0.75);
    for (const l of this.layers) l.mat.color.set(0x7a4a3c).lerp(c, l.k);
  }
}
