# Generates the Thai voiceover lines with edge-tts and works out the clip timeline from their lengths.
# Usage: python3 build-voice.py <voice-dir>   -> writes phone-clip-timeline.js and <voice-dir>/timeline.json
import json, os, subprocess, sys, time
VOICE = os.environ.get('TTS_VOICE', 'th-TH-PremwadeeNeural'); RATE = os.environ.get('TTS_RATE', '+8%')
here = os.path.dirname(os.path.abspath(__file__)); out = sys.argv[1]; os.makedirs(out, exist_ok=True)
lines = json.load(open(os.path.join(here, 'narration.json'), encoding='utf-8'))
def dur(p):
    try: return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', p]))
    except Exception: return 0.0
segs = []
for i, ln in enumerate(lines):
    wav = os.path.join(out, f'line{i:02d}.wav'); mp3 = wav[:-4] + '.mp3'
    tries = 0
    while not os.path.exists(wav) and tries < 15:
        tries += 1
        if tries > 1: time.sleep(2)
        cmd = ['edge-tts', '--voice', VOICE, f'--rate={RATE}', '--text', ln['say'], '--write-media', mp3]
        if os.environ.get('HTTPS_PROXY'): cmd += ['--proxy', os.environ['HTTPS_PROXY']]
        subprocess.run(cmd, check=False, capture_output=True)
        # keep it only if it decodes cleanly; trim the silence edge-tts leaves at both ends
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-af',
            'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
            '-ar', '44100', '-ac', '1', wav], capture_output=True)
        if r.returncode or dur(wav) < 0.8:
            if os.path.exists(wav): os.remove(wav)
    if not os.path.exists(wav): sys.exit(f'voice line {i} failed')
    mp3 = wav
    segs.append({'cap': ln['cap'], 'file': mp3, 'vdur': round(dur(mp3), 3)})
# timeline
t = 0.0
intro = segs[0]; intro['voice'] = 0.4; intro['start'] = 0.0; intro['end'] = max(6.0, 0.4 + intro['vdur'] + 0.6)
explode = [intro['end'] - 3.0, intro['end'] - 0.8]
t = intro['end']; layers = []
for s in segs[1:11]:
    s['start'] = t; s['voice'] = t + 0.3; s['end'] = t + max(3.4, 0.3 + s['vdur'] + 0.5); t = s['end']; layers.append(s)
outro = segs[11]; close = [t, t + 1.8]; outro['start'] = t; outro['voice'] = t + 0.2
outro['end'] = max(t + 5.0, outro['voice'] + outro['vdur'] + 1.2)
tl = {'dur': round(outro['end'], 2), 'explode': explode, 'close': close, 'segments': segs}
json.dump(tl, open(os.path.join(out, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
web = {k: v for k, v in tl.items() if k != 'segments'}
web['segments'] = [{k: s[k] for k in ('cap', 'start', 'end', 'voice', 'vdur')} for s in segs]
open(os.path.join(here, 'phone-clip-timeline.js'), 'w', encoding='utf-8').write('window.TL = ' + json.dumps(web, ensure_ascii=False) + ';\n')
print('duration', tl['dur'], 'layers', [round(s['end'] - s['start'], 2) for s in layers])
