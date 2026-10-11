/**
 * Score board. Tries the shared board on the server (public/api/scores.php, PHP on Hostinger);
 * when that isn't reachable (static demo, offline) it keeps a top-10 on this device instead.
 */
export interface Entry { name: string; score: number; dist: number; tips: number; me?: boolean }

const API = import.meta.env.BASE_URL + 'api/scores.php';
const LOCAL = 'tf_scores';
const NAME = 'tf_name';

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export const savedName = () => read<string>(NAME, '');
export const cleanName = (n: string) => n.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 14) || 'Courier';

function localTop(): Entry[] { return read<Entry[]>(LOCAL, []); }
function localAdd(e: Entry) {
  const list = [...localTop(), e].sort((a, b) => b.score - a.score).slice(0, 10);
  write(LOCAL, list);
  return list;
}

async function withTimeout<T>(p: Promise<T>, ms = 4000) {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

/** Top scores; `global` tells whether they came from the shared board. */
export async function topScores(): Promise<{ list: Entry[]; global: boolean; today: Entry[] | null }> {
  try {
    const r = await withTimeout(fetch(API, { cache: 'no-store' }));
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('no api');
    const j = await r.json();
    if (!Array.isArray(j.top)) throw new Error('bad api');
    return { list: j.top, global: true, today: Array.isArray(j.today) ? j.today : null };
  } catch {
    return { list: localTop(), global: false, today: null };
  }
}

/** Save a run's score under `name`; returns the board with this run marked. */
export async function submitScore(name: string, score: number, dist: number, tips: number) {
  name = cleanName(name);
  write(NAME, name);
  const mine: Entry = { name, score, dist: Math.floor(dist), tips };
  const local = localAdd(mine);
  try {
    const r = await withTimeout(fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mine) }));
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('no api');
    const j = await r.json();
    if (!Array.isArray(j.top)) throw new Error('bad api');
    return {
      list: (j.top as Entry[]).map((e, i) => ({ ...e, me: i === j.rank })), global: true,
      today: Array.isArray(j.today) ? (j.today as Entry[]).map((e, i) => ({ ...e, me: i === j.rankToday })) : null,
    };
  } catch {
    let marked = false;
    return { list: local.map((e) => { const me = !marked && e.name === mine.name && e.score === mine.score; if (me) marked = true; return { ...e, me }; }), global: false, today: null };
  }
}

export function renderBoard(el: HTMLElement, list: Entry[], global: boolean) {
  el.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'lb-head';
  h.textContent = global ? 'Top couriers' : 'Top couriers (this device)';
  el.appendChild(h);
  if (!list.length) {
    const p = document.createElement('div'); p.className = 'lb-empty'; p.textContent = 'No scores yet. Be the first!';
    el.appendChild(p); return;
  }
  const ol = document.createElement('ol');
  list.slice(0, 10).forEach((e) => {
    const li = document.createElement('li');
    if (e.me) li.className = 'me';
    const n = document.createElement('span'); n.textContent = e.name;
    const s = document.createElement('b'); s.textContent = String(e.score);
    li.append(n, s);
    ol.appendChild(li);
  });
  el.appendChild(ol);
}
