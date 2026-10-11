import { introSeen, playIntro } from './game/intro';
import { Game } from './game/game';
import { renderBoard, savedName, submitScore, topScores } from './game/leaderboard';

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
$('menuBoard').addEventListener('click', async (e) => {
  e.stopPropagation(); click();
  show('board', true);
  $('boardList').textContent = 'Loading…';
  const { list, global } = await topScores();
  renderBoard($('boardList'), list, global);
});
$('closeBoard').addEventListener('click', () => { click(); show('board', false); });
let lastRun = { score: 0, dist: 0, tips: 0, saved: false };
const nameInput = $('nameInput') as HTMLInputElement;
game.onOver = async (score, dist, tips) => {
  lastRun = { score, dist, tips, saved: false };
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
