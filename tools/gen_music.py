"""Upbeat Lanternfall run loop: 144 bpm, C - G - Am - F, pentatonic pluck melody, bouncy bass, shaker + clap.
Usage: python3 gen_music.py <public/audio dir>"""
import numpy as np, os, subprocess, sys
import wave
SR = 44100
out = sys.argv[1]
os.makedirs(out + "/music", exist_ok=True)
rng = np.random.default_rng(11)
bpm = 144; beat = 60 / bpm; bars = 16
n = int(bars * 4 * beat * SR); m = np.zeros(n + SR)
def t(d): return np.arange(int(SR * d)) / SR
def midi(p): return 440 * 2 ** ((p - 69) / 12)
def add(sig, start, g=1.0):
    i = int(start * SR); m[i:i + len(sig)] += sig * g
def pluck(p, d, bright=1.0):
    x = t(d); f = midi(p)
    s = np.sin(2*np.pi*f*x) + 0.5*np.sin(4*np.pi*f*x)*np.exp(-x*9)*bright + 0.25*np.sin(6*np.pi*f*x)*np.exp(-x*14)*bright
    return s * np.exp(-x * 7) * np.minimum(1, x * 400)
def bass(p, d):
    x = t(d); f = midi(p)
    return (np.sin(2*np.pi*f*x) + 0.3*np.sin(4*np.pi*f*x)) * np.exp(-x * 5) * np.minimum(1, x * 300)
def kick():
    x = t(0.22); f = 45 + 100*np.exp(-x*30)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-x*14)
def clap():
    x = t(0.14); nz = rng.uniform(-1, 1, len(x))
    nz = np.convolve(nz, np.ones(3)/3, 'same'); return nz * np.exp(-x*28)
def shaker():
    x = t(0.05); return rng.uniform(-1, 1, len(x)) * np.exp(-x*70)
prog = [(48, [60, 64, 67]), (55, [59, 62, 67]), (45, [57, 60, 64]), (53, [57, 60, 65])]  # C G Am F
penta = {0: [72, 74, 76, 79, 81, 84], 1: [71, 74, 79, 76, 83, 79], 2: [72, 76, 81, 79, 84, 81], 3: [72, 77, 81, 79, 77, 74]}
motifs = [  # (eighth offset, scale-degree index)
    [(0, 2), (1, 3), (2, 4), (4, 3), (5, 2), (6, 1)],
    [(0, 4), (1, 3), (2, 2), (3, 1), (4, 2), (6, 3)],
    [(0, 2), (2, 3), (3, 4), (4, 5), (6, 4), (7, 3)],
    [(0, 5), (1, 4), (2, 3), (4, 2), (5, 3), (6, 4)],
]
for bar in range(bars):
    root, chord = prog[bar % 4]; b0 = bar * 4 * beat
    for q in range(4):
        add(kick(), b0 + q*beat, 0.9)
        if q % 2 == 1: add(clap(), b0 + q*beat, 0.5)
    for s in range(16):
        add(shaker(), b0 + s*beat/4, 0.12 if s % 2 else 0.2)
    for e in range(8):  # bouncy off-beat bass
        p = root + (12 if e in (3, 7) else 0)
        if e % 2 == 1 or e == 0: add(bass(p, beat/2), b0 + e*beat/2, 0.55)
    for e in range(8):  # chord stabs on off-beats
        if e % 2 == 1:
            for p in chord: add(pluck(p, beat/2, 0.6), b0 + e*beat/2, 0.11)
    if bar >= 2:  # melody from bar 3, higher energy in second half
        sc = penta[bar % 4]; mo = motifs[(bar // 2) % 4]
        for off, idx in mo:
            add(pluck(sc[idx] + (12 if bar >= 8 and off == 7 else 0), beat, 1.0), b0 + off*beat/2, 0.3)
        if bar >= 8:  # counter-arp
            for e in range(8): add(pluck(chord[e % 3] + 24, beat/2, 0.5), b0 + e*beat/2, 0.09)
# gentle echo for width
d = int(0.19 * SR); m[d:] += m[:-d] * 0.22
m = m[:n]
m = np.tanh(m * 1.3)
m /= np.max(np.abs(m)) / 0.6
f = int(0.01 * SR); m[:f] *= np.linspace(0, 1, f); m[-f:] *= np.linspace(1, 0, f)
wav = "/tmp/run_loop.wav"
w = wave.open(wav, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((m * 32767).astype(np.int16).tobytes()); w.close()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "4", out + "/music/run_loop.ogg"], check=True)
print("music done", round(n / SR, 1), "s")
