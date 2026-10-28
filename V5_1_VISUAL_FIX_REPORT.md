# PELAGIC V5.1 — Visual Rendering Fix

## Why this revision exists
The user-provided Android screenshots showed a segmented, low-fidelity orange fish, detached-looking stripes/fins, an eye positioned toward the rear of the body, and overly flat surface-water negative space. This revision targets those observed defects rather than claiming a complete cinematic rebuild.

## Changes
- Replaced alternating stacked LatheGeometry body segments with a single smooth indexed mesh and per-vertex colors.
- Added contiguous orange/ivory bands with narrow dark margins on the same surface, a warmer underside, clearcoat material response and tail-weighted vertex-shader sway.
- Moved the eye assemblies toward the snout, layered socket/iris/pupil/catchlight, added low-contrast gill grooves, and added fin rays to the swept dorsal and fan tail.
- Animated the tail and pectoral joints continuously; kept reduced-motion amplitude lower.
- Added a chapter-responsive atmospheric background sphere with a gradient, restrained animated caustic pattern, and updated chapter exposure values to reduce washout.
- Kept the existing repository, eight chapters, existing HUD and Vercel project.

## Verification
- Automated verification is scheduled through `.github/workflows/pelagic-v51-verify.yml`: unit tests, TypeScript typecheck, production build, and asset-size report.
- Vercel preview and production build state must be read from the deployment API.
- A visual screenshot review and physical Android test have not been performed by this code change. Do not infer visual acceptance from a green build.
