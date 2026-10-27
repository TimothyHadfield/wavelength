// Online Wavelength through the shared kit (js/online.js = _online/online.js, unchanged):
// js/wave-online.mjs plays whole games, keeps the target secret from everyone but the Hinter
// until the reveal, scores like the one-phone game, and a local kit room plays to the end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { game, score } from '../js/wave-online.mjs';
import { createLocal } from '../js/online.js';

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const copy = (s) => JSON.parse(JSON.stringify(s));
const CARDS = Array.from({ length: 40 }, (_, i) => ({ left: 'Cold ' + i, right: 'Hot ' + i }));
const people = (n) => Array.from({ length: n }, (_, i) => ({ kind: 'human', name: 'P' + i }));
const step = (s, rng) => { const seat = game.toAct(s)[0]; return game.apply(copy(s), seat, game.bot({ pub: game.publicView(s), mine: game.privateView(s, seat), state: s }, seat, rng), rng); };

test('scoring matches the one-phone game: 4 / 3 / 2 / 0 by 4.5, 13.5, 22.5 degrees', () => {
  assert.equal(score(94.5, 94.5), 4); assert.equal(score(94.5, 90), 4); assert.equal(score(94.5, 81), 3);
  assert.equal(score(94.5, 72), 2); assert.equal(score(94.5, 71.9), 0);
});

test('whole games with 4 to 8 people: someone always to act, JSON-safe, ends at the target', () => {
  for (let g = 0; g < 30; g++) {
    const n = 4 + (g % 5), rng = mulberry(g + 1);
    let s = game.setup(n, { target: 10, cards: CARDS }, rng, people(n));
    let k = 0;
    while (!game.isOver(s)) { assert.ok(game.toAct(s).length >= 1, 'stuck in ' + s.phase); s = step(s, rng); assert.deepEqual(copy(s), s); assert.ok(++k < 3000); }
    assert.ok(s.teams.some((t) => t.score >= 10));
    assert.equal(s.winner, s.teams[1].score > s.teams[0].score ? 1 : 0);
  }
});

test('teams alternate by join order, the team going second starts on 1, empty seats (computers) sit out', () => {
  const seats = [...people(4), { kind: 'computer' }, { kind: 'computer' }];
  const s = game.setup(6, { cards: CARDS }, mulberry(4), seats);
  assert.deepEqual(s.teams.map((t) => t.players), [[0, 2], [1, 3]]);
  assert.equal(s.teams[1 - s.active].score, 1);
  assert.ok(!game.toAct(s).some((i) => i >= 4));
  assert.throws(() => game.setup(3, { cards: CARDS }, mulberry(1), people(3)), /4 people/);
});

test('who acts: the Hinter writes, teammates turn the dial, the other team calls, anyone moves on', () => {
  const rng = mulberry(7);
  let s = game.setup(6, { cards: CARDS }, rng, people(6));
  const team = s.teams[s.active], other = s.teams[1 - s.active], hinter = team.players[team.hinter];
  assert.deepEqual(game.toAct(s), [hinter]);
  assert.throws(() => game.apply(copy(s), team.players.find((p) => p !== hinter), { t: 'clue', text: 'x' }, rng), /turn/);
  s = game.apply(s, hinter, { t: 'clue', text: '  lava  ' }, rng);
  assert.equal(s.clue, 'lava');
  assert.deepEqual(game.toAct(s), team.players.filter((p) => p !== hinter));
  s = game.apply(s, game.toAct(s)[0], { t: 'guess', angle: 300 }, rng);
  assert.equal(s.guess, 180);
  assert.deepEqual(game.toAct(s), other.players);
  s = game.apply(s, other.players[0], { t: 'counter', side: 'LEFT' }, rng);
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(game.toAct(s).sort(), [0, 1, 2, 3, 4, 5]);
  const round = s.round;
  s = game.apply(s, 0, { t: 'next', round }, rng);
  assert.equal(s.round, round + 1);
  assert.throws(() => game.apply(copy(s), 1, { t: 'next', round }, rng));   // a second tap for the same round is dropped
});

test('counter point: the other team gets 1 for the right side, never on a bullseye', () => {
  const rng = mulberry(11);
  let s = game.setup(4, { cards: CARDS }, rng, people(4));
  s.targetAngle = 130.5;
  const team = s.teams[s.active], hinter = team.players[team.hinter], before = s.teams.map((t) => t.score);
  s = game.apply(s, hinter, { t: 'clue', text: 'hot' }, rng);
  s = game.apply(s, game.toAct(s)[0], { t: 'guess', angle: 90 }, rng);
  s = game.apply(s, game.toAct(s)[0], { t: 'counter', side: 'RIGHT' }, rng);
  assert.deepEqual(s.points, { activeTeam: 0, opposingTeam: 1 });
  assert.equal(s.teams[1 - s.active].score, before[1 - s.active] + 1);
});

test('secrecy: only the Hinter sees the target before the reveal; the card pool stays on the host', () => {
  const rng = mulberry(21);
  let s = game.setup(5, { cards: CARDS }, rng, people(5));
  for (let k = 0; k < 400 && !game.isOver(s); k++) {
    const pub = game.publicView(s), hinter = s.teams[s.active].players[s.teams[s.active].hinter];
    assert.ok(!('pool' in pub));
    if (s.phase === 'reveal' || s.phase === 'over') assert.equal(pub.targetAngle, s.targetAngle);
    else {
      assert.ok(!('targetAngle' in pub), 'target public in ' + s.phase);
      for (let i = 0; i < 5; i++) {
        const mine = game.privateView(s, i);
        if (i === hinter) assert.equal(mine.target, s.targetAngle); else assert.deepEqual(mine, {});
      }
    }
    s = step(s, rng);
  }
});

test('a local kit room with four people on one device plays to the end', async () => {
  const room = createLocal({ game, seats: ['human', 'human', 'human', 'human'], options: { target: 8, cards: CARDS }, names: ['A', 'B', 'C', 'D'], botDelayMs: 0 });
  let snap = null;
  room.on('change', (x) => { snap = x; });
  room.start();
  const rng = mulberry(3);
  for (let i = 0; i < 3000 && snap.status !== 'finished'; i++) {
    const seat = snap.toAct[0];
    const v = room.view(seat);
    room.act(game.bot({ pub: v.pub, mine: v.mine }, seat, rng), seat);
    await new Promise((r) => setTimeout(r, 0));
  }
  assert.equal(snap.status, 'finished');
  assert.ok(snap.pub.teams.some((t) => t.score >= 8));
});
