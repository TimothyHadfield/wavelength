# Wavelength

A browser version of the party game Wavelength for two teams sharing one screen (Tim's phone or laptop, passed around in person). One player (the "Hinter") sees a hidden target on a half-circle dial between two opposites, types a clue, their team turns the dial, the other team calls left/right, then a shutter reveal scores it. Since 2026-10-27 also **online rooms** (each person on their own phone, 4–8 people, room code) through the shared `_online` kit on Firestore `th-board-games`. No accounts. Saved on the device only: custom card lists and ticks, the game in progress, seen cards, My stats, sound settings.

- **Live:** https://timothyhadfield.github.io/wavelength/ (GitHub Pages, repo `TimothyHadfield/wavelength`, branch `main`, root folder)
- Handoff notes: `progress.md` (state, traps, NOT verified), `chat.md` (session log). Global rules: `~/.claude/CLAUDE.md`.

## File map
- `index.html`: markup only (menu, game screen, game over, three sheets: Cards, Settings, How to play). Scripts at the bottom, in this order: `fx.js`, `profile.js`, `profile-wl.js`, `cards.js`, `pwa.js` (no defer), `app.js`. Bump every `?v=N`, `data-version="N"` and `BUILD` in app.js together.
- `js/app.js`: the game (classic script, globals).
  - `CARD_LISTS` (built from `WL_LISTS` + saved custom lists, key `wavelength:lists` = `{custom, off}`).
  - `gameState` + `GamePhase`: MENU → PSYCHIC_PREP (look-away) → CLUE_ENTRY → GUESS_PHASE → COUNTER_GUESS → REVEAL → next turn, or GAME_OVER.
  - `setPhase()` shows each phase and calls `saveGame()` (key `wavelength:game`, local games only; cleared on MENU/GAME_OVER). `resumeGame()` in `init()` brings it back (CLUE_ENTRY resumes at the look-away screen). REVEAL never rescored: it uses `round.pointsAwarded` if set.
  - Dial: `resizeCanvas()` fits dial + rim + spectrum card (`#specCard`) into `#dialContainer` (ResizeObserver). `setGuess()` clamps, ticks per 9° section. `playReveal()` = shutter animation, then sounds/celebration; the score card and scoreboard wait for it.
  - `drawCard()` prefers cards not in `wavelength:seen` (cards seen in earlier games on this device).
  - `setupProfile()` / `onGameOver()` (records once per game), `setupFx()`, `renderSettingsSheet()`, `PWA.safeToReload` (only MENU/GAME_OVER, no sheet open, no input focused).
- Online: `js/wave-online.mjs` (ES module: the game for the kit — teams by join order, phases clue→guess→counter→reveal→over, target only in the Hinter's private doc until the reveal; `score()` matches app.js), `js/wl-net.mjs` (module loaded last: room sheet `#onlineSheet`, lobby, maps each room snapshot onto app.js screens via `setPhase`, `NET_WAIT` panel for "someone else's move"; `window.WLNet` is what app.js calls when `gameState.mode === 'online'`). It reads app.js's top-level `let/const` (`gameState`, `GamePhase`, `SPECTRUM_CARDS`, `CARD_LISTS`, `selectedListIndices`) by bare name: they are global bindings, **not** `window.` properties. `js/online.js` = kit copy (`-text`), loaded only when a room is opened or resumed.
- `js/cards.js`: `WL_LISTS`, 11 built-in lists, 471 original cards (Basic 71 + 10 themed × 40).
- `js/profile-wl.js`: `WL_PROFILE` = Wavelength's 8 achievements + `resultFromGame()` (pure, node-tested).
- Kit copies, **byte-for-byte, never edit here** (`.gitattributes` `-text`): `js/online.js` (_online v2), `js/fx.js` (_fx), `css/table.css` (_table 1.0.2), `js/profile.js` + `css/profile.css` (_profile), `sw.js` + `js/pwa.js` + `tools/make-icons.mjs` + `tools/pwa-check.mjs` (_pwa). Update by re-copying from `Board and Card Games/_<kit>/`.
- `manifest.webmanifest`, `icons/`, `icon.svg`, `apple-touch-icon.png`: home-screen install.
- `README.md`: GitHub showcase page (screenshots in `docs/screenshots/`).

## Game rules as built (don't change without Tim)
- Dial is 20 sections of 9 degrees. Target centre snaps to a section centre between 22.5 and 157.5 degrees.
- Scoring: bullseye ±4.5° = 4, ±13.5° = 3, ±22.5° = 2, else 0.
- Counter-guess: the other team gets 1 point for the right side, only when the guessers didn't get 4.
- The team that goes second starts with 1 bonus point. Play to 8/10/15/20 (default 10).
- Hinter rotates within each team; the first hinter and first team are random.
- Game over is checked when "Next Turn" is pressed. If both teams pass the target in the same round, the higher score wins (exact tie: Team 1 is shown as winner; Tim's call, see progress.md).
- No catch-up rule (official: a trailing team that scores 4 goes again). Not added: Tim's call.

## Run locally
`python -m http.server 8110` in this folder (background), then open http://localhost:8110/.

## Test (all headless; Playwright from `~/.claude/tools/node_modules`)
- `npm test` = `node --test "test/*.test.mjs"` (cards: 400+, no duplicates, shapes; achievements). Node 24 needs the quoted glob, not `test/`.
- `npm run e2e` (`node tools/e2e.mjs [webkit|chrome] [--shots DIR]`): 22 checks at 393×659 touch: cards sheet, saved lists, tap/nudge/arrow on the dial, resume after reload, settings, shutter, no spoiler, no dial jumps, result reason, fresh cards, no double score after reload, My stats.
- `npm run layout` (`node tools/layout-check.mjs [webkit|chrome] [--shots DIR]`): 5 sizes (393, 320, 659×393, 1280, 1440) × 6 phases: no overflow, no scroll, button on screen, dial size, rim not cut off.
- `npm run pwa` (`node tools/pwa-check.mjs`, config `tests/pwa-check.json`): 18 checks (offline, never an old build, safe reload).
- `node test/ui.online.mjs <baseUrl> [outDir]`: 4 headless phones (one browser) make/join a room and tap through a game to 8 on real Firestore (~1 min). Not in `npm test` (needs internet; uses free quota).
- `SITE_ROOT=<folder>` points e2e/layout at another build (fail-first checks against main).

## Deploy
Push to `main`; GitHub Pages serves it within a minute or two. Check with `python ~/.claude/hooks/live-check.py <this folder>`, then tell Tim to hard-refresh.

## Traps
- Every player-typed string (team, player, list and card names) must go through `escapeHtml()` before any `innerHTML`; `textContent` is fine as is.
- Identify the hinter by `team.hinterIndex`, not by name: two players can share a name.
- `.screen` uses `100vh` with a `100dvh` override so the dial isn't hidden under iPhone Safari's bottom toolbar. phone-view can't show that toolbar.
- The viewport meta has `user-scalable=no` (stops accidental zoom while dragging the dial). Left alone (Tim's call).
- Anything shown/hidden above the dial changes `#dialContainer`'s height and moves the dial: keep the space (`visibility:hidden`, `.phase-panel.waiting`), never `display:none` mid-step. e2e checks this.
- ResizeObserver redraws a frame later: in tests, wait ~250 ms before measuring `dialGeo` after a layout change.
- Files are LF in the working tree; git warns about CRLF (harmless). Kit copies are `-text`.
- Port 8111 is often taken by other projects' local servers; Wavelength uses 8110. Test scripts use port 0 (random).
