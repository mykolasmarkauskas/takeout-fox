import numpy as np, os, subprocess, sys
from scipy.io import wavfile
SR = 44100
out = sys.argv[1]
os.makedirs(out + "/sfx", exist_ok=True)
os.makedirs(out + "/music", exist_ok=True)
rng = np.random.default_rng(7)

def t(d): return np.arange(int(SR * d)) / SR
def env(n, a=0.005, r=0.1):
    e = np.ones(n); na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def expdec(x, k): return np.exp(-k * x)
def sweep(f0, f1, d, wave="sine", curve=1.0):
    x = t(d); f = f0 + (f1 - f0) * (x / d) ** curve
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave == "sine": return np.sin(ph)
    if wave == "tri": return 2 / np.pi * np.arcsin(np.sin(ph))
    if wave == "sq": return np.sign(np.sin(ph)) * 0.6
    if wave == "saw": return 2 * ((ph / (2 * np.pi)) % 1) - 1
def noise(d): return rng.uniform(-1, 1, int(SR * d))
def lp(x, a):
    y = np.zeros_like(x); s = 0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y
def save(name, x, folder="sfx", gain=0.8):
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    wav = f"{out}/{folder}/{name}.wav"
    wavfile.write(wav, SR, (x * 32767).astype(np.int16))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "4", wav[:-4] + ".ogg"], check=True)
    os.remove(wav)

# slapstick set
x = sweep(300, 1800, 0.7, "sine", 1.6) * (1 + 0.15 * np.sin(2 * np.pi * 7 * t(0.7)))
save("slide_whistle_up", x * env(len(x), 0.01, 0.1))
x = sweep(1700, 250, 0.8, "sine", 0.8) * (1 + 0.15 * np.sin(2 * np.pi * 7 * t(0.8)))
save("slide_whistle_down", x * env(len(x), 0.01, 0.1))
d = 0.55; x = sweep(160, 70, d, "sine", 0.4) * (1 + 0.5 * np.sin(2 * np.pi * 22 * t(d)) * expdec(t(d), 5)) * expdec(t(d), 4)
x += 0.4 * sweep(320, 140, d, "tri", 0.4) * expdec(t(d), 5)
save("boing", x)
d = 0.12; x = sweep(900, 200, d, "sine", 0.5) * expdec(t(d), 25) + 0.15 * lp(noise(d), 0.5) * expdec(t(d), 40)
save("pop", x)
# pickups
d = 0.35; x = np.zeros(int(SR * d)); a = t(0.07)
x[:len(a)] += np.sin(2 * np.pi * 988 * a) * expdec(a, 15)
b = t(d - 0.07); x[int(0.07 * SR):] += np.sin(2 * np.pi * 1319 * b) * expdec(b, 9)
x += 0.2 * np.sin(2 * np.pi * 2638 * t(d)) * expdec(t(d), 12)
save("coin", x)
x = (sweep(200, 1200, 0.5, "saw", 1.5) * 0.4 + lp(noise(0.5), 0.15) * 0.8) * np.sin(np.pi * t(0.5) / 0.5)
save("chilli_whoosh", x)
d = 0.4; x = sweep(400, 900, d, "tri", 1) * expdec(t(d), 5) + 0.3 * sweep(800, 1800, d, "sine", 1) * expdec(t(d), 8)
save("hot_bag", x)
d = 0.45; x = lp(noise(d), 0.3) * np.sin(np.pi * t(d) / d) * 0.6 + 0.5 * sweep(300, 600, d, "sine", 2) * expdec(t(d), 5)
save("umbrella_open", x)
# movement
d = 0.22; x = lp(noise(d), 0.25) * np.sin(np.pi * t(d) / d)
save("swipe", x)
d = 0.3; x = sweep(250, 520, d, "sine", 0.6) * expdec(t(d), 6) + 0.2 * lp(noise(d), 0.2) * expdec(t(d), 20)
save("jump", x)
d = 0.12; x = sweep(120, 70, d, "sine", 0.5) * expdec(t(d), 20) + 0.2 * lp(noise(d), 0.15) * expdec(t(d), 40)
save("land", x)
# crashes
d = 0.7; x = sweep(110, 40, d, "sine", 0.4) * expdec(t(d), 5) + 0.7 * lp(noise(d), 0.12) * expdec(t(d), 7)
save("crash_thud", x)
d = 0.9; x = noise(d) * expdec(t(d), 5); g = np.zeros_like(x)
for s in rng.uniform(0, 0.35, 24):
    i = int(s * SR); k = t(0.05); g[i:i + len(k)] += np.sin(2 * np.pi * rng.uniform(2500, 6500) * k) * expdec(k, 80) * 0.4
save("glass_break", x * 0.3 + g)
d = 0.8; x = lp(noise(d), 0.08) * expdec(t(d), 3) + 0.4 * sweep(200, 60, d, "sine", 0.4) * expdec(t(d), 5)
save("dust_dogpile", x)
d = 0.6; x = sweep(900, 200, d, "sq", 0.5) * expdec(t(d), 3) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * t(d)))
save("dizzy_stars", x * 0.6)
d = 0.8; x = np.zeros(int(SR * d))
for i, f in enumerate([700, 560, 700, 560]):
    a = t(0.18); s = int(i * 0.18 * SR); x[s:s + len(a)] += sweep(f * 1.0, f * 0.8, 0.18, "tri") * expdec(a, 6)
save("pigeon_coo", x)
# game
d = 1.5; x = np.zeros(int(SR * d))
for i, f in enumerate([523, 440, 392, 262]):
    a = t(0.28 if i < 3 else 0.5); s = int(i * 0.28 * SR); x[s:s + len(a)] += sweep(f, f * (0.98 if i < 3 else 0.7), len(a) / SR, "tri") * expdec(a, 4)
save("game_over", x)
d = 0.1; x = sweep(600, 800, d, "sine") * expdec(t(d), 30)
save("ui_click", x)
d = 0.9; x = np.zeros(int(SR * d))
for i, f in enumerate([392, 494, 587, 784]):
    a = t(0.22); s = int(i * 0.14 * SR); x[s:s + len(a)] += sweep(f, f, 0.22, "sq") * 0.4 * expdec(a, 6) + np.sin(2 * np.pi * f * a) * expdec(a, 5)
save("run_start", x)

# ---------- music: 8-bar loop, 128 bpm, Am - F - C - G ----------
bpm = 128; beat = 60 / bpm; bars = 8; total = bars * 4 * beat
n = int(total * SR); m = np.zeros(n)
def add(sig, start):
    i = int(start * SR); j = min(n, i + len(sig))
    m[i:j] += sig[:j - i]
def midi(p): return 440 * 2 ** ((p - 69) / 12)
prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55]), (55, [55, 59, 62])]
for bar in range(bars):
    root, chord = prog[bar % 4]
    for b in range(8):  # eighth-note bass + arp
        st = bar * 4 * beat + b * beat / 2
        f = midi(root - 12 + (12 if b % 4 == 3 else 0)); d = beat / 2
        add(np.sin(2 * np.pi * f * t(d)) * expdec(t(d), 7) * 0.5, st)
        p = chord[b % 3] + 12 + (12 if b % 8 == 6 else 0); d2 = beat / 2
        add(sweep(midi(p), midi(p), d2, "tri") * expdec(t(d2), 9) * 0.28, st)
    for b in range(4):  # kick + hat + clap
        st = bar * 4 * beat + b * beat
        d = 0.2; add(sweep(130, 45, d, "sine", 0.3) * expdec(t(d), 14) * 0.9, st)
        d = 0.04; add(noise(d) * expdec(t(d), 80) * 0.18, st + beat / 2)
        if b % 2 == 1: d = 0.12; add(lp(noise(d), 0.5) * expdec(t(d), 30) * 0.35, st)
    if bar % 2 == 1:  # melody pickup
        mel = [69, 72, 76, 72]
        for k, p in enumerate(mel):
            st = bar * 4 * beat + 2 * beat + k * beat / 2; d = beat / 2
            add(sweep(midi(p + 12), midi(p + 12), d, "sq") * 0.12 * expdec(t(d), 6), st)
fade = int(0.01 * SR); m[:fade] *= np.linspace(0, 1, fade); m[-fade:] *= np.linspace(1, 0, fade)
save("run_loop", m, "music", 0.6)
print("done")
