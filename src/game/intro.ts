/**
 * Story intro: four comic panels that explain why Marm is running.
 * Shown before the first run (remembered per browser) and from the menu's "Story" button.
 * Tap / Space / Enter = next panel; "Skip" jumps straight into the run.
 */
const PANELS = [
  { img: 'intro_01_last_order', text: 'Lanternfall, midnight. Grandma Pim’s noodle shop has one last order: extra-spicy, extra-hot. “Keep them steaming, Marm!”' },
  { img: 'intro_02_smell', text: 'But the lid wasn’t on tight. The smell drifted over every rooftop in town…' },
  { img: 'intro_03_crowd', text: '…and woke up the Hangry Crowd. Thirty raccoons. One craving.' },
  { img: 'intro_04_run', text: 'No roads. No brakes. Run the rooftops, deliver it hot, and don’t drop the noodles!' },
];
const KEY = 'tf_intro_seen';

export function introSeen() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
}

export function playIntro(host: HTMLElement, onDone: () => void, say?: (line: string) => void) {
  const base = import.meta.env.BASE_URL + 'art/';
  const el = document.createElement('div');
  el.className = 'intro';
  el.innerHTML = `
    <div class="intro-frame"><img alt=""><div class="intro-text"></div></div>
    <div class="intro-bar"><div class="intro-dots"></div><button class="intro-skip" type="button">Skip</button><button class="btn intro-next" type="button">Next</button></div>`;
  host.appendChild(el);
  const img = el.querySelector('img')!, text = el.querySelector('.intro-text')!, dots = el.querySelector('.intro-dots')!;
  const next = el.querySelector('.intro-next') as HTMLButtonElement;
  PANELS.forEach(() => dots.appendChild(document.createElement('i')));
  // preload
  PANELS.forEach((p) => { const i = new Image(); i.src = base + p.img + '.webp'; });

  let i = -1;
  const finish = () => {
    window.removeEventListener('keydown', onKey, true);
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
    markSeen();
    onDone();
  };
  const show = (n: number) => {
    if (n >= PANELS.length) { finish(); return; }
    i = n;
    const p = PANELS[i];
    img.classList.remove('in'); void img.offsetWidth;
    img.src = base + p.img + '.webp';
    img.classList.add('in');
    text.textContent = p.text;
    say?.(p.img);
    Array.from(dots.children).forEach((d, k) => d.classList.toggle('on', k === i));
    next.textContent = i === PANELS.length - 1 ? 'Run!' : 'Next';
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); show(i + 1); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
  };
  window.addEventListener('keydown', onKey, true);
  el.querySelector('.intro-frame')!.addEventListener('click', () => show(i + 1));
  next.addEventListener('click', (e) => { e.stopPropagation(); show(i + 1); });
  el.querySelector('.intro-skip')!.addEventListener('click', (e) => { e.stopPropagation(); finish(); });
  show(0);
}
