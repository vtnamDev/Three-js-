# PELAGIC V9 â€” The Deep Descent

PELAGIC is a real-time Three.js/WebGL ocean journey controlled by native page scroll. The production path is the 3D renderer, not a stock-video canvas. It follows a fish through eight Vietnamese-titled depth chapters from the sunlit surface to the Hadal trench.

## V9 implementation

- A smooth CC0 Khronos Barramundi GLB is the primary hero. Its textures are converted to WebP; the runtime builds an articulated spine/pectoral rig and maintains gentle swimming while scroll is stationary.
- A spherical/orbit camera rig tracks the fish along a diagonal-and-lateral 3D descent. Fish position, camera, depth HUD, chapter title choreography and atmospheric parameters are driven by one normalized scroll progress value.
- src/experience/effectRegistry.ts contains 24 typed effect families, with chapter-specific selection, cleanup and quality-tier controls.
- The scene includes procedural caustics, ocean fog/lighting, geology, marine snow, bioluminescence, schooling fish, and resilient asset-loading fallbacks.
- Includes reduced-motion handling, responsive portrait camera framing, low/balanced/high quality profiles, keyboard controls, field notes and opt-in synthesized ocean audio.

## Local development

Requires Node.js 20+ and npm 10+.

    npm ci
    npm run typecheck
    npm test
    npm run dev

## Production build

    npm run build
    npm run preview

Vite emits static output in dist/. vercel.json configures the existing Vercel static deployment.¶»§q«^