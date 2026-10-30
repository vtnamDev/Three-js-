import * as THREE from 'three';
import {
  BlendedAtmosphere,
  EFFECT_CATALOGUE,
  EffectId,
  getEffectStrengthAtProgress,
} from '../lib/chapterConfig';
import { getDescentCurve, getSightlineBasisAtProgress } from '../lib/fishPath';
import { QualityProfile } from '../lib/qualityTier';
import { ProceduralTextureSet } from './proceduralTextures';

export interface EffectRuntimeContext {
  elapsedTime: number;
  dt: number;
  progress: number;
  atmosphere: BlendedAtmosphere;
  quality: QualityProfile;
  reducedMotion: boolean;
  fishWorldPos: THREE.Vector3;
  fishForwardDir: THREE.Vector3;
  tailPhaseSin: number;
  scrollVelocity: number;
}

export interface ManagedOceanEffect {
  id: EffectId;
  name: string;
  enabled: boolean;
  update: (ctx: EffectRuntimeContext) => void;
  setQuality: (profile: QualityProfile) => void;
  dispose: () => void;
}

export interface OceanEffectRegistryRig {
  root: THREE.Group;
  effects: ReadonlyMap<EffectId, ManagedOceanEffect>;
  getActiveEffectIds: (progress: number) => EffectId[];
  update: (ctx: EffectRuntimeContext) => void;
  setQuality: (profile: QualityProfile) => void;
  dispose: () => void;
}

function detHash(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function createOceanEffectRegistry(
  initialProfile: QualityProfile,
  textures: ProceduralTextureSet,
): OceanEffectRegistryRig {
  const root = new THREE.Group();
  root.name = 'PelagicEffectRegistryRoot';

  const effects = new Map<EffectId, ManagedOceanEffect>();
  const curve = getDescentCurve();
  let currentProfile = initialProfile;

  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  // ============================================================================
  // E05: MULTI-LAYER PARALLAX MARINE SNOW (NEAR FAST/LARGE + FAR SLOW/FINE)
  // ============================================================================
  const maxNearCount = 420;
  const maxFarCount = 820;

  const nearBase = new Float32Array(maxNearCount * 3);
  const nearPos = new Float32Array(maxNearCount * 3);
  const nearSeed = new Float32Array(maxNearCount);

  const _pt = new THREE.Vector3();
  for (let i = 0; i < maxNearCount; i++) {
    const u = detHash(i * 11 + 3);
    curve.getPointAt(u, _pt);
    const rx = (detHash(i * 11 + 5) - 0.5) * 14.0;
    const ry = (detHash(i * 11 + 7) - 0.5) * 9.0;
    const rz = (detHash(i * 11 + 9) - 0.5) * 14.0;
    nearBase[i * 3] = _pt.x + rx;
    nearBase[i * 3 + 1] = _pt.y + ry;
    nearBase[i * 3 + 2] = _pt.z + rz;
    nearPos[i * 3] = nearBase[i * 3];
    nearPos[i * 3 + 1] = nearBase[i * 3 + 1];
    nearPos[i * 3 + 2] = nearBase[i * 3 + 2];
    nearSeed[i] = detHash(i * 17 + 13) * Math.PI * 2;
  }

  const farBase = new Float32Array(maxFarCount * 3);
  const farPos = new Float32Array(maxFarCount * 3);
  const farSeed = new Float32Array(maxFarCount);
  for (let i = 0; i < maxFarCount; i++) {
    const u = detHash(i * 13 + 7);
    curve.getPointAt(u, _pt);
    const rx = (detHash(i * 13 + 11) - 0.5) * 34.0;
    const ry = (detHash(i * 13 + 17) - 0.5) * 18.0;
    const rz = (detHash(i * 13 + 19) - 0.5) * 32.0;
    farBase[i * 3] = _pt.x + rx;
    farBase[i * 3 + 1] = _pt.y + ry;
    farBase[i * 3 + 2] = _pt.z + rz;
    farPos[i * 3] = farBase[i * 3];
    farPos[i * 3 + 1] = farBase[i * 3 + 1];
    farPos[i * 3 + 2] = farBase[i * 3 + 2];
    farSeed[i] = detHash(i * 23 + 5) * Math.PI * 2;
  }

  const nearSnowGeo = new THREE.BufferGeometry();
  nearSnowGeo.setAttribute('position', new THREE.BufferAttribute(nearPos, 3));
  const farSnowGeo = new THREE.BufferGeometry();
  farSnowGeo.setAttribute('position', new THREE.BufferAttribute(farPos, 3));
  disposableGeos.push(nearSnowGeo, farSnowGeo);

  const nearSnowMat = new THREE.PointsMaterial({
    size: 0.16,
    map: textures.particleMap,
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const farSnowMat = new THREE.PointsMaterial({
    size: 0.085,
    map: textures.particleMap,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  disposableMats.push(nearSnowMat, farSnowMat);

  const nearSnowPoints = new THREE.Points(nearSnowGeo, nearSnowMat);
  const farSnowPoints = new THREE.Points(farSnowGeo, farSnowMat);
  nearSnowPoints.frustumCulled = false;
  farSnowPoints.frustumCulled = false;
  root.add(nearSnowPoints, farSnowPoints);

  const applySnowBudget = (prof: QualityProfile) => {
    const ratio = prof.tier === 'high' ? 1.0 : prof.tier === 'balanced' ? 0.62 : 0.3;
    nearSnowGeo.setDrawRange(0, Math.max(48, Math.floor(maxNearCount * ratio)));
    farSnowGeo.setDrawRange(0, Math.max(96, Math.floor(maxFarCount * ratio)));
  };
  applySnowBudget(initialProfile);

  effects.set('E05', {
    id: 'E05',
    name: 'Multi-layer marine snow',
    enabled: true,
    setQuality: applySnowBudget,
    update: ({ elapsedTime, atmosphere, reducedMotion }) => {
      nearSnowMat.color.setRGB(...atmosphere.particleColor);
      farSnowMat.color.setRGB(...atmosphere.particleColor);
      nearSnowMat.opacity = atmosphere.particleOpacity * 0.95;
      farSnowMat.opacity = atmosphere.particleOpacity * 0.62;

      const motionScale = reducedMotion ? 0.22 : 1.0;
      const nearLimit = nearSnowGeo.drawRange.count;
      const nearAttr = nearSnowGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < nearLimit; i++) {
        const s = nearSeed[i];
        nearAttr.setXYZ(
          i,
          nearBase[i * 3] + Math.sin(elapsedTime * 0.44 + s) * 0.52 * motionScale,
          nearBase[i * 3 + 1] + Math.cos(elapsedTime * 0.34 + s * 1.3) * 0.58 * motionScale,
          nearBase[i * 3 + 2] + Math.sin(elapsedTime * 0.38 + s * 0.7) * 0.46 * motionScale,
        );
      }
      nearAttr.needsUpdate = true;

      if (!reducedMotion) {
        const farLimit = farSnowGeo.drawRange.count;
        const farAttr = farSnowGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < farLimit; i++) {
          const s = farSeed[i];
          farAttr.setXYZ(
            i,
            farBase[i * 3] + Math.sin(elapsedTime * 0.19 + s) * 0.22,
            farBase[i * 3 + 1] + Math.cos(elapsedTime * 0.15 + s * 1.1) * 0.25,
            farBase[i * 3 + 2] + Math.sin(elapsedTime * 0.17 + s * 0.8) * 0.2,
          );
        }
        farAttr.needsUpdate = true;
      }
    },
    dispose: () => {},
  });

  // ============================================================================
  // E06: MICRO-BUBBLE DRIFT (CHAPTERS 01-03 RISING AGAINST DESCENT)
  // ============================================================================
  const maxBubbles = 64;
  const bubbleGeo = new THREE.SphereGeometry(0.048, 8, 8);
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0xe6fbff,
    roughness: 0.08,
    metalness: 0.12,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
  });
  disposableGeos.push(bubbleGeo);
  disposableMats.push(bubbleMat);

  const bubbleMesh = new THREE.InstancedMesh(bubbleGeo, bubbleMat, maxBubbles);
  bubbleMesh.frustumCulled = false;
  root.add(bubbleMesh);

  const bBasis1 = getSightlineBasisAtProgress(0.03);
  const bBasis2 = getSightlineBasisAtProgress(0.17);
  const bBasis3 = getSightlineBasisAtProgress(0.28);
  const _bDummy = new THREE.Object3D();
  const _bVec = new THREE.Vector3();

  effects.set('E06', {
    id: 'E06',
    name: 'Micro-bubble drift',
    enabled: true,
    setQuality: (prof) => {
      bubbleMesh.count = prof.tier === 'low' ? 24 : prof.tier === 'balanced' ? 44 : maxBubbles;
    },
    update: ({ elapsedTime, progress, reducedMotion }) => {
      const strength = getEffectStrengthAtProgress('E06', progress);
      if (strength <= 0.01) {
        bubbleMesh.visible = false;
        return;
      }
      bubbleMesh.visible = true;
      bubbleMat.opacity = 0.52 * strength;
      const tAnim = reducedMotion ? elapsedTime * 0.28 : elapsedTime;
      const activeCount = bubbleMesh.count;

      for (let i = 0; i < activeCount; i++) {
        const seed = detHash(i * 7 + 3);
        const basis = i < 24 ? bBasis1 : i < 46 ? bBasis2 : bBasis3;
        const fwd = 3.8 + detHash(i * 7 + 1) * 11.5;
        const right = (detHash(i * 7 + 2) - 0.5) * 10.5;
        const riseCycle = (tAnim * (0.48 + seed * 0.36) + seed * 11.0) % 10.0;
        _bVec
          .copy(basis.fishPos)
          .addScaledVector(basis.sightDir, fwd)
          .addScaledVector(basis.sightRight, right);
        _bVec.y += -4.8 + riseCycle;
        _bVec.x += Math.sin(tAnim * 1.9 + i) * 0.08;

        _bDummy.position.copy(_bVec);
        _bDummy.scale.setScalar(0.62 + 0.42 * detHash(i * 11 + 4));
        _bDummy.updateMatrix();
        bubbleMesh.setMatrixAt(i, _bDummy.matrix);
      }
      bubbleMesh.instanceMatrix.needsUpdate = true;
    },
    dispose: () => {},
  });

  // ============================================================================
  // E11: SPORADIC PLANKTON GLINTS (LOCAL CLUSTER FLASHES IN CH03-CH06)
  // ============================================================================
  const maxGlints = 220;
  const glintPos = new Float32Array(maxGlints * 3);
  const glintPhase = new Float32Array(maxGlints);
  const glintClusterProgress = [0.29, 0.41, 0.46, 0.54, 0.59, 0.68];

  for (let i = 0; i < maxGlints; i++) {
    const clusterP = glintClusterProgress[i % glintClusterProgress.length] + (detHash(i * 5 + 1) - 0.5) * 0.05;
    curve.getPointAt(THREE.MathUtils.clamp(clusterP, 0.24, 0.75), _pt);
    glintPos[i * 3] = _pt.x + (detHash(i * 5 + 2) - 0.5) * 15.0;
    glintPos[i * 3 + 1] = _pt.y + (detHash(i * 5 + 3) - 0.5) * 9.5;
    glintPos[i * 3 + 2] = _pt.z + (detHash(i * 5 + 4) - 0.5) * 15.0;
    glintPhase[i] = detHash(i * 19 + 7) * 62.83;
  }

  const glintGeo = new THREE.BufferGeometry();
  glintGeo.setAttribute('position', new THREE.BufferAttribute(glintPos, 3));
  glintGeo.setAttribute('aPhase', new THREE.BufferAttribute(glintPhase, 1));
  disposableGeos.push(glintGeo);

  const glintUniforms = {
    uTime: { value: 0 },
    uStrength: { value: 0 },
    uPointScale: { value: 140.0 },
  };
  const glintMat = new THREE.ShaderMaterial({
    uniforms: glintUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      uniform float uPointScale;
      varying float vTwinkle;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float wave = 0.5 + 0.5 * sin(uTime * 2.35 + aPhase);
        vTwinkle = pow(wave, 10.0);
        gl_PointSize = clamp((uPointScale / max(1.5, -mvPosition.z)) * (0.45 + vTwinkle * 0.95), 1.5, 11.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uStrength;
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float halo = smoothstep(0.5, 0.04, d);
        vec3 col = mix(vec3(0.24, 0.82, 0.96), vec3(0.76, 0.99, 1.0), vTwinkle);
        gl_FragColor = vec4(col, halo * (0.08 + vTwinkle * 0.88) * uStrength);
      }
    `,
  });
  disposableMats.push(glintMat);

  const glintPoints = new THREE.Points(glintGeo, glintMat);
  glintPoints.frustumCulled = false;
  root.add(glintPoints);

  effects.set('E11', {
    id: 'E11',
    name: 'Plankton glints',
    enabled: true,
    setQuality: (prof) => {
      const cnt = prof.tier === 'low' ? 80 : prof.tier === 'balanced' ? 150 : maxGlints;
      glintGeo.setDrawRange(0, cnt);
    },
    update: ({ elapsedTime, progress, reducedMotion }) => {
      const strength = getEffectStrengthAtProgress('E11', progress);
      glintPoints.visible = strength > 0.01;
      if (!glintPoints.visible) return;
      glintUniforms.uTime.value = reducedMotion ? elapsedTime * 0.3 : elapsedTime;
      glintUniforms.uStrength.value = reducedMotion ? strength * 0.55 : strength;
    },
    dispose: () => {},
  });

  // ============================================================================
  // E12: DIRECTIONAL CURRENT RIBBONS (FLOW WISPS AROUND TERRAIN IN CH02/03/06/07)
  // ============================================================================
  const ribbonGroup = new THREE.Group();
  ribbonGroup.name = 'E12_CurrentRibbons';
  root.add(ribbonGroup);

  const ribbonUniforms = {
    uTime: { value: 0 },
    uStrength: { value: 0 },
  };
  const ribbonMat = new THREE.ShaderMaterial({
    uniforms: ribbonUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uStrength;
      varying vec2 vUv;
      void main() {
        float edgeFade = sin(vUv.y * 3.14159265);
        float lengthTaper = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.80, vUv.x);
        float stream = 0.5 + 0.5 * sin(vUv.x * 9.5 - uTime * 1.85);
        float wisp = pow(stream, 2.2) * edgeFade * lengthTaper;
        vec3 col = vec3(0.42, 0.86, 0.98);
        gl_FragColor = vec4(col, wisp * 0.24 * uStrength);
      }
    `,
  });
  disposableMats.push(ribbonMat);

  const ribbonAnchors = [0.15, 0.20, 0.28, 0.33, 0.66, 0.72, 0.79, 0.85];
  const ribbonMeshes: THREE.Mesh[] = [];

  for (let r = 0; r < ribbonAnchors.length; r++) {
    const pAnchor = ribbonAnchors[r];
    const basis = getSightlineBasisAtProgress(pAnchor);
    for (let k = 0; k < 2; k++) {
      const idx = r * 2 + k;
      const sideSign = k === 0 ? -1 : 1;
      const baseOrigin = basis.fishPos
        .clone()
        .addScaledVector(basis.sightDir, 4.8 + k * 3.4)
        .addScaledVector(basis.sightRight, sideSign * (2.6 + detHash(idx * 7) * 2.2));
      baseOrigin.y += (k === 0 ? 1.1 : -1.2);

      const ctrlPts: THREE.Vector3[] = [];
      for (let s = 0; s < 5; s++) {
        const frac = (s - 2) * 2.4;
        ctrlPts.push(
          new THREE.Vector3(
            baseOrigin.x + frac * 0.85 + Math.sin(s * 1.3 + idx) * 0.75,
            baseOrigin.y - s * 0.38 + Math.cos(s * 1.1 + idx) * 0.28,
            baseOrigin.z - s * 1.65,
          ),
        );
      }
      const rCurve = new THREE.CatmullRomCurve3(ctrlPts);
      const rGeo = new THREE.TubeGeometry(rCurve, 24, 0.055, 6, false);
      disposableGeos.push(rGeo);
      const rMesh = new THREE.Mesh(rGeo, ribbonMat);
      ribbonGroup.add(rMesh);
      ribbonMeshes.push(rMesh);
    }
  }

  effects.set('E12', {
    id: 'E12',
    name: 'Directional current ribbons',
    enabled: true,
    setQuality: (prof) => {
      ribbonMeshes.forEach((m, i) => {
        m.visible = prof.tier === 'low' ? i % 2 === 0 : true;
      });
    },
    update: ({ elapsedTime, progress, reducedMotion }) => {
      const strength = getEffectStrengthAtProgress('E12', progress);
      ribbonGroup.visible = strength > 0.01;
      if (!ribbonGroup.visible) return;
      ribbonUniforms.uTime.value = reducedMotion ? elapsedTime * 0.3 : elapsedTime;
      ribbonUniforms.uStrength.value = reducedMotion ? strength * 0.6 : strength;
    },
    dispose: () => {},
  });

  // ============================================================================
  // E17: FOREGROUND PARALLAX WIPE SILHOUETTES (SAFE OUTER-MARGIN 3D PROPS)
  // ============================================================================
  const parallaxGroup = new THREE.Group();
  parallaxGroup.name = 'E17_ForegroundParallaxProps';
  root.add(parallaxGroup);

  const silhouetteRockMat = new THREE.MeshStandardMaterial({
    color: 0x0c273b,
    roughness: 0.9,
    metalness: 0.05,
  });
  disposableMats.push(silhouetteRockMat);

  const spireGeo = new THREE.ConeGeometry(0.68, 4.8, 9, 4);
  const spirePos = spireGeo.attributes.position;
  for (let i = 0; i < spirePos.count; i++) {
    const vx = spirePos.getX(i);
    const vy = spirePos.getY(i);
    const vz = spirePos.getZ(i);
    const n = Math.sin(vy * 1.7 + vx * 2.4) * 0.14;
    spirePos.setXYZ(i, vx + n, vy, vz - n * 0.8);
  }
  spireGeo.computeVertexNormals();
  disposableGeos.push(spireGeo);

  // Place sculpted multi-part foreground framing pillars on the safe right/bottom-right camera margin
  // so lateral tracking causes rich near-camera depth wipes without covering the hero fish or top-left title!
  const parallaxBeats = [
    { p: 0.16, side: 1, distFromCam: 2.8, lateral: 2.35, yOff: -1.4, scale: 0.82 },
    { p: 0.29, side: 1, distFromCam: 3.1, lateral: 2.65, yOff: -1.5, scale: 1.05 },
    { p: 0.68, side: -1, distFromCam: 3.0, lateral: 2.55, yOff: -1.55, scale: 0.95 },
    { p: 0.81, side: 1, distFromCam: 3.2, lateral: 2.6, yOff: -1.35, scale: 1.12 },
  ];

  for (const pb of parallaxBeats) {
    const basis = getSightlineBasisAtProgress(pb.p);
    const cluster = new THREE.Group();
    const mainSpire = new THREE.Mesh(spireGeo, silhouetteRockMat);
    const secondarySpire = new THREE.Mesh(spireGeo, silhouetteRockMat);
    secondarySpire.scale.set(0.68, 0.62, 0.72);
    secondarySpire.position.set(pb.side * 0.55, -0.85, 0.35);
    const baseBolder = new THREE.Mesh(spireGeo, silhouetteRockMat);
    baseBolder.scale.set(1.25, 0.35, 1.15);
    baseBolder.position.set(0, -1.75, 0);
    cluster.add(mainSpire, secondarySpire, baseBolder);
    cluster.scale.setScalar(pb.scale);

    const worldPos = basis.camPos
      .clone()
      .addScaledVector(basis.sightDir, pb.distFromCam)
      .addScaledVector(basis.sightRight, pb.side * pb.lateral);
    worldPos.y += pb.yOff;
    cluster.position.copy(worldPos);
    parallaxGroup.add(cluster);
  }

  effects.set('E17', {
    id: 'E17',
    name: 'Depth parallax/foreground wipe',
    enabled: true,
    setQuality: (prof) => {
      parallaxGroup.visible = prof.tier !== 'low';
    },
    update: ({ progress }) => {
      if (currentProfile.tier === 'low') {
        parallaxGroup.visible = false;
        return;
      }
      parallaxGroup.visible = getEffectStrengthAtProgress('E17', progress) > 0.02;
    },
    dispose: () => {},
  });

  // ============================================================================
  // E22: CAUDAL HYDRODYNAMIC WAKE / TURBULENCE (TIED TO SWIM PHASE & VELOCITY)
  // ============================================================================
  const maxWake = 42;
  const wakePositions = new Float32Array(maxWake * 3);
  interface WakeParticle {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    age: number;
    life: number;
  }
  const wakePool: WakeParticle[] = [];
  for (let i = 0; i < maxWake; i++) {
    wakePool.push({
      pos: new THREE.Vector3(0, -999, 0),
      vel: new THREE.Vector3(),
      age: (i / maxWake) * 1.35,
      life: 0.95 + detHash(i * 19 + 3) * 0.65,
    });
  }

  const wakeGeo = new THREE.BufferGeometry();
  wakeGeo.setAttribute('position', new THREE.BufferAttribute(wakePositions, 3));
  disposableGeos.push(wakeGeo);

  const wakeMat = new THREE.PointsMaterial({
    color: 0xd8f6ff,
    size: 0.085,
    map: textures.particleMap,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  disposableMats.push(wakeMat);

  const wakePoints = new THREE.Points(wakeGeo, wakeMat);
  wakePoints.frustumCulled = false;
  root.add(wakePoints);

  const _tailSpawn = new THREE.Vector3();
  const _fishRight = new THREE.Vector3();
  const _upAxis = new THREE.Vector3(0, 1, 0);

  effects.set('E22', {
    id: 'E22',
    name: 'Caudal wake/turbulence',
    enabled: true,
    setQuality: (prof) => {
      const cnt = prof.tier === 'low' ? 16 : prof.tier === 'balanced' ? 28 : maxWake;
      wakeGeo.setDrawRange(0, cnt);
    },
    update: ({ elapsedTime, dt, progress, reducedMotion, fishWorldPos, fishForwardDir, tailPhaseSin, scrollVelocity }) => {
      const speedBoost = Math.min(1.0, Math.abs(scrollVelocity) * 2.2);
      wakeMat.opacity = reducedMotion ? 0.12 : 0.2 + speedBoost * 0.22;

      _fishRight.crossVectors(fishForwardDir, _upAxis).normalize();
      _tailSpawn
        .copy(fishWorldPos)
        .addScaledVector(fishForwardDir, -0.78)
        .addScaledVector(_fishRight, tailPhaseSin * 0.14);

      const activeWake = wakeGeo.drawRange.count;
      const wakeAttr = wakeGeo.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < activeWake; i++) {
        const wp = wakePool[i];
        wp.age += dt * (reducedMotion ? 0.45 : 1.0 + speedBoost * 0.85);
        if (wp.age >= wp.life) {
          wp.age = wp.age % wp.life;
          const spread = 0.05 + detHash(i * 17 + Math.floor(elapsedTime * 12)) * 0.09;
          const ang = detHash(i * 23 + 5) * Math.PI * 2;
          wp.pos.set(
            _tailSpawn.x + Math.cos(ang) * spread,
            _tailSpawn.y + Math.sin(ang) * spread * 0.65,
            _tailSpawn.z + Math.sin(ang * 1.7) * spread,
          );
          const buoyancy = progress < 0.45 ? 0.2 : 0.05;
          wp.vel
            .copy(fishForwardDir)
            .multiplyScalar(-(0.3 + speedBoost * 0.55))
            .addScaledVector(_fishRight, -tailPhaseSin * 0.18);
          wp.vel.y += buoyancy;
        } else {
          wp.pos.addScaledVector(wp.vel, dt);
        }
        wakeAttr.setXYZ(i, wp.pos.x, wp.pos.y, wp.pos.z);
      }
      wakeAttr.needsUpdate = true;
    },
    dispose: () => {},
  });

  // ============================================================================
  // E23: TRIGGERED SEAFLOOR & CANYON SILT PLUME (CH06-CH08 BOUNDED SEDIMENT POOL)
  // ============================================================================
  const maxSilt = 240;
  const siltBase = new Float32Array(maxSilt * 3);
  const siltPos = new Float32Array(maxSilt * 3);
  const siltSeed = new Float32Array(maxSilt);
  const siltProgressZones = [0.66, 0.71, 0.79, 0.84, 0.92];

  for (let i = 0; i < maxSilt; i++) {
    const pz = siltProgressZones[i % siltProgressZones.length] + (detHash(i * 9 + 1) - 0.5) * 0.04;
    const basis = getSightlineBasisAtProgress(pz);
    const fwd = 3.2 + detHash(i * 9 + 2) * 12.5;
    const right = (detHash(i * 9 + 3) - 0.5) * 14.0;
    const baseVec = basis.fishPos
      .clone()
      .addScaledVector(basis.sightDir, fwd)
      .addScaledVector(basis.sightRight, right);
    baseVec.y -= 2.2 + detHash(i * 9 + 4) * 2.6;

    siltBase[i * 3] = baseVec.x;
    siltBase[i * 3 + 1] = baseVec.y;
    siltBase[i * 3 + 2] = baseVec.z;
    siltPos[i * 3] = baseVec.x;
    siltPos[i * 3 + 1] = baseVec.y;
    siltPos[i * 3 + 2] = baseVec.z;
    siltSeed[i] = detHash(i * 15 + 7) * Math.PI * 2;
  }

  const siltGeo = new THREE.BufferGeometry();
  siltGeo.setAttribute('position', new THREE.BufferAttribute(siltPos, 3));
  disposableGeos.push(siltGeo);

  const siltMat = new THREE.PointsMaterial({
    color: 0x7aaec4,
    size: 0.19,
    map: textures.particleMap,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  disposableMats.push(siltMat);

  const siltPoints = new THREE.Points(siltGeo, siltMat);
  siltPoints.frustumCulled = false;
  root.add(siltPoints);

  effects.set('E23', {
    id: 'E23',
    name: 'Seafloor silt plume',
    enabled: true,
    setQuality: (prof) => {
      const cnt = prof.tier === 'low' ? 90 : prof.tier === 'balanced' ? 165 : maxSilt;
      siltGeo.setDrawRange(0, cnt);
    },
    update: ({ elapsedTime, progress, reducedMotion, scrollVelocity }) => {
      const strength = getEffectStrengthAtProgress('E23', progress);
      siltPoints.visible = strength > 0.01;
      if (!siltPoints.visible) return;

      const motionLift = Math.min(1.0, Math.abs(scrollVelocity) * 1.8);
      siltMat.opacity = strength * (reducedMotion ? 0.22 : 0.34 + motionLift * 0.16);

      const tAnim = reducedMotion ? elapsedTime * 0.22 : elapsedTime;
      const count = siltGeo.drawRange.count;
      const attr = siltGeo.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < count; i++) {
        const s = siltSeed[i];
        const liftCycle = ((tAnim * 0.32 + s) % 3.14159);
        const liftY = Math.sin(liftCycle) * (0.65 + motionLift * 0.45);
        const driftX = Math.cos(tAnim * 0.28 + s) * 0.75;
        attr.setXYZ(
          i,
          siltBase[i * 3] + driftX,
          siltBase[i * 3 + 1] + liftY,
          siltBase[i * 3 + 2] + Math.sin(tAnim * 0.22 + s * 1.4) * 0.55,
        );
      }
      attr.needsUpdate = true;
    },
    dispose: () => {},
  });

  // ============================================================================
  // E24: HADAL COLD-SEEP MINERAL SHIMMER & CHEMOSYNTHETIC BIO-LIGHT (CH08)
  // ============================================================================
  const seepGroup = new THREE.Group();
  seepGroup.name = 'E24_HadalColdSeepShimmer';
  root.add(seepGroup);

  const hadalBasis = getSightlineBasisAtProgress(0.96);
  const seepOrigin = hadalBasis.fishPos
    .clone()
    .addScaledVector(hadalBasis.sightDir, 6.2)
    .add(new THREE.Vector3(0, -3.6, 0));

  const seepShimmerCount = 130;
  const seepPos = new Float32Array(seepShimmerCount * 3);
  const seepPhase = new Float32Array(seepShimmerCount);
  for (let i = 0; i < seepShimmerCount; i++) {
    seepPos[i * 3] = seepOrigin.x + (detHash(i * 7 + 1) - 0.5) * 7.5;
    seepPos[i * 3 + 1] = seepOrigin.y + detHash(i * 7 + 2) * 8.5;
    seepPos[i * 3 + 2] = seepOrigin.z + (detHash(i * 7 + 3) - 0.5) * 7.5;
    seepPhase[i] = detHash(i * 13 + 5) * 6.283;
  }

  const seepShimmerGeo = new THREE.BufferGeometry();
  seepShimmerGeo.setAttribute('position', new THREE.BufferAttribute(seepPos, 3));
  seepShimmerGeo.setAttribute('aPhase', new THREE.BufferAttribute(seepPhase, 1));
  disposableGeos.push(seepShimmerGeo);

  const seepUniforms = {
    uTime: { value: 0 },
    uReveal: { value: 0 },
  };
  const seepShimmerMat = new THREE.ShaderMaterial({
    uniforms: seepUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aPhase;
      uniform float uTime;
      varying float vGlow;
      void main() {
        vec3 p = position;
        float cycle = mod(uTime * 0.45 + aPhase, 6.28318);
        p.y += cycle * 0.65;
        p.x += sin(uTime * 0.9 + aPhase) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vGlow = sin(clamp(cycle / 6.28318, 0.0, 1.0) * 3.14159);
        gl_PointSize = clamp((130.0 / max(1.5, -mv.z)) * (0.5 + vGlow * 0.7), 1.5, 9.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uReveal;
      varying float vGlow;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float soft = smoothstep(0.5, 0.05, d);
        vec3 col = mix(vec3(0.18, 0.68, 0.90), vec3(0.58, 0.96, 1.0), vGlow);
        gl_FragColor = vec4(col, soft * vGlow * 0.62 * uReveal);
      }
    `,
  });
  disposableMats.push(seepShimmerMat);

  const seepShimmerPoints = new THREE.Points(seepShimmerGeo, seepShimmerMat);
  seepShimmerPoints.frustumCulled = false;
  seepGroup.add(seepShimmerPoints);

  effects.set('E24', {
    id: 'E24',
    name: 'Cold-seep plume/shimmer',
    enabled: true,
    setQuality: (prof) => {
      seepShimmerGeo.setDrawRange(0, prof.tier === 'low' ? 55 : seepShimmerCount);
    },
    update: ({ elapsedTime, progress, reducedMotion }) => {
      const strength = getEffectStrengthAtProgress('E24', progress);
      seepGroup.visible = strength > 0.01;
      if (!seepGroup.visible) return;
      seepUniforms.uTime.value = reducedMotion ? elapsedTime * 0.25 : elapsedTime;
      seepUniforms.uReveal.value = strength;
    },
    dispose: () => {},
  });

  // Register metadata hooks for the remaining 16 effects owned by WorldBuilder / Controller / FishRig / HUD
  // so the registry maintains a complete 24-effect lifecycle & telemetry manifest.
  for (const desc of EFFECT_CATALOGUE) {
    if (!effects.has(desc.id)) {
      effects.set(desc.id, {
        id: desc.id,
        name: desc.name,
        enabled: true,
        setQuality: () => {},
        update: () => {},
        dispose: () => {},
      });
    }
  }

  const getActiveEffectIds = (progress: number): EffectId[] => {
    const active: EffectId[] = [];
    for (const desc of EFFECT_CATALOGUE) {
      const eff = effects.get(desc.id);
      if (eff?.enabled && getEffectStrengthAtProgress(desc.id, progress) > 0.05) {
        active.push(desc.id);
      }
    }
    return active;
  };

  const update = (ctx: EffectRuntimeContext) => {
    for (const eff of effects.values()) {
      if (eff.enabled) {
        eff.update(ctx);
      }
    }
  };

  const setQuality = (prof: QualityProfile) => {
    currentProfile = prof;
    for (const eff of effects.values()) {
      eff.setQuality(prof);
    }
  };

  const dispose = () => {
    for (const eff of effects.values()) {
      eff.dispose();
    }
    disposableGeos.forEach((g) => g.dispose());
    disposableMats.forEach((m) => m.dispose());
  };

  return {
    root,
    effects,
    getActiveEffectIds,
    update,
    setQuality,
    dispose,
  };
}
