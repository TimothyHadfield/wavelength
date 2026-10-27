// Wavelength online rooms: each person on their own phone, friends join with a 5-letter code.
// Uses the shared kit js/online.js (byte-identical copy of _online/online.js, Firestore project
// th-board-games) and the rules in js/wave-online.mjs. The kit (and the Firebase SDK) load only
// when someone opens a room, joins one, or comes back to one after a reload.
// It drives the same screens as the one-phone game in js/app.js. Its top-level const/let (gameState,
// GamePhase, SPECTRUM_CARDS, CARD_LISTS, selectedListIndices) are global bindings, not window
// properties, so they are used here by bare name; its functions are on window.
import { game } from './wave-online.mjs?v=7';

const NAME_KEY = 'wavelength:netname';
const $ = (id) => document.getElementById(id);
let room = null, loading = null, snap = null, busy = false, msg = '', shownKey = '';

function load() {
  if (room) return Promise.resolve(room);
  if (!loading) loading = import('./online.js?v=7').then((m) => {
    room = m.createOnline({ game, gameId: 'wavelength', botDelayMs: 900 });
    room.on('change', onSnap);
    room.on('error', (m2) => toast(typeof m2 === 'string' ? m2 : (m2 && m2.message) || 'Online error'));
    return room;
  }).catch((e) => { loading = null; throw e; });
  return loading;
}
function toast(text) {
  let t = $('netToast');
  if (!t) { t = document.createElement('div'); t.id = 'netToast'; t.className = 'net-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = text; t.hidden = false;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 3500);
}
const esc = (s) => window.escapeHtml(String(s == null ? '' : s));

// ---------------------------------------------------------------- the room sheet (lobby)
function people(s) { return s.seats.map((q, i) => ({ q, i })).filter((x) => x.q.kind === 'human'); }
function renderSheet() {
  const body = $('onlineBody'); if (!body) return;
  const s = snap;
  if (s && s.status === 'joining') {
    body.innerHTML = `<p class="net-note">${s.askingHost ? 'Waiting for the host to let you in…' : 'Joining ' + esc(s.code) + '…'}</p>
      <div class="net-row"><button class="btn btn-small btn-dialog-cancel" id="netLeave">Cancel</button></div>`;
  } else if (s && s.status === 'lobby') {
    const ppl = people(s);
    const col = (t) => ppl.filter((_, k) => k % 2 === t).map((x) => `<div class="net-person">${esc(x.q.name)}${x.i === s.mySeat ? ' <span class="net-you">(you)</span>' : ''}${x.q.isHost ? ' <span class="net-you">host</span>' : ''}</div>`).join('') || '<div class="net-person net-you">nobody yet</div>';
    const ready = ppl.length >= 4;
    body.innerHTML = `<div class="set-h">Room code</div><div class="net-code">${esc(s.code)}</div>
      <p class="net-note">Friends open this page, tap Play online and type the code. Teams fill in turn as people join.</p>
      <div class="net-teams"><div class="net-team team1"><b>Team 1</b>${col(0)}</div><div class="net-team team2"><b>Team 2</b>${col(1)}</div></div>
      <div class="net-row">${s.isHost ? `<button class="btn btn-primary" id="netStart" ${ready ? '' : 'disabled'}>Start</button>` : '<span class="net-note">Waiting for the host to start.</span>'}
      <button class="btn btn-small btn-dialog-cancel" id="netLeave">Leave</button></div>
      ${s.isHost && !ready ? `<p class="net-note">${4 - ppl.length} more to start (2 per team).</p>` : ''}`;
  } else {
    const nm = (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } })();
    body.innerHTML = `<p class="net-note">Everyone plays on their own phone. The host's card lists and "Play to" are used.</p>
      <input type="text" class="net-inp" id="netName" maxlength="20" placeholder="Your name" autocomplete="nickname" value="${esc(nm)}">
      <button class="btn btn-primary net-wide" id="netCreate" ${busy ? 'disabled' : ''}>Make a room</button>
      <div class="net-row"><input type="text" class="net-inp" id="netCode" maxlength="5" placeholder="Room code" autocapitalize="characters" autocomplete="off" spellcheck="false">
      <button class="btn btn-small btn-dialog-cancel" id="netJoin" ${busy ? 'disabled' : ''}>Join</button></div>
      ${msg ? `<p class="net-note net-bad">${esc(msg)}</p>` : ''}`;
  }
  const on = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', fn); };
  on('netCreate', () => go('create'));
  on('netJoin', () => go('join'));
  on('netStart', async () => { const r = await room.start(); if (!r.ok) toast(r.message); });
  on('netLeave', () => { leave(); window.closeSheet('onlineSheet'); });
}
function pickCards() {   // 40 fresh cards from the host's ticked lists (same "seen last" rule as one phone)
  SPECTRUM_CARDS = [];
  selectedListIndices.forEach((i) => SPECTRUM_CARDS.push(...CARD_LISTS[i].cards));
  if (SPECTRUM_CARDS.length < 3) return null;
  const save = gameState.usedCardIndices;
  gameState.usedCardIndices = [];
  const out = [];
  for (let k = 0; k < Math.min(40, SPECTRUM_CARDS.length); k++) { const c = window.drawCard(); out.push({ left: c.left, right: c.right }); }
  gameState.usedCardIndices = save;
  return out;
}
async function go(kind) {
  if (busy) return;
  const name = ($('netName').value || '').trim().slice(0, 20) || 'Player';
  try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* not saved */ }
  const code = ($('netCode').value || '').trim().toUpperCase();
  if (kind === 'join' && code.length !== 5) { msg = 'Room codes have 5 letters.'; renderSheet(); return; }
  let cards = null;
  if (kind === 'create' && !(cards = pickCards())) { msg = 'Pick card lists with at least 3 cards (Cards on the menu).'; renderSheet(); return; }
  busy = true; msg = ''; renderSheet();
  let r;
  try {
    const o = await load();
    r = kind === 'create'
      ? await o.createRoom({ name, seats: ['human', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty', 'empty'],
          options: { target: +$('targetScoreSelect').value, cards, names: [$('team1NameInput').value.trim() || 'Team 1', $('team2NameInput').value.trim() || 'Team 2'] } })
      : await o.joinRoom(code, name);
  } catch (e) { r = { ok: false, message: 'Online play couldn\'t load. Check your internet and try again.' }; }
  busy = false;
  if (!r.ok) msg = r.message || 'That didn\'t work. Try again.';
  renderSheet();
}
function leave() {
  const r = room; snap = null; shownKey = '';
  if (r) r.leave();
  if (gameState.mode === 'online') { gameState.mode = 'friends'; gameState.phase = GamePhase.MENU; window.showScreen('menuScreen'); }
}

// ---------------------------------------------------------------- the game screens
const COLORS = ['#00d9ff', '#ff6b6b'];
function role(s) {
  const p = s.pub, me = s.mySeat, team = p.teams[p.active];
  if (me === p.hinter) return 'hinter';
  if (team.players.includes(me)) return 'guesser';
  if (p.teams[1 - p.active].players.includes(me)) return 'other';
  return 'watch';
}
function onSnap(s) {
  snap = s;
  const G = gameState, P = GamePhase;   // app.js globals
  if (['none', 'closed', 'left'].includes(s.status)) {
    if (G.mode === 'online') { toast(s.status === 'closed' ? 'The room was closed.' : 'You left the room.'); G.mode = 'friends'; G.phase = P.MENU; window.showScreen('menuScreen'); }
    shownKey = ''; renderSheet(); return;
  }
  if (s.status === 'lobby' || s.status === 'joining' || !s.pub) { renderSheet(); return; }
  const p = s.pub, mine = s.mine || {}, r = role(s);
  window.closeSheet('onlineSheet');
  // the one-phone game's state, filled from the room
  G.mode = 'online';
  G.myTeam = p.teams.findIndex((t) => t.players.includes(s.mySeat));
  G.targetScore = p.target;
  G.teams = p.teams.map((t, i) => ({ name: t.name, score: t.score, color: COLORS[i], players: t.players.map((q) => p.names[q]), hinterIndex: t.hinter }));
  G.activeTeamIndex = p.active;
  G.roundNumber = p.round;
  G.roundHistory = p.history.map((h) => ({ team: h.team, pointsAwarded: h.points }));
  const key = [p.phase, p.round, r].join('|');
  if (key === shownKey) return;
  shownKey = key;
  const prevGuess = G.round && G.round.guessAngle;
  G.round = {
    spectrumCard: p.card, targetAngle: p.targetAngle != null ? p.targetAngle : (mine.target != null ? mine.target : 90),
    hinterName: p.names[p.hinter], clue: p.clue, guessAngle: p.guess != null ? p.guess : 90, counterGuess: p.counter,
    pointsAwarded: p.points, revealed: p.phase === 'clue' && r === 'hinter', guessLocked: p.guess != null,
  };
  if (p.phase === 'guess' && r === 'guesser' && prevGuess != null && G.phase === P.GUESS_PHASE) G.round.guessAngle = prevGuess;
  window.showScreen('gameScreen');
  window.hidePrepOverlay();
  window.updateSpectrumLabels();
  window.updateScoreboard();
  document.getElementById('clueBarText').textContent = p.clue || '';
  const team = p.teams[p.active], other = p.teams[1 - p.active];
  const wait = (text) => { G.phase = 'NET_WAIT'; $('netWaitText').innerHTML = text; window.showClueBar(!!p.clue); window.showPanel('netWaitPanel'); window.resizeCanvas(); window.renderDial(); };
  const tn = (t, i) => `<b style="color:${COLORS[i]}">${esc(t.name)}</b>`;
  if (p.phase === 'clue') {
    if (r === 'hinter') { G.phase = 'NET_WAIT'; window.setPhase(P.CLUE_ENTRY); }
    else wait(`<b style="color:${COLORS[p.active]}">${esc(p.names[p.hinter])}</b> is thinking of a clue…`);
  } else if (p.phase === 'guess') {
    if (r === 'guesser') { G.phase = 'NET_WAIT'; window.setPhase(P.GUESS_PHASE); $('guessInstruction').innerHTML = `Agree on a spot, then <b>one of you</b> locks it in for ${tn(team, p.active)}`; }
    else wait(`${tn(team, p.active)} is turning the dial`);
  } else if (p.phase === 'counter') {
    if (r === 'other') { G.phase = 'NET_WAIT'; window.setPhase(P.COUNTER_GUESS); }
    else wait(`${tn(other, 1 - p.active)} is calling left or right`);
  } else if (p.phase === 'reveal') {
    G.phase = 'NET_WAIT';
    window.setPhase(P.REVEAL);
  } else if (p.phase === 'over') {
    G.phase = 'NET_WAIT';
    window.setPhase(P.GAME_OVER);
  }
}

// ---------------------------------------------------------------- hooks app.js calls
const act = async (a) => { if (!room) return; const res = await room.act(a); if (!res.ok && res.message) toast(res.message); };
window.WLNet = {
  open() { msg = ''; renderSheet(); window.openSheet('onlineSheet'); },
  canMove() { return !!snap && !!snap.pub && snap.pub.phase === 'guess' && role(snap) === 'guesser'; },
  clue(text) { act({ t: 'clue', text }); },
  guess(angle) { act({ t: 'guess', angle }); },
  counter(side) { act({ t: 'counter', side }); },
  next() { if (snap && snap.pub) act({ t: 'next', round: snap.pub.round }); },
  leave,
  get snap() { return snap; },
};
// back into the room after a reload (only loads the kit if this browser was in one)
try { if (localStorage.getItem('online.wavelength')) load().then((o) => o.resume()).catch(() => {}); } catch (e) { /* no storage */ }
