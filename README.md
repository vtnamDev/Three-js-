# PELAGIC V9 — Hành Trình Chạm Đáy Đại Dương (`0m → 10,920m`)

**PELAGIC — The Deep Descent (V9)** is a production-grade, real-time **Three.js / WebGL** interactive ocean expedition descending through **8 canonical ocean depth zones** from sunlit surface caustics (`0m`) down to the Challenger Deep Hadal sanctuary (`10,920m`).

---

## 1. Key V9 Highlights

- **High-Fidelity CC0 3D Hero Fish + 10-Bone `SkinnedMesh` Rig**:
  - Primary hero: **`public/assets/fish/hero-barramundi.glb`** (`3,864` smooth welded triangles + 1K WebP PBR `baseColor`, tangent `normalMap`, and `ORM` maps — Khronos `glTF-Sample-Assets` **CC0-1.0**).
  - Deformed in real time by a 10-bone hierarchical `THREE.Skeleton` (`8` axial spine/caudal joints + `2` pectoral fin joints) with smooth Gaussian skin weights, continuous idle swimming during scroll pauses, and depth-adaptive dorsal caustics / bioluminescent rim shading.
  - 3-tier resilient loader: `hero-barramundi.glb` → `grey-snapper.glb` (`?fish=fallback`, Poly Haven **CC0-1.0**) → procedural organic fallback mesh.
- **Spherical Orbital Camera Rig & 3D Diagonal-Lateral Descent**:
  - Sweeping 3D `CatmullRomCurve3` trajectory descending diagonally and laterally (`> 7.5m` lateral X span, `> 85m` forward Z span) with natural oblique pitch (`[-22°, -2°]`) and turn banking.
  - Gimbal-free spherical camera choreography (`orbitAzimuthDeg ∈ [58°, 118°]` + `Quaternion.slerp`), crane/dolly reveals, and automatic portrait mobile pullback (`360px` / `390px`).
- **8 Canonical Chapters & 24 Real Runtime Effects (`E01–E24`)**:
  1. `01` **Mặt Nước Ánh Dương** (*Sunlit Surface*, `0m–40m`, `clip-rise`)
  2. `02` **Vườn Xanh Đại Dương** (*Blue Ocean Garden*, `40m–110m`, `horizon-wipe`)
  3. `03` **Tia Nắng Cuối** (*Last Sunlight*, `110m–220m`, `split-descent`)
  4. `04` **Vùng Chạng Vạng** (*The Twilight Zone*, `220m–700m`, `stagger-track`)
  5. `05` **Nửa Đêm Đại Dương** (*Midnight Zone*, `700m–2,200m`, `abyss-focus`)
  6. `06` **Đồng Bằng Vực Sâu** (*Abyssal Plain*, `2,200m–4,800m`, `sediment-line`)
  7. `07` **Hẻm Vực Thẳm** (*Abyssal Canyon*, `4,800m–8,200m`, `canyon-shear`)
  8. `08` **Đáy Rãnh Hadal** (*Hadal Trench Sanctuary*, `8,200m–10,920m`, `hadal-sanctuary`)
- **Adaptive Performance & Accessibility**:
  - Automatic `high` / `medium` / `low` quality profiles (`dprCap`, MSAA, particle & school scaling), software-WebGL detection, chapter visibility culling, full `prefers-reduced-motion: reduce` support, keyboard navigation, and zero-binary Web Audio synthesis.

---

## 2. Prerequisites & Local Quickstart

- **Node.js**: `>= 20.11` (tested on Node `22.x` LTS)
- **npm**: `>= 10.x`

```bash
# 1. Unpack the standalone source archive (if starting from ZIP)
unzip PELAGIC_V9_SOURCE.zip -d pelagic-v9
cd pelagic-v9

# 2. Install dependencies deterministically from package-lock.json
npm ci
# (or `npm install` if updating lockfile)

# 3. Run fast unit tests (9 suites) & strict TypeScript check
npm test
npm run typecheck

# 4. Start full-stack Express + Vite dev server on http://localhost:3000
npm run dev
```

---

## 3. Production Build & Manual Deployment Guide

PELAGIC V9 supports **two deployment topologies** out of the box:

### Option A — Static Hosting (Vercel Static, Cloudflare Pages, Netlify, GitHub Pages, S3/CDN)
The entire 3D WebGL experience, 8 ocean chapters, 24 effects, HUD, and Web Audio synthesizer run **100% client-side** with zero backend requirements:

```bash
npm ci
npm run build
# Deploy the generated `dist/` directory to any static host!
# Local static preview:
npm run preview
```
*(Note: `vercel.json` is pre-configured for SPA routing on Vercel.)*

### Option B — Full-Stack Node.js Server (Cloud Run, Railway, Render, Fly.io, Docker/VPS)
Running `server.ts` serves the built `dist/` bundle **plus** optional backend routes (`/api/pelagic-notes` AI Marine Biology Field Notes and `/api/source-files`):

```bash
npm ci
npm run build
# Optional: copy .env.example to .env and set GEMINI_API_KEY=<your_key> for AI Field Notes
NODE_ENV=production PORT=3000 npx tsx server.ts
```

---

## 4. Diagnostic & QA Query Parameters

| Query Parameter | Purpose |
| --- | --- |
| `?autostart=1` | Skips the intro overlay directly into the live 3D ocean experience |
| `?fish=fallback` | Forces secondary CC0 hero GLB (`grey-snapper.glb`) rigged with the same 10-bone `SkinnedMesh` |
| `?quality=low\|medium\|high` | Overrides automatic hardware quality tier detection |
| `?fishStudio=neutral&fishCandidate=barramundi\|snapper\|clownfish\|tang` | Opens neutral 3-point PBR studio harness used for `reports/fish-model-review/` |

---

## 5. Project Structure & Evidence Reports

- `src/lib/` — Pure math, 8-chapter config (`chapterConfig.ts`), 3D spline & spherical camera rig (`fishPath.ts`), 10-bone skeletal swim wave (`fishSwim.ts`), scroll damping (`scrollDirector.ts`), quality tier (`qualityTier.ts`), Web Audio (`oceanAudio.ts`), and unit tests (`pelagicLogic.test.ts`).
- `src/experience/` — `OceanSceneController.ts`, `OceanWorldBuilder.ts`, `effectRegistry.ts` (`E01–E24`), `proceduralTextures.ts`, `OceanCanvas.tsx`, and optional `CinematicReel.tsx`.
- `src/ui/` — `DepthHUD.tsx`, `IntroOverlay.tsx`, `MarineNotesDrawer.tsx`, `SourceCodeModal.tsx`.
- `public/assets/fish/` — Locally bundled CC0 3D GLB models (`hero-barramundi.glb`, `grey-snapper.glb`, `reef-tang-school.optimized.glb`).
- `research/` — `REPOSITORY_LEDGER.csv` (`332` seeds -> `276` verified -> `246` shallow-cloned) & `DEEP_REVIEW_40_PLUS.md` (`61` source-inspected repos).
- `reports/` — Full audit, choreography, 24-effect matrix, license ledger, QA Cycle 1 & Cycle 2 reports + screenshots, test report, and final scorecard.
