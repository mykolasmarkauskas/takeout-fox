/**
 * Saved progress on this device: the tip bank, daily tasks, achievements and the shop.
 * Daily tasks are picked from the date, so everyone gets the same three on the same day.
 */
export interface RunStats {
  tips: number; tipsD: [number, number, number]; dist: number;
  bestClean: number; pickups: number; jumps: number; slides: number;
}
export const newRunStats = (): RunStats => ({ tips: 0, tipsD: [0, 0, 0], dist: 0, bestClean: 0, pickups: 0, jumps: 0, slides: 0 });

interface Template { id: string; text: string; n: number[]; get: (r: RunStats) => number }
const TEMPLATES: Template[] = [
  { id: 'tips', text: 'Collect {n} tips in one run', n: [30, 60, 100], get: (r) => r.tips },
  { id: 'dist', text: 'Run {n} m in one run', n: [500, 900, 1500], get: (r) => r.dist },
  { id: 'harbour', text: 'Collect {n} tips in Harbour Lights', n: [10, 25, 45], get: (r) => r.tipsD[1] },
  { id: 'garden', text: 'Collect {n} tips in Garden Terraces', n: [8, 20, 40], get: (r) => r.tipsD[2] },
  { id: 'clean', text: 'Run {n} m without a bump', n: [300, 600, 1000], get: (r) => r.bestClean },
  { id: 'power', text: 'Grab {n} power-ups in one run', n: [2, 4, 6], get: (r) => r.pickups },
  { id: 'jumps', text: 'Jump {n} times in one run', n: [20, 40, 70], get: (r) => r.jumps },
  { id: 'slides', text: 'Slide {n} times in one run', n: [8, 16, 28], get: (r) => r.slides },
];
const REWARD = [50, 100, 200];

export interface Task { id: string; tier: number; goal: number; text: string; best: number; done: boolean; reward: number }

export interface Achievement { id: string; name: string; text: string; test: (r: RunStats) => boolean; reward: number }
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'harbour', name: 'Sea legs', text: 'Reach Harbour Lights', test: (r) => r.dist >= 700, reward: 100 },
  { id: 'garden', name: 'Green thumb', text: 'Reach Garden Terraces', test: (r) => r.dist >= 1400, reward: 150 },
  { id: 'loop', name: 'Grand tour', text: 'Run through all three districts and back to the roofs', test: (r) => r.dist >= 2100, reward: 300 },
  { id: 'tips100', name: 'Big tipper', text: 'Collect 100 tips in one run', test: (r) => r.tips >= 100, reward: 200 },
  { id: 'clean1000', name: 'Untouchable', text: 'Run 1000 m without a bump', test: (r) => r.bestClean >= 1000, reward: 300 },
  { id: 'marathon', name: 'Marathon courier', text: 'Run 3000 m in one run', test: (r) => r.dist >= 3000, reward: 500 },
];

export interface ShopItem { id: string; kind: 'bag' | 'acc'; name: string; price: number; color?: number; swatch: string }
export const SHOP: ShopItem[] = [
  { id: 'bag_teal', kind: 'bag', name: 'Classic teal bag', price: 0, swatch: '#2e9e91' },
  { id: 'bag_red', kind: 'bag', name: 'Chilli red bag', price: 150, color: 0xd8342b, swatch: '#d8342b' },
  { id: 'bag_blue', kind: 'bag', name: 'Harbour blue bag', price: 200, color: 0x2f6fd6, swatch: '#2f6fd6' },
  { id: 'bag_gold', kind: 'bag', name: 'Sunny yellow bag', price: 250, color: 0xf2b51d, swatch: '#f2b51d' },
  { id: 'bag_grape', kind: 'bag', name: 'Grape bag', price: 300, color: 0x7d47c2, swatch: '#7d47c2' },
  { id: 'bag_pink', kind: 'bag', name: 'Berry bag', price: 350, color: 0xe2457a, swatch: '#e2457a' },
  { id: 'acc_none', kind: 'acc', name: 'No extras', price: 0, swatch: '#e8d6bf' },
  { id: 'acc_scarf', kind: 'acc', name: 'Cosy scarf', price: 500, swatch: '#e2452f' },
  { id: 'acc_shades', kind: 'acc', name: 'Cool shades', price: 800, swatch: '#2a2a2a' },
  { id: 'acc_chef', kind: 'acc', name: 'Chef hat', price: 1200, swatch: '#ffffff' },
];

interface Save {
  bank: number; owned: string[]; bag: string; acc: string; ach: string[];
  day: string; tasks: { id: string; tier: number; best: number; done: boolean }[];
}
const KEY = 'tf_progress';
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function pickTasks(day: string) {
  const r = (k: number) => hash(day + ':' + k);
  const ids: number[] = [];
  for (let k = 0; ids.length < 3 && k < 50; k++) { const i = r(k) % TEMPLATES.length; if (!ids.includes(i)) ids.push(i); }
  return ids.map((i, tier) => ({ id: TEMPLATES[i].id, tier, best: 0, done: false }));
}

export class Progress {
  private s: Save;
  constructor() {
    let s: Partial<Save> = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* fresh */ }
    this.s = { bank: 0, owned: ['bag_teal', 'acc_none'], bag: 'bag_teal', acc: 'acc_none', ach: [], day: '', tasks: [], ...s };
    this.rollDay();
  }
  private save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* private mode */ } }
  private rollDay() {
    const d = today();
    if (this.s.day !== d) { this.s.day = d; this.s.tasks = pickTasks(d); this.save(); }
  }

  get bank() { return this.s.bank; }
  get bag() { return this.s.bag; }
  get acc() { return this.s.acc; }
  owns(id: string) { return this.s.owned.includes(id); }
  hasAch(id: string) { return this.s.ach.includes(id); }

  tasks(): Task[] {
    this.rollDay();
    return this.s.tasks.map((t) => {
      const tp = TEMPLATES.find((x) => x.id === t.id)!;
      const goal = tp.n[t.tier];
      return { id: t.id, tier: t.tier, goal, text: tp.text.replace('{n}', String(goal)), best: Math.min(goal, t.best), done: t.done, reward: REWARD[t.tier] };
    });
  }

  /** Live check during a run: returns tasks/achievements completed just now (rewards banked). */
  check(r: RunStats): { tasks: Task[]; ach: Achievement[] } {
    this.rollDay();
    const out = { tasks: [] as Task[], ach: [] as Achievement[] };
    let changed = false;
    for (const t of this.s.tasks) {
      if (t.done) continue;
      const tp = TEMPLATES.find((x) => x.id === t.id)!;
      const v = tp.get(r);
      if (v > t.best) { t.best = v; changed = true; }
      if (v >= tp.n[t.tier]) { t.done = true; this.s.bank += REWARD[t.tier]; changed = true; out.tasks.push(this.tasks().find((x) => x.id === t.id)!); }
    }
    for (const a of ACHIEVEMENTS) {
      if (this.s.ach.includes(a.id) || !a.test(r)) continue;
      this.s.ach.push(a.id); this.s.bank += a.reward; changed = true; out.ach.push(a);
    }
    if (changed) this.save();
    return out;
  }
  /** End of run: tips go into the bank. */
  bankTips(n: number) { this.s.bank += n; this.save(); }

  buy(id: string) {
    const it = SHOP.find((x) => x.id === id);
    if (!it || this.owns(id) || this.s.bank < it.price) return false;
    this.s.bank -= it.price; this.s.owned.push(id); this.save();
    return true;
  }
  equip(id: string) {
    const it = SHOP.find((x) => x.id === id);
    if (!it || !this.owns(id)) return;
    if (it.kind === 'bag') this.s.bag = id; else this.s.acc = id;
    this.save();
  }
  /** The closest unfinished task (for the results screen). */
  nearest(): Task | null {
    const open = this.tasks().filter((t) => !t.done);
    open.sort((a, b) => b.best / b.goal - a.best / a.goal);
    return open[0] ?? null;
  }
}
