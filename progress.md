# Wavelength progress

## START HERE
Last updated 2026-10-27. Read `CLAUDE.md` (what it is, file map, rules as built, tests, traps), then this file, then the tail of `chat.md`.

## Goal right now
Board-games improvement wave (2026-10-27, Tim: "I want to make our boardgames the best in every single metric we can"). Wavelength's pass is done and live. Open: Tim's calls below; online rooms wait on the Online guard (needs a cheaper `_online` v2 or Tim's OK).

## Status
| Area | State |
|---|---|
| Layout (10-27) | Start Game + dial on screen without scrolling at 393, 320, 659×393, 1280, 1440 (old build failed 7 of 30 checks; now 30/30). Teams side by side, Cards/Settings/How to play in sheets |
| Cards (10-27) | 471 original cards in 11 lists (was 71). Custom lists + ticks saved on the device. Seen cards come last next game |
| Dial (10-27) | Device look (rim, cream face, knob, red needle), tap-to-move, ‹ › and arrow keys 1°, section ticks, shutter reveal, score card waits for it (no spoiler, no jump) |
| Sounds + table look (10-27) | `_fx` sounds/celebrations with Settings switches; `_table` 1.0.2 surface in navy |
| My stats + install (10-27) | `_profile` (8 achievements), `_pwa` (home screen, offline, never an old build: pwa-check 4/18 without → 18/18) |
| Resume (10-27) | Game in progress survives reload; reveal never scores twice |
| Online rooms | **Not built: trips the Online guard** (see numbers below) |
| Computer player | **Not built: not sensible** with free word vectors (measured, below) |
| Tests | `npm test` 9, e2e 22, layout 30, pwa 18; WebKit + Chrome |

## Online guard numbers (10-27, reasoned from `_online` README costs)
Per 5-player online game (~16 turns, ~30 min, dial published only on Lock): moves 4/turn × ~4 writes ≈ 256 writes + heartbeats ≈ 240 writes → **≈ 500 writes, ≈ 1,600 reads per game**. Normal day (30 players ≈ 6 games): ≈ 3,000 writes (15% of 20K), ≈ 9,600 reads (19% of 50K). Busy day (10×): ≈ 30,000 writes (150%), ≈ 96,000 reads (190%). Over the 10% line even on a normal day, so stopped (same as Catan). A live synced dial (what the official app does) would cost more.

## Computer player measurement (10-27)
GloVe 300d (free, 400k words) "semantic axis" guesser on 74 hand-placed clues (e.g. Hot|Cold "lava" 8°): avg **1.32 pts/clue** vs random 0.69 vs always-middle 0.23; median error 32°; **right half only 47/62** for clear-cut clues (puts "ocean" on Dry, "soap" on Dirty, "calculus" on Easy). 50d: 0.95 pts. A human team would do far better, and a computer Hinter (choosing words) would be worse. Script: scratchpad `wl_eval.py` (not in repo).

## Authorized next steps
- None beyond the 10-27 wave.

## Standing instructions
- Tim 10-27 (wave brief): "start building every single improvement you can think of after your competitor analysis. For Online play, talk to me before you're going to set something up that requires anything more than the firebase system we already have set up or takes up a large portion of our free plan that we have."
- Global rules in `~/.claude/CLAUDE.md` apply.

## Traps
- See `CLAUDE.md` Traps (escapeHtml, hinterIndex, 100dvh, dial jumps, ResizeObserver timing, kit copies byte-for-byte).

## Decisions
- 2026-10-16: exact tie when both teams pass the target in the same round shows Team 1 as winner. **Tim decides the real tie rule** (reviewer flagged it again 10-27).
- 10-27: all built-in lists ticked by default; custom lists now saved on the device.
- 10-27: online not built (guard); computer not built (measured not sensible).
- 10-27: reload during the clue step resumes at the look-away screen (the clue screen shows the target).

## Tim's calls (open, 10-27)
- The 10 new list names and all card wording; achievement names; "My stats" top-left on the menu.
- Dial look (rim, cream face, red needle), spectrum card colours, navy table surface.
- How to play text; result line "Team 1 called left: correct"; "Round 1 · to 10"; "tap the side".
- End game needs two taps.
- Tie rule; official catch-up rule (trailing team scoring 4 goes again) not added; card skip for the Hinter not added.
- My stats shows an empty "Vs the computer" heading and Elo 1200 (the shared kit's layout; no computer here).

## NOT verified
- A real iPhone: `100dvh`, home-screen app, offline after install, keyboard covering the dial while typing a clue (reasoned risk).
- Android browsers.
- Online quota numbers are reasoned from the kit README, not measured.

## Rejected / parked
- ~~Online rooms via `_online`~~: over the Online guard (above); parked until `_online` v2 cuts writes or Tim OKs it.
- ~~Computer guesser/Hinter~~: measured not sensible with free word vectors (above).
