// Co-op mode rules (js/coop-wl.js) and how a co-op game lands in My stats (js/profile-wl.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
await import('../js/coop-wl.js');
await import('../js/profile.js');
await import('../js/profile-wl.js');
const { WL_COOP, Profile, WL_PROFILE } = globalThis;

test('co-op deck starts at 7 cards; a bullseye scores 3 and adds a card, other bands score as usual', () => {
  assert.equal(WL_COOP.CARDS, 7);
  assert.deepEqual(WL_COOP.points(4), { points: 3, extraCard: true });
  assert.deepEqual(WL_COOP.points(3), { points: 3, extraCard: false });
  assert.deepEqual(WL_COOP.points(2), { points: 2, extraCard: false });
  assert.deepEqual(WL_COOP.points(0), { points: 0, extraCard: false });
});

test('rating table bands match the rulebook: 0-3, 4-6, 7-9, 10-12, 13-15, 16-18 (won), 19-21, 22-24, 25+', () => {
  const band = (n) => WL_COOP.rating(n).text;
  const edges = [[0, 3], [4, 6], [7, 9], [10, 12], [13, 15], [16, 18], [19, 21], [22, 24]];
  const seen = new Set();
  for (const [lo, hi] of edges) {
    assert.equal(band(lo), band(hi), `${lo}-${hi} is one band`);
    if (lo > 0) assert.notEqual(band(lo), band(lo - 1), `${lo} starts a new band`);
    seen.add(band(lo));
  }
  assert.notEqual(band(25), band(24));
  assert.equal(band(40), band(25));
  assert.equal(seen.size, 8);
  assert.equal(WL_COOP.rating(15).won, false);
  assert.equal(WL_COOP.rating(16).won, true);
});

test('a co-op game counts as played but never unlocks Clean sweep or Marathon', () => {
  mem.clear();
  Profile.init({ game: 'wavelength', achievements: WL_PROFILE.achievements, modes: { friends: { name: 'One phone' } }, toast: false });
  const rounds = [0, 4, 4, 2, 3, 0, 4, 3, 2, 3].map(p => ({ team: 0, points: { activeTeam: p, opposingTeam: 0 } }));
  const r = Profile.recordResult(WL_PROFILE.resultFromGame({ mode: 'friends', coop: true, rounds, finalScores: [23, 0], winnerTeam: 0 }));
  const ids = r.unlocked.map(u => u.id).sort();
  assert.deepEqual(ids, ['bull', 'first', 'hat', 'reader']);
});
