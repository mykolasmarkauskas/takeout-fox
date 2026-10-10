import { introSeen, playIntro } from './game/intro';
import { Game } from './game/game';

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

window.addEventListener('keydown', (e) => {
  game.audio.unlock();
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': game.moveLane(-1); break;
    case 'ArrowRight': case 'd': case 'D': game.moveLane(1); break;
    case 'ArrowUp': case 'w': case 'W': case ' ': game.jump(); e.preventDefault(); break;
    case 'ArrowDown': case 's': case 'S': game.slide(); break;
    case 'Enter': if (game.state !== 'run' && game.state !== 'crash' && !document.querySelector('.intro')) startWithIntro(); break;
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
