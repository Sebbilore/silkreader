# Leise Hintergrundmusik, selbst erzeugt (keine Lizenz nötig): python3 music.py <ausgabe.wav> [sekunden]
import sys, wave, numpy as np
sr = 44100; T = float(sys.argv[2]) if len(sys.argv) > 2 else 40.0
t = np.arange(int(sr * T)) / sr; out = np.zeros_like(t)
def note(f, start, dur, amp, kind='pluck'):
    i = int(start * sr); n = int(dur * sr); tt = np.arange(n) / sr
    env = np.exp(-tt * 3.2) if kind == 'pluck' else np.minimum(1, tt / 1.2) * np.minimum(1, (dur - tt) / 1.5)
    w = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt) * (kind == 'pluck') + 0.15 * np.sin(6 * np.pi * f * tt)
    out[i:i + n] += (amp * env * w)[:max(0, len(out) - i)]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]]  # C, Am, F, G
bar = 60 / 100 * 4  # 100 BPM
for b in range(int(T / bar) + 1):
    for m in chords[b % 4]: note(hz(m), b * bar, bar + 0.8, 0.035, 'pad')
    arp = [chords[b % 4][0] + 12, chords[b % 4][1] + 12, chords[b % 4][2] + 12, chords[b % 4][1] + 24]
    for k in range(8): note(hz(arp[[0, 1, 2, 3, 2, 1, 2, 3][k]]), b * bar + k * bar / 8, 0.9, 0.06)
out *= np.minimum(1, t / 1.5) * np.minimum(1, (T - t) / 2.5)
# einfacher Hall
d = np.zeros_like(out)
for ms, g in [(230, .35), (410, .25), (630, .15)]:
    k = int(sr * ms / 1000); d[k:] += g * out[:-k]
out = out + d; out = out / np.abs(out).max() * 0.5
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((out * 32767).astype(np.int16).tobytes())
