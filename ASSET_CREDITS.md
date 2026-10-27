# ASSET CREDITS & LICENSING LEDGER

All 3D models, textures, shaders, and fonts used in **PELAGIC — THE DEEP DESCENT** have verified, permissive open licenses suitable for commercial/public web deployment on Vercel and source distribution. Zero assets were copied from `MoncyDev/Portfolio-Website`.

---

## 1. Primary Hero 3D Fish Model (`public/assets/fish/barramundi-hero.glb`)

- **Model Title:** Barramundi Fish (`Lates calcarifer`)
- **Author / Origin:** Microsoft / Khronos Group (`KhronosGroup/glTF-Sample-Assets`)
- **Source URL:** `https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BarramundiFish`
- **License:** **CC0 1.0 Universal (Public Domain Dedication)**
- **License Verification:** Verified directly in upstream `Models/BarramundiFish/README.md` (`License Information: Donated by Microsoft for glTF testing, licensed under CC0 1.0`) and repository `REUSE.toml` (`SPDX-License-Identifier = "CC0-1.0"`).
- **Modifications Made for PELAGIC V4:**
  - The deployment bootstrap restores the original upstream GLB from the official Khronos repository; this version is larger than the optimized Barramundi GLB in the original source ZIP (`baseColor` RGBA `PNG32` `1536×1536` preserving translucent fin-ray alpha; `occlusionRoughnessMetallic` and `normal` `PNG24` `1024×1024`).
  - Bound at runtime in `src/lib/fishSwim.ts` to a custom **10-bone `THREE.Skeleton` (`THREE.SkinnedMesh`)** with 8 axial spine bones + 2 pectoral fin bones and custom `onBeforeCompile` dorsal/anal/caudal fin membrane ripple + gill operculum breathing.

---

## 2. Secondary Schooling 3D Fish Model (`public/assets/fish/grey-snapper.glb`)

- **Model Title:** Grey Snapper (`Lutjanus griseus` — `greySnapper_vertColor.glb`)
- **Author / Origin:** Babylon.js Team (`Patrick Ryan` / Microsoft contributors, `BabylonJS/Assets`)
- **Source URL:** `https://github.com/BabylonJS/Assets/blob/master/meshes/Demos/UnderWaterScene/fish/greySnapper_vertColor.glb`
- **License:** **Creative Commons Attribution 4.0 International (CC BY 4.0)**
- **License Verification:** Verified directly in upstream `BabylonJS/Assets/LICENSE.md` (`Creative Commons Attribution 4.0 International`).
- **Attribution Statement:** *"Grey Snapper 3D model from the Babylon.js Assets repository by the Babylon.js Team, licensed under CC BY 4.0."*
- **Modifications Made for PELAGIC V4:**
  - Normalized scale (`0.95 m` body length) and augmented with a lightweight GPU vertex tail-propulsion shader for pelagic schooling orbits in Chapters 01–03.

---

## 3. Procedural Environment Textures, Shaders & Lighting

- **Geological Bump/Roughness Maps, Caustics & Marine Snow Sprites (`src/experience/proceduralTextures.ts`):**
  - Authored from scratch for this project (`100%` procedural `HTMLCanvasElement` -> `THREE.CanvasTexture`, zero external image fetches).
- **PBR Environment Illumination (`RoomEnvironment`):**
  - Provided by `three` (`three/addons/environments/RoomEnvironment.js`), **MIT License**.

---

## 4. Typography

- **Cormorant Garamond**, **Plus Jakarta Sans**, and **JetBrains Mono** served via Google Fonts (**SIL Open Font License 1.1**).
