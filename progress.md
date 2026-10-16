# Wavelength progress

## START HERE
Last updated 2026-10-16. Read `CLAUDE.md` (what it is, file map, rules as built, traps), then this file.

## Goal right now
Nothing in progress. The game is finished and live; only fixes when Tim reports something.

## Status
| Area | State |
|---|---|
| Game (menu, look-away, clue, guess, counter-guess, reveal, game over) | Works, live on GitHub Pages |
| Custom card lists | Work, but are not saved between visits (by design so far) |
| Tests | None in the repo; checked with headless WebKit scripts |
| 2026-10-16 sweep | Fixed: winner when both teams pass the target in one round; names/cards with `<` or `&`; teammate with the same name as the hinter dropped from the guess line. Added labels, meta description, empty favicon (console 404), `100dvh` for iPhone toolbar. Pixel-identical otherwise |

## Authorized next steps
None.

## Standing instructions
- None recorded from Tim for this project yet. Global rules in `~/.claude/CLAUDE.md` apply.

## Traps
- See `CLAUDE.md` Traps (escapeHtml, hinterIndex, 100dvh, port 8110).

## Decisions
- 2026-10-16 (sweep, no Tim input): exact tie when both teams pass the target in the same round still shows Team 1 as the winner, same as before. Tim decides the real tie rule.

## NOT verified
- The `100dvh` fix on a real iPhone (phone-view's WebKit has no collapsing toolbar, so 100vh and 100dvh measure the same there).
- Android browsers.

## Rejected / parked
- (none yet)
