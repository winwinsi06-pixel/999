# Synthesizes the clip's soundtrack: a light plucked sea-shanty loop plus cartoon sound effects.
import numpy as np, wave, sys
SR = 44100; DUR = 42.0
out = np.zeros(int(SR * DUR))
rng = np.random.default_rng(7)
def add(sig, t, gain=1.0):
    i = int(t * SR); n = min(len(sig), len(out) - i)
    if n > 0: out[i:i + n] += sig[:n] * gain
def env(n, a=0.005, r=None):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    if r: nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr)
    return e
def pluck(freq, dur=0.5):  # Karplus-Strong string
    n = int(dur * SR); p = int(SR / freq); buf = rng.uniform(-1, 1, p); y = np.zeros(n)
    for i in range(n):
        y[i] = buf[i % p]; buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return y * env(n, 0.002, 0.05)
def tone(f0, f1, dur, kind='sine'):
    n = int(dur * SR); f = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(ph) if kind == 'sine' else np.sign(np.sin(ph)) * .5
    return w
# --- music: D minor shanty, 120 bpm, mutes during the awkward silence ---
note = lambda m: 440 * 2 ** ((m - 69) / 12)
mel = [62, 65, 69, 65, 67, 64, 62, 64, 65, 69, 72, 69, 67, 64, 69, None]
bass = [50, 50, 48, 48, 46, 46, 45, 45]
beat = 0.5; cache = {}
def pl(m, d):
    if (m, d) not in cache: cache[(m, d)] = pluck(note(m), d)
    return cache[(m, d)]
t = 0.0; k = 0
while t < DUR - 1.0:
    if not (27.3 <= t < 30.0):
        m = mel[k % len(mel)]
        if m: add(pl(m, .45), t, .16)
        if k % 2 == 0: add(pl(bass[(k // 2) % len(bass)], .9), t, .2)
    t += beat; k += 1
# --- effects ---
def pop(t): add(tone(500, 1300, .09) * env(int(.09 * SR), .002, .06), t, .35)
def bonk(t):
    n = int(.35 * SR); s = tone(180, 70, .35) * np.exp(-np.linspace(0, 9, n)); s += rng.uniform(-1, 1, n) * np.exp(-np.linspace(0, 40, n)) * .6
    add(s, t, .8)
def ding(t):
    n = int(1.4 * SR); tt = np.arange(n) / SR; s = (np.sin(2 * np.pi * 1568 * tt) + .5 * np.sin(2 * np.pi * 2349 * tt)) * np.exp(-tt * 3)
    add(s, t, .35)
def swish(t):
    n = int(.3 * SR); s = rng.uniform(-1, 1, n); s = np.convolve(s, np.ones(8) / 8, 'same') * np.sin(np.linspace(0, np.pi, n)) ** 2
    add(s, t, .5)
def slide(t0, t1): d = t1 - t0; n = int(d * SR); add(tone(1400, 300, d) * env(n, .01, .05), t0, .3)
def scream(t, base=700):
    d = .9; n = int(d * SR); tt = np.arange(n) / SR; f = base + 160 * np.sin(2 * np.pi * 9 * tt) - 150 * tt
    s = tone(0, 0, d) * 0; s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .35 * env(n, .01, .2)
    add(s, t, .3)
def boing(t):
    d = .7; n = int(d * SR); tt = np.arange(n) / SR; f = 220 + 120 * np.sin(2 * np.pi * 7 * tt) * np.exp(-tt * 4)
    add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.5), t, .55)
def thud(t):
    n = int(.4 * SR); tt = np.arange(n) / SR; add(np.sin(2 * np.pi * 60 * tt) * np.exp(-tt * 12) + rng.uniform(-1, 1, n) * np.exp(-tt * 50) * .5, t, .9)
def tick(t): n = int(.03 * SR); add(rng.uniform(-1, 1, n) * np.exp(-np.linspace(0, 8, n)), t, .15)
def cricket(t):
    for i in range(3):
        n = int(.05 * SR); tt = np.arange(n) / SR; add(np.sin(2 * np.pi * 4300 * tt) * np.sin(np.pi * tt / .05) ** 2, t + i * .07, .12)
def step(t): n = int(.06 * SR); add(rng.uniform(-1, 1, n) * np.exp(-np.linspace(0, 10, n)), t, .12)

for x in [0.8, 1.2, 1.6, 5.0, 6.2, 9.85, 21.2, 27.7, 31.3, 38.0]: pop(x)
for x in np.arange(4.0, 5.0, .26): step(x)
for x in np.arange(9.0, 9.8, .26): step(x)
slide(9.8, 10.5)
for x in [12.0, 13.2, 14.4]: bonk(x)
for x in np.arange(12.4, 16.0, .5): tick(x)
ding(16.3)
swish(18.0); swish(24.6)
scream(19.4, 760); scream(25.4, 600); scream(25.7, 820)
for x in [28.2, 28.9, 29.5]: cricket(x)
thud(30.55)
boing(35.0)
ding(35.8)
# master
out /= max(1.0, np.abs(out).max() / 0.9)
fade = int(1.0 * SR); out[-fade:] *= np.linspace(1, 0, fade)
pcm = (out * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
