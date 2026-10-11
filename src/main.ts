import { introSeen, playIntro } from './game/intro';
import { Game } from './game/game';
import { renderBoard, savedName, submitScore, topScores, type Entry } from './game/leaderboard';
import { ACHIEVEMENTS, Progress, SHOP } from './game/progress';
import { track } from './game/stats';

const $ = (id: string) => document.getElementById(id)!;
const game = new Game($('c') as HTMLCanvasElement, {
  score: $('score'), coins: $('coins'), bubble: $('bubble'),
  menu: $('menu'), over: $('over'), overTitle: $('overTitle'), overText: $('overText'),
  card: $('card') as HTMLImageElement, orderImg: $('orderImg') as HTMLImageElement,
  district: $('district'), districtImg: $('districtImg') as HTMLImageElement, districtName: $('districtName'),
  customer: $('customer'), customerImg: $('customerImg') as HTMLImageElement, customerText: $('customerText'),
});
(window as any).__game = game; // handy for debugging and tests

const startWithIntro = () => {
  if (introSeen()) { game.start(); return; }
  game.audio.unlock();
  playIntro($('frame'), () => { game.hold = false; game.start(); }); game.hold = true;
};
$('play').addEventListener('click', startWithIntro);
$('story').addEventListener('click', () => { game.audio.unlock(); playIntro($('frame'), () => { game.hold = false; game.start(); }); game.hold = true; });
$('again').addEventListener('click', () => game.start());

// ---- pause, settings, home
const show = (id: string, on: boolean) => $(id).classList.toggle('hidden', !on);
const click = () => game.audio.play('ui_click');
const pauseBtn = $('pauseBtn');
setInterval(() => show('pauseBtn', (game.state === 'run' || game.state === 'crash') && !game.paused && !document.querySelector('.intro')), 200);
const openPause = () => { if (game.pause()) { show('pause', true); } };
const closePause = () => { show('pause', false); game.resume(); };
pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); click(); openPause(); });
$('resume').addEventListener('click', () => { click(); closePause(); });
$('pauseHome').addEventListener('click', () => { click(); show('pause', false); game.toMenu(); });
$('overHome').addEventListener('click', () => { click(); game.toMenu(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) openPause(); });

// settings (saved per device)
const SETTINGS = 'tf_settings';
const vols = (() => { try { return { music: 0.8, sfx: 0.8, voice: 1, ...JSON.parse(localStorage.getItem(SETTINGS) || '{}') }; } catch { return { music: 0.8, sfx: 0.8, voice: 1 }; } })();
game.audio.setVolumes(vols);
const sliders: [string, keyof typeof vols][] = [['volMusic', 'music'], ['volSfx', 'sfx'], ['volVoice', 'voice']];
for (const [id, k] of sliders) {
  const el = $(id) as HTMLInputElement;
  el.value = String(Math.round(vols[k] * 100));
  el.addEventListener('input', () => {
    vols[k] = Number(el.value) / 100;
    game.audio.setVolumes({ [k]: vols[k] });
    try { localStorage.setItem(SETTINGS, JSON.stringify(vols)); } catch { /* private mode */ }
  });
  el.addEventListener('change', () => { if (k === 'sfx') game.audio.play('coin'); if (k === 'voice') game.audio.voice('Order up!'); });
}
const saverEl = $('saver') as HTMLInputElement;
try { saverEl.checked = localStorage.getItem('tf_saver') === '1'; } catch { /* private mode */ }
game.setSaver(saverEl.checked);
saverEl.addEventListener('change', () => {
  game.setSaver(saverEl.checked);
  try { localStorage.setItem('tf_saver', saverEl.checked ? '1' : '0'); } catch { /* private mode */ }
});
const openSettings = () => { game.audio.unlock(); show('settings', true); };
$('menuSettings').addEventListener('click', (e) => { e.stopPropagation(); click(); openSettings(); });
$('pauseSettings').addEventListener('click', () => { click(); openSettings(); });
$('closeSettings').addEventListener('click', () => { click(); show('settings', false); });
$('replayIntro').addEventListener('click', () => {
  click(); show('settings', false);
  if (game.paused) { show('pause', false); game.toMenu(); }
  playIntro($('frame'), () => { game.hold = false; game.start(); }); game.hold = true;
});

// ---- leaderboard
let boardData: { list: Entry[]; global: boolean; today: Entry[] | null } | null = null;
let boardTab: 'all' | 'today' = 'all';
const drawBoard = () => {
  if (!boardData) return;
  $('tabAll').classList.toggle('on', boardTab === 'all'); $('tabToday').classList.toggle('on', boardTab === 'today');
  show('tabToday', !!boardData.today); if (!boardData.today) boardTab = 'all';
  renderBoard($('boardList'), boardTab === 'today' ? boardData.today! : boardData.list, boardData.global);
};
$('tabAll').addEventListener('click', () => { click(); boardTab = 'all'; drawBoard(); });
$('tabToday').addEventListener('click', () => { click(); boardTab = 'today'; drawBoard(); });
$('menuBoard').addEventListener('click', async (e) => {
  e.stopPropagation(); click();
  show('board', true);
  $('boardList').textContent = 'Loading…';
  boardData = await topScores();
  drawBoard();
});
$('closeBoard').addEventListener('click', () => { click(); show('board', false); });
// ---- progress: tip bank, daily tasks, achievements, shop
const progress = new Progress();
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const refreshBank = () => {
  $('menuBank').textContent = `💰 ${progress.bank} tips`;
  $('shopBank').textContent = `💰 ${progress.bank} tips`;
  let seen = ''; try { seen = localStorage.getItem('tf_tasks_seen') || ''; } catch { /* private mode */ }
  show('tasksDot', seen !== progress.tasks().map((t) => t.id + t.done).join());
};
const applyLook = () => {
  const bag = SHOP.find((i) => i.id === progress.bag);
  game.fox.setLook(bag?.color ?? null, progress.acc);
};
const renderTasks = () => {
  $('taskList').innerHTML = progress.tasks().map((t) => `<div class="task${t.done ? ' done' : ''}"><b>${t.done ? '✅ ' : ''}${esc(t.text)}</b><div class="bar"><i style="width:${Math.round((t.best / t.goal) * 100)}%"></i></div><div class="meta"><span>${t.done ? 'Done!' : `${Math.floor(t.best)} / ${t.goal}`}</span><span>+${t.reward} 💰</span></div></div>`).join('');
  $('achList').innerHTML = ACHIEVEMENTS.map((a) => `<div class="ach${progress.hasAch(a.id) ? '' : ' locked'}"><span class="ic">${progress.hasAch(a.id) ? '🏅' : '🔒'}</span><div><b>${esc(a.name)}</b><small>${esc(a.text)} · +${a.reward} 💰</small></div></div>`).join('');
  try { localStorage.setItem('tf_tasks_seen', progress.tasks().map((t) => t.id + t.done).join()); } catch { /* private mode */ }
  refreshBank();
};
const renderShop = () => {
  const cell = (kind: 'bag' | 'acc') => SHOP.filter((i) => i.kind === kind).map((i) => {
    const owned = progress.owns(i.id), on = (kind === 'bag' ? progress.bag : progress.acc) === i.id;
    const label = on ? 'Wearing' : owned ? 'Wear' : `${i.price} 💰`;
    return `<button class="item${on ? ' on' : ''}${!owned && progress.bank < i.price ? ' locked' : ''}" data-id="${i.id}" type="button"><i class="sw" style="background:${i.swatch}"></i><b>${esc(i.name)}</b><span>${label}</span></button>`;
  }).join('');
  $('shopBags').innerHTML = cell('bag'); $('shopAcc').innerHTML = cell('acc');
  refreshBank();
};
const onItem = (e: Event) => {
  const b = (e.target as HTMLElement).closest('.item') as HTMLElement | null;
  if (!b) return;
  const id = b.dataset.id!;
  if (!progress.owns(id)) {
    if (!progress.buy(id)) { game.audio.play('boing'); b.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 200); return; }
    game.audio.play('coin', 0.8); track('buy', id);
  } else click();
  progress.equip(id); applyLook(); renderShop();
};
$('shopBags').addEventListener('click', onItem); $('shopAcc').addEventListener('click', onItem);
$('menuTasks').addEventListener('click', (e) => { e.stopPropagation(); click(); renderTasks(); show('tasks', true); });
$('closeTasks').addEventListener('click', () => { click(); show('tasks', false); });
$('menuShop').addEventListener('click', (e) => { e.stopPropagation(); click(); renderShop(); show('shop', true); });
$('closeShop').addEventListener('click', () => { click(); show('shop', false); });
refreshBank(); applyLook();

// toasts for tasks and achievements finished mid-run (the run keeps going)
const toastQ: string[] = [];
let toastBusy = false;
const toast = (t: string) => { toastQ.push(t); if (!toastBusy) nextToast(); };
const nextToast = () => {
  const t = toastQ.shift();
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  const el = $('toast'); el.textContent = t; el.classList.add('on');
  setTimeout(() => { el.classList.remove('on'); setTimeout(nextToast, 350); }, 2200);
};
const checkProgress = () => {
  const r = progress.check(game.run);
  for (const t of r.tasks) { toast(`✅ ${t.text}  +${t.reward} 💰`); game.audio.play('coin', 1.5); track('task', t.id); }
  for (const a of r.ach) { toast(`🏅 ${a.name}  +${a.reward} 💰`); game.audio.play('coin', 1.5); track('ach', a.id); }
};
setInterval(() => { if (game.state === 'run' && !game.paused) checkProgress(); }, 500);
let prevBest = 0; try { prevBest = Number(localStorage.getItem('tf_best') || 0); } catch { /* private mode */ }

let lastRun = { score: 0, dist: 0, tips: 0, saved: false };
const nameInput = $('nameInput') as HTMLInputElement;
game.onOver = async (score, dist, tips) => {
  lastRun = { score, dist, tips, saved: false };
  checkProgress();
  progress.bankTips(tips);
  const near = progress.nearest();
  const lines = [
    `<div class="line"><span>Tips banked</span><span class="gain">+${tips} 💰 (${progress.bank})</span></div>`,
    score > prevBest && prevBest > 0 ? '<div class="line"><span>🎉 New best score!</span></div>'
      : prevBest > 0 ? `<div class="line"><span>To your best</span><span>${prevBest - score} pts</span></div>` : '',
    near ? `<div class="line"><span>🎯 ${esc(near.text)}</span><span>${Math.floor(near.best)}/${near.goal}</span></div>` : '<div class="line"><span>✅ All daily tasks done!</span></div>',
  ];
  $('overGoals').innerHTML = lines.join('');
  prevBest = Math.max(prevBest, score);
  refreshBank();
  nameInput.value = savedName();
  show('nameRow', score > 0);
  $('overList').textContent = '';
  const { list, global } = await topScores();
  if (!lastRun.saved) renderBoard($('overList'), list, global);
};
const saveRun = async () => {
  if (lastRun.saved || lastRun.score <= 0) return;
  lastRun.saved = true;
  click();
  show('nameRow', false);
  $('overList').textContent = 'Saving…';
  const { list, global } = await submitScore(nameInput.value, lastRun.score, lastRun.dist, lastRun.tips);
  renderBoard($('overList'), list, global);
};
$('saveScore').addEventListener('click', saveRun);
nameInput.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') saveRun(); });

window.addEventListener('keydown', (e) => {
  game.audio.unlock();
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': game.moveLane(-1); break;
    case 'ArrowRight': case 'd': case 'D': game.moveLane(1); break;
    case 'ArrowUp': case 'w': case 'W': case ' ': game.jump(); e.preventDefault(); break;
    case 'ArrowDown': case 's': case 'S': game.slide(); break;
    case 'Enter': if (game.state !== 'run' && game.state !== 'crash' && !document.querySelector('.intro') && document.activeElement !== nameInput) startWithIntro(); break;
    case 'Escape': case 'p': case 'P': if (game.paused) closePause(); else openPause(); break;
  }
});

// swipe controls: act as soon as the finger has moved far enough (no waiting for release)
let sx = 0, sy = 0, down = false, used = false;
const frame = $('frame');
const SWIPE = 28; // px
frame.addEventListener('pointerdown', (e) => {
  if ((e.target as HTMLElement).closest('button')) return;
  sx = e.clientX; sy = e.clientY; down = true; used = false;
});
frame.addEventListener('pointermove', (e) => {
  if (!down || used) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.hypot(dx, dy) < SWIPE) return;
  used = true;
  if (Math.abs(dx) > Math.abs(dy)) game.moveLane(dx > 0 ? 1 : -1);
  else if (dy < 0) game.jump(); else game.slide();
});
frame.addEventListener('pointerup', (e) => {
  if (!down) return;
  down = false;
  if (used || (e.target as HTMLElement).closest('button')) return;
  game.jump(); // a short tap also jumps
});
frame.addEventListener('pointercancel', () => { down = false; });

// ---- installable app: offline play after the first visit
if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* not critical */ }); });
}
window.addEventListener('appinstalled', () => track('install'));
