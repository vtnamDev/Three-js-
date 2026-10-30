import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  BlendedAtmosphere,
  OCEAN_CHAPTERS,
  OceanChapter,
  getBlendedAtmosphere,
} from '../lib/chapterConfig';
import {
  DEFAULT_HERO_FISH_BOUNDS,
  getCameraRigAtProgress,
  getFishPathAtProgress,
} from '../lib/fishPath';
import {
  RiggedFishRig,
  buildAnatomicalSkinnedFish,
  buildProceduralFallbackFish,
  evaluateSwimKinematics,
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
  progressPercent: number | null;
  message: string;
}

export interface OceanControllerOptions {
  container: HTMLElement;
  initialQuality: QualityTierOption;
  reducedMotion: boolean;
  onTelemetry: (data: TelemetryUpdate) => void;
  onLoaderState: (state: LoaderStateUpdate) => void;
}

const CANDIDATE_ASSET_MAP: Record<string, { url: string; species: string }> = {
  barramundi: {
    url: '/assets/fish/hero-barramundi.glb',
    species: 'lates-calcarifer-barramundi',
  },
  snapper: {
    url: '/assets/fish/grey-snapper.glb',
    species: 'lutjanus-griseus-snapper',
  },
  clownfish: {
    url: '/assets/fish/clownfish-hero.optimized.glb',
    species: 'amphiprion-ocellaris-baseline',
  },
  tang: {
    url: '/assets/fish/reef-tang-school.optimized.glb',
    species: 'zebrasoma-flavescens-tang',
  },
};

export class OceanSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private fog: THREE.FogExp2;
  private envTexture: THREE.Texture;

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
  private neutralStudioMode: boolean;

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

  private lastHudEmitTime = 0;
  private lastEmittedChapter = -1;
  private lastEmittedDepth = -1;
  private frameCounter = 0;
  private fpsWindowStart = 0;
  private measuredFps: number | null = null;

  private onTelemetry: (data: TelemetryUpdate) => void;
  private onLoaderState: (state: LoaderStateUpdate) => void;

  private _fishPos = new THREE.Vector3();
  private _fishTan = new THREE.Vector3();
  private _fishLook = new THREE.Vector3();
  private _fishForward = new THREE.Vector3();
  private _camTargetPos = new THREE.Vector3();
  private _camTargetLook = new THREE.Vector3();
  private _camTargetQuat = new THREE.Quaternion();
  private _bgColor = new THREE.Color();
  private _fogColor = new THREE.Color();

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

    const searchParams = new URLSearchParams(window.location.search);
    this.neutralStudioMode = searchParams.get('fishStudio') === 'neutral';

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
    this.renderer.toneMappingExposure = 0.96;
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

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    this.scene.environmentIntensity = 0.34;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.12, 185);
    const initRig = getCameraRigAtProgress(
      0,
      width / height,
      this.camera.position,
      this._camTargetLook,
      DEFAULT_HERO_FISH_BOUNDS,
      this.camera.quaternion,
    );
    this.camera.fov = initRig.fov;
    this.camera.updateProjectionMatrix();

    this.hemiLight = new THREE.HemisphereLight(0x7be4ff, 0x0b3650, 1.28);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff1d2, 2.45);
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

    this.rimLight = new THREE.DirectionalLight(0xa4f2ff, 1.25);
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    this.ventralFillLight = new THREE.PointLight(0x42b2e0, 0.82, 9.5, 1.5);
    this.scene.add(this.ventralFillLight);

    this.fishCarrier = new THREE.Group();
    this.fishCarrier.name = 'HeroFishPathCarrier';
    this.scene.add(this.fishCarrier);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextureSet(maxAniso);
    this.worldRig = buildOceanWorld(this.profile, this.textures);
    if (!this.neutralStudioMode) {
      this.scene.add(this.worldRig.root);
    }

    this.syncPostProcessing(width, height);

    this.boundOnScroll = () => this.syncScrollTarget();
    this.boundOnResize = () => this.handleResize();
    this.boundOnVisibility = () => {
      this.isTabHidden = document.hidden;
      if (!this.isTabHidden) {
        this.lastFrameMs = performance.now();
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

    void this.loadAssets();
    this.startLoop();
  }

  private syncPostProcessing(width: number, height: number): void {
    const shouldUseComposer =
      !this.isSoftwareGl && this.profile.tier === 'high' && !this.reducedMotion;

    if (!shouldUseComposer) {
      if (this.composer) {
        this.composer.dispose();
        this.composer = null;
        this.bloomPass = null;
      }
      return;
    }

    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2))),
        0.18,
        0.32,
        0.9,
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }

    this.composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.dprCap));
    this.composer.setSize(width, height);
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

    this.worldRig.setQualityProfile(this.profile);
    this.renderer.shadowMap.enabled = this.profile.shadows;
    this.keyLight.castShadow = this.profile.shadows;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.profile.dprCap));
    this.renderer.setSize(width, height);
    this.syncPostProcessing(width, height);
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
    const params = new URLSearchParams(window.location.search);
    const fishMode = params.get('fish');
    const candidateKey = params.get('fishCandidate') ?? 'barramundi';
    const selectedCandidate =
      CANDIDATE_ASSET_MAP[candidateKey] ?? CANDIDATE_ASSET_MAP.barramundi;

    this.onLoaderState({
      status: 'loading',
      progressPercent: null,
      message: 'Đang chuẩn bị mô hình cá 3D PBR & hệ sinh thái 8 tầng đại dương...',
    });

    const loader = new GLTFLoader();

    if (fishMode !== 'emergency' && !this.neutralStudioMode) {
      loader.load(
        '/assets/fish/reef-tang-school.optimized.glb',
        (gltf) => {
          if (!this.isDisposed) {
            this.worldRig.attachReefSchoolModel(gltf.scene);
          }
        },
        undefined,
        () => {},
      );

      loader.load(
        '/assets/fish/grey-snapper.glb',
        (gltf) => {
          if (!this.isDisposed) {
            this.worldRig.attachDeepSchoolModel(gltf.scene);
          }
        },
        undefined,
        () => {},
      );
    }

    if (fishMode === 'emergency') {
      this.mountEmergencyFallbackFish();
      return;
    }

    if (fishMode === 'fallback') {
      this.loadSecondaryGlbFallback(loader);
      return;
    }

    loader.load(
      selectedCandidate.url,
      (gltf) => {
        if (this.isDisposed) return;
        this.fishRig = buildAnatomicalSkinnedFish(gltf.scene);
        this.fishCarrier.add(this.fishRig.root);

        if (!this.isSoftwareGl) {
          this.renderer.compile(this.scene, this.camera);
        }

        document.body.dataset.fishStatus = 'glb-ready';
        document.body.dataset.fishSpecies = selectedCandidate.species;
        this.onLoaderState({
          status: 'ready',
          progressPercent: 100,
          message: 'Sẵn sàng lặn sâu.',
        });
      },
      (xhr) => {
        if (this.isDisposed) return;
        if (xhr.lengthComputable && xhr.total > 0) {
          const pct = Math.min(99, Math.round((xhr.loaded / xhr.total) * 100));
          this.onLoaderState({
            status: 'loading',
            progressPercent: pct,
            message: `Đang tải mô hình cá 3D PBR (${pct}%)...`,
          });
        } else {
          this.onLoaderState({
            status: 'loading',
            progressPercent: null,
            message: 'Đang giải mã lưới đa giác mịn & hệ xương 10 khớp...',
          });
        }
      },
      () => {
        if (!this.isDisposed) {
          this.loadSecondaryGlbFallback(loader);
        }
      },
    );
  }

  /**
   * Loads pre-vetted secondary CC0 GLB model (`grey-snapper.glb`) before ever falling back to procedural geometry.
   */
  private loadSecondaryGlbFallback(loader: GLTFLoader): void {
    loader.load(
      '/assets/fish/grey-snapper.glb',
      (gltf) => {
        if (this.isDisposed) return;
        this.fishRig = buildAnatomicalSkinnedFish(gltf.scene);
        this.fishCarrier.add(this.fishRig.root);
        document.body.dataset.fishStatus = 'secondary-glb-fallback';
        document.body.dataset.fishSpecies = 'lutjanus-griseus-snapper';
        this.onLoaderState({
          status: 'fallback-fish',
          progressPercent: 100,
          message: 'Đang sử dụng mô hình cá 3D GLB dự phòng đã kiểm duyệt.',
        });
      },
      undefined,
      () => {
        if (!this.isDisposed) {
          this.mountEmergencyFallbackFish();
        }
      },
    );
  }

  private mountEmergencyFallbackFish(): void {
    this.fishRig = buildProceduralFallbackFish();
    this.fishCarrier.add(this.fishRig.root);
    document.body.dataset.fishStatus = 'emergency-procedural-fallback';
    document.body.dataset.fishSpecies = 'emergency-fallback';
    this.onLoaderState({
      status: 'fallback-fish',
      progressPercent: 100,
      message: 'Đang sử dụng mô hình dự phòng khẩn cấp khi ngoại tuyến.',
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
        if (this.composer && !this.isSoftwareGl) {
          this.composer.render();
        } else {
          this.renderer.render(this.scene, this.camera);
        }
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

    // 1. Canonical scroll progress step (strictly stationary when scroll pauses)
    const scrollSnap = stepScrollProgress(
      this.currentProgress,
      this.targetProgress,
      dt,
      this.reducedMotion,
      this.isSoftwareGl,
    );
    this.currentProgress = scrollSnap.currentProgress;
    this.scrollVelocity = scrollSnap.velocity;

    // 2. Blended chapter & Beer-Lambert depth atmosphere (E04, E19)
    const atmo: BlendedAtmosphere = getBlendedAtmosphere(this.currentProgress);

    if (this.neutralStudioMode) {
      this._bgColor.setHex(0x1f2d3a);
      this.fog.density = 0.0;
      this.renderer.toneMappingExposure = 1.08;
      this.scene.environmentIntensity = 0.75;
    } else {
      this._bgColor.setRGB(atmo.bgColor[0], atmo.bgColor[1], atmo.bgColor[2]);
      this._fogColor.setRGB(atmo.fogColor[0], atmo.fogColor[1], atmo.fogColor[2]);
      this.fog.color.copy(this._fogColor);
      this.fog.density = atmo.fogDensity;
      this.renderer.toneMappingExposure = atmo.exposure;
      this.scene.environmentIntensity = 0.22 + atmo.hemiIntensity * 0.17;
    }

    if (this.bloomPass) {
      this.bloomPass.strength = 0.14 + atmo.bioGlowIntensity * 0.1;
    }

    // 3. Deterministic 3D diagonal/lateral fish spline & turn banking
    const fishState = getFishPathAtProgress(
      this.currentProgress,
      this._fishPos,
      this._fishTan,
      this._fishLook,
    );
    this._fishForward.copy(this._fishLook).sub(this._fishPos).normalize();

    const idleBuoyancy = this.reducedMotion ? 0 : Math.sin(elapsed * 1.4) * 0.02;
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

    // 4. Continuous 10-bone skeletal fish swimming + wet specular/caustics (E21)
    let kinSample = evaluateSwimKinematics(
      elapsed,
      this.scrollVelocity,
      this.reducedMotion,
      fishState.curvature,
    );
    if (this.fishRig) {
      this.fishRig.shaderUniforms.uCausticStrength.value = this.neutralStudioMode
        ? 0.0
        : atmo.causticStrength;
      this.fishRig.shaderUniforms.uBioRim.value = this.neutralStudioMode
        ? 0.08
        : 0.12 + (1.0 - atmo.causticStrength) * 0.16;
      kinSample = this.fishRig.update(
        elapsed,
        this.scrollVelocity,
        this.reducedMotion,
        fishState.curvature,
      );
    }

    // 5. Three-point + ventral scatter lighting anchored around hero fish
    if (this.neutralStudioMode) {
      this.keyLight.color.setHex(0xffffff);
      this.keyLight.intensity = 2.1;
      this.hemiLight.color.setHex(0xd8e8f5);
      this.hemiLight.groundColor.setHex(0x283848);
      this.hemiLight.intensity = 1.1;
      this.rimLight.color.setHex(0xb8e0ff);
      this.rimLight.intensity = 1.1;
    } else {
      this.keyLight.color.setRGB(
        atmo.keyLightColor[0],
        atmo.keyLightColor[1],
        atmo.keyLightColor[2],
      );
      this.keyLight.intensity = atmo.keyLightIntensity;
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
    }

    this.keyLight.position.set(
      this._fishPos.x + 3.8,
      this._fishPos.y + 9.0,
      this._fishPos.z + 4.6,
    );
    this.keyLight.target.position.copy(this._fishPos);

    this.rimLight.position.set(
      this._fishPos.x - 4.4,
      this._fishPos.y + 3.0,
      this._fishPos.z - 5.0,
    );
    this.rimLight.target.position.copy(this._fishPos);

    this.ventralFillLight.position.set(
      this._fishPos.x + 0.6,
      this._fishPos.y - 1.5,
      this._fishPos.z + 1.2,
    );
    this.ventralFillLight.intensity = 0.62 + atmo.bioGlowIntensity * 0.34;

    // 6. Spherical Orbital Camera Rig with Quaternion Slerp (E13, E14, E15, E16)
    const activeBounds = this.fishRig?.bounds ?? DEFAULT_HERO_FISH_BOUNDS;
    const rigState = getCameraRigAtProgress(
      this.currentProgress,
      this.camera.aspect,
      this._camTargetPos,
      this._camTargetLook,
      activeBounds,
      this._camTargetQuat,
      elapsed,
    );

    const camAlpha = this.reducedMotion || this.isSoftwareGl ? 1.0 : 1 - Math.exp(-9.0 * dt);
    this.camera.position.lerp(this._camTargetPos, camAlpha);
    this.camera.quaternion.slerp(this._camTargetQuat, camAlpha);

    if (Math.abs(this.camera.fov - rigState.fov) > 0.04) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, rigState.fov, camAlpha);
      this.camera.updateProjectionMatrix();
    }

    // 7. Update 8-chapter 3D ocean world & 24-effect registry
    if (!this.neutralStudioMode) {
      this.worldRig.update(
        elapsed,
        dt,
        this.currentProgress,
        atmo,
        this.reducedMotion,
        this.fishCarrier.position,
        this._fishForward,
        kinSample.tailPhaseSin,
        this.scrollVelocity,
      );
    }

    // 8. Telemetry & DOM verification dataset attributes
    this.frameCounter++;
    const now = performance.now();
    if (now - this.fpsWindowStart >= 1000) {
      this.measuredFps = Math.round((this.frameCounter * 1000) / (now - this.fpsWindowStart));
      this.frameCounter = 0;
      this.fpsWindowStart = now;
    }

    const activeEffects = this.worldRig.effectRegistry.getActiveEffectIds(this.currentProgress);

    document.body.dataset.chapter = atmo.chapter.id;
    document.body.dataset.chapterCode = atmo.chapter.code;
    document.body.dataset.progress = this.currentProgress.toFixed(4);
    document.body.dataset.depth = String(atmo.depthMeters);
    document.body.dataset.fishPitchDeg = THREE.MathUtils.radToDeg(fishState.pitchRadians).toFixed(2);
    document.body.dataset.camOrbitDeg = rigState.orbitAzimuthDeg.toFixed(1);
    document.body.dataset.activeEffects = activeEffects.join(',');
    document.body.dataset.tailYaw = kinSample.spineYaw[7].toFixed(4);
    document.body.dataset.pectoralFlap = kinSample.pectoralLeftFlap.toFixed(4);

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

    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
      this.bloomPass = null;
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
