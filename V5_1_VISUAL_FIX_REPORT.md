# PELAGIC V5.2 — Cinematic Canvas

## Changes in this revision
- Changed the default visual presentation from the low-poly animated cute-fish model to a scroll-linked canvas compositor backed by genuine underwater footage.
- Added five Pexels clips with individual chapter grades/crops: clownfish, coral reef, deep-water dive, jellyfish, and dark bioluminescent footage.
- Mapped eight ocean chapters to video source-time segments; uses a 16% cross-dissolve before each chapter boundary, gentle zoom drift, surface caustic overlay, moving marine snow, vignette and depth-dependent color grading.
- Footage remains animated when the user pauses scrolling; when scrolling, the active video's current time is scrubbed to match the chapter progress.
- Kept the prior Three.js scene on `?mode=webgl` and as an automatic fallback if all source videos fail.
- Existing HUD, depth rail, field notes, reduced-motion toggle and quality selector remain mounted.
- Added Chromium mobile QA that records source video readyState/currentTime/errors, HUD layout, and screenshots at surface, mid-descent, and Hadal.

## Validation status
- GitHub Actions must report success for unit tests, TypeScript, production build, and the Chromium mobile render QA before merging this branch.
- Verify the five remote clips actually decode from the Pexels CDN before promoting.
- This is a real-footage canvas composite, not a claim of a single 3D model swimming continuously through a physically simulated ocean.
