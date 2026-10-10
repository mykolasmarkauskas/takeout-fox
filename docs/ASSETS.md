# Takeout Fox — asset & tooling map

## Audio (public/audio)
- `sfx/*.ogg` (19) — procedural, `python3 tools/gen_audio.py public/audio` (needs numpy, scipy, ffmpeg).
- `music/run_loop.ogg` — 144 bpm upbeat Lanternfall loop (C–G–Am–F), `python3 tools/gen_music.py public/audio` (numpy + ffmpeg). Plays from run start until a crash or a cutaway; playback rate rises with speed (up to +12 %).
- `voice/*.ogg` (29) — Micmonster project "fox". Marm = Brian (19 lines, e.g. order_up, ouch, crowd_wins); customers: grandma = Nancy, student = Jason, opera = Davis, baker = Tony, gardener = Andrew (`grandma_1/2`, `student_1/2`, `opera_1/2`, `baker_1/2`, `gardener_1/2`). Lines are mapped from the bubble text in `src/game/audio.ts` (`VOICE`). Source MP3s are named "NN - Line.mp3" in the Micmonster download zip; convert with ffmpeg (silenceremove + loudnorm -18 LUFS, mono, libvorbis q4).

## Art (public/art, originals in art/)
Generated with Gemini (AltSpace.lt account); originals as ART_*.jpeg under `art/`, runtime copies as webp.
- fox 9, crowd 2, food 3, npc 5, world 3, pick_ 4, key_poster, gag_ 3 (`gag_01_chimney_therapy`, `gag_02_pigeon_union`, `gag_03_raccoon_mirror`).

## Gameplay features
- Pickups (sprites `pick_hotbag|chilli|umbrella`): hot bag = shield for one hit; chilli = 4 s dash that smashes obstacles; umbrella = 8 s half gravity.
- Cutaway gags: every 500–900 m (first at 450 m) the run freezes 2.6 s on a gag card with a "Meanwhile…" caption, then 1.2 s invulnerability.
- Deliveries every 350 m with customer pop-ups and voice; districts change every 700 m.
