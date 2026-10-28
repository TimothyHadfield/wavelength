// Wavelength's part of the shared profile (game-profile): its achievements and how a finished game
// becomes a Profile.recordResult() call. Pure, so test/profile.test.mjs can check it in node.
// Classic script: sets globalThis.WL_PROFILE.
(function (root) {
const BULL = 4;

// rounds: [{ team, points: { activeTeam, opposingTeam } }] in play order
function gameExtra(rounds, finalScores, winnerTeam) {
    let bullseyes = 0, bullRun = 0, bestRun = 0, perTeam = [0, 0], runs = [0, 0], bestPerTeam = [0, 0];
    for (const r of rounds) {
        const t = r.team === 1 ? 1 : 0;
        if (r.points && r.points.activeTeam === BULL) {
            bullseyes++; perTeam[t]++; runs[t]++; bullRun++;
        } else { runs[t] = 0; bullRun = 0; }
        bestPerTeam[t] = Math.max(bestPerTeam[t], runs[t]);
        bestRun = Math.max(bestRun, bullRun);
    }
    const w = winnerTeam === 1 ? 1 : 0;
    return {
        rounds: rounds.length, bullseyes, bestRun,
        bullseyesBy: perTeam, bestRunBy: bestPerTeam,
        winnerScore: finalScores[w], loserScore: finalScores[1 - w],
    };
}

// mode: 'friends' (one phone, no "me"), 'online' or 'computer' (myTeam known)
// coop: one team, no winner or loser score (so Clean sweep and Marathon never count it)
function resultFromGame({ mode, rounds, finalScores, winnerTeam, myTeam, coop }) {
    const extra = gameExtra(rounds, finalScores, winnerTeam);
    if (coop) { extra.coop = true; extra.coopScore = finalScores[0]; delete extra.winnerScore; delete extra.loserScore; }
    const mine = myTeam === 0 || myTeam === 1;
    return {
        mode,
        won: mine ? winnerTeam === myTeam : null,
        score: mine ? finalScores[myTeam] : undefined,
        extra: { ...extra, myTeam: mine ? myTeam : -1 },
    };
}

// My bullseyes: on one phone every bullseye counts (everyone at the table played it)
const myBulls = (x) => (x.myTeam >= 0 ? x.bullseyesBy[x.myTeam] : x.bullseyes);
const myRun = (x) => (x.myTeam >= 0 ? x.bestRunBy[x.myTeam] : x.bestRun);

const achievements = [
    { id: 'first', title: 'First game', desc: 'Finish a game', test: c => c.stats.games >= 1 },
    { id: 'bull', title: 'Bullseye', desc: 'Land in the 4-point centre', test: c => !!c.last && myBulls(c.last.extra) >= 1 },
    { id: 'reader', title: 'Mind reader', desc: 'Bullseyes on two turns in a row', test: c => !!c.last && myRun(c.last.extra) >= 2 },
    { id: 'hat', title: 'Hat trick', desc: 'Three bullseyes in one game', test: c => !!c.last && myBulls(c.last.extra) >= 3 },
    { id: 'sweep', title: 'Clean sweep', desc: 'Win with the other team on 3 or less', test: c => !!c.last && c.last.extra.loserScore <= 3 && c.last.result !== 'l' },
    { id: 'marathon', title: 'Marathon', desc: 'Finish a game played to 20', test: c => !!c.last && c.last.extra.winnerScore >= 20 },
    { id: 'distance', title: 'Long distance', desc: 'Finish an online game', test: c => !!c.last && c.last.mode === 'online' },
    { id: 'regular', title: 'Regular', desc: 'Play 10 games', test: c => c.stats.games >= 10 },
];

root.WL_PROFILE = { achievements, resultFromGame, gameExtra };
})(typeof window !== 'undefined' ? window : globalThis);
