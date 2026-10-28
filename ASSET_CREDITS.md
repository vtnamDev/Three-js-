# ASSET CREDITS & LICENSING LEDGER

All 3D models, textures, shaders, and fonts used in **PELAGIC — THE DEEP DESCENT** have verified, permissive open licenses suitable for commercial/public web deployment on Vercel and source distribution. Zero assets were copied from `MoncyDev/Portfolio-Website`.

---

## 1. V5 Hero — original procedural rounded reef fish (`src/lib/fishSwim.ts`)

- **Model Title:** Original procedural rounded reef fish, inspired by warm clownfish coloration.
- **Author / Origin:** Authored in project source using Three.js geometry/materials; no third-party hero mesh is bundled.
- **License:** Original implementation code; not a scanned or species-certified model.
- **Runtime:** Local procedural geometry with warm orange body, pale belly, animated tail and pectoral fins. The previous CC0 barramundi GLB remains only as a rollback file and is no longer loaded as the hero.

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
