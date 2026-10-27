// Wavelength online: the game in the shape the shared kit (js/online.js = _online/online.js) expects.
// Every person is on their own phone. People are put in two teams by join order (1st, 3rd, 5th...
// = team 1). A computer seat (an open seat the host started with) sits out: Wavelength has no
// computer player. Same rules and scoring as the one-phone game in js/app.js.
//
// Turn: the Hinter (only they get the target, in their private doc) writes a clue -> any teammate
// locks the dial for the team -> any player of the other team calls left/right -> the reveal ->
// anyone taps Next turn (the tap carries the round, so two taps move on once).
// The dial is NOT streamed while it turns (that would cost a write per nudge): teammates agree out
// loud and one of them locks it in. One write per decision keeps the free quota.

const SECTION_DEG = 9;
export function score(target, guess) {
  const d = Math.abs(target - guess);
  if (d <= SECTION_DEG * 0.5) return 4;
  if (d <= SECTION_DEG * 1.5) return 3;
  if (d <= SECTION_DEG * 2.5) return 2;
  return 0;
}
const newTarget = (rng) => (Math.floor(rng() * 16) + 2) * 9 + 4.5;   // a section centre, 22.5..157.5
const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const TARGETS = [8, 10, 15, 20];

function drawCard(s, rng) {
  if (s.poolAt >= s.pool.length) {   // every card used: shuffle the same cards again
    for (let i = s.pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [s.pool[i], s.pool[j]] = [s.pool[j], s.pool[i]]; }
    s.poolAt = 0;
  }
  return s.pool[s.poolAt++];
}
const hinterOf = (s) => { const t = s.teams[s.active]; return t.players[t.hinter]; };
const everyone = (s) => s.teams[0].players.concat(s.teams[1].players).sort((a, b) => a - b);

export const game = {
  id: 'wavelength', minSeats: 4, maxSeats: 8,

  // options: { target: 8|10|15|20, cards: [{left, right}] (picked on the host's phone), names: ['Team 1', 'Team 2'] }
  setup(n, options, rng, seats) {
    const o = options || {};
    const people = [];
    for (let i = 0; i < n; i++) if (seats && seats[i] && seats[i].kind !== 'computer' && seats[i].kind !== 'empty') people.push(i);
    if (people.length < 4) throw new Error('Wavelength online needs at least 4 people (2 per team).');
    const pool = (Array.isArray(o.cards) ? o.cards : []).filter((c) => c && c.left && c.right).map((c) => ({ left: clean(c.left, 40), right: clean(c.right, 40) }));
    if (pool.length < 3) throw new Error('Pick card lists with at least 3 cards.');
    const names = Array.isArray(o.names) ? o.names : [];
    const teams = [0, 1].map((t) => {
      const players = people.filter((_, k) => k % 2 === t);
      return { name: clean(names[t], 20) || 'Team ' + (t + 1), score: 0, players, hinter: Math.floor(rng() * players.length) };
    });
    const s = {
      v: 1, target: TARGETS.includes(+o.target) ? +o.target : 10,
      names: Array.from({ length: n }, (_, i) => clean(seats && seats[i] && seats[i].name, 20) || 'Player ' + (i + 1)),
      teams, active: rng() < 0.5 ? 0 : 1, round: 1, pool, poolAt: 0,
      phase: 'clue', card: null, targetAngle: 90, clue: '', guess: null, counter: null, points: null, history: [], winner: -1,
    };
    s.teams[1 - s.active].score = 1;   // the team going second starts with 1 point
    s.card = drawCard(s, rng);
    s.targetAngle = newTarget(rng);
    return s;
  },

  toAct(s) {
    const team = s.teams[s.active], hinter = hinterOf(s);
    if (s.phase === 'clue') return [hinter];
    if (s.phase === 'guess') return team.players.filter((p) => p !== hinter);
    if (s.phase === 'counter') return s.teams[1 - s.active].players.slice();
    if (s.phase === 'reveal') return everyone(s);
    return [];
  },

  apply(s, seat, a, rng) {
    if (!a || !game.toAct(s).includes(seat)) throw new Error('Not your turn.');
    if (s.phase === 'clue' && a.t === 'clue') {
      const text = clean(a.text, 40);
      if (!text) throw new Error('Type a clue.');
      s.clue = text; s.phase = 'guess';
      return s;
    }
    if (s.phase === 'guess' && a.t === 'guess') {
      const g = Number(a.angle);
      if (!Number.isFinite(g)) throw new Error('No guess.');
      s.guess = Math.round(Math.max(0, Math.min(180, g)) * 10) / 10; s.phase = 'counter';
      return s;
    }
    if (s.phase === 'counter' && a.t === 'counter') {
      if (a.side !== 'LEFT' && a.side !== 'RIGHT') throw new Error('Pick a side.');
      s.counter = a.side;
      const pts = score(s.targetAngle, s.guess);
      const right = s.targetAngle > s.guess;
      const counterOk = pts < 4 && ((a.side === 'RIGHT' && right) || (a.side === 'LEFT' && !right));
      s.points = { activeTeam: pts, opposingTeam: counterOk ? 1 : 0 };
      s.teams[s.active].score += pts;
      s.teams[1 - s.active].score += counterOk ? 1 : 0;
      s.history.push({ team: s.active, points: s.points });
      s.phase = 'reveal';
      return s;
    }
    if (s.phase === 'reveal' && a.t === 'next') {
      if (a.round != null && a.round !== s.round) throw new Error('The game already moved on.');
      if (s.teams.some((t) => t.score >= s.target)) {   // both can pass the target in one round: higher score wins (tie: team 1, as on one phone)
        s.phase = 'over'; s.winner = s.teams[1].score > s.teams[0].score ? 1 : 0;
        return s;
      }
      const team = s.teams[s.active];
      team.hinter = (team.hinter + 1) % team.players.length;
      s.active = 1 - s.active; s.round++;
      s.card = drawCard(s, rng); s.targetAngle = newTarget(rng);
      s.phase = 'clue'; s.clue = ''; s.guess = null; s.counter = null; s.points = null;
      return s;
    }
    throw new Error('That move isn\'t allowed now.');
  },

  publicView(s) {
    const shown = s.phase === 'reveal' || s.phase === 'over';
    const v = {
      target: s.target, names: s.names, teams: s.teams, active: s.active, round: s.round, hinter: hinterOf(s),
      phase: s.phase, card: s.card, clue: s.clue, guess: s.guess, counter: s.counter, points: s.points,
      history: s.history, winner: s.winner,
    };
    if (shown) v.targetAngle = s.targetAngle;
    return v;
  },

  // The Hinter's own phone gets the target until the reveal; everyone else gets nothing (a stable, empty doc).
  privateView(s, seat) {
    if (s.phase === 'reveal' || s.phase === 'over' || seat !== hinterOf(s)) return {};
    return { target: s.targetAngle };
  },

  // Plays a seat whose person went away (the kit's turn timeout): a plain clue, the middle, a coin flip.
  bot(ctx, seat, rng) {
    const pub = ctx.pub || game.publicView(ctx.state);
    if (pub.phase === 'clue') return { t: 'clue', text: '(no clue)' };
    if (pub.phase === 'guess') return { t: 'guess', angle: 90 };
    if (pub.phase === 'counter') return { t: 'counter', side: rng() < 0.5 ? 'LEFT' : 'RIGHT' };
    return { t: 'next', round: pub.round };
  },

  isOver(s) { return s.phase === 'over'; },
};
