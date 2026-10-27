// Layout check: is the main thing visible without scrolling at phone, phone-on-its-side and laptop sizes?
// Serves this folder, opens the menu and every game phase, and measures.
//   node tools/layout-check.mjs [webkit|chrome] [--shots DIR]
// SITE_ROOT=<folder> checks another copy (e.g. the old build). Exit code 1 if any check fails.
// Needs Playwright (installed in ~/.claude/tools).
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

const ROOT = process.env.SITE_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'webkit';
const si = process.argv.indexOf('--shots');
const SHOTS = si > 0 ? process.argv[si + 1] : null;
let pw;
try { pw = (await import(pathToFileURL(join(homedir(), '.claude/tools/node_modules/playwright/index.mjs')).href)).default; }
catch { console.log('Playwright not found in ~/.claude/tools: skipped'); process.exit(0); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const SIZES = [
  { id: '393x659', w: 393, h: 659, phone: true, minR: 130 },
  { id: '320x568', w: 320, h: 568, phone: true, minR: 110 },
  { id: '659x393', w: 659, h: 393, phone: true, minR: 90 },
  { id: '1280x800', w: 1280, h: 800, minR: 220 },
  { id: '1440x900', w: 1440, h: 900, minR: 250 },
];
// Each phase: how to reach it and which button must be fully on screen.
const PHASES = [
  { id: 'menu', go: null, btn: '#startGameBtn, #menuScreen .btn-primary' },
  { id: 'prep', go: 'PSYCHIC_PREP', btn: '#psychicReadyBtn' },
  { id: 'clue', go: 'CLUE_ENTRY', btn: '#submitClueBtn' },
  { id: 'guess', go: 'GUESS_PHASE', btn: '#lockGuessBtn' },
  { id: 'counter', go: 'COUNTER_GUESS', btn: null },
  { id: 'reveal', go: 'REVEAL', btn: '#nextRoundBtn' },
];

const fails = [], lines = [];
const check = (ok, what) => { if (!ok) fails.push(what); return ok; };
const browser = engine === 'chrome' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw.webkit.launch();
if (SHOTS) await mkdir(SHOTS, { recursive: true });
try {
  for (const sz of SIZES) {
    const opts = { viewport: { width: sz.w, height: sz.h } };
    if (sz.phone) Object.assign(opts, { hasTouch: true, isMobile: engine !== 'webkit' ? true : undefined, deviceScaleFactor: 2 });
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    for (const ph of PHASES) {
      if (ph.go) {
        await page.evaluate((go) => {
          if (gameState.phase === 'MENU') startGame();
          if (go === 'COUNTER_GUESS' || go === 'REVEAL') { gameState.round.clue = 'Lukewarm bathwater'; setPhase('GUESS_PHASE'); }
          if (go === 'REVEAL') { setPhase('COUNTER_GUESS'); gameState.round.counterGuess = 'LEFT'; }
          if (go === 'GUESS_PHASE') gameState.round.clue = 'Lukewarm bathwater';
          setPhase(go);
        }, ph.go);
        await page.waitForTimeout(ph.go === 'REVEAL' ? 1600 : 400);
      }
      const m = await page.evaluate((sel) => {
        const vw = innerWidth, vh = innerHeight;
        const scr = document.querySelector('.screen.active');
        const b = sel ? document.querySelector(sel) : null;
        const br = b && b.getBoundingClientRect();
        const cont = document.getElementById('dialContainer').getBoundingClientRect();
        return {
          vw, vh,
          hOverflow: document.documentElement.scrollWidth - vw,
          scrolls: scr ? scr.scrollHeight - scr.clientHeight : 0,
          btn: br ? { top: Math.round(br.top), bottom: Math.round(br.bottom), w: Math.round(br.width) } : null,
          r: Math.round(dialGeo.radius),
          dialBottom: Math.round(cont.top + dialGeo.cy),
          dialTop: Math.round(cont.top + dialGeo.cy - dialGeo.radius),
          // the device's rim around the face must not be cut off by the canvas edge
          rimTop: Math.round(dialGeo.cy - dialGeo.radius - Math.max(6, dialGeo.radius * 0.045)),
        };
      }, ph.btn);
      const tag = `${sz.id} ${ph.id}`;
      let ok = true;
      ok = check(m.hOverflow <= 0, `${tag}: horizontal overflow ${m.hOverflow}px`) && ok;
      ok = check(m.scrolls <= 1, `${tag}: screen scrolls ${m.scrolls}px`) && ok;
      if (ph.btn) ok = check(m.btn && m.btn.w > 0 && m.btn.top >= 0 && m.btn.bottom <= m.vh, `${tag}: button ${ph.btn} not fully on screen (${JSON.stringify(m.btn)}, vh ${m.vh})`) && ok;
      if (ph.id !== 'menu' && ph.id !== 'prep') {
        ok = check(m.r >= sz.minR, `${tag}: dial radius ${m.r} < ${sz.minR}`) && ok;
        ok = check(m.rimTop >= 0, `${tag}: top of the dial rim cut off by ${-m.rimTop}px`) && ok;
        ok = check(m.dialBottom <= m.vh && m.dialTop >= 0, `${tag}: dial off screen (${m.dialTop}..${m.dialBottom}, vh ${m.vh})`) && ok;
      }
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `${sz.id}-${ph.id}.png`) });
      lines.push(`${ok ? 'ok  ' : 'FAIL'} ${tag}  r=${m.r} btn=${m.btn ? m.btn.top + '..' + m.btn.bottom : '-'} scroll=${m.scrolls}`);
    }
    check(errs.length === 0, `${sz.id}: page errors ${errs.join(' | ')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(lines.join('\n'));
if (fails.length) { console.log(`\n${fails.length} failed:\n- ` + fails.join('\n- ')); process.exit(1); }
console.log(`\nall ${lines.length} layout checks passed (${engine})`);
