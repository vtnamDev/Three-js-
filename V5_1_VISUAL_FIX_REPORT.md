# PELAGIC V5.1 — Animated Fish & Rendering Overhaul

## Changes in this revision
- Switched the active hero from a homemade faceted fallback to Quaternius's rigged animated clownfish GLB (CC0-1.0), preserving six authored animation clips.
- Added a Three.js AnimationMixer adapter: normal swimming remains active at rest; fast swimming blends in with scroll speed; reduced-motion lowers animation speed.
- Recolored the four hero materials to warm orange, cream, deep brown and black; reduced metallic response and normalized/centered the model bounding box.
- Removed the 12.49 MB Barramundi hero binary from the deploy tree; the original procedural fish remains as a model-load fallback.
- Kept the eight-chapter experience, optional Grey Snapper school, chapter-gradient water backdrop, exposure adjustments and portrait camera side-view guard.
- Updated asset credits, current README and historical V4 reports so they no longer claim Barramundi is the current hero.

## Verification
- GitHub Actions run 40643822889 passed 6/6 unit tests, TypeScript check, production build and asset-size report for the previous visual-fix commit.
- This asset/animation integration must pass the newly triggered tests/typecheck/build before merge.
- Vercel preview deployment must be READY before production merge.
- Browser screenshots and physical Android tests are not available in this execution; visual acceptance and FPS on the target phone are not claimed.
