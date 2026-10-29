# Wavelength progress

## START HERE
Last updated 2026-10-28 (wave 3). Read `CLAUDE.md` (what it is, file map, rules as built, tests, traps), then this file, then the tail of `chat.md`.

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
| Wave 3 (10-28) | **Videos** in How to play (4, oEmbed-checked 10-28: MR_ughqNorg "Wavelength Board Game - How to Play" Meeple University; cBoQO1wqErA "Learn how to play WAVELENGTH" Barnes & Noble; KuL_R60_320 "Wavelength Review - How Much Do You Love Your Mum?" Shut Up & Sit Down; sk1BowhRwj0 "Let's Play: Wavelength" Good Mythical MORE). **Co-op** switch in Settings → Game (rulebook variant; sources: gamerules.com/rules/wavelength = 7 cards, no left/right, rating bands; opinionatedgamers.com Dan Blum review = bullseye 3 pts + extra card). **Guess timer** Off/30/60/90 s (locks the guess at 0). **Menu remembers** team names, players, Play to. Card list ticks were already saved; nudge ‹ › and sound switches already existed |
| Computer player | **Not built: not sensible** with free word vectors (measured, below) |
| Tests | `npm test` 19 (7 online, 3 co-op), e2e 32, layout 30, pwa 18; `node test/ui.online.mjs <url> [dir]` = 4 headless phones on real Firestore play to 8 (10-27: passed, 1.1 min, no target leak, same final score on all 4) |

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
- **PWA kit re-copied 2026-10-28 (sweep, 725d337):** game-pwa 1.4.0, pwa.js `data-version` 11 (pwa-check 18/18). `BUILD` in app.js (8) already lagged data-version (10); left as is, app.js untouched.
- **PWA kit re-copied 2026-10-27 (kitfix):** game-pwa 1.3.0 (`data-extra` on the pwa.js tag caches files loaded later by script). Copies stay byte-identical to `../_pwa`.
- **online.js cache stamp (2026-10-27):** every import of `js/online.js` uses `?v=a3d0418b`, the `_online` content stamp. After a re-copy: put the new stamp from `node ../_online/tools/stamp.mjs` there, bump the importing file's `?v=` (and pwa.js `data-version`), then `node ../_online/tools/stamp.mjs --check .` must say OK.
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
- Wave 3 (10-28): co-op rating lines are our own wording on the rulebook's bands ("Static" … "You won!" at 16 … "Telepaths"); co-op menu hides the Team 2 column and shows "Co-op 7 cards" in place of "Play to"; co-op scoreboard "Cards left: N" in the right pill; guess timer auto-locks at 0 (could instead just buzz); video picks and labels; no new card lists added (471 already).
- My stats shows an empty "Vs the computer" heading and Elo 1200 (the shared kit's layout; no computer here).

## NOT verified
- A real iPhone: `100dvh`, home-screen app, offline after install, keyboard covering the dial while typing a clue (reasoned risk).
- Android browsers.
- Online on real phones (4 headless WebKit phones only); reload mid-game resume online not exercised in a browser.
- Co-op bullseye rule (3 pts + 1 card) comes from a review, not the rulebook text itself (rulebook PDF not reached). Co-op/timer not run through `test/ui.online.mjs` (they are one-phone only and guarded by `gameState.mode`).

## Rejected / parked
- ~~Online rooms parked~~: un-parked and built 10-27 (Tim's go).
- ~~Computer guesser/Hinter~~: measured not sensible with free word vectors (above).
