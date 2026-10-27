# ASSET RESEARCH & LICENSE GATE — PELAGIC V4

Checked on: `2026-10-26`

## 1. Candidate Evaluation Matrix (0–5 per attribute, License Gate = PASS/FAIL)

Four real downloadable GLB fish/marine assets were retrieved, inspected at the binary glTF JSON/accessor level, and audited against their upstream license manifests.

| Candidate | Creator / Repository | Exact License & Proof | File Size & Geometry | PBR Maps & Extensions | Rig / Motion Readiness | Anatomy | Material | Motion | Import | Camera Read | License Gate | Decision |
|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|
| **1. `BarramundiFish.glb`** (*Lates calcarifer*) | Microsoft / Public via `KhronosGroup/glTF-Sample-Assets` (`Models/BarramundiFish/glTF-Binary/BarramundiFish.glb`) | **CC0-1.0** (`REUSE.toml` `SPDX-License-Identifier = "CC0-1.0"` and `Models/BarramundiFish/README.md`) | Raw `11.91 MB` (`2,188` verts; 3 uncompressed PNGs, optimizable to `< 3.5 MB` under CC0) | Core glTF 2.0 `baseColorTexture`, `metallicRoughnessTexture`, `normalTexture`, `occlusionTexture` | Clean longitudinal topology (`Z ∈ [-0.318, +0.325]`, snout at `-Z`, caudal blade at `+Z`, separated pectoral/dorsal/pelvic/anal fin regions); ideal for multi-bone `THREE.SkinnedMesh` + fin phase-lag rig | **5/5** | **5/5** | **4/5** (with custom 8-bone skinning + fin articulation) | **5/5** | **5/5** | **PASS** (CC0 permits modification, local hosting & ZIP redistribution) | **SELECTED — Primary Hero Fish** (`public/assets/fish/barramundi-hero.glb`) |
| **2. `greySnapper_vertColor.glb`** (*Lutjanus griseus*) | Babylon.js Team / Contributors via `BabylonJS/Assets` (`meshes/Demos/UnderWaterScene/fish/greySnapper_vertColor.glb`) | **CC-BY-4.0** (`BabylonJS/Assets/master/LICENSE` — Creative Commons Attribution 4.0 International) | `0.84 MB` (`1,515` verts; 3 compact PNGs) | Core glTF 2.0 `baseColorTexture`, `metallicRoughnessTexture`, `normalTexture`, `occlusionTexture` | Clean axis-aligned topology (`Z ∈ [-19.82, +20.35]`, snout at `+Z`, forked caudal fin at `-Z`); lightweight for GPU-instanced midwater schooling fish | **4/5** | **4/5** | **4/5** (shader swim wave) | **5/5** | **4/5** | **PASS** (CC-BY-4.0 permits modification & redistribution with attribution) | **SELECTED — Secondary Schooling Species** (`public/assets/fish/grey-snapper.glb`) |
| **3. `Q12296-1-2_animation_2.glb`** (*Oryzias latipes* Medaka) | `ffish.asia / floraZia.com` via `code4fukui/vr-medaka` | **CC0-1.0** (`vr-medaka/README.md` + Sketchfab CC0 specimen scan) | `1.46 MB` (`11,998` verts; 1 JPEG) | `baseColorTexture` only (`metallicFactor: 0.26`, no normal/roughness maps) | 39-bone `Armature` with `7.08s` swim clip (`117` channels) | **3/5** (freshwater ricefish specimen scan, not pelagic silhouette) | **2.5/5** (no normal or roughness map; flat under rim lighting) | **4.5/5** | **4.5/5** | **3/5** | **PASS** | **BACKUP ONLY** — Inferior pelagic silhouette and surface material response vs. Barramundi |
| **4. `shark.glb`** | `BabylonJS/Assets` (`meshes/shark.glb`) | **CC-BY-4.0** (`BabylonJS/Assets/master/LICENSE`) | `14.66 MB` (`27,440` verts; 4 PNGs) | Uses deprecated **`KHR_materials_pbrSpecularGlossiness`** (`pbrMetallicRoughness: {}`) | 31 joints, `swimming` (`1.97s`), `circling`, `bite` clips | **4.5/5** | **1/5** in modern Three.js (extension removed in `GLTFLoader`, loads untextured) | **4.5/5** | **2/5** (large + deprecated extension) | **3/5** | **PASS** | **REJECTED** — Deprecated glTF specular-glossiness extension breaks standard PBR import and exceeds size budget |

---

## 2. Why `BarramundiFish.glb` + Anatomical Multi-Bone Rig Wins (Fallback Ladder Step A)

Per `05_ASSET_RESEARCH_AND_LICENSES.md` Section 4 (*Fallback Ladder Step A: "Find a licensed model with strong anatomy but no clip, then add a meaningful skeletal/procedural tail/body animation if its topology/rig supports it"*):

1. **Anatomical & Material Superiority:** `BarramundiFish.glb` has authentic perciform pelagic proportions—distinct jaw/mouth, iris/cornea eye detail, operculum gill plate, lateral line, iridescent dorsal-to-ventral countershading, separate spiny and soft dorsal fins, pectoral fins, pelvic fins, anal fin, and a broad caudal fin—backed by full Core glTF 2.0 `baseColorTexture`, `normalTexture`, `metallicRoughnessTexture`, and `occlusionTexture`.
2. **Verified Vertex Anatomy for Skeletal Skinning:**
   - Snout tip at `z = -0.3177`, caudal fin trailing edge at `z = +0.3254` (total length `0.6431 m`).
   - Pectoral fins flare laterally at `z ∈ [-0.14, -0.02]`, `|x| ∈ [0.042, 0.074]`.
   - Dorsal fins rise to `y = 0.2866`; pelvic and anal fins descend to `y = -0.0009`.
   - Converting the mesh into a genuine `THREE.SkinnedMesh` bound to an **8-bone anatomical `THREE.Skeleton`** (`Head`, `AnteriorTrunk`, `MidTrunk`, `PosteriorTrunk`, `CaudalPeduncle`, `CaudalFin`, `PectoralLeft`, `PectoralRight`) plus secondary dorsal/anal fin phase-lag displacement gives real multi-joint carangiform propulsion, pectoral sculling, and gill breathing—even when `scrollProgress` is completely stationary.
3. **File Size Optimization under CC0-1.0:** Re-encoding the three uncompressed 2K PNG buffers inside `BarramundiFish.glb` reduces the binary payload from `11.91 MB` to `< 3.5 MB` (well under the `≤ 8 MB` target) while preserving sharp normal-mapped scale relief and wet biological roughness.
