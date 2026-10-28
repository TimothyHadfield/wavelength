# Wavelength chat log

## 2026-10-27: improvement wave (builder, resumed after the 02:28 crash)
- **Asked:** layout first (Start Game + dial without scrolling), 400+ original cards, satisfying dial, sounds via `_fx`, table look via `_table`, online via `_online` (Online guard), keep pass-and-play, computer if sensible, `_profile` + `_pwa`. Ship in pieces.
- **Built (live):** 399d803 layout + 471 cards + saved lists; 6736641 dial, shutter reveal, fine adjust, sounds, table surface, settings, how to play; 37989e5 My stats, home-screen install/offline, resume after reload; dce8a75 reviewer fixes (laptop rim cut off, dial jump in the left/right step, result reason, fresh cards across games, rules in settings).
- **Not built:** online (≈ 500 writes/game; busy day 150% of free writes); computer (1.32 pts/clue vs 0.69 random, wrong half on 15 of 62 clear clues).
- **Verified:** `npm test` 9/9; e2e 22/22 and layout 30/30 in WebKit + Chrome; pwa-check 18/18 (4/18 without the kit); new checks failed on the old build first; live-check + phone-view on the live site (service worker active).
- **Open:** Tim's calls in progress.md.

## 2026-10-28: wave 3 "just make the games better" (builder)
- **Asked:** learn videos, official co-op mode, more cards if useful, practical settings, layout check.
- **Built:** 4 verified YouTube videos in How to play; Co-op switch (Settings → Game; 7 cards, no left/right, bullseye 3 + 1 card, rating table); guess timer Off/30/60/90 s; menu remembers names/players/Play to. Skipped: new card lists (471 is plenty), nudge buttons + sound switch + list ticks (already built).
- **Verified:** `npm test` 19/19 (co-op profile test failed first on the old profile-wl.js); e2e 32/32 WebKit + Chrome (old build crashes on the new checks); layout 30/30 WebKit + Chrome; pwa 18/18; sheets/menu screenshots at 393, 320, 659×393, 1440.
- **Open:** Tim's calls in progress.md (wave 3 line).
