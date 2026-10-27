// My stats: Wavelength's achievements and results through the shared js/profile.js (game-profile kit).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
await import('../js/profile.js');
await import('../js/profile-wl.js');
const { Profile, WL_PROFILE } = globalThis;
const { achievements, resultFromGame } = WL_PROFILE;

const fresh = () => { mem.clear(); Profile.init({ game: 'wavelength', achievements, modes: { friends: { name: 'One phone' } }, toast: false }); };
const R = (team, a, o = 0) => ({ team, points: { activeTeam: a, opposingTeam: o } });
const ids = (r) => r.unlocked.map(u => u.id).sort();

test('a one-phone game counts as played, not won or lost, and unlocks First game', () => {
  fresh();
  const r = Profile.recordResult(resultFromGame({ mode: 'friends', rounds: [R(0, 2), R(1, 0, 1), R(0, 3)], finalScores: [10, 3], winnerTeam: 0 }));
  const s = Profile.stats();
  assert.equal(s.games, 1); assert.equal(s.wins, 0); assert.equal(s.losses, 0);
  assert.deepEqual(ids(r), ['first', 'sweep']);
});

test('bullseyes: one gives Bullseye, two in a row by the same team gives Mind reader, three gives Hat trick', () => {
  fresh();
  const rounds = [R(0, 4), R(1, 0), R(0, 4), R(1, 2), R(0, 4)];
  const r = Profile.recordResult(resultFromGame({ mode: 'online', rounds, finalScores: [12, 6], winnerTeam: 0, myTeam: 0 }));
  assert.deepEqual(ids(r), ['bull', 'distance', 'first', 'hat', 'reader']);
  assert.equal(Profile.stats().wins, 1);
});

test("online: the other team's bullseyes are not mine, and a loss is a loss", () => {
  fresh();
  const r = Profile.recordResult(resultFromGame({ mode: 'online', rounds: [R(0, 4), R(1, 0), R(0, 4)], finalScores: [10, 2], winnerTeam: 0, myTeam: 1 }));
  assert.deepEqual(ids(r), ['distance', 'first']);
  assert.equal(Profile.stats().losses, 1);
});

test('Marathon needs a game to 20, Regular needs 10 games', () => {
  fresh();
  let got = [];
  for (let i = 0; i < 10; i++) got.push(...ids(Profile.recordResult(resultFromGame({ mode: 'friends', rounds: [R(0, 2)], finalScores: [i === 9 ? 21 : 10, 8], winnerTeam: 0 }))));
  assert.ok(got.includes('regular'));
  assert.ok(got.includes('marathon'));
  assert.equal(got.filter(x => x === 'marathon').length, 1);
});
