# Soundtrack for phone-clip.html: light plucked arpeggio plus whooshes, clicks and pops on the clip's timeline.
import numpy as np, wave, sys
SR = 44100; DUR = 45.0
out = np.zeros(int(SR * DUR)); rng = np.random.default_rng(3)
def add(sig, t, gain=1.0):
    i = int(t * SR); n = min(len(sig), len(out) - i)
    if n > 0: out[i:i + n] += sig[:n] * gain
def pluck(freq, dur=0.4):
    n = int(dur * SR); p = int(SR / freq); buf = rng.uniform(-1, 1, p); y = np.zeros(n)
    for i in range(n):
        y[i] = buf[i % p]; buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.995
    r = int(.04 * SR); y[-r:] *= np.linspace(1, 0, r); return y
note = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]
cache = {}
def pl(m, d):
    if (m, d) not in cache: cache[(m, d)] = pluck(note(m), d)
    return cache[(m, d)]
step = 0.25; t = 0.0; k = 0
while t < DUR - 1.2:
    ch = chords[(k // 16) % 4]; pat = [0, 2, 1, 3, 2, 1, 3, 2]
    add(pl(ch[pat[k % 8]] + 12, .35), t, .09)
    if k % 8 == 0: add(pl(ch[0] - 12, 1.6), t, .2)
    t += step; k += 1
def whoosh(t, d=1.0, rev=False):
    n = int(d * SR); s = rng.uniform(-1, 1, n)
    for w in (4, 8, 16): s = np.convolve(s, np.ones(w) / w, 'same')
    e = np.sin(np.linspace(0, np.pi, n)) ** 2; add(s * e * 3.0, t, .6)
def click(t):
    n = int(.05 * SR); tt = np.arange(n) / SR; add(np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 90), t, .35)
def pop(t, f=900):
    n = int(.08 * SR); tt = np.arange(n) / SR; f2 = np.linspace(f, f * 1.8, n)
    add(np.sin(2 * np.pi * np.cumsum(f2) / SR) * np.exp(-tt * 45), t, .25)
def ding(t, f=1318.5):
    n = int(1.2 * SR); tt = np.arange(n) / SR; add((np.sin(2 * np.pi * f * tt) + .4 * np.sin(2 * np.pi * f * 2 * tt)) * np.exp(-tt * 3.5), t, .3)
whoosh(3.0, 2.0); whoosh(40.2, 1.8)
for i in range(10):
    t0 = 6.0 + i * 3.4; click(t0)
    nparts = [1, 3, 3, 5, 6, 2, 4, 4, 2, 2][i]
    for j in range(nparts): pop(t0 + .45 + j * .2, 800 + j * 90)
ding(42.1, 1046.5); ding(42.4, 1318.5)
out /= max(1.0, np.abs(out).max() / 0.9)
f = int(1.0 * SR); out[-f:] *= np.linspace(1, 0, f)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
