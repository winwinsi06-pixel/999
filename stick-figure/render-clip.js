// Renders pirate-clip.html frame by frame.
// node render-clip.js frames out.mp4          -> full 30 fps video (silent)
// node render-clip.js stills dir t1 t2 ...    -> PNG stills at given seconds
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
(async () => {
  const [mode, out, ...ts] = process.argv.slice(2);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 400, height: 700 } });
  pg.on('pageerror', e => console.error('pageerror', e.message));
  await pg.goto('file://' + (process.env.CLIP_HTML ? path.resolve(process.env.CLIP_HTML) : path.resolve(__dirname, 'pirate-clip.html')) + '?render');
  await pg.evaluate(() => window.ready);
  const grab = t => pg.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/jpeg', .93).split(',')[1]; }, t);
  if (mode === 'stills') {
    fs.mkdirSync(out, { recursive: true });
    for (const t of ts) fs.writeFileSync(path.join(out, `t${t}.jpg`), Buffer.from(await grab(+t), 'base64'));
  } else {
    const fps = 30, dur = await pg.evaluate(() => window.DUR);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < dur * fps; i++) {
      const buf = Buffer.from(await grab(i / fps), 'base64');
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log('frame', i);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
