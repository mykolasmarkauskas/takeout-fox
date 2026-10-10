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

$('play').addEventListener('click', () => game.start());
$('again').addEventListener('click', () => game.start());

window.addEventListener('keydown', (e) => {
  game.audio.unlock();
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': game.moveLane(-1); break;
    case 'ArrowRight': case 'd': case 'D': game.moveLane(1); break;
    case 'ArrowUp': case 'w': case 'W': case ' ': game.jump(); e.preventDefault(); break;
    case 'ArrowDown': case 's': case 'S': game.slide(); break;
    case 'Enter': if (game.state !== 'run' && game.state !== 'crash') game.start(); break;
  }
});

// swipe controls
let sx = 0, sy = 0, st = 0;
const frame = $('frame');
frame.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); });
frame.addEventListener('pointerup', (e) => {
  if ((e.target as HTMLElement).closest('button')) return;
  const dx = e.clientX - sx, dy = e.clientY - sy;
  if (Math.hypot(dx, dy) < 24) { game.jump(); return; } // tap = jump
  if (Math.abs(dx) > Math.abs(dy)) game.moveLane(dx > 0 ? 1 : -1);
  else if (dy < 0) game.jump(); else game.slide();
});
