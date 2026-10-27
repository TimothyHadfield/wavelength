// Four phones, one online room, against the real free Firebase project (th-board-games):
//   node test/ui.online.mjs <baseUrl> [outDir]
// Host makes a room, three friends join by code (2 per team), and all four tap the real buttons
// (Submit Clue, Lock In Guess, a side + Submit, Next Turn) until someone reaches 8 points.
// Fails on console/page errors, the target showing on a phone that isn't the Hinter's before the
// reveal, phones disagreeing on the final score, or no finish. Not part of `npm test` (needs internet).
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const pw = require(path.join(os.homedir(), '.claude/tools/node_modules/playwright'));
const base = process.argv[2] || 'http://127.0.0.1:18500/';
const out = process.argv[3] || '.';
const errors = [];
const browser = await pw.webkit.launch({ headless: true });
async function open(tag) {
  const ctx = await browser.newContext({ ...pw.devices['iPhone 15'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(tag + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(tag + ' console: ' + m.text()); });
  page.on('requestfailed', (r) => { const u = r.url(); if (!/firestore\.googleapis\.com.*(Listen|Write)\/channel/.test(u)) errors.push(tag + ' failed: ' + u); });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.WLNet, null, { timeout: 30000 });
  return page;
}
const names = ['Tim', 'Sam', 'Ana', 'Joe'];
const phones = [];
for (const n of names) phones.push(await open(n));
const [host] = phones;
const t0 = Date.now();
try {
  await host.selectOption('#targetScoreSelect', '8');
  await host.click('#onlineBtn');
  await host.fill('#netName', names[0]);
  await host.click('#netCreate');
  await host.waitForSelector('.net-code', { timeout: 30000 });
  const code = (await host.textContent('.net-code')).trim();
  console.log('room', code);
  for (let k = 1; k < 4; k++) {
    const p = phones[k];
    await p.click('#onlineBtn');
    await p.fill('#netName', names[k]);
    await p.fill('#netCode', code.toLowerCase());
    await p.click('#netJoin');
    await p.waitForSelector('.net-code', { timeout: 30000 });
  }
  await host.waitForSelector('#netStart:not([disabled])', { timeout: 30000 });
  await host.screenshot({ path: path.join(out, 'online-lobby-host.png') });
  await phones[3].screenshot({ path: path.join(out, 'online-lobby-friend.png') });
  await host.click('#netStart');
  // every phone: a timer taps whatever button its screen shows, and checks the target stays secret
  const driver = (isHost) => {
    window.__drv = { clues: 0, guesses: 0, counters: 0, nexts: 0, leaks: 0, over: false, last: 0 };
    const vis = (id) => { const e = document.getElementById(id); return e && e.offsetParent !== null && !e.disabled; };
    setInterval(() => {
      const s = window.WLNet.snap, d = window.__drv;
      if (!s || !s.pub) return;
      const p = s.pub, hinter = s.mySeat === p.hinter;
      if (p.phase !== 'reveal' && p.phase !== 'over') {
        if ('targetAngle' in p) d.leaks++;
        if (!hinter && s.mine && s.mine.target != null) d.leaks++;
      }
      if (p.phase === 'over' || s.status === 'finished') { d.over = true; return; }
      if (Date.now() - d.last < 1200) return;            // one tap, then let the room catch up
      if (vis('submitClueBtn') && p.phase === 'clue') { document.getElementById('clueInput').value = 'clue ' + p.round; document.getElementById('submitClueBtn').click(); d.clues++; d.last = Date.now(); }
      else if (vis('lockGuessBtn') && window.WLNet.canMove() && Math.random() < 0.5) { document.getElementById('lockGuessBtn').click(); d.guesses++; d.last = Date.now(); }
      else if (p.phase === 'counter' && document.getElementById('counterPanel').offsetParent !== null) {
        counterSelectedSide = Math.random() < 0.5 ? 'LEFT' : 'RIGHT';   // what a tap on one side of the dial sets
        document.getElementById('counterSubmitBtn').click(); d.counters++; d.last = Date.now();
      } else if (isHost && vis('nextRoundBtn') && p.phase === 'reveal') { document.getElementById('nextRoundBtn').click(); d.nexts++; d.last = Date.now(); }
    }, 300);
  };
  for (let k = 0; k < 4; k++) await phones[k].evaluate(driver, k === 0);
  const shots = { clue: false, guess: false, counter: false, reveal: false };
  while (Date.now() - t0 < 15 * 60000) {
    await host.waitForTimeout(1000);
    const st = await Promise.all(phones.map((p) => p.evaluate(() => ({ d: window.__drv, phase: window.WLNet.snap && window.WLNet.snap.pub && window.WLNet.snap.pub.phase, hinter: window.WLNet.snap && window.WLNet.snap.pub && window.WLNet.snap.pub.hinter === window.WLNet.snap.mySeat }))));
    const ph = st[0].phase;
    if (ph && ph in shots && !shots[ph]) {
      shots[ph] = true;
      const who = ph === 'clue' ? st.findIndex((x) => x.hinter) : ph === 'guess' ? st.findIndex((x) => !x.hinter) : 0;
      await phones[Math.max(0, who)].screenshot({ path: path.join(out, `online-${ph}.png`) });
      if (ph === 'clue') await phones[st.findIndex((x) => !x.hinter)].screenshot({ path: path.join(out, 'online-clue-wait.png') });
    }
    if (st.every((x) => x.d.over)) break;
  }
  const fin = await Promise.all(phones.map((p) => p.evaluate(() => ({ d: window.__drv, scores: JSON.stringify(window.WLNet.snap.pub.teams.map((t) => t.score)), shown: document.getElementById('gameOverScreen') ? document.getElementById('gameOverScreen').classList.contains('active') : null }))));
  fin.forEach((f, k) => { if (f.d.leaks) errors.push(names[k] + ' saw the target before the reveal ' + f.d.leaks + ' times'); });
  if (!fin.every((f) => f.d.over)) errors.push('game did not finish on all four phones');
  if (new Set(fin.map((f) => f.scores)).size !== 1) errors.push('final scores differ: ' + fin.map((f) => f.scores).join(' / '));
  await host.waitForTimeout(1500);
  await host.screenshot({ path: path.join(out, 'online-over-host.png') });
  console.log(JSON.stringify({ code, scores: fin[0].scores, taps: fin.map((f) => f.d), minutes: +((Date.now() - t0) / 60000).toFixed(1) }));
  for (const p of phones.slice(1)) await p.evaluate(() => window.WLNet.leave()).catch(() => {});
  await host.evaluate(() => window.WLNet.leave()).catch(() => {});
  await host.waitForTimeout(1500);
} catch (e) { errors.push('run: ' + String(e).slice(0, 300)); }
await browser.close();
console.log(JSON.stringify({ errors }, null, 1));
if (errors.length) process.exit(1);
