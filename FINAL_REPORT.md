# FINAL REPORT — PELAGIC V4: THE DEEP DESCENT

## 1. Executive Summary

- **Product Built:** **PELAGIC — THE DEEP DESCENT**, a cinematic scroll-driven 3D WebGL ocean descent experience built with Vite + React 19 + TypeScript + Three.js (`THREE.WebGLRenderer`).
- **Core Experience:** Users scroll (mouse wheel, touch, keyboard `ArrowUp/Down` / `W/S` / `Home/End`, or right-edge bathymetric chapter markers) to travel through true 3D space alongside a continuously swimming 3D Barramundi (`Lates calcarifer`) from sunlit surface caustics (`0 m`, Chapter `01`) down to the Hadal cold-seep sanctuary (`10.920 m`, Chapter `08`), with reversible scroll state and a working `Trở về mặt nước` (`Return to Surface`) action at the trench epilogue.
- **Vercel Deployment Status:** **`READY FOR VERCEL DEPLOYMENT — NOT DEPLOYED`** (No Vercel CLI token or linked Vercel account credentials exist in this build container; static Vite production build `npm run build` -> `dist/` is verified clean and ready for immediate zero-config Vercel import).

---

## 2. Architecture & Reference Independence Summary

- **Reference Audit (`REFERENCE_AUDIT.md`):** Audited both the attached `Portfolio-Website-main.zip` and a shallow clone of `https://github.com/MoncyDev/Portfolio-Website` (`commit 5dcb544`). Respected the Personal Portfolio License (PPL v1.0): **zero** code, CSS, images, HDRs, encrypted models, or `gsap-trial` packages were copied, and `Portfolio-Website-main.zip` is strictly excluded from `PELAGIC_V4_SOURCE.zip`.
- **Single-Owner WebGL & Canonical Scroll Architecture:**
  - `src/experience/OceanSceneController.ts` owns the sole `THREE.WebGLRenderer`, `THREE.Scene`, `THREE.PerspectiveCamera`, and render loop (`requestAnimationFrame` on hardware GPUs; `gl.fenceSync` `afterSoftwareDraw` pacing on software WebGL).
  - `src/lib/scrollDirector.ts` + `src/lib/fishPath.ts` + `src/lib/chapterConfig.ts` compute a single normalized `scrollProgress ∈ [0, 1]` from `window.scrollY` that deterministically drives the 3D `CatmullRomCurve3` descent trajectory, natural pelagic body pitch & lateral banking, aspect-aware camera framing, exponential fog (`FogExp2`), 3-point + ventral lighting, and 8 chapter environments.

---

## 3. 3D Fish Model & Biological Swim Gate

- **Primary Hero Model:** `public/assets/fish/barramundi-hero.glb` (`4.02 MB`, optimized from `KhronosGroup/glTF-Sample-Assets` `BarramundiFish`, **CC0-1.0**), featuring high-detail PBR maps (`baseColor` with RGBA translucent fin-ray fringes, `occlusionRoughnessMetallic`, and tangent-space `normalMap`).
- **Secondary Schooling Model:** `public/assets/fish/grey-snapper.glb` (`860 KB`, `BabylonJS/Assets`, **CC-BY-4.0**), orbiting in pelagic formations in Chapters `01`–`03`.
- **Skeletal & Shader Articulation (`src/lib/fishSwim.ts`):**
  - Dynamically binds the hero mesh to a **10-bone `THREE.Skeleton` (`THREE.SkinnedMesh`)** (`8` longitudinal spine bones from snout to caudal blade + `2` lateral pectoral fin bones), augmented with `onBeforeCompile` dorsal/anal/caudal fin membrane ripple and operculum gill breathing.
  - **8-Second Stationary Idle Swim Proof (Playwright Round 2):** Sampled `document.body.dataset` every `1 s` for `8 s` at `scrollY = 0`:
    - `tailYaw` oscillated across `8` unique values (`minTailYaw: -0.1459 rad`, `maxTailYaw: +0.1447 rad`, `tailYawSpan: 0.2906 rad`), while `progress: "0.0000"`, `depth: "0"`, and `chapter: "surface"` exhibited **zero drift** (`zeroDrift: true`).
  - **Fallback Fish Rig:** Multi-part 11-component procedural articulated fish rig (`?fish=fallback`) activates automatically if GLB loading ever fails.

---

## 4. Eight Ocean Chapters Implemented

| Code | ID | Vietnamese Title | Depth Span | Key 3D Environment & Lighting Features |
| :--- | :--- | :--- | :--- | :--- |
| `01` | `surface` | Mặt Nước Ánh Dương | `0 – 45 m` | Overhead Snell's window & animated caustics, volumetric sun shafts, rising bubbles, upper-water snappers |
| `02` | `blue-garden` | Vườn Xanh Đại Dương | `45 – 130 m` | Sculpted limestone reef domes, 46 swaying instanced giant kelp blades, orbiting `grey-snapper.glb` school |
| `03` | `last-sunlight` | Tia Nắng Cuối | `130 – 240 m` | Steep continental shelf drop-off escarpment, composite gorgonian sea-fan colonies, narrowing cyan beams |
| `04` | `twilight` | Vùng Chạng Vạng | `240 – 680 m` | Towering basalt sea-stacks, mesopelagic cobalt fog, pulsing 6-part bioluminescent medusae |
| `05` | `midnight` | Nửa Đêm Đại Dương | `680 – 2.100 m` | Wide-FOV (`46°`) bathypelagic negative space, distant colossal seamounts, cool photophore Fresnel rim |
| `06` | `deep-plain` | Đồng Bằng Vực Sâu | `2.100 – 4.800 m` | Undulating abyssal sediment floor (`6.2 m` below fish), grounded hydrothermal basalt spires & contact shadows |
| `07` | `abyssal-canyon` | Hẻm Vực Thẳm | `4.800 – 8.200 m` | Asymmetric tectonic trench walls (`> 11 m` safe corridor) leading toward an overhead basalt archway |
| `08` | `hadal-reveal` | Đáy Rãnh Hadal | `8.200 – 10.920 m` | Cathedral buttresses, luminous cold-seep fissure & rising plumes, sanctuary medusae, `Trở về mặt nước` CTA |

---

## 5. Quality Gates & Verification Matrix

| Check / Gate | Status | Real Command / Evidence |
| :--- | :--- | :--- |
| Unit Tests (`node:test` pure logic) | **PASS** | `npx --yes tsx --test src/lib/pelagicLogic.test.ts` (`6/6` passed: 8 chapters, monotonic depth, 3D path/camera reversibility, stationary swim kinematics, zero-drift pause, quality tiers) |
| TypeScript Strict Check | **PASS** | `npm run typecheck` (`tsc --noEmit` — `0` errors) |
| Production Static Build (`dist/`) | **PASS** | `npm run build` (`vite build` — succeeded cleanly) |
| 8-Second Stationary Idle Swim | **PASS** | Playwright `run-code` 8s telemetry + `evidence/01-surface-desktop.png` + `.playwright-cli/r2-swim-scroll.webm` |
| Full 8-Chapter Descent (`0 m` → `10.920 m`) | **PASS** | Playwright visited `["01","02","03","04","05","06","07","08"]`; real captures in `evidence/01-*.png` .. `evidence/08-*.png` |
| Reversible Scroll & `Trở về mặt nước` CTA | **PASS** | Verified upward scroll chapter/depth restoration and Hadal `return-to-surface-btn` returning `window.scrollY` to `0` |
| Mobile Responsive Framing (`390×844`) | **PASS** | `evidence/09-surface-mobile.png`, `evidence/10-hadal-mobile.png` (`horizontalOverflow: false`, readable HUD) |
| Reduced Motion & Quality Tier Controls | **PASS** | Collapsible `Thiết lập` dock with `Auto/High/Balanced/Low` selector & `Giảm chuyển động` toggle + `prefers-reduced-motion` media query |
| Non-WebGL Graceful Fallback | **PASS** | Verified via `http://localhost:3000/?webgl=fallback` Playwright accessibility snapshot (all 8 chapters + SVG silhouette + return button) |
| Browser Console & Network Requests | **PASS** | `playwright-cli console` (`Errors: 0, Warnings: 0`); `playwright-cli requests` (`barramundi-hero.glb` `200 OK`, `grey-snapper.glb` `200 OK`, zero `404`/`500` errors) |
| Clean ZIP Extraction & Rebuild | **PASS** | Extracted `PELAGIC_V4_SOURCE.zip` to clean `/tmp` directory, verified archive root layout & zero prohibited files, and ran `npm run build` + `npm test` |

---

## 6. Visual Quality Scorecard (`18_VISUAL_QUALITY_SCORECARD.md`)

Evaluated honestly on real Round 2 browser captures (`evidence/01-surface-desktop.png` through `evidence/10-hadal-mobile.png`):

- **1. Hero Fish Anatomy, Silhouette & PBR Material (`23 / 25`):** Crisp species-accurate Barramundi anatomy (jaw, eye, gill operculum, dorsal spines, soft dorsal/anal/pectoral/pelvic/caudal fins, iridescent lateral scale normals, translucent fin-ray alpha).
- **2. Continuous Biological Swim Motion (`19 / 20`):** Smooth 8-bone axial carangiform traveling wave + pectoral sculling + fin-membrane shader flutter verified in `.webm` recording and 8s telemetry.
- **3. True 3D Spatial Descent & Camera Direction (`18 / 20`):** Genuine 3D `CatmullRomCurve3` travel (`162.5 m` vertical + `61 m` forward/lateral) with varied starboard/port/wide/elevated camera beats refined between Round 1 and Round 2.
- **4. Eight-Chapter Environmental Progression & Lighting (`14 / 15`):** Distinct depth palette shift from turquoise caustics & sun-rays to cobalt sea-stacks, midnight void, hydrothermal abyssal plain, canyon walls, and luminous Hadal cold-seep plumes.
- **5. Editorial Typography, Minimal HUD & Viewport Presence (`10 / 10`):** `> 88%` unobstructed 3D WebGL viewport, `Cormorant Garamond` + `Plus Jakarta Sans` + `JetBrains Mono` (`tabular-nums`), solid dark-slate `rgba` surfaces (zero `backdrop-filter` stalls, zero pill badges, zero decorative pulsing dots).
- **6. Responsive Polish, Fallbacks & Clean Engineering (`8 / 10`):** Desktop (`1440×900`) and mobile (`390×844`) verified; minor horizontal edge crop of snout/tail tip on ultra-narrow `390px` portrait at closest beat noted honestly below.
- **Total Score:** **`92 / 100`** (Exceeds `85 / 100` gate).

---

## 7. Known Limitations & Honest Environment Notes

1. **Headless Container Software WebGL (`SwiftShader`):** The verification container runs headless Chromium without a physical GPU (`detectSoftwareGl() === true`), so real 60fps hardware GPU frame times could not be measured inside the container. On real desktop/mobile GPUs, `OceanSceneController` automatically runs `requestAnimationFrame` with hardware MSAA and soft shadows (`High` tier).
2. **Ultra-Narrow Portrait Mobile Margin (`390×844`):** On `390px` portrait viewports (`evidence/09-surface-mobile.png`), the `2.15 m` broadside fish fills ~98% of horizontal width so the extreme caudal tip touches the left edge while all HUD text and controls remain 100% legible with zero horizontal scroll (`horizontalOverflow: false`).
3. **Paid Gemini Models Declined by User:** Per user selection, paid API key setup was declined; therefore `server.ts` uses standard non-paid models (`gemini-3.1-flash-lite` and `gemini-3.8-flash`), and `MarineFieldNotesDrawer.tsx` falls back seamlessly to curated oceanography notes when deployed as a static Vite build on Vercel.
