// Co-op mode (the rulebook's cooperative variant): everyone is one team, the deck starts at 7 cards,
// no left/right call, a bullseye scores 3 and adds 1 card, and the total is read off a rating table.
// Pure, so test/coop.test.mjs can check it in node. Classic script: sets globalThis.WL_COOP.
(function (root) {
const CARDS = 7;

// Bands follow the rulebook's table (0-3, 4-6, ... 22-24, 25+); the lines are our own wording.
const RATINGS = [
    [25, 'Telepaths'],
    [22, 'Mind melders'],
    [19, 'Same wavelength'],
    [16, 'You won!'],
    [13, 'So close'],
    [10, 'Not bad'],
    [7, 'Tuning in'],
    [4, 'Faint signal'],
    [0, 'Static'],
];

// base = the normal dial score (4/3/2/0)
function points(base) {
    return base === 4 ? { points: 3, extraCard: true } : { points: base, extraCard: false };
}

function rating(total) {
    const t = Math.max(0, Number(total) || 0);
    for (const [min, text] of RATINGS) if (t >= min) return { text, won: t >= 16 };
    return { text: RATINGS[RATINGS.length - 1][1], won: false };
}

root.WL_COOP = { CARDS, RATINGS, points, rating };
})(typeof window !== 'undefined' ? window : globalThis);
