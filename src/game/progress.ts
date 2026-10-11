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

/** Lifetime totals kept across runs (for the lifetime ladders). */
export interface Life { runs: number; tips: number; metres: number }

/**
 * Achievements are ladders: finish a tier and the next, bigger one appears.
 * `get` reads either this run or lifetime totals (lifetime includes the run in progress).
 */
export interface Ladder { id: string; name: string; icon: string; text: string; goals: number[]; reward: (tier: number) => number; get: (r: RunStats, l: Life) => number }
const R = (base: number) => (t: number) => Math.round(base * Math.pow(1.8, t) / 10) * 10;
export const LADDERS: Ladder[] = [
  { id: 'dist', name: 'Long haul', icon: '🏃', text: 'Run {n} m in one run', goals: [500, 1000, 2000, 3000, 5000, 8000, 12000], reward: R(80), get: (r) => r.dist },
  { id: 'tour', name: 'Tour guide', icon: '🗺️', text: 'Reach {d} in one run', goals: [700, 1400, 2100, 4200, 6300], reward: R(100), get: (r) => r.dist },
  { id: 'tips', name: 'Big tipper', icon: '💰', text: 'Collect {n} tips in one run', goals: [50, 100, 200, 350, 500, 800], reward: R(80), get: (r) => r.tips },
  { id: 'clean', name: 'Untouchable', icon: '🛡️', text: 'Run {n} m without a bump', goals: [300, 600, 1000, 2000, 3500, 5000], reward: R(90), get: (r) => r.bestClean },
  { id: 'power', name: 'Power hungry', icon: '🌶️', text: 'Grab {n} power-ups in one run', goals: [3, 6, 10, 15, 25], reward: R(70), get: (r) => r.pickups },
  { id: 'harbour', name: 'Harbour regular', icon: '⚓', text: 'Collect {n} tips in Harbour Lights in one run', goals: [20, 50, 100, 180], reward: R(80), get: (r) => r.tipsD[1] },
  { id: 'garden', name: 'Garden gourmet', icon: '🌸', text: 'Collect {n} tips in Garden Terraces in one run', goals: [15, 40, 80, 150], reward: R(90), get: (r) => r.tipsD[2] },
  { id: 'acro', name: 'Acrobat', icon: '🤸', text: 'Jump {n} times in one run', goals: [30, 60, 120, 200], reward: R(60), get: (r) => r.jumps },
  { id: 'runs', name: 'Loyal courier', icon: '📦', text: 'Finish {n} runs', goals: [5, 25, 100, 250, 500, 1000], reward: R(60), get: (_r, l) => l.runs },
  { id: 'saver', name: 'Piggy bank', icon: '🐷', text: 'Earn {n} tips in total', goals: [500, 2000, 10000, 30000, 100000], reward: R(100), get: (_r, l) => l.tips },
];
const TOUR = ['Harbour Lights', 'Garden Terraces', 'the roofs again (one full loop)', 'a second full loop', 'a third full loop'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
export interface AchStep { id: string; tier: number; name: string; icon: string; text: string; goal: number; best: number; reward: number; max: number; maxed: boolean }
export function ladderStep(l: Ladder, tier: number, best: number): AchStep {
  const t = Math.min(tier, l.goals.length - 1), goal = l.goals[t];
  const text = l.text.replace('{n}', goal.toLocaleString('en')).replace('{d}', TOUR[t] ?? `${goal} m`);
  return { id: l.id, tier, name: `${l.name} ${ROMAN[t]}`, icon: l.icon, text, goal, best: Math.min(best, goal), reward: l.reward(t), max: l.goals.length, maxed: tier >= l.goals.length };
}

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
  /** Completed tiers per ladder, best value seen per ladder, lifetime totals. */
  tiers: Record<string, number>; bests: Record<string, number>; life: Life;
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
    this.s = { bank: 0, owned: ['bag_teal', 'acc_none'], bag: 'bag_teal', acc: 'acc_none', ach: [], day: '', tasks: [], tiers: {}, bests: {}, life: { runs: 0, tips: 0, metres: 0 }, ...s };
    // first version had six one-off achievements: carry them over as finished tiers (no double reward)
    const old: Record<string, [string, number]> = { harbour: ['tour', 1], garden: ['tour', 2], loop: ['tour', 3], tips100: ['tips', 2], clean1000: ['clean', 3], marathon: ['dist', 4] };
    for (const a of this.s.ach) { const o = old[a]; if (o && (this.s.tiers[o[0]] ?? 0) < o[1]) this.s.tiers[o[0]] = o[1]; }
    if (this.s.ach.length) { this.s.ach = []; this.save(); }
    this.rollDay();
  }
  private save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* private mode */ } }
  private rollDay() {
    const d = today();
    if (this.s.day !== d || !this.s.tasks.length) { this.s.day = d; this.s.tasks = pickTasks(d); this.save(); }
  }

  get bank() { return this.s.bank; }
  get bag() { return this.s.bag; }
  get acc() { return this.s.acc; }
  owns(id: string) { return this.s.owned.includes(id); }
  /** The next step of every ladder (or its last one, marked maxed), for the achievements list. */
  ladders(): AchStep[] {
    return LADDERS.map((l) => ladderStep(l, this.s.tiers[l.id] ?? 0, this.s.bests[l.id] ?? 0));
  }
  get life() { return this.s.life; }

  tasks(): Task[] {
    this.rollDay();
    return this.s.tasks.map((t) => {
      const tp = TEMPLATES.find((x) => x.id === t.id)!;
      const goal = tp.n[t.tier];
      return { id: t.id, tier: t.tier, goal, text: tp.text.replace('{n}', String(goal)), best: Math.min(goal, t.best), done: t.done, reward: REWARD[t.tier] };
    });
  }

  /** Live check during a run: returns tasks/achievements completed just now (rewards banked). */
  /** `ended`: the run's tips are already banked (lifetime totals include them). */
  check(r: RunStats, ended = false): { tasks: Task[]; ach: AchStep[] } {
    this.rollDay();
    const out = { tasks: [] as Task[], ach: [] as AchStep[] };
    let changed = false;
    for (const t of this.s.tasks) {
      if (t.done) continue;
      const tp = TEMPLATES.find((x) => x.id === t.id)!;
      const v = tp.get(r);
      if (v > t.best) { t.best = v; changed = true; }
      if (v >= tp.n[t.tier]) { t.done = true; this.s.bank += REWARD[t.tier]; changed = true; out.tasks.push(this.tasks().find((x) => x.id === t.id)!); }
    }
    const live: Life = ended ? this.s.life : { ...this.s.life, tips: this.s.life.tips + r.tips };
    for (const l of LADDERS) {
      const v = l.get(r, live);
      if (v > (this.s.bests[l.id] ?? 0)) { this.s.bests[l.id] = v; changed = true; }
      // one run can clear several tiers at once (e.g. a 2000 m run clears 500 and 1000 too)
      let t = this.s.tiers[l.id] ?? 0;
      while (t < l.goals.length && v >= l.goals[t]) {
        const step = ladderStep(l, t, v);
        this.s.bank += step.reward; out.ach.push(step);
        t++; this.s.tiers[l.id] = t; changed = true;
      }
    }
    if (changed) this.save();
    return out;
  }
  /** End of run: tips go into the bank. */
  bankTips(n: number, metres = 0) {
    this.s.bank += n;
    this.s.life.runs++; this.s.life.tips += n; this.s.life.metres += Math.floor(metres);
    this.save();
  }

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
