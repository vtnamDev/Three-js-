# ASSET CREDITS & LICENSING LEDGER

All 3D models, textures, shaders, and fonts used in **PELAGIC — THE DEEP DESCENT** have verified, permissive open licenses suitable for commercial/public web deployment on Vercel and source distribution. Zero assets were copied from `MoncyDev/Portfolio-Website`.

---

## 1. Hero Fish — Quaternius Animated Clownfish (public/assets/fish/clownfish-animated.glb)

- **Model Title:** Clownfish from the Animated Cute Fish Pack.
- **Creator:** Quaternius.
- **Source page:** https://quaternius.com/packs/cutefish.html
- **Source file mirror:** https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/cute_fish_pack/Clownfish.glb
- **License:** **CC0-1.0**, as listed for the cute_fish_pack in the source pack's LICENSES.md. This is the model asset license, separate from the showcase code license.
- **Original asset size:** approximately 169 KB (168,854 bytes).
- **Rig / animation evidence:** one skinned mesh, six-joint armature plus endpoint, and six embedded clips: Swimming_Normal, Swimming_Fast, Swimming_Impulse, Attack, Death, and Out_Of_Water.
- **PELAGIC modifications:** runtime material color/roughness/metalness tuning, model scale normalization, centered pivot, normal/fast swim blending, and subtle idle movement. The underlying mesh and animation clips are not re-authored.
- **Attribution:** not required under CC0, but retained here for provenance and auditability.

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

---

## V5.2 Cinematic footage (Pexels)

The default cinematic mode composites real underwater footage into a scroll-linked canvas. Video footage remains hosted by Pexels and is streamed at runtime; no unaltered video files are redistributed inside this repository. Pexels' official license permits free use and modification in websites/apps; attribution is not required but creator/source links are kept here for provenance. Verify the latest terms at https://www.pexels.com/license/ before commercial republishing.

- **Clownfish surface scene:** Across Wong, “Underwater video of clownfish” — https://www.pexels.com/video/underwater-video-of-clownfish-7008971/
- **Coral reef and tropical fish:** Alex Mesel, “Underwater footage of tropical fish in a coral reef” — https://www.pexels.com/video/underwater-footage-of-tropical-fish-in-a-coral-reef-11273418/
- **Deep-water dive:** JUN HO LEE, “Deep Blue Dive: Underwater Exploration Adventure” — https://www.pexels.com/video/deep-blue-dive-underwater-exploration-adventure-35588135/
- **Jellyfish scene:** Pexels, “Jellyfish swimming in the ocean” — https://www.pexels.com/video/jellyfish-swimming-in-the-ocean-8950645/
- **Dark bioluminescent scene:** Nothing Ahead, “Jellyfish in the dark with green and blue lights” — https://www.pexels.com/video/jellyfish-in-the-dark-with-green-and-blue-lights-17177445/

**Rendering distinction:** the cinematic mode uses genuine footage plus Canvas grading, caustics, particles, dark-water atmosphere and scroll-controlled cross-dissolves. It is not represented as a physically simulated, fully 3D ocean or a single continuously modelled fish.