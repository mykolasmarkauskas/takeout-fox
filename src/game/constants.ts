export const LANES = [-2.2, 0, 2.2];
export const CHUNK_LEN = 40;
export const CHUNK_COUNT = 6;
export const RECYCLE_Z = CHUNK_LEN; // chunk fully behind the camera
export const FOX_Z = 0;
export const GRAVITY = 38;
export const JUMP_V = 12.5;
export const SLIDE_TIME = 0.7;
export const BASE_SPEED = 13;
export const MAX_SPEED = 32;
/**
 * Run speed by distance: noticeably quicker every few hundred metres early on, then
 * creeping toward MAX_SPEED (about 17 m/s at 500 m, 20 at 1000 m, 25 at 2000 m, 30 at 5000 m).
 */
export const speedAt = (dist: number) => BASE_SPEED + (MAX_SPEED - BASE_SPEED) * (1 - Math.exp(-Math.max(0, dist) / 2000));
export const HIT_WINDOW = 3; // second hit within this many seconds ends the run

export const COLORS = {
  sky: 0xf9c98a,
  fog: 0xf6b46b,
  roof: 0xb5532f,
  roofDark: 0x8e3d22,
  path: 0xe9b78a,
  wall: 0xf3d9b1,
  teal: 0x2e9e91,
  cream: 0xf5e2bd,
  fur: 0xf28a2e,
  furDark: 0xd9691a,
  cap: 0x8f3b2a,
  hoodie: 0xe8a93a,
  shorts: 0x41505e,
  lantern: 0xe5392b,
  coin: 0xffc61a,
  brick: 0xc8532f,
  raccoon: 0x7f858b,
};

export type ObstacleKind = 'chimney' | 'crate' | 'laundry' | 'gap';
