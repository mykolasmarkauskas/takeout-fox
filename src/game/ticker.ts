/**
 * "Lanternfall News" crawl along the bottom of the screen while running. The gag set
 * pieces by the track break in as BREAKING items (with a thumbnail of the gag art), so a
 * runner can read the joke without looking away from the lanes.
 */
const HEADLINES = [
  'Rooftop tiles say they are "tired of being walked on"',
  'Hot bags now 20% hotter, experts confirm',
  'Mayor reminds citizens: the Crowd does not accept coupons',
  'Weather: light drizzle of soy sauce over Harbour Lights',
  'Garden Terraces report a record crop of tips',
  'Fox courier seen outrunning the 7:15 bus, bus "not surprised"',
  'Laundry line thieves deny everything, keep the socks',
  'Lantern shortage: festival committee blames moths',
  'Noodle shop meeting ends in a tangle',
  'Local raccoon insists he was "just looking" at the dumplings',
  'Study finds 9 out of 10 chimneys are in the way',
  'Seagulls petition for a delivery app of their own',
  'Harbourmaster: "Please stop jumping over my boats"',
  'Gardener rates today\'s delivery "acceptable", town stunned',
];

export class Ticker {
  readonly el: HTMLDivElement;
  private win: HTMLDivElement;
  private run: HTMLSpanElement;
  private anim: Animation | null = null;
  private on = false;
  private i = Math.floor(Math.random() * HEADLINES.length);
  private urgent: { text: string; img?: string }[] = [];

  constructor(parent: HTMLElement, private art: (name: string) => string) {
    this.el = document.createElement('div');
    this.el.className = 'ticker';
    this.el.innerHTML = '<b class="tk-tag">LANTERNFALL NEWS</b><div class="tk-win"><span class="tk-run"></span></div>';
    this.win = this.el.querySelector('.tk-win')!;
    this.run = this.el.querySelector('.tk-run')!;
    parent.appendChild(this.el);
  }

  show(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    this.el.classList.toggle('on', on);
    if (on) this.next(); else { this.anim?.cancel(); this.anim = null; }
  }
  pause() { this.anim?.pause(); }
  resume() { if (this.on) this.anim?.play(); }

  /** A gag coming into view: cut in right away as a BREAKING item. */
  breaking(text: string, img?: string) {
    this.urgent.push({ text, img });
    if (this.on) this.next();
  }

  private next() {
    this.anim?.cancel();
    const u = this.urgent.shift();
    const tag = this.el.querySelector('.tk-tag')!;
    this.el.classList.toggle('breaking', !!u);
    tag.textContent = u ? 'BREAKING' : 'LANTERNFALL NEWS';
    this.run.innerHTML = '';
    if (u?.img) { const im = document.createElement('img'); im.src = this.art(u.img); im.alt = ''; this.run.appendChild(im); }
    const t = document.createElement('span');
    t.textContent = u ? u.text : HEADLINES[this.i++ % HEADLINES.length];
    this.run.appendChild(t);
    const w = this.win.clientWidth, rw = this.run.scrollWidth;
    // breaking news crawls slower so it can be read at a glance between swipes
    const pxs = u ? 70 : 95;
    this.anim = this.run.animate([{ transform: `translateX(${w}px)` }, { transform: `translateX(${-rw}px)` }], { duration: ((w + rw) / pxs) * 1000, easing: 'linear' });
    this.anim.onfinish = () => { if (this.on) setTimeout(() => this.on && this.next(), 400); };
  }
}
