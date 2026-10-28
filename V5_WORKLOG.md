# PELAGIC V5 Worklog

## Source
- Repository: https://github.com/vtnamDev/Three-js-
- Base commit: 67309e638bbb97a71eae257ed6a91f5c8d156bec

## Changes
- Switched the hero away from the long barramundi GLB to locally authored procedural geometry.
- Shortened and rounded the fallback body proportions; changed palette to warm amber/orange with a pale belly and brighter fins; enlarged eyes slightly.
- Kept the existing eight-chapter scroll timeline, render loop, quality tiers, reduced-motion handling and optional secondary school fish.
- Hero no longer waits on the barramundi network request; secondary model remains non-blocking.

## Verification
- Source changes prepared on branch feat/pelagic-v5-golden-reef-fish.
- Local npm ci: timed out before dependencies were installed.
- npm test / typecheck / build: NOT RUN due incomplete dependency installation.
- Browser screenshot review, FPS measurement and physical Android test: NOT RUN.
- Vercel preview/deployment: pending.

## Known limitations
- Procedural fish is stylized, not a photoreal scanned clownfish.
- Environmental VFX, grass density, mobile framing and two-cycle screenshot review remain to be completed before visual acceptance.
