/**
 * Game-portal builds (npm run build:portal). Set at build time by VITE_PORTAL, e.g. 'crazygames'.
 * On a portal the game does not talk to takeoutfox.com (no leaderboard API, no stats, no service
 * worker, no outgoing links) and reports gameplay to the portal SDK instead.
 */
export const PORTAL = ((import.meta.env.VITE_PORTAL as string | undefined) || '') as '' | 'crazygames';

type CG = { SDK: { init(): Promise<void>; environment: string; game: Record<string, () => void> } };
const cg = () => (window as unknown as { CrazyGames?: CG }).CrazyGames?.SDK;
let ready = false;
let playing = false;

const call = (fn: string) => {
  if (PORTAL !== 'crazygames' || !ready) return;
  try { cg()?.game[fn]?.(); } catch { /* SDK disabled on this domain */ }
};

export const portal = {
  async init() {
    if (PORTAL !== 'crazygames' || !cg()) return;
    try { await cg()!.init(); ready = cg()!.environment !== 'disabled'; } catch { ready = false; }
  },
  loadingStart: () => call('loadingStart'),
  loadingStop: () => call('loadingStop'),
  /** Player is running (also after a pause). */
  start() { if (!playing) { playing = true; call('gameplayStart'); } },
  /** Menu, pause, results. */
  stop() { if (playing) { playing = false; call('gameplayStop'); } },
  /** A real celebration moment (new best score). Use sparingly. */
  happy: () => call('happytime'),
};
