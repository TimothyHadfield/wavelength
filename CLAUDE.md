# Wavelength

A browser version of the party game Wavelength for two teams sharing one screen (Tim's phone or laptop, passed around in person). One player (the "Hinter") sees a hidden target on a half-circle dial between two opposites, types a clue, their team drags the pointer, the other team calls left/right, then the reveal scores it. No accounts, no backend, nothing saved between visits.

- **Live:** https://timothyhadfield.github.io/wavelength/ (GitHub Pages, repo `TimothyHadfield/wavelength`, branch `main`, root folder)
- Handoff notes: `progress.md` (state, traps, NOT verified). Global rules: `~/.claude/CLAUDE.md`.

## File map
- `index.html`: the whole app. CSS in `<style>`, JS in one `<script>` at the bottom. No libraries, no build step.
  - `CARD_LISTS`: the built-in "Basic" list (71 spectrum cards). Players can add their own lists on the menu; those live only in memory until the tab closes.
  - `gameState` + `GamePhase`: MENU → PSYCHIC_PREP (look-away overlay) → CLUE_ENTRY → GUESS_PHASE → COUNTER_GUESS → REVEAL → next turn, or GAME_OVER.
  - `setPhase()`: shows the right panel/overlay for each phase. `resolveRound()` / `calculateScore()`: scoring.
  - Dial: drawn on `#dialCanvas`. `resizeCanvas()` sizes it to `#dialContainer` (window resize + a ResizeObserver, because the panels above the dial change its height). `getAngleFromMouse()` maps touch/mouse to 0–180 degrees.
- `README.md`: GitHub showcase page (screenshots in `docs/screenshots/`).

## Game rules as built (don't change without Tim)
- Dial is 20 sections of 9 degrees. Target centre snaps to a section centre between 22.5 and 157.5 degrees.
- Scoring: bullseye ±4.5° = 4, ±13.5° = 3, ±22.5° = 2, else 0.
- Counter-guess: the other team gets 1 point for the right side, only when the guessers didn't get 4.
- The team that goes second starts with 1 bonus point. Play to 8/10/15/20 (default 10).
- Hinter rotates within each team; the first hinter and first team are random.
- Game over is checked when "Next Turn" is pressed. If both teams pass the target in the same round, the higher score wins (exact tie: Team 1 is shown as winner; see progress.md).

## Run locally
`python -m http.server 8110` in this folder (background), then open http://localhost:8110/. Opening `index.html` directly also works.

## Test
There is no test suite in the repo. Verify with headless WebKit only:
- `node ~/.claude/tools/phone-view.mjs http://localhost:8110/ --out shot.png` (and `--desktop`), stepping through with `--do click:...` / `fill:#clueInput=...`.
- Taps on the dial need real coordinates (the canvas centre is often outside the half-circle), so for the full flow use a small Playwright script with `page.touchscreen.tap` at `dialGeo` positions. `dialGeo`, `gameState`, `setPhase`, `nextRound` are globals, handy for `page.evaluate`.

## Deploy
Push to `main`; GitHub Pages serves it within a minute or two. Check with `python ~/.claude/hooks/live-check.py <this folder>`, then tell Tim to hard-refresh.

## Traps
- Every player-typed string (team, player, list and card names) must go through `escapeHtml()` before any `innerHTML`; `textContent` is fine as is.
- Identify the hinter by `team.hinterIndex`, not by name: two players can share a name.
- `.screen` uses `100vh` with a `100dvh` override so the dial isn't hidden under iPhone Safari's bottom toolbar. phone-view can't show that toolbar, so check on Tim's phone if the bottom of the dial looks cut off.
- The viewport meta has `user-scalable=no`; Lighthouse flags it as an accessibility fail. It likely stops accidental zoom while dragging the dial, so it was left alone (Tim's call).
- Port 8111 is often taken by other projects' local servers during sweeps; Wavelength uses 8110.
