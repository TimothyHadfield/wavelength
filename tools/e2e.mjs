// End-to-end check in headless WebKit at iPhone size: cards sheet, custom lists saved across a reload,
// and a full pass-and-play round driven by real taps on the dial.
//   node tools/e2e.mjs [webkit|chrome] [--shots DIR]
// Exit code 1 if any check fails. Needs Playwright (installed in ~/.claude/tools).
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

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.bin': 'application/octet-stream', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try { const body = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const results = [];
const check = (ok, what, extra = '') => { results.push(`${ok ? 'ok  ' : 'FAIL'} ${what}${extra ? '  (' + extra + ')' : ''}`); return ok; };
const shot = async (page, name) => { if (SHOTS) { await mkdir(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, name + '.png') }); } };

const browser = engine === 'chrome' ? await pw.chromium.launch({ channel: 'chrome' }) : await pw.webkit.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 659 }, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(base, { waitUntil: 'load' });

  // ---- cards
  const count = await page.textContent('#cardsBtnCount');
  check(/471|[4-9]\d\d/.test(count), 'Cards button shows 400+ cards', count);
  await page.tap('#cardsBtn');
  await page.waitForSelector('#cardsSheet.open');
  await shot(page, 'cards-sheet');
  const lists = await page.$$eval('.card-list-row', r => r.length);
  check(lists >= 10, 'sheet lists the built-in lists', `${lists}`);
  // untick the first list, make a new one with one card
  await page.click('.card-list-row input[type=checkbox]');
  await page.click('.btn-new-list');
  await page.fill('.app-dialog input', 'Our Jokes');
  await page.click('.app-dialog .btn-primary');
  const li = await page.evaluate(() => CARD_LISTS.findIndex(l => l.name === 'Our Jokes'));
  await page.fill(`#addLeft_${li}`, 'Dad Joke');
  await page.fill(`#addRight_${li}`, 'Actually <Funny>');
  await page.click(`#addLeft_${li} ~ .btn-add-card`);
  await shot(page, 'cards-custom');
  await page.reload({ waitUntil: 'load' });
  const after = await page.evaluate(() => ({
    custom: CARD_LISTS.filter(l => !l.builtin).map(l => ({ name: l.name, n: l.cards.length, c: l.cards[0] })),
    firstOff: !selectedListIndices.has(0), customOn: selectedListIndices.has(CARD_LISTS.findIndex(l => l.name === 'Our Jokes')),
  }));
  check(after.custom.length === 1 && after.custom[0].n === 1 && after.custom[0].c.right === 'Actually <Funny>', 'custom list + card survive a reload', JSON.stringify(after.custom));
  check(after.firstOff && after.customOn, 'ticks survive a reload');

  // ---- a full round by taps
  await page.tap('#startGameBtn');
  await page.waitForSelector('#psychicPrepOverlay.active');
  await shot(page, 'prep');
  await page.tap('#psychicReadyBtn');
  await page.waitForSelector('#clueEntryPanel', { state: 'visible' });
  await page.fill('#clueInput', 'Warm toast');
  await page.tap('#submitClueBtn');
  await page.waitForSelector('#guessPanel', { state: 'visible' });
  // tap the dial 30 degrees from the left end
  const tapAt = async (deg) => {
    const p = await page.evaluate((d) => {
      const r = document.getElementById('dialCanvas').getBoundingClientRect();
      const a = Math.PI * (1 + d / 180);
      return { x: r.left + dialGeo.cx + Math.cos(a) * dialGeo.radius * 0.7, y: r.top + dialGeo.cy + Math.sin(a) * dialGeo.radius * 0.7 };
    }, deg);
    await page.touchscreen.tap(p.x, p.y);
  };
  await tapAt(30);
  const g = await page.evaluate(() => gameState.round.guessAngle);
  check(Math.abs(g - 30) < 2, 'tap on the dial moves the pointer there', `${g.toFixed(1)}°`);
  await shot(page, 'guess');
  await page.tap('#lockGuessBtn');
  await page.waitForSelector('#counterPanel', { state: 'visible' });
  await tapAt(120);
  await page.waitForSelector('#counterSubmitBtn', { state: 'visible' });
  await page.tap('#counterSubmitBtn');
  await page.waitForSelector('#revealPanel', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1400);
  await shot(page, 'reveal');
  const sc = await page.evaluate(() => ({ s: gameState.teams.map(t => t.score), p: gameState.round.pointsAwarded, ph: gameState.phase }));
  check(sc.ph === 'REVEAL' && sc.p && typeof sc.p.activeTeam === 'number', 'round reaches the reveal with points', JSON.stringify(sc));
  await page.tap('#nextRoundBtn');
  await page.waitForSelector('#psychicPrepOverlay.active');
  check(true, 'next turn starts');
  check(errs.length === 0, 'no page errors', errs.join(' | '));
  await ctx.close();
} finally {
  await browser.close();
  server.close();
}
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL'));
if (failed.length) { console.log(`\n${failed.length} failed`); process.exit(1); }
console.log(`\nall ${results.length} e2e checks passed (${engine})`);
