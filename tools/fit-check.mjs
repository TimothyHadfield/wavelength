// Fit check (2026-11-27 fit pass): in a CROWDED game (8 players a team, 20-letter names, the longest card
// wording, a 40-letter clue, two-digit scores) is everything readable and on screen at 5 sizes?
//   node tools/fit-check.mjs [webkit|chrome] [--shots DIR] [--normal]
// SITE_ROOT=<folder> checks another copy (e.g. the old build). Exit code 1 if any check fails.
// --normal uses the short default names instead (early game) for screenshots.
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

const ROOT = process.env.SITE_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'webkit';
const si = process.argv.indexOf('--shots');
const SHOTS = si > 0 ? process.argv[si + 1] : null;
const NORMAL = process.argv.includes('--normal');
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

// minR: the dial must stay big enough to aim (1 degree of arc = r * pi / 180 px)
const SIZES = [
  { id: '393x659', w: 393, h: 659, phone: true, minR: 150 },
  { id: '320x568', w: 320, h: 568, phone: true, minR: 125 },
  { id: '659x393', w: 659, h: 393, phone: true, minR: 110 },
  { id: '1280x800', w: 1280, h: 800, minR: 240 },
  { id: '1440x900', w: 1440, h: 900, minR: 280 },
];
const CROWD = NORMAL ? null : {
  t1: 'The Magnificent Ones', t2: 'Absolutely Not Losing',
  p1: ['Bartholomew Jenkins', 'Maximilian Ortega', 'Christopher Nguyen', 'Alexandria Fischer', 'Jonathan Whitaker', 'Penelope Hargrove', 'Sebastian Moreau', 'Gwendolyn Patterson'],
  p2: ['Evangeline Castillo', 'Theodore Lancaster', 'Anastasia Petrova', 'Montgomery Fields', 'Frederick Ashworth', 'Josephine Calloway', 'Nathaniel Brooks', 'Isabella Rodriguez'],
  card: { left: 'Superpower Side Effect: Mild', right: 'Superpower Side Effect: Terrible' },
  clue: 'Accidentally turning everything to jelly',
};
const PHASES = ['menu', 'PSYCHIC_PREP', 'CLUE_ENTRY', 'GUESS_PHASE', 'COUNTER_GUESS', 'REVEAL', 'GAME_OVER'];

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
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForTimeout(300);
    if (CROWD) {
      await page.evaluate((c) => {
        document.getElementById('team1NameInput').value = c.t1;
        document.getElementById('team2NameInput').value = c.t2;
        for (const [id, names] of [['team1Players', c.p1], ['team2Players', c.p2]]) {
          while (document.querySelectorAll(`#${id} .player-row`).length < names.length) addPlayer(id);
          document.querySelectorAll(`#${id} .player-row input`).forEach((inp, i) => { inp.value = names[i] || ''; });
        }
        document.getElementById('targetScoreSelect').value = '20';
      }, CROWD);
    } else {
      await page.evaluate(() => {
        for (const [id, names] of [['team1Players', ['Tim', 'Sam']], ['team2Players', ['Ana', 'Ben']]])
          document.querySelectorAll(`#${id} .player-row input`).forEach((inp, i) => { inp.value = names[i] || ''; });
      });
    }
    await page.waitForTimeout(150);
    for (const ph of PHASES) {
      if (ph !== 'menu') {
        await page.evaluate(({ go, c }) => {
          if (gameState.phase === 'MENU') {
            startGame();
            if (c) {
              gameState.teams[0].score = 18; gameState.teams[1].score = 19; gameState.roundNumber = 23;
              gameState.round.spectrumCard = { ...c.card };
            }
            gameState.round.clue = c ? c.clue : 'Lukewarm bathwater';
          }
          if (go === 'GUESS_PHASE') { setPhase('CLUE_ENTRY'); document.getElementById('clueInput').value = gameState.round.clue; }
          if (go === 'REVEAL') gameState.round.counterGuess = 'LEFT';
          if (go === 'GAME_OVER' && c) { gameState.teams[0].score = 20; gameState.teams[1].score = 19; }
          updateScoreboard(); updateSpectrumLabels();
          setPhase(go);
          if (go === 'GUESS_PHASE') setGuess && setGuess(70);
          if (go === 'COUNTER_GUESS') { counterHoverSide = 'LEFT'; renderDial(); }
        }, { go: ph, c: CROWD });
        await page.waitForTimeout(ph === 'REVEAL' ? 1800 : 450);
      }
      const m = await page.evaluate((ph) => {
        const vw = innerWidth, vh = innerHeight;
        const vis = el => { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
        const R = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
        const scr = document.querySelector('.screen.active');
        const out = { vw, vh, hOverflow: document.documentElement.scrollWidth - vw, scrolls: scr ? scr.scrollHeight - scr.clientHeight : 0, issues: [] };
        const iss = s => out.issues.push(s);
        // key text: on screen, not clipped, >= 12px
        const keys = {
          menu: ['#team1NameInput', '#team2NameInput', '#startGameBtn', '#targetScoreSelect', '#cardsBtn'],
          PSYCHIC_PREP: ['#psychicPrepTitle', '#psychicPrepHinter', '#psychicPrepDesc', '#psychicReadyBtn'],
          CLUE_ENTRY: ['#team1ScoreDisplay', '#team2ScoreDisplay', '#roundInfo', '#clueEntryTitle', '#spectrumReminder', '#clueInput', '#submitClueBtn', '#spectrumLeft', '#spectrumRight'],
          GUESS_PHASE: ['#team1ScoreDisplay', '#team2ScoreDisplay', '#roundInfo', '#clueBar', '#guessInstruction', '#lockGuessBtn', '#nudgeLeft', '#nudgeRight', '#spectrumLeft', '#spectrumRight'],
          COUNTER_GUESS: ['#team1ScoreDisplay', '#team2ScoreDisplay', '#roundInfo', '#clueBar', '#counterTitle', '#spectrumLeft', '#spectrumRight'],
          REVEAL: ['#team1ScoreDisplay', '#team2ScoreDisplay', '#roundInfo', '#clueBar', '#revealScoreCard', '#nextRoundBtn', '#spectrumLeft', '#spectrumRight'],
          GAME_OVER: ['#winnerTitle', '#finalScores', '#gameOverScreen .btn-primary'],
        }[ph];
        for (const sel of keys) {
          const el = document.querySelector(sel);
          if (!vis(el)) { iss(`${sel} not visible`); continue; }
          const r = R(el);
          if (r.l < -0.5 || r.t < -0.5 || r.r > vw + 0.5 || r.b > vh + 0.5) iss(`${sel} off screen (${Math.round(r.l)},${Math.round(r.t)}..${Math.round(r.r)},${Math.round(r.b)})`);
          const fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 12) iss(`${sel} font ${fs}px < 12`);
          if (el.tagName !== 'INPUT' && el.tagName !== 'SELECT' && (el.scrollWidth > el.clientWidth + 1)) iss(`${sel} text cut sideways (${el.scrollWidth} > ${el.clientWidth})`);
        }
        // menu: the corner buttons must not sit on the title
        if (ph === 'menu') {
          const t = R(document.querySelector('.menu-title'));
          for (const b of document.querySelectorAll('#menuScreen .corner-btns > *')) {
            const r = R(b);
            if (r.l < t.r && r.r > t.l && r.t < t.b - 2 && r.b > t.t + 2) iss(`${b.id || b.className} covers the title`);
          }
        }
        // the spectrum words must fit inside the card halves (overflow:hidden would cut them)
        if (ph !== 'menu' && ph !== 'GAME_OVER' && ph !== 'PSYCHIC_PREP') {
          for (const half of document.querySelectorAll('.spec-half')) {
            const span = half.querySelector('span:not(.spec-arrow)');
            const hr = R(half), sr = R(span);
            if (sr.t < hr.t - 0.5 || sr.b > hr.b + 0.5 || sr.l < hr.l - 0.5 || sr.r > hr.r + 0.5) iss(`spectrum word "${span.textContent}" cut by its card (${Math.round(sr.h)}px tall in ${Math.round(hr.h)}px)`);
            const lines = Math.round(sr.h / parseFloat(getComputedStyle(span).lineHeight || 16));
            // a word broken mid-word = more lines than words would need
            if (span.textContent.split(/\s+/).some(w => { const t = document.createElement('span'); t.textContent = w; t.style.cssText = 'position:absolute;white-space:nowrap;visibility:hidden'; half.appendChild(t); const ww = t.getBoundingClientRect().width; t.remove(); return ww > hr.w - 24 - 20; })) iss(`spectrum word "${span.textContent}" breaks mid-word`);
          }
          // scoreboard: the three parts must not overlap each other
          const a = R(document.getElementById('team1ScoreDisplay')), mid = R(document.getElementById('roundInfo')), b = R(document.getElementById('team2ScoreDisplay'));
          if (a.r > mid.l + 0.5 || mid.r > b.l + 0.5) iss(`scoreboard parts overlap (${Math.round(a.r)} > ${Math.round(mid.l)} or ${Math.round(mid.r)} > ${Math.round(b.l)})`);
          const sb = R(document.getElementById('scoreboard'));
          if (sb.h > (vh < 450 ? 56 : 80)) iss(`scoreboard ${Math.round(sb.h)}px tall`);
          // the clue: whole and on screen
          const cb = document.querySelector('#clueBar .clue-text');
          if (vis(cb)) { const cr = R(cb); if (cr.r > vw + 0.5 || cr.l < -0.5) iss('clue cut off'); }
          out.r = Math.round(dialGeo.radius);
          const cont = document.getElementById('dialContainer').getBoundingClientRect();
          const spec = R(document.getElementById('specCard'));
          out.specBottom = Math.round(spec.b); out.specTop = Math.round(spec.t);
          if (spec.b > vh + 0.5 || spec.b > cont.bottom + 0.5) iss(`spectrum card cut at the bottom (${Math.round(spec.b)} > ${Math.round(Math.min(vh, cont.bottom))})`);
          if (spec.t < cont.top + dialGeo.cy - 0.5) iss('spectrum card covers the dial');
        }
        // tap targets in the active screen >= 36px
        for (const btn of (scr ? scr.querySelectorAll('button, select, input') : [])) {
          if (!vis(btn)) continue;
          if (ph === 'menu' && btn.closest('.player-list')) {
            // inside its own scroll box: only the ones in view count
            const lr = btn.closest('.player-list').getBoundingClientRect(), br = btn.getBoundingClientRect();
            if (br.bottom < lr.top || br.top > lr.bottom) continue;
          }
          const r = R(btn);
          if (Math.min(r.w, r.h) < 35.5) iss(`tap target ${btn.id || btn.className || btn.tagName} ${Math.round(r.w)}x${Math.round(r.h)}`);
        }
        return out;
      }, ph);
      const tag = `${sz.id} ${ph}`;
      let ok = true;
      ok = check(m.hOverflow <= 0, `${tag}: horizontal overflow ${m.hOverflow}px`) && ok;
      ok = check(m.scrolls <= 1, `${tag}: screen scrolls ${m.scrolls}px`) && ok;
      for (const s of m.issues) ok = check(false, `${tag}: ${s}`) && ok;
      // the reveal is only looked at (the score card sits above it): 90% of the aiming size is enough
      const minR = ph === 'REVEAL' ? Math.round(sz.minR * 0.9) : sz.minR;
      if (m.r !== undefined) ok = check(m.r >= minR, `${tag}: dial radius ${m.r} < ${minR}`) && ok;
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `${NORMAL ? 'normal' : 'crowded'}-${sz.id}-${ph}.png`) });
      lines.push(`${ok ? 'ok  ' : 'FAIL'} ${tag}${m.r !== undefined ? `  r=${m.r}` : ''}`);
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
console.log(`\nall ${lines.length} fit checks passed (${engine}${NORMAL ? ', normal' : ', crowded'})`);
