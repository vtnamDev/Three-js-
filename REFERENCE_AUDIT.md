# REFERENCE AUDIT — PELAGIC V4: THE DEEP DESCENT

## 1. Sources Inspected

Both the attached reference archive and the upstream GitHub repository were inspected in isolated temporary directories outside the application source tree:

- **Attached Archive:** `Portfolio-Website-main.zip` (extracted to `/tmp/portfolio_ref/Portfolio-Website-main`, never copied into project deliverables).
- **Upstream Git Repository:** `https://github.com/MoncyDev/Portfolio-Website` (shallow-cloned to `/tmp/moncy_github_clone`, verified at commit `5dcb544` — *"Update README.md"*).

### Files Read & Audited
1. `README.md` — Project overview, tech stack statement, and explicit notice that the custom 3D avatar and 3D assets are proprietary and prohibited from reuse or extraction.
2. `LICENSE` — **Personal Portfolio License (PPL) v1.0** (`Copyright (c) 2026 Moncy Yohannan`). Permits viewing/studying code for personal learning and building independent inspired projects; strictly prohibits copying the website/design/experience, commercial use of derivatives, redistributing the project, or using any original 3D models, avatars, HDRs, or textures.
3. `package.json` — Dependency and script audit.
4. `src/components/Character/Scene.tsx` — Imperative `THREE.WebGLRenderer` setup, camera configuration, mouse/touch listeners, `THREE.Clock` + `AnimationMixer` update loop, and unmount logic.
5. `src/components/Character/utils/character.ts` — `GLTFLoader` + `DRACOLoader` setup, AES decryption of `character.enc`, shadow traversal, and `renderer.compileAsync`.
6. `src/components/Character/utils/animationUtils.ts` — `THREE.AnimationMixer` clip lookup, bone-filtered sub-tracks (`filterAnimationTracks`), `LoopOnce` + `clampWhenFinished`, and `fadeIn`/`fadeOut` transitions.
7. `src/components/Character/utils/lighting.ts` — `DirectionalLight`, `PointLight`, `RGBELoader` environment setup, and GSAP light intensity transitions.
8. `src/components/Character/utils/resizeUtils.ts` — Viewport resize handling for `renderer` and `camera.aspect`, plus `ScrollTrigger` teardown/rebuild.
9. `src/components/utils/GsapScroll.ts` — Scroll-scrubbed GSAP timelines (`tl1`, `tl2`, `tl3`) driving `camera.position`, object rotation, and DOM transitions across desktop (`> 1024px`) and mobile branches.
10. `src/components/Loading.tsx` & `src/context/LoadingProvider.tsx` — Loading overlay state management and progress bar driver.

---

## 2. General Technical Concepts Learned (Clean-Room Adaptation)

| Concept | Observation in Reference | Independent Implementation in PELAGIC V4 |
|---|---|---|
| **Single WebGL Canvas Owner** | Mounts one `THREE.WebGLRenderer` inside a React `useRef` container (`Scene.tsx`) rather than mixing R3F and raw WebGL on the same canvas. | `src/experience/OceanCanvas.tsx` mounts a single imperative `THREE.WebGLRenderer` inside an isolated `div` ref, keeping React HUD overlays as sibling DOM nodes with zero 60Hz `setState`. |
| **Scroll-to-3D Choreography** | Maps scroll position to 3D camera coordinates and subject orientation (`GsapScroll.ts`). | `src/lib/scrollDirector.ts` + `src/lib/fishPath.ts` compute a single normalized `scrollProgress ∈ [0, 1]` from native document scroll and deterministically evaluate spline position, tangent, camera framing, depth meters, and 8-chapter atmospheric blending in both scroll directions. |
| **Time vs. Scroll Separation** | `THREE.Clock` advances `AnimationMixer` continuously while scroll timelines scrub spatial transforms. | `elapsedTime` drives continuous fish swimming (caudal fin thrust, progressive spinal undulation, pectoral/dorsal/pelvic/anal fin phase lag, gill breathing, and plankton drift) independently of `scrollProgress`, ensuring the fish keeps swimming naturally when scroll pauses. |
| **Tone Mapping & IBL** | Uses `THREE.ACESFilmicToneMapping` + environment reflections (`Scene.tsx`, `lighting.ts`). | Uses `ACESFilmicToneMapping`, `SRGBColorSpace`, procedural `RoomEnvironment` via `PMREMGenerator` (zero external `.hdr` 404 risk), directional sunlight shafts, cool `HemisphereLight` water scatter, rim separation light, and depth-attenuated `FogExp2`. |
| **Responsive Camera Branching** | Adjusts camera framing by viewport width (`GsapScroll.ts` `window.innerWidth > 1024`). | `src/lib/cameraRig.ts` and `src/lib/qualityTier.ts` compute aspect-aware camera distance, FOV, vertical framing offset, and pixel-ratio/particle budgets so the full fish snout-to-caudal silhouette stays unobstructed on portrait mobile (`390×844`) and desktop (`1440×900`). |

---

## 3. Risks & Defects Identified in Reference Source (Not Replicated)

1. **Unlicensed `gsap-trial` Dependency:** `Portfolio-Website-main/package.json` depends on `"gsap-trial": "^3.12.7"`, which is restricted from production redistribution/deployment. **Decision:** PELAGIC V4 does **not** install `gsap-trial` (nor GSAP at all); scroll progress and smooth damping are implemented cleanly with native scroll events + deterministic math helpers in `src/lib/scrollDirector.ts`.
2. **Unused Heavy Dependencies:** Reference installs `@react-three/fiber`, `@react-three/drei`, `@react-three/cannon`, `@react-three/rapier`, and `three-stdlib` despite running imperative `three` in `Scene.tsx`. **Decision:** PELAGIC V4 installs only `three` and `@types/three` for 3D rendering—no physics engines, marquee libraries, or trial packages.
3. **Fake Loading Timer & Render Side-Effects:** `Loading.tsx` uses `setInterval` with `Math.random()` (`setProgress`) to fake percentages up to 91%, and invokes `setTimeout` directly inside the React component render body (`if (percent >= 100) { setTimeout(...) }`). **Decision:** PELAGIC V4 tracks genuine byte/item events from `THREE.LoadingManager` / `GLTFLoader` and falls back to an honest indeterminate state when byte length headers are absent.
4. **Uncancelled `requestAnimationFrame` Loop:** `Scene.tsx` calls `requestAnimationFrame(animate)` without storing the returned handle or cancelling it in the `useEffect` cleanup, leaking render loops on remount. **Decision:** PELAGIC V4 tracks both `rafId` and software-GL `timeoutId` handles and cancels them deterministically on unmount.
5. **Broken Event Listener Cleanup:** `Scene.tsx` registers `window.addEventListener("resize", () => handleResize(...))` and `document.addEventListener("mousemove", (event) => onMouseMove(event))` with inline arrow functions, so `removeEventListener` in cleanup passes a different function reference and fails to detach listeners. **Decision:** PELAGIC V4 stores exact stable handler references and removes those exact references on teardown.
6. **Unbounded Device Pixel Ratio:** `Scene.tsx` sets `renderer.setPixelRatio(window.devicePixelRatio)`, causing severe fill-rate throttling on 3x–4x mobile screens. **Decision:** PELAGIC V4 caps DPR via `src/lib/qualityTier.ts` (`1.0` on software WebGL / low tier, `1.35` on mobile balanced tier, `1.75–2.0` on high desktop GPUs).

---

## 4. Strict License & Asset Boundary Confirmation

- **Zero Reference Code Copied:** All TypeScript modules, shaders, UI components, and styles in PELAGIC V4 were written from scratch for an underwater descent experience.
- **Zero Reference Assets Used:** None of `character.enc`, `character.glb`, `char_enviorment.hdr`, `/public/draco/*`, `/public/images/*.webp`, or CSS/layout designs from `Portfolio-Website-main` exist anywhere in this workspace or in `PELAGIC_V4_SOURCE.zip`.
- **Archive Exclusion:** Neither `Portfolio-Website-main.zip` nor `PELAGIC_SUPER_PROMPT_VERCEL_3D_FISH_V4.zip` is included in the delivered `PELAGIC_V4_SOURCE.zip`.
