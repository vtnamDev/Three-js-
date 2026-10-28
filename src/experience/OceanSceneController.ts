import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BlendedAtmosphere,
  OCEAN_CHAPTERS,
  OceanChapter,
  getBlendedAtmosphere,
} from '../lib/chapterConfig';
import { getCameraRigAtProgress, getFishPathAtProgress } from '../lib/fishPath';
import {
  RiggedFishRig,
  buildAnatomicalSkinnedFish,
  buildProceduralFallbackFish,
} from '../lib/fishSwim';
import {
  QualityProfile,
  QualityTierOption,
  detectSoftwareGl,
  resolveQualityProfile,
} from '../lib/qualityTier';
import { computeNormalizedWindowScroll, stepScrollProgress } from '../lib/scrollDirector';
import { createProceduralTextureSet } from './proceduralTextures';
import { OceanWorldRig, buildOceanWorld } from './OceanWorldBuilder';

export interface TelemetryUpdate {
  progress: number;
  depthMeters: number;
  chapter: OceanChapter;
  fpsEstimate: number | null;
}

export interface LoaderStateUpdate {
  status: 'loading' | 'ready' | 'fallback-fish' | 'context-lost';
  progressPercent: number | null; // null = indeterminate when Content-Length header is omitted
  message: string;
}

export interface OceanControllerOptions {
  container: HTMLElement;
  initialQuality: QualityTierOption;
  reducedMotion: boolean;
  onTelemetry: (data: TelemetryUpdate) => void;
  onLoaderState: (state: LoaderStateUpdate) => void;
}

export class OceanSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private fog: THREE.FogExp2;
  private envTexture: THREE.Texture;

  // 3-point + hemisphere ocean lighting rig
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private ventralFillLight: THREE.PointLight;

  private textures: ReturnType<typeof createProceduralTextureSet>;
  private worldRig: OceanWorldRig;
  private fishRig: RiggedFishRig | null = null;
  private fishCarrier: THREE.Group;

  private qualityOption: QualityTierOption;
  private profile: QualityProfile;
  private reducedMotion: boolean;
  private isSoftwareGl: boolean;

  private targetProgress = 0;
  private currentProgress = 0;
  private scrollVelocity = 0;

  private startTimeMs = performance.now();
  private lastFrameMs = performance.now();
  private rafId = 0;
  private timeoutId = 0;
  private isDisposed = false;
  private isTabHidden = false;
  private isContextLost = false;

  // Throttled HUD callback tracking (<= 12Hz, zero 60fps setState!)
  private lastHudEmitTime = 0;
  private lastEmittedChapter = -1;
  private lastEmittedDepth = -1;
  private frameCounter = 0;
  private fpsWindowStart = 0;
  private measuredFps: number | null = null;

  private onTelemetry: (data: TelemetryUpdate) => void;
  private onLoaderState: (state: LoaderStateUpdate) => void;

  // Pre-allocated scratch math helpers (zero GC in render loop)
  private _fishPos = new THREE.Vector3();
  private _fishTan = new THREE.Vector3();
  private _fishLook = new THREE.Vector3();
  private _camTargetPos = new THREE.Vector3();
  private _camTargetLook = new THREE.Vector3();
  private _camCurrentLook = new THREE.Vector3();
  private _bgColor = new THREE.Color();
  private _fogColor = new THREE.Color();

  // Stable event listener references for exact detachment on unmount
  private boundOnScroll: () => void;
  private boundOnResize: () => void;
  private boundOnVisibility: () => void;
  private boundOnContextLost: (e: Event) => void;
  private boundOnContextRestored: () => void;
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: OceanControllerOptions) {
    this.container = options.container;
    this.qualityOption = options.initialQuality;
    this.reducedMotion = options.reducedMotion;
    this.onTelemetry = options.onTelemetry;
    this.onLoaderState = options.onLoaderState;

    this.isSoftwareGl = detectSoftwareGl();
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.profile = resolveQualityProfile(
      this.qualityOption,
      width,
      this.isSoftwareGl,
      this.reducedMotion,
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.profile.antialias,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.dprCap));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('data-testid', 'pelagic-webgl-canvas');
    this.renderer.domElement.className = 'block w-full h-full';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const initialAtmo = getBlendedAtmosphere(0);
    this._bgColor.setRGB(...initialAtmo.bgColor);
    this._fogColor.setRGB(...initialAtmo.fogColor);
    this.scene.background = this._bgColor;
    this.fog = new THREE.FogExp2(this._fogColor.getHex(), initialAtmo.fogDensity);
    this.scene.fog = this.fog;

    // Zero-404 procedural PBR environment reflection map (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.52;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.12, 160);
    getCameraRigAtProgress(0, width / height, this.camera.position, this._camCurrentLook);
    this.camera.lookAt(this._camCurrentLook);

    // Studio Underwater 3-Point + Hemisphere Rig
    this.hemiLight = new THREE.HemisphereLight(0x7ce6ff, 0x09354f, 1.35);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff3d8, 2.65);
    this.keyLight.position.set(4, 14, 6);
    if (this.profile.shadows) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 35;
      const d = 6;
      this.keyLight.shadow.camera.left = -d;
      this.keyLight.shadow.camera.right = d;
      this.keyLight.shadow.camera.top = d;
      this.keyLight.shadow.camera.bottom = -d;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(0x9cf0ff, 1.25);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    // Subtle cool water-scatter bounce light beneath the hero fish so ventral scales never clip to flat black
    this.ventralFillLight = new THREE.PointLight(0x3ba6d4, 0.75, 9.0, 1.6);
    this.scene.add(this.ventralFillLight);

    // Fish path carrier group
    this.fishCarrier = new THREE.Group();
    this.fishCarrier.name = 'HeroFishPathCarrier';
    this.scene.add(this.fishCarrier);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextureSet(maxAniso);
    this.worldRig = buildOceanWorld(this.profile, this.textures);
    this.scene.add(this.worldRig.root);

    // Bind exact listener references
    this.boundOnScroll = () => this.syncScrollTarget();
    this.boundOnResize = () => this.handleResize();
    this.boundOnVisibility = () => {
      this.isTabHidden = document.hidden;
      if (!this.isTabHidden) {
        this.lastFrameMs = performance.now(); // Reset delta jump after tab resume
      }
    };
    this.boundOnContextLost = (e: Event) => {
      e.preventDefault();
      this.isContextLost = true;
      this.onLoaderState({
        status: 'context-lost',
        progressPercent: null,
        message: 'Ngữ cảnh WebGL tạm ngưng — đang chờ khôi phục GPU.',
      });
    };
    this.boundOnContextRestored = () => {
      this.isContextLost = false;
      this.onLoaderState({
        status: 'ready',
        progressPercent: 100,
        message: 'Đã khôi phục WebGL.',
      });
    };

    window.addEventListener('scroll', this.boundOnScroll, { passive: true });
    window.addEventListener('resize', this.boundOnResize, { passive: true });
    document.addEventListener('visibilitychange', this.boundOnVisibility);
    this.renderer.domElement.addEventListener('webglcontextlost', this.boundOnContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.boundOnContextRestored);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.boundOnResize);
      this.resizeObserver.observe(this.container);
    }

    this.syncScrollTarget();
    this.currentProgress = this.targetProgress;

    this.loadAssets();
    this.startLoop();
  }

  private syncScrollTarget(): void {
    this.targetProgress = computeNormalizedWindowScroll(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight,
    );
  }

  private handleResize(): void {
    if (this.isDisposed) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.profile = resolveQualityProfile(
      this.qualityOption,
      width,
      this.isSoftwareGl,
      this.reducedMotion,
    );

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.dprCap));
    this.renderer.setSize(width, height);
    this.syncScrollTarget();
  }

  public setQualityOption(option: QualityTierOption): void {
    this.qualityOption = option;
    this.handleResize();
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.handleResize();
  }

  private async loadAssets(): Promise<void> {
    // V5: mount the local, original rounded reef-fish geometry immediately instead of loading
    // the long barramundi GLB. The optional school fish is non-blocking and can fail independently.
    const params = new URLSearchParams(window.location.search);
    const simulateAssetFail = params.get('fish') === 'fallback';
    this.onLoaderState({ status: 'loading', progressPercent: null, message: 'Đang tạo cá rạn san hô vàng 3D...' });
    if (!simulateAssetFail) {
      const loader = new GLTFLoader();
      loader.load('/assets/fish/grey-snapper.glb', (gltf) => {
        if (!this.isDisposed) this.worldRig.attachSchoolModel(gltf.scene);
      }, undefined, () => { /* Optional schooling model; never blocks the hero. */ });
    }
    this.mountFallbackFish();
    document.body.dataset.fishStatus = 'procedural-reef-fish-ready';
    this.onLoaderState({ status: 'ready', progressPercent: 100, message: 'Cá rạn san hô đã sẵn sàng.' });
  }

  private mountFallbackFish(): void {
    this.fishRig = buildProceduralFallbackFish();
    this.fishCarrier.add(this.fishRig.root);
    document.body.dataset.fishStatus = 'procedural-fallback';
    this.onLoaderState({
      status: 'fallback-fish',
      progressPercent: 100,
      message: 'Đang sử dụng mô hình cá dự phòng đa khớp nối.',
    });
  }

  private afterSoftwareDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.timeoutId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.timeoutId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.timeoutId = window.setTimeout(cb, 80);
      }
    };
    this.timeoutId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    this.fpsWindowStart = performance.now();
    const tick = () => {
      if (this.isDisposed) return;

      if (!this.isTabHidden && !this.isContextLost) {
        this.stepFrame();
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterSoftwareDraw(tick);
      } else {
        this.rafId = window.requestAnimationFrame(tick);
      }
    };

    this.rafId = window.requestAnimationFrame(tick);
  }

  private stepFrame(): void {
    const nowMs = performance.now();
    const dt = Math.min(0.08, Math.max(0.001, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;
    const elapsed = (nowMs - this.startTimeMs) / 1000;

    // 1. Canonical scroll progress step (drift-free when stationary)
    const scrollSnap = stepScrollProgress(
      this.currentProgress,
      this.targetProgress,
      dt,
      this.reducedMotion,
      this.isSoftwareGl,
    );
    this.currentProgress = scrollSnap.currentProgress;
    this.scrollVelocity = scrollSnap.velocity;

    // 2. Blended chapter & depth atmosphere
    const atmo: BlendedAtmosphere = getBlendedAtmosphere(this.currentProgress);

    this._bgColor.setRGB(atmo.bgColor[0], atmo.bgColor[1], atmo.bgColor[2]);
    this._fogColor.setRGB(atmo.fogColor[0], atmo.fogColor[1], atmo.fogColor[2]);
    this.fog.color.copy(this._fogColor);
    this.fog.density = atmo.fogDensity;
    this.renderer.toneMappingExposure = atmo.exposure;
    this.scene.environmentIntensity = 0.28 + atmo.hemiIntensity * 0.25;

    // 3. Deterministic fish 3D path & natural banking orientation
    const fishState = getFishPathAtProgress(
      this.currentProgress,
      this._fishPos,
      this._fishTan,
      this._fishLook,
    );

    // Subtle idle vertical buoyancy hover (~1.8 cm) strictly around path anchor without drifting progress
    const idleBuoyancy = this.reducedMotion ? 0 : Math.sin(elapsed * 1.35) * 0.024;
    this.fishCarrier.position.set(
      fishState.position.x,
      fishState.position.y + idleBuoyancy,
      fishState.position.z,
    );
    this.fishCarrier.lookAt(
      this._fishLook.x,
      this._fishLook.y + idleBuoyancy,
      this._fishLook.z,
    );
    this.fishCarrier.rotateZ(fishState.bankRadians);

    // 4. Continuous biological fish swimming (independent of scrollProgress!)
    if (this.fishRig) {
      this.fishRig.shaderUniforms.uBioRim.value =
        0.14 + (1.0 - atmo.causticStrength) * 0.18;
      this.fishRig.update(elapsed, this.scrollVelocity, this.reducedMotion);
    }

    // 5. Update 3-point lights anchored relative to the hero fish so illumination stays cohesive at every depth
    this.keyLight.color.setRGB(
      atmo.keyLightColor[0],
      atmo.keyLightColor[1],
      atmo.keyLightColor[2],
    );
    this.keyLight.intensity = atmo.keyLightIntensity;
    this.keyLight.position.set(
      this._fishPos.x + 3.5,
      this._fishPos.y + 9.5,
      this._fishPos.z + 4.5,
    );
    this.keyLight.target.position.copy(this._fishPos);

    this.hemiLight.color.setRGB(
      atmo.hemiSkyColor[0],
      atmo.hemiSkyColor[1],
      atmo.hemiSkyColor[2],
    );
    this.hemiLight.groundColor.setRGB(
      atmo.hemiGroundColor[0],
      atmo.hemiGroundColor[1],
      atmo.hemiGroundColor[2],
    );
    this.hemiLight.intensity = atmo.hemiIntensity;

    this.rimLight.color.setRGB(
      atmo.rimLightColor[0],
      atmo.rimLightColor[1],
      atmo.rimLightColor[2],
    );
    this.rimLight.intensity = atmo.rimLightIntensity;
    this.rimLight.position.set(
      this._fishPos.x - 4.2,
      this._fishPos.y + 3.2,
      this._fishPos.z - 5.2,
    );
    this.rimLight.target.position.copy(this._fishPos);

    this.ventralFillLight.position.set(
      this._fishPos.x,
      this._fishPos.y - 1.8,
      this._fishPos.z + 1.1,
    );
    this.ventralFillLight.intensity = 0.55 + atmo.bioGlowIntensity * 0.35;

    // 6. Camera follow rig with aspect-aware framing & smooth exponential settle
    getCameraRigAtProgress(
      this.currentProgress,
      this.camera.aspect,
      this._camTargetPos,
      this._camTargetLook,
    );

    const camAlpha = this.reducedMotion || this.isSoftwareGl ? 1.0 : 1 - Math.exp(-9.0 * dt);
    this.camera.position.lerp(this._camTargetPos, camAlpha);
    this._camCurrentLook.lerp(this._camTargetLook, camAlpha);
    this.camera.lookAt(this._camCurrentLook);

    const rigState = getCameraRigAtProgress(
      this.currentProgress,
      this.camera.aspect,
      this._camTargetPos,
      this._camTargetLook,
    );
    if (Math.abs(this.camera.fov - rigState.fov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, rigState.fov, camAlpha);
      this.camera.updateProjectionMatrix();
    }

    // 7. Update 8-chapter ocean world
    this.worldRig.update(elapsed, this.currentProgress, atmo, this.reducedMotion);

    // 8. Measure real frame rate & emit throttled HUD telemetry (<= 10Hz) + DOM dataset attributes
    this.frameCounter++;
    const now = performance.now();
    if (now - this.fpsWindowStart >= 1000) {
      this.measuredFps = Math.round((this.frameCounter * 1000) / (now - this.fpsWindowStart));
      this.frameCounter = 0;
      this.fpsWindowStart = now;
    }

    document.body.dataset.chapter = atmo.chapter.id;
    document.body.dataset.chapterCode = atmo.chapter.code;
    document.body.dataset.progress = this.currentProgress.toFixed(4);
    document.body.dataset.depth = String(atmo.depthMeters);
    if (this.fishRig) {
      document.body.dataset.tailYaw = this.fishRig.spineBones[7].rotation.y.toFixed(4);
    }

    const chapterChanged = atmo.chapter.index !== this.lastEmittedChapter;
    const depthChanged = Math.abs(atmo.depthMeters - this.lastEmittedDepth) >= 1;

    if (chapterChanged || (depthChanged && now - this.lastHudEmitTime > 95)) {
      this.lastHudEmitTime = now;
      this.lastEmittedChapter = atmo.chapter.index;
      this.lastEmittedDepth = atmo.depthMeters;
      this.onTelemetry({
        progress: this.currentProgress,
        depthMeters: atmo.depthMeters,
        chapter: atmo.chapter,
        fpsEstimate: this.measuredFps,
      });
    } else if (now - this.lastHudEmitTime > 600) {
      this.lastHudEmitTime = now;
      this.onTelemetry({
        progress: this.currentProgress,
        depthMeters: atmo.depthMeters,
        chapter: atmo.chapter,
        fpsEstimate: this.measuredFps,
      });
    }
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;

    window.cancelAnimationFrame(this.rafId);
    window.clearTimeout(this.timeoutId);

    window.removeEventListener('scroll', this.boundOnScroll);
    window.removeEventListener('resize', this.boundOnResize);
    document.removeEventListener('visibilitychange', this.boundOnVisibility);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.boundOnContextLost);
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.boundOnContextRestored,
    );

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.fishRig) {
      this.fishRig.dispose();
      this.fishRig = null;
    }
    this.worldRig.dispose();
    this.textures.dispose();
    this.envTexture.dispose();

    this.scene.clear();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export { OCEAN_CHAPTERS };
