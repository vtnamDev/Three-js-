# PELAGIC V5.2 — Cinematic Canvas

## Changes in this revision
- Replaced the low-poly cute-fish hero as the default presentation with real underwater footage composited through a scroll-linked canvas.
- Uses three Chromium-verified Pexels clips: clownfish among anemones (surface), tropical coral reef (blue garden/last sunlight), and dark bioluminescent jellyfish (five deeper chapters).
- The deep clip is time-mapped continuously across the twilight-to-Hadal chapters rather than resetting to an arbitrary close-up at every chapter boundary.
- Each chapter applies its own focus/crop, zoom, tint and darkness. The last 16% cross-dissolves between distinct clips; Canvas adds restrained surface caustics, drifting marine snow and vignette.
- While scrolling, video currentTime follows the relevant chapter segment. When scroll stops, muted footage continues as living ambience.
- Only the current and next clip are played; the existing quality control sets Canvas DPR, and low-resolution caps are applied on mobile.
- Kept the prior Three.js mode on `?mode=webgl` and as automatic fallback if all video clips fail.
- Kept the existing eight chapters, scroll track, HUD, field notes and reduced-motion setting.

## Validation
- GitHub Actions on this branch: unit tests and TypeScript pass; production build succeeds.
- Chromium verified all three MP4 sources decode (`readyState >= 2`) and captured 390×844 screenshots at surface, mid-descent and Hadal; HUD remains visible.
- The video pipeline is a photoreal-footage Canvas composite, not a claim of a physically simulated all-3D ocean. Physical-device FPS testing is not yet performed.
