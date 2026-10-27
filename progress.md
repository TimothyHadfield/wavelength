# Wavelength progress

## START HERE
Last updated 2026-10-27. Read `CLAUDE.md` (what it is, file map, rules as built, tests, traps), then this file, then the tail of `chat.md`.

## Goal right now
Board-games improvement wave (2026-10-27, Tim: "I want to make our boardgames the best in every single metric we can"). Wavelength's pass is done and live. **Online rooms built and on (10-27)**, Tim: "I think it'll be okay to enable it to all games for now and we can disable it later if it becomes too much". Open: Tim's calls below.

## Status
| Area | State |
|---|---|
| Layout (10-27) | Start Game + dial on screen without scrolling at 393, 320, 659×393, 1280, 1440 (old build failed 7 of 30 checks; now 30/30). Teams side by side, Cards/Settings/How to play in sheets |
| Cards (10-27) | 471 original cards in 11 lists (was 71). Custom lists + ticks saved on the device. Seen cards come last next game |
| Dial (10-27) | Device look (rim, cream face, knob, red needle), tap-to-move, ‹ › and arrow keys 1°, section ticks, shutter reveal, score card waits for it (no spoiler, no jump) |
| Sounds + table look (10-27) | `_fx` sounds/celebrations with Settings switches; `_table` 1.0.2 surface in navy |
| My stats + install (10-27) | `_profile` (8 achievements), `_pwa` (home screen, offline, never an old build: pwa-check 4/18 without → 18/18) |
| Resume (10-27) | Game in progress survives reload; reveal never scores twice |
| Online rooms (10-27) | **On.** Menu "Play online" → sheet: name, Make a room / Join by 5-letter code; lobby shows two team columns (teams by join order, alternating); host taps Start once 4+ people are in (4–8). Each phone: Hinter alone sees the target and writes the clue; teammates see the dial and **one of them** locks it in (dial is not live-synced, they agree out loud/on a call); other team calls left/right; anyone taps Next Turn. Host's card lists + "Play to" are used (40 cards sent at room start). Files: `js/online.js` (kit v2 copy), `js/wave-online.mjs` (rules), `js/wl-net.mjs` (room + screens). No computers online, no My stats for online games |
| Computer player | **Not built: not sensible** with free word vectors (measured, below) |
| Tests | `npm test` 16 (7 online), e2e 22, layout 30, pwa 18; `node test/ui.online.mjs <url> [dir]` = 4 headless phones on real Firestore play to 8 (10-27: passed, 1.1 min, no target leak, same final score on all 4) |

## Online cost (10-27, measured with the kit cost harness `_online/test/cost.mjs`)
Per game to 10: **4 people ≈ 66 writes / 190 reads**, **6 people ≈ 91 writes / 310 reads** (one write per decision, dial only on Lock). Harness think time is short; a real ~30-min game adds about 1 presence write per person per minute (≈ +120–180 writes). Free plan 20K writes / 50K reads a day.

## Computer player measurement (10-27)
GloVe 300d (free, 400k words) "semantic axis" guesser on 74 hand-placed clues (e.g. Hot|Cold "lava" 8°): avg **1.32 pts/clue** vs random 0.69 vs always-middle 0.23; median error 32°; **right half only 47/62** for clear-cut clues (puts "ocean" on Dry, "soap" on Dirty, "calculus" on Easy). 50d: 0.95 pts. A human team would do far better, and a computer Hinter (choosing words) would be worse. Script: scratchpad `wl_eval.py` (not in repo).

## Authorized next steps
- 10-27: online on (Tim, quoted above). Done.

## Standing instructions
- Tim 10-27 (wave brief): "start building every single improvement you can think of after your competitor analysis. For Online play, talk to me before you're going to set something up that requires anything more than the firebase system we already have set up or takes up a large portion of our free plan that we have."
- Global rules in `~/.claude/CLAUDE.md` apply.

## Traps
- See `CLAUDE.md` Traps (escapeHtml, hinterIndex, 100dvh, dial jumps, ResizeObserver timing, kit copies byte-for-byte).

## Decisions
- 2026-10-16: exact tie when both teams pass the target in the same round shows Team 1 as winner. **Tim decides the real tie rule** (reviewer flagged it again 10-27).
- 10-27: all built-in lists ticked by default; custom lists now saved on the device.
- 10-27: computer not built (measured not sensible). Online built 10-27 (Tim's go): needs 4+ people (2 per team), no computers online; second team starts on 1 like one phone; tie → Team 1 (same as one phone).
- 10-27: reload during the clue step resumes at the look-away screen (the clue screen shows the target).

## Tim's calls (open, 10-27)
- The 10 new list names and all card wording; achievement names; "My stats" top-left on the menu.
- Dial look (rim, cream face, red needle), spectrum card colours, navy table surface.
- How to play text; result line "Team 1 called left: correct"; "Round 1 · to 10"; "tap the side".
- End game needs two taps.
- Online: dial not live-synced between teammates (one locks it in); wording "Play online", "Make a room", lobby/waiting lines ("Team 2 is turning the dial"); 4-person minimum.
- Tie rule; official catch-up rule (trailing team scoring 4 goes again) not added; card skip for the Hinter not added.
- My stats shows an empty "Vs the computer" heading and Elo 1200 (the shared kit's layout; no computer here).

## NOT verified
- A real iPhone: `100dvh`, home-screen app, offline after install, keyboard covering the dial while typing a clue (reasoned risk).
- Android browsers.
- Online on real phones (4 headless WebKit phones only); reload mid-game resume online not exercised in a browser.

## Rejected / parked
- ~~Online rooms parked~~: un-parked and built 10-27 (Tim's go).
- ~~Computer guesser/Hinter~~: measured not sensible with free word vectors (above).
