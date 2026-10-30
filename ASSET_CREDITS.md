# PELAGIC V9 — ASSET CREDITS & OPEN-SOURCE LICENSES

Every 3D model, texture, audio synthesizer, and runtime dependency bundled in **PELAGIC V9 (`PELAGIC_V9_SOURCE.zip`)** carries a verified, permissive open-source or public-domain license allowing modification, redistribution, and commercial/public web deployment. Full byte-level metadata is tracked in `reports/ASSET_LICENSE_LEDGER.csv`.

---

## 1. Bundled 3D glTF / GLB Models (`public/assets/fish/`)

1. **Primary Hero Fish — `public/assets/fish/hero-barramundi.glb` (`655,992` bytes)**
   - **Original Asset**: `BarramundiFish` (*Lates calcarifer*)
   - **Source**: [Khronos Group `glTF-Sample-Assets` (`Models/BarramundiFish`)](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BarramundiFish)
   - **Author / Contributor**: Microsoft (donated to Khronos Group glTF Sample Assets)
   - **Exact License**: **CC0 1.0 Universal (Public Domain Dedication)** ([README license evidence](https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/Models/BarramundiFish/README.md))
   - **PELAGIC V9 Modifications**: Vertex-welded (`3,864` smooth indexed triangles), 1K PBR maps (`baseColor`, tangent `normal`, `occlusionRoughnessMetallic`) compressed to WebP via `@gltf-transform/cli`, and bound at runtime to a custom 10-bone `THREE.SkinnedMesh` axial/pectoral rig (`src/lib/fishSwim.ts`).

2. **Secondary Hero Fallback & Pelagic School — `public/assets/fish/grey-snapper.glb` (`880,316` bytes)**
   - **Original Asset**: `Grey Snapper` (*Lutjanus griseus*)
   - **Source**: [Poly Haven — `grey_snapper`](https://polyhaven.com/a/grey_snapper)
   - **Author / Contributor**: Poly Haven (`humgen` / Rico Cilliers & contributors)
   - **Exact License**: **CC0 1.0 Universal (Public Domain Dedication)** ([Poly Haven License](https://polyhaven.com/license))
   - **PELAGIC V9 Modifications**: Runtime sanitization strips non-albedo `COLOR_0` Blender rig-mask vertex attribute (`src/lib/fishSwim.ts`, `src/experience/OceanWorldBuilder.ts`) to restore accurate silver-copper scale PBR shading; used for Chapter `02–04` `InstancedMesh` schools and `?fish=fallback` secondary hero mode.

3. **Background Coral Reef School — `public/assets/fish/reef-tang-school.optimized.glb` (`216,056` bytes)**
   - **Original Asset**: Blue Reef Tang mesh from *Ultimate Modular Fish Pack*
   - **Source**: [Quaternius (`ultimatemodularfish`)](https://quaternius.com/packs/ultimatemodularfish.html)
   - **Author**: Tomas Laulhé (Quaternius)
   - **Exact License**: **CC0 1.0 Universal (Public Domain Dedication)**
   - **PELAGIC V9 Role**: Distant `THREE.InstancedMesh` coral-reef fish shoals (`E08`) in Chapters `01–03`.

4. **Legacy Audit Comparison Model — `public/assets/fish/clownfish-hero.optimized.glb` (`590,320` bytes)**
   - **Original Asset**: Quaternius CC0 Clownfish (PELAGIC V5 baseline)
   - **Exact License**: **CC0 1.0 Universal (Public Domain Dedication)**
   - **PELAGIC V9 Role**: **Demoted from runtime hero**; retained solely so auditors can run `/?autostart=1&fishStudio=neutral&fishCandidate=clownfish` to reproduce the V5 vs V9 studio comparison in `reports/FISH_ASSET_COMPARISON.md`.

---

## 2. Procedural Textures & Hydroacoustic Audio (Clean-Room First-Party Code)

- **Procedural Textures (`src/experience/proceduralTextures.ts`)**: `causticMap` (domain-warped multi-octave underwater caustics), `rockDetailNormalMap` (central-difference FBM tangent-space normal map), `sandBumpMap` (seamless benthic sediment ripples), and `glowSprite` (radial bioluminescent halo) are generated 100% deterministically in clean-room TypeScript at startup (**MIT**).
- **Hydroacoustic Synthesizer (`src/lib/oceanAudio.ts`)**: Real-time Web Audio API synthesis (filtered surface wash, mesopelagic resonance, abyssal sub-bass drone) using zero external audio recordings (**MIT**).

---

## 3. Core Open-Source Libraries & Architectural Inspiration Credits

- **Runtime Packages (`package.json`)**: `three` (**MIT**), `react` / `react-dom` (**MIT**), `lucide-react` (**ISC**), `motion` (**MIT**), `express` (**MIT**), `@google/genai` (**Apache-2.0**), `tailwindcss` (**MIT**), `vite` (**MIT**).
- **Clean-Room Engineering Patterns Studied**: Documented across 61 source-inspected repositories in `research/DEEP_REVIEW_40_PLUS.md` and `reports/RESEARCH_TO_IMPLEMENTATION_MAP.csv`, including `mrdoob/three.js` (MIT), `Yomotsu/camera-controls` (MIT), `donmccurdy/glTF-Transform` (MIT), `donmccurdy/three-gltf-viewer` (MIT), `KhronosGroup/glTF-Sample-Viewer` (Apache-2.0), `FarazzShaikh/THREE-CustomShaderMaterial` (MIT), `creativelifeform/three-nebula` (MIT), `darkroomengineering/lenis` (MIT), `gkjohnson/three-mesh-bvh` (MIT), and `hughsk/glsl-noise` (MIT). No third-party demo websites or unlicensed shaders/assets were copied.
