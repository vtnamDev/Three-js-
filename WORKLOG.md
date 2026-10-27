# WORKLOG — PELAGIC V4: THE DEEP DESCENT

### T00 — Workspace & tool inventory
- **Status:** PASS
- **Files changed:** `metadata.json`, `index.html`, `WORKLOG.md`
- **Commands/tools actually used:** `view_file` (`package.json`, skills), `run_command` (`unzip`, `ls -la`, `git clone`)
- **Evidence:** Workspace uses Vite `^8.3.0`, React `^19.0.1`, TypeScript `^7.0.2`, Tailwind CSS `^4.3.3`, Express `^4.21.2`, `@google/genai` `^2.4.0`. Installed `three` and `@types/three` cleanly via `install_applet_package`. Headless Chromium + `playwright-cli` and outbound GitHub access verified.
- **Failure or limitation:** None.
- **Next exact action:** Complete reference source audit (`T01`) and candidate fish-model research (`T03`).

### T01 — Reference audit & license boundary
- **Status:** PASS
- **Files changed:** `REFERENCE_AUDIT.md`
- **Commands/tools actually used:** `run_command` (`unzip` of `Portfolio-Website-main.zip` to `/tmp/portfolio_ref`, `git clone --depth 1 https://github.com/MoncyDev/Portfolio-Website.git /tmp/moncy_github_clone` at commit `5dcb544`, inspected `README.md`, `LICENSE`, `package.json`, `Scene.tsx`, `character.ts`, `animationUtils.ts`, `lighting.ts`, `resizeUtils.ts`, `GsapScroll.ts`, `Loading.tsx`, `LoadingProvider.tsx`)
- **Evidence:** Documented Personal Portfolio License (PPL v1.0) restrictions, excluded `gsap-trial` and all proprietary reference assets (`character.enc`, `character.glb`, `char_enviorment.hdr`, `/public/images/*`), and cataloged 6 lifecycle/performance defects in the reference (`Math.random` loader timer, uncancelled RAF, inline arrow listener leaks, unbounded DPR) to avoid in PELAGIC V4.
- **Failure or limitation:** None.
- **Next exact action:** Evaluate 3+ candidate 3D fish GLB models and verify licenses (`T03`).

### T03 — Candidate fish-model search
- **Status:** PASS
- **Files changed:** `ASSET_RESEARCH.md`
- **Commands/tools actually used:** `search_web`, `run_command` (`curl` + Node binary glTF JSON/accessor inspection on `BarramundiFish.glb`, `greySnapper.glb`, `medaka.glb`, `shark.glb`)
- **Evidence:** Inspected 4 real GLB assets. Verified `BarramundiFish.glb` (`CC0-1.0` via Khronos `REUSE.toml` & `README.md`) as primary hero fish and `greySnapper_vertColor.glb` (`CC-BY-4.0` via `BabylonJS/Assets/LICENSE`) as secondary midwater schooling species; rejected `shark.glb` due to deprecated `KHR_materials_pbrSpecularGlossiness` extension.
- **Failure or limitation:** Raw `BarramundiFish.glb` is `11.91 MB` due to uncompressed PNGs; will optimize embedded textures to `< 3.5 MB` under CC0-1.0 before bundling into `public/assets/fish/`.
- **Next exact action:** Prompt Paid API Key flow required for `gemini-4-argon` high-thinking mode, then optimize & package `public/assets/fish/`, build `T02`–`T10` (vertical slice, 8-Bone `SkinnedMesh` swim rig, `ScrollDirector`, 8 ocean chapters, minimal HUD, optional collapsible Deep-Sea Research Log with `gemini-3.1-flash-lite` & `gemini-4-argon`), run `node:test` unit suite (`T11`), and run browser visual QA rounds (`T12`) + `PELAGIC_V4_SOURCE.zip` (`T15`–`T17`).

### T04 & T05 — Hero fish asset optimization, 10-bone SkinnedMesh rigging & biological idle swim
- **Status:** PASS
- **Files changed:** `public/assets/fish/barramundi-hero.glb`, `public/assets/fish/grey-snapper.glb`, `src/lib/fishSwim.ts`, `ASSET_CREDITS.md`
- **Commands/tools actually used:** ImageMagick `PNG32`/`PNG24` texture repacking (`11.91 MB` -> `4.02 MB` preserving RGBA fin-ray translucency), `write_to_file`
- **Evidence:** `buildAnatomicalSkinnedFish` binds `barramundi-hero.glb` to a 10-bone `THREE.Skeleton` (`8` axial spine bones + `2` pectoral fin bones) with `onBeforeCompile` dorsal/anal/caudal fin membrane wave and operculum gill breathing, plus 11-part procedural fallback (`buildProceduralFallbackFish` via `?fish=fallback`).
- **Failure or limitation:** None.
- **Next exact action:** Wire canonical `ScrollDirector`, 3D descent curve, and 8 ocean chapters (`T06`–`T10`).

### T02, T06, T07, T08, T09 & T10 — Single-renderer architecture, canonical scroll curve, 8 ocean chapters, HUD & fallbacks
- **Status:** PASS
- **Files changed:** `src/lib/qualityTier.ts`, `src/lib/chapterConfig.ts`, `src/lib/fishPath.ts`, `src/lib/scrollDirector.ts`, `src/experience/proceduralTextures.ts`, `src/experience/OceanWorldBuilder.ts`, `src/experience/OceanSceneController.ts`, `src/experience/OceanCanvas.tsx`, `src/ui/DepthHUD.tsx`, `src/ui/LoadingOverlay.tsx`, `src/ui/MarineFieldNotesDrawer.tsx`, `src/ui/WebGLFallback.tsx`, `src/App.tsx`, `src/index.css`, `server.ts`, `package.json`, `README.md`
- **Commands/tools actually used:** `write_to_file`, `replace_file_content`
- **Evidence:** Single `THREE.WebGLRenderer` + single render loop owner (`OceanSceneController.ts`), canonical `window.scrollY` -> `scrollProgress ∈ [0, 1]` across `880vh` scroll track, 8 distinct 3D depth chapters (`0 m` to `10,920 m`), collapsible settings dock (Quality Tier + Reduced Motion), Hadal `Trở về mặt nước` CTA, optional `Sổ tay Hải dương` drawer (using non-paid Gemini 3 models after user declined paid key setup, with static Vercel scientific fallback), and `?webgl=fallback` view.
- **Failure or limitation:** Paid Gemini models (`gemini-4-argon`) intentionally omitted because user declined paid API key flow.
- **Next exact action:** Execute unit tests, TypeScript check, production build, and 2-round Playwright visual critique & refinement (`T11`–`T14`).

### T11, T12, T13 & T14 — Unit tests, Round 1 -> Round 2 browser visual critique & production build verification
- **Status:** PASS
- **Files changed:** `src/lib/pelagicLogic.test.ts`, `src/lib/fishPath.ts`, `src/lib/scrollDirector.ts`, `src/experience/OceanSceneController.ts`, `src/experience/OceanWorldBuilder.ts`, `src/ui/DepthHUD.tsx`, `evidence/01-surface-desktop.png` .. `evidence/10-hadal-mobile.png`
- **Commands/tools actually used:** `npx --yes tsx --test src/lib/pelagicLogic.test.ts` (`6/6 PASS`), `lint_applet` (`tsc --noEmit` `0 errors`), `compile_applet` (`vite build` `PASS`), `playwright-cli` (`open`, `snapshot`, `run-code`, `screenshot`, `video-start`/`video-stop`, `console`, `requests`), `view_file` on all captured PNGs and `.webm` motion clip.
- **Evidence:**
  - Round 1 visual inspection caught steep `-66°` fish nose-down pitch, tight close-up clipping, a color seam on abyssal chimneys, and minor mobile header wrapping.
  - Fixed all 4 defects surgically for Round 2: natural pelagic glide pitch (`-3°` to `-16°`), full-silhouette 3/4 lateral camera beats, seamless hydrothermal basalt chimneys with radial contact shadows, elevated Hadal cold-seep plumes/medusae, and `whitespace-nowrap` mobile gauge.
  - Round 2 Playwright verification passed with `Errors: 0, Warnings: 0`, 8s stationary swim (`tailYawSpan: 0.2906 rad`, `8` unique samples, `zeroDrift: true`), all 8 chapters (`["01","02","03","04","05","06","07","08"]`), mobile `390×844` (`10,920 m`, `horizontalOverflow: false`), and `?webgl=fallback` accessible DOM fallback.
- **Failure or limitation:** Headless container uses CPU SwiftShader WebGL (`isSoftwareGl = true`), so hardware 60fps GPU frame rate cannot be benchmarked inside the container; `OceanSceneController` automatically runs `afterSoftwareDraw` `gl.fenceSync` pacing on SwiftShader and full `requestAnimationFrame` on real hardware GPUs.
- **Next exact action:** Package `PELAGIC_V4_SOURCE.zip`, extract into clean `/tmp` folder, verify root layout + rebuild, and compute SHA-256 (`T15`–`T17`).
