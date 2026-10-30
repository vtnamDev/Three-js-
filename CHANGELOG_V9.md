# CHANGELOG — PELAGIC V9 (`v9.0.0`)

## Summary

Major production upgrade from **PELAGIC V5** to **PELAGIC V9**, resolving all visual failure modes in the reference audit (`BUG-01..BUG-07`) and all Cycle 1 QA findings (`C1-01..C1-05`).

---

## Added

- **Primary CC0 PBR 3D Hero Fish (`public/assets/fish/hero-barramundi.glb`)**: Bundled `3,864`-triangle smooth welded Khronos `BarramundiFish` (`655,992` bytes) with 1K WebP `baseColor`, tangent-space `normalMap`, and `ORM` maps (`9.2/10` studio score).
- **10-Bone Hierarchical `SkinnedMesh` Rig (`src/lib/fishSwim.ts`)**: `8` axial spine/caudal joints + `2` articulated pectoral fin joints with unit-normalized 4-joint Gaussian skin weights, active idle biological swimming during scroll pauses, and depth-adaptive dorsal caustic shimmer (`E20`, `E21`).
- **24-Effect Runtime Registry (`src/experience/effectRegistry.ts`)**: Full typed implementation of `E01..E24` (`OceanEffectRegistry` + `OceanWorldBuilder`) with `high` / `medium` / `low` quality tier scaling, `prefers-reduced-motion: reduce` damping, and deterministic GPU disposal.
- **Neutral 3D Studio Harness (`?fishStudio=neutral&fishCandidate=...`)**: Deterministic 3-point PBR studio mode in `src/experience/OceanSceneController.ts` for objective candidate scoring.
- **Open-Source Research & QA Deliverables (`research/*`, `reports/*`)**: 332-seed `REPOSITORY_LEDGER.csv` (`276` verified canonical repos, `246` shallow clones), 61-repo `DEEP_REVIEW_40_PLUS.md`, `RESEARCH_TO_IMPLEMENTATION_MAP.csv`, `EFFECT_IMPLEMENTATION_MATRIX.csv`, `ASSET_LICENSE_LEDGER.csv`, `QA_CYCLE_1.md`, `QA_CYCLE_2.md`, `TEST_REPORT.md`, and `FINAL_SCORECARD.md`.

## Changed

- **Spherical Orbital Camera Rig (`src/lib/fishPath.ts`)**: Replaced V5 Cartesian camera offset lerping (which flipped behind the fish tail at `p=0.24` & `p=0.90`) with spherical `orbitAzimuthDeg ∈ [58°, 118°]` + `Quaternion.slerp`, crane/dolly reveals (`E13–E16`), diagonal-lateral `CatmullRomCurve3` descent (`pitch ∈ [-22°, -2°]`), and portrait mobile camera pullback.
- **8 Canonical Chapters & Title Choreography (`src/lib/chapterConfig.ts`, `src/ui/DepthHUD.tsx`, `src/index.css`)**: Restored canonical Vietnamese/English chapter names (`01` Mặt Nước Ánh Dương → `08` Đáy Rãnh Hadal, `0m → 10,920m`), authored 8 unique progress-driven reveal transitions (`E18`) with `-24%` vertical clip-path headroom for Vietnamese diacritics (`C1-03`), tightened asymmetric `trailOutOverlap = 0.012` to prevent overhead reef-skirt ghosting (`C1-02`), and compacted the mobile bottom dock into a single clean row (`C1-05`).
- **3D Geological & Ecological World (`src/experience/OceanWorldBuilder.ts`, `src/experience/proceduralTextures.ts`)**: Replaced floating reef planes, cramped Ch03 right wall, and Ch06 radial cylinder spokes with skirted reef terraces, height-clamped kelp frond towers (`0 NaN` bounding spheres, `C1-01`), open Ch03 continental shelf drop-off vista, domain-warped seamless caustics, `COLOR_0`-sanitized pelagic snapper schools (`C1-04`), pulsing medusae, FBM benthic basins, basalt sea-stacks, canyon arches, and Hadal cold-seep plumes.
- **Build & Packaging (`vite.config.ts`, `server.ts`, `src/ui/SourceCodeModal.tsx`)**: Switched `vite.config.ts` to `import.meta.dirname` (fixing Vite 8 ESM warning `BUG-07`) and updated source archive endpoints to `/PELAGIC_V9_SOURCE.zip`.

## Removed

- Deleted obsolete `PELAGIC_V5_SOURCE.zip` and `public/PELAGIC_V5_SOURCE.zip` archives and demoted `clownfish-hero.optimized.glb` from default runtime loading.
