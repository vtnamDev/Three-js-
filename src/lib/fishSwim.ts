import * as THREE from 'three';

export interface SwimKinematicsSample {
  spineYaw: number[];       // 8 longitudinal spine joints (snout -> caudal fin)
  spineLateralOffset: number;
  pectoralLeftFlap: number;
  pectoralRightFlap: number;
  pectoralSpread: number;
  gillPulse: number;
  bodyRoll: number;
}

export const SPINE_BONE_COUNT = 8;

/**
 * Pure biomechanical carangiform swim solver.
 * Separates `elapsedTime` (continuous biological propulsion) from `scrollVelocity` (burst cadence).
 * Guarantees non-zero multi-joint tail, body, and pectoral fin articulation when scroll is completely stationary.
 */
export function evaluateSwimKinematics(
  elapsedTime: number,
  scrollVelocity = 0,
  reducedMotion = false,
): SwimKinematicsSample {
  const speedFactor = Math.min(1.8, Math.abs(scrollVelocity) * 2.4);
  // Even in reduced-motion mode, keep a calm, gentle biological tail beat so the fish stays alive
  const ampScale = reducedMotion ? 0.45 : 1.0 + speedFactor * 0.28;
  const freq = (reducedMotion ? 1.8 : 3.15) + speedFactor * 1.35;
  const phase = elapsedTime * freq;
  const waveNumber = 4.35; // ~0.7 wavelengths along body (classic carangiform propulsion)

  const spineYaw: number[] = new Array(SPINE_BONE_COUNT);

  for (let i = 0; i < SPINE_BONE_COUNT; i++) {
    const s = i / (SPINE_BONE_COUNT - 1); // 0 = head/snout, 1 = caudal blade
    // Cranial stiffness near s=0; quadratic-cubic amplitude growth toward peduncle & caudal fin
    const envelope = 0.018 + 0.09 * Math.pow(s, 1.75) + 0.24 * Math.pow(s, 3.1);
    // Relative incremental joint rotation so cumulative chain forms traveling wave without kinking
    const localAngle = Math.sin(phase - waveNumber * s) * envelope * ampScale;
    spineYaw[i] = i === 0 ? localAngle * 0.35 : localAngle * 0.42;
  }

  // Subtle counter-recoil at center of mass + pectoral fin sculling with phase lag
  const spineLateralOffset = -Math.sin(phase) * 0.014 * ampScale;
  const hoverFactor = 1.0 - Math.min(1.0, speedFactor * 0.7);
  const pectoralFreq = freq * 0.85;
  const pectoralLeftFlap =
    Math.sin(elapsedTime * pectoralFreq + 0.6) * (0.24 * hoverFactor + 0.09) * (reducedMotion ? 0.5 : 1);
  const pectoralRightFlap =
    Math.sin(elapsedTime * pectoralFreq + 0.6 + 0.35) *
    (0.24 * hoverFactor + 0.09) *
    (reducedMotion ? 0.5 : 1);
  const pectoralSpread = 0.16 * hoverFactor;
  const gillPulse = (Math.sin(elapsedTime * 3.8) * 0.5 + 0.5) * (reducedMotion ? 0.4 : 1.0);
  const bodyRoll = Math.sin(phase * 0.5) * 0.032 * ampScale;

  return {
    spineYaw,
    spineLateralOffset,
    pectoralLeftFlap,
    pectoralRightFlap,
    pectoralSpread,
    gillPulse,
    bodyRoll,
  };
}

export interface RiggedFishRig {
  root: THREE.Group;
  skinnedMesh?: THREE.SkinnedMesh;
  spineBones: THREE.Bone[];
  pectoralLeftBone: THREE.Bone;
  pectoralRightBone: THREE.Bone;
  shaderUniforms: {
    uTime: { value: number };
    uSwimAmp: { value: number };
    uBioRim: { value: number };
  };
  update: (elapsedTime: number, scrollVelocity: number, reducedMotion: boolean) => void;
  dispose: () => void;
}

/**
 * Converts the static Khronos BarramundiFish mesh (snout at -Z, caudal tail at +Z)
 * into a genuine 10-bone `THREE.SkinnedMesh` with smooth anatomical vertex weights
 * (8 longitudinal spine bones + 2 lateral pectoral fin bones) plus subtle dorsal/anal/caudal
 * membrane wave shader enhancement while preserving full PBR maps and normals.
 */
export function buildAnatomicalSkinnedFish(loadedScene: THREE.Object3D): RiggedFishRig {
  let sourceMesh: THREE.Mesh | null = null;
  loadedScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && !sourceMesh) {
      sourceMesh = child as THREE.Mesh;
    }
  });

  if (!sourceMesh) {
    return buildProceduralFallbackFish();
  }

  const mesh = sourceMesh as THREE.Mesh;
  const srcGeo = mesh.geometry.clone();
  srcGeo.computeBoundingBox();
  const bbox = srcGeo.boundingBox!;

  // Center Y around midline (~0.135 in Barramundi) and flip Y by PI so snout (+Z) faces Three.js lookAt forward!
  const centerY = (bbox.min.y + bbox.max.y) * 0.5;
  const centerX = (bbox.min.x + bbox.max.x) * 0.5;
  srcGeo.translate(-centerX, -centerY, 0);
  srcGeo.rotateY(Math.PI);
  srcGeo.computeBoundingBox();

  // After rotateY(PI): Snout is at +Z (+0.318), Caudal Fin tip is at -Z (-0.325)!
  const normBox = srcGeo.boundingBox!;
  const maxZ = normBox.max.z; // Snout (+0.318)
  const minZ = normBox.min.z; // Caudal tail (-0.325)
  const lengthZ = Math.max(0.001, maxZ - minZ);
  const halfWidthX = Math.max(0.001, (normBox.max.x - normBox.min.x) * 0.5);

  // Normalize fish to hero world length = 2.15 units for crisp cinematic readability
  const targetLength = 2.15;
  const scaleFactor = targetLength / lengthZ;
  srcGeo.scale(scaleFactor, scaleFactor, scaleFactor);
  srcGeo.computeBoundingBox();
  srcGeo.computeVertexNormals();

  const scaledBox = srcGeo.boundingBox!;
  const snoutZ = scaledBox.max.z;
  const tailZ = scaledBox.min.z;
  const totalLen = snoutZ - tailZ;
  const bodyHalfWidth = halfWidthX * scaleFactor;

  // Build 10-bone anatomical skeleton:
  // Bones 0..7: Spine chain from snout/skull (Bone 0) backward to caudal fin blade (Bone 7)
  // Bone 8: Left Pectoral Fin (child of Bone 2 Thorax)
  // Bone 9: Right Pectoral Fin (child of Bone 2 Thorax)
  const spineBones: THREE.Bone[] = [];
  const segmentStep = totalLen / (SPINE_BONE_COUNT - 1);

  for (let i = 0; i < SPINE_BONE_COUNT; i++) {
    const bone = new THREE.Bone();
    bone.name = `PelagicSpine_${i}`;
    if (i === 0) {
      bone.position.set(0, 0, snoutZ);
    } else {
      bone.position.set(0, 0, -segmentStep);
      spineBones[i - 1].add(bone);
    }
    spineBones.push(bone);
  }

  const pectoralLeftBone = new THREE.Bone();
  pectoralLeftBone.name = 'PelagicPectoral_L';
  pectoralLeftBone.position.set(bodyHalfWidth * 0.48, -0.08 * scaleFactor, 0);
  spineBones[2].add(pectoralLeftBone);

  const pectoralRightBone = new THREE.Bone();
  pectoralRightBone.name = 'PelagicPectoral_R';
  pectoralRightBone.position.set(-bodyHalfWidth * 0.48, -0.08 * scaleFactor, 0);
  spineBones[2].add(pectoralRightBone);

  const allBones: THREE.Bone[] = [...spineBones, pectoralLeftBone, pectoralRightBone];

  // Assign smooth 4-joint skinIndices and skinWeights per vertex
  const posAttr = srcGeo.attributes.position;
  const vCount = posAttr.count;
  const skinIndices = new Uint16Array(vCount * 4);
  const skinWeights = new Float32Array(vCount * 4);

  for (let v = 0; v < vCount; v++) {
    const vx = posAttr.getX(v);
    const vy = posAttr.getY(v);
    const vz = posAttr.getZ(v);

    // Longitudinal normalized coordinate s: 0 at snout (+Z), 1 at caudal tail (-Z)
    const s = THREE.MathUtils.clamp((snoutZ - vz) / totalLen, 0, 1);
    const spineFloat = s * (SPINE_BONE_COUNT - 1);
    const idxA = Math.min(SPINE_BONE_COUNT - 2, Math.floor(spineFloat));
    const idxB = idxA + 1;
    const frac = spineFloat - idxA;

    let wA = 1 - frac;
    let wB = frac;

    // Detect lateral pectoral fin vertices (s in [0.24..0.46], lateral |x| > 56% half-width, lower-mid Y)
    let pecBoneIdx = 0;
    let pecWeight = 0;
    const absXRatio = Math.abs(vx) / bodyHalfWidth;
    if (s > 0.22 && s < 0.47 && absXRatio > 0.56 && vy < 0.08 * scaleFactor) {
      const sMask = Math.sin(((s - 0.22) / 0.25) * Math.PI);
      const xMask = THREE.MathUtils.clamp((absXRatio - 0.56) / 0.36, 0, 1);
      pecWeight = THREE.MathUtils.clamp(sMask * xMask * 0.88, 0, 0.88);
      pecBoneIdx = vx >= 0 ? 8 : 9;
      wA *= 1 - pecWeight;
      wB *= 1 - pecWeight;
    }

    const base = v * 4;
    skinIndices[base] = idxA;
    skinIndices[base + 1] = idxB;
    skinIndices[base + 2] = pecBoneIdx;
    skinIndices[base + 3] = 0;

    skinWeights[base] = wA;
    skinWeights[base + 1] = wB;
    skinWeights[base + 2] = pecWeight;
    skinWeights[base + 3] = 0;
  }

  srcGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  srcGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  // Calibrate biological PBR material + subtle fin-ray flutter & wet mucus Fresnel sheen
  const shaderUniforms = {
    uTime: { value: 0 },
    uSwimAmp: { value: 1 },
    uBioRim: { value: 0.15 },
  };

  const origMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
  const fishMat = origMat.clone();
  fishMat.color.setHex(0xffffff);
  fishMat.roughness = 0.34;
  fishMat.metalness = 0.14;
  fishMat.envMapIntensity = 1.15;
  fishMat.side = THREE.DoubleSide;
  fishMat.alphaTest = 0.18;
  fishMat.transparent = false; // Opaque + alphaTest prevents transparent sorting glitches on fins while keeping crisp fin fringes!

  if (fishMat.map) {
    fishMat.map.colorSpace = THREE.SRGBColorSpace;
  }

  fishMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shaderUniforms.uTime;
    shader.uniforms.uSwimAmp = shaderUniforms.uSwimAmp;
    shader.uniforms.uBioRim = shaderUniforms.uBioRim;

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uSwimAmp;
      varying vec3 vLocalBioPos;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vLocalBioPos = position;
        // Subtle secondary wave on dorsal/anal fin tips and trailing caudal membrane
        float finHeightMask = smoothstep(0.24, 0.45, abs(position.y));
        float caudalTipMask = smoothstep(-0.72, -1.08, position.z);
        float membraneMask = max(finHeightMask * 0.55, caudalTipMask * 0.65);
        transformed.x += sin(uTime * 5.2 + position.z * 5.5 + position.y * 4.0) * 0.022 * membraneMask * uSwimAmp;
        // Subtle operculum gill breathing expansion near head
        float gillMask = smoothstep(0.45, 0.72, position.z) * smoothstep(0.95, 0.72, position.z) * smoothstep(0.08, 0.18, abs(position.x));
        transformed.x += sign(position.x) * (sin(uTime * 3.8) * 0.5 + 0.5) * 0.011 * gillMask;
        `,
      );

    shader.fragmentShader =
      `
      uniform float uBioRim;
      varying vec3 vLocalBioPos;
      ` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        // Biological wet scale Fresnel sheen so silhouette stays volumetric even in deep abyssal zones
        vec3 viewDirBio = normalize(vViewPosition);
        float fresnelBio = pow(1.0 - abs(dot(normal, viewDirBio)), 3.2);
        gl_FragColor.rgb += vec3(0.22, 0.58, 0.78) * fresnelBio * uBioRim;
        #include <dithering_fragment>
        `,
      );
  };

  const skinnedMesh = new THREE.SkinnedMesh(srcGeo, fishMat);
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  skinnedMesh.frustumCulled = false;

  const root = new THREE.Group();
  root.name = 'PelagicHeroFishRoot';
  root.add(spineBones[0]);
  root.add(skinnedMesh);

  const skeleton = new THREE.Skeleton(allBones);
  skinnedMesh.bind(skeleton);

  const update = (elapsedTime: number, scrollVelocity: number, reducedMotion: boolean) => {
    const sample = evaluateSwimKinematics(elapsedTime, scrollVelocity, reducedMotion);
    shaderUniforms.uTime.value = elapsedTime;
    shaderUniforms.uSwimAmp.value = reducedMotion ? 0.45 : 1.0;

    for (let i = 0; i < SPINE_BONE_COUNT; i++) {
      spineBones[i].rotation.y = sample.spineYaw[i];
    }
    spineBones[0].position.x = sample.spineLateralOffset;
    spineBones[0].rotation.z = sample.bodyRoll;

    pectoralLeftBone.rotation.z = -0.25 + sample.pectoralLeftFlap;
    pectoralLeftBone.rotation.y = -sample.pectoralSpread - sample.pectoralLeftFlap * 0.45;

    pectoralRightBone.rotation.z = 0.25 - sample.pectoralRightFlap;
    pectoralRightBone.rotation.y = sample.pectoralSpread + sample.pectoralRightFlap * 0.45;
  };

  const dispose = () => {
    srcGeo.dispose();
    fishMat.dispose();
  };

  return {
    root,
    skinnedMesh,
    spineBones,
    pectoralLeftBone,
    pectoralRightBone,
    shaderUniforms,
    update,
    dispose,
  };
}

/**
 * Multi-part anatomical procedural fish fallback (11 distinct sculpted parts: LatheGeometry fusiform
 * body, beveled operculum plates, eyes with iris/cornea, spiny & soft dorsal fins, articulated pectoral,
 * pelvic, anal, and forked caudal fin) used ONLY if the GLB network fetch is blocked or simulated to fail.
 */
/**
 * Uses Quaternius' CC0 rigged clownfish as the hero asset. The source GLB contains
 * six swimming/action clips and an articulated 6-joint spine; this adapter normalizes
 * its FBX-origin scale, preserves the real skinning, and exposes the existing hero-rig API.
 */
export function buildAnimatedClownfishRig(
  loadedScene: THREE.Object3D,
  animations: THREE.AnimationClip[],
): RiggedFishRig {
  const root = new THREE.Group();
  root.name = 'PelagicAnimatedClownfishRoot';
  const geometries = new Set<THREE.BufferGeometry>();
  const clonedMaterials = new Set<THREE.Material>();
  const sourceMaterials = new Set<THREE.Material>();

  loadedScene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(loadedScene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const largestDimension = Math.max(size.x, size.y, size.z, 0.001);
  const fitScale = 1.82 / largestDimension;
  loadedScene.scale.multiplyScalar(fitScale);
  loadedScene.position.addScaledVector(center, -fitScale);
  root.add(loadedScene);

  const bones: THREE.Bone[] = [];
  let skinnedMesh: THREE.SkinnedMesh | undefined;
  loadedScene.traverse((object) => {
    if ((object as THREE.Bone).isBone) bones.push(object as THREE.Bone);
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh && !skinnedMesh) {
      skinnedMesh = mesh as THREE.SkinnedMesh;
    }

    const sourceList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const tuned = sourceList.map((source) => {
      sourceMaterials.add(source);
      const material = source.clone();
      clonedMaterials.add(material);
      if (material instanceof THREE.MeshStandardMaterial) {
        const name = material.name.toLowerCase();
        material.side = THREE.DoubleSide;
        material.metalness = 0.025;
        material.roughness = name.includes('eye') ? 0.12 : 0.31;
        material.envMapIntensity = 1.15;
        if (name.includes('main')) {
          material.color.setHex(0xf47720);
        } else if (name.includes('light')) {
          material.color.setHex(0xfff1d9);
        } else if (name.includes('dark')) {
          material.color.setHex(0x64371d);
        } else if (name.includes('eye')) {
          material.color.setHex(0x101419);
        }
        material.needsUpdate = true;
      }
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? tuned : tuned[0];
  });

  // The original GLB is authored with a 6-joint chain. Pad the old telemetry interface so
  // existing performance instrumentation can still read spineBones[7] without crashing.
  while (bones.length < SPINE_BONE_COUNT) {
    bones.push(bones[bones.length - 1] ?? new THREE.Bone());
  }
  if (!bones[0].parent) root.add(bones[0]);

  const mixer = new THREE.AnimationMixer(loadedScene);
  const normalClip =
    animations.find((clip) => /Swimming_Normal/i.test(clip.name)) ??
    animations.find((clip) => /Swimming/i.test(clip.name)) ??
    animations[0];
  const fastClip = animations.find((clip) => /Swimming_Fast/i.test(clip.name)) ?? null;
  const normalAction = normalClip ? mixer.clipAction(normalClip) : null;
  const fastAction = fastClip && fastClip !== normalClip ? mixer.clipAction(fastClip) : null;

  if (normalAction) {
    normalAction.reset();
    normalAction.enabled = true;
    normalAction.setLoop(THREE.LoopRepeat, Infinity);
    normalAction.setEffectiveWeight(1);
    normalAction.play();
  }
  if (fastAction) {
    fastAction.reset();
    fastAction.enabled = true;
    fastAction.setLoop(THREE.LoopRepeat, Infinity);
    fastAction.setEffectiveWeight(0);
    fastAction.play();
  }

  const pectoralLeftBone = bones[Math.min(3, bones.length - 1)];
  const pectoralRightBone = bones[Math.min(4, bones.length - 1)];
  const shaderUniforms = {
    uTime: { value: 0 },
    uSwimAmp: { value: 1 },
    uBioRim: { value: 0.23 },
  };
  let previousElapsed = 0;

  const update = (elapsedTime: number, scrollVelocity: number, reducedMotion: boolean) => {
    const delta = THREE.MathUtils.clamp(elapsedTime - previousElapsed, 0, 0.05);
    previousElapsed = elapsedTime;
    const scrollSpeed = Math.abs(scrollVelocity);
    const fastWeight = fastAction
      ? THREE.MathUtils.clamp((scrollSpeed - 0.03) * 0.82, 0, 0.62)
      : 0;
    normalAction?.setEffectiveWeight(1 - fastWeight);
    fastAction?.setEffectiveWeight(fastWeight);
    normalAction?.setEffectiveTimeScale(reducedMotion ? 0.54 : 0.86 + fastWeight * 0.48);
    fastAction?.setEffectiveTimeScale(reducedMotion ? 0.64 : 0.98 + fastWeight * 0.42);
    mixer.update(delta);

    const breath = Math.sin(elapsedTime * (reducedMotion ? 1.0 : 1.7));
    root.rotation.y = breath * (reducedMotion ? 0.006 : 0.018);
    root.rotation.z = Math.sin(elapsedTime * 0.75) * (reducedMotion ? 0.004 : 0.012);
    root.position.y = Math.sin(elapsedTime * 1.15) * (reducedMotion ? 0.0015 : 0.006);
    shaderUniforms.uTime.value = elapsedTime;
    shaderUniforms.uSwimAmp.value = reducedMotion ? 0.5 : 1 + Math.min(scrollSpeed, 0.7) * 0.22;
  };

  const dispose = () => {
    mixer.stopAllAction();
    mixer.uncacheRoot(loadedScene);
    geometries.forEach((geometry) => geometry.dispose());
    clonedMaterials.forEach((material) => material.dispose());
    sourceMaterials.forEach((material) => material.dispose());
  };

  return {
    root,
    skinnedMesh,
    spineBones: bones,
    pectoralLeftBone,
    pectoralRightBone,
    shaderUniforms,
    update,
    dispose,
  };
}

export function buildProceduralFallbackFish(): RiggedFishRig {
  // PELAGIC V5.1: build one smooth, watertight-looking body with vertex-colour markings.
  // This replaces the visibly segmented LatheGeometry body that produced pale, disconnected bands.
  const root = new THREE.Group();
  root.name = 'PelagicGoldenReefFish';
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => {
    geometries.push(geometry);
    return geometry;
  };
  const trackMaterial = <T extends THREE.Material>(material: T): T => {
    materials.push(material);
    return material;
  };

  const orange = new THREE.Color(0xe96813);
  const amber = new THREE.Color(0xf99b2d);
  const ivory = new THREE.Color(0xfff3dd);
  const stripeEdge = new THREE.Color(0x6d351c);
  const belly = new THREE.Color(0xf5b44d);

  const bodyMat = trackMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.28,
    metalness: 0.015,
    clearcoat: 0.52,
    clearcoatRoughness: 0.24,
    envMapIntensity: 1.15,
  }));
  const finMat = trackMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xe97820,
    roughness: 0.34,
    metalness: 0.01,
    clearcoat: 0.28,
    clearcoatRoughness: 0.31,
    side: THREE.DoubleSide,
  }));
  const finRayMat = trackMaterial(new THREE.MeshStandardMaterial({
    color: 0xffc16b,
    roughness: 0.42,
    metalness: 0.0,
    side: THREE.DoubleSide,
  }));
  const gillMat = trackMaterial(new THREE.MeshStandardMaterial({
    color: 0x733816,
    roughness: 0.54,
  }));
  const socketMat = trackMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x6d351c,
    roughness: 0.34,
    clearcoat: 0.25,
  }));
  const irisMat = trackMaterial(new THREE.MeshPhysicalMaterial({
    color: 0xffc343,
    roughness: 0.25,
    clearcoat: 0.45,
  }));
  const pupilMat = trackMaterial(new THREE.MeshPhysicalMaterial({
    color: 0x0b1117,
    roughness: 0.09,
    metalness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  }));
  const glintMat = trackMaterial(new THREE.MeshBasicMaterial({ color: 0xffffff }));

  // The snout is +Z and the caudal fin is -Z. Ring interpolation creates a continuous
  // rounded fusiform body; 96 rings avoid the faceted, stacked-segment appearance.
  const profile = [0.018, 0.060, 0.125, 0.205, 0.290, 0.365, 0.414, 0.440, 0.445, 0.430, 0.400, 0.365, 0.320, 0.265, 0.205, 0.145, 0.090, 0.046, 0.014];
  const bodyLength = 1.52;
  const ringCount = 96;
  const radialCount = 48;
  const positions = new Float32Array((ringCount + 1) * radialCount * 3);
  const colors = new Float32Array((ringCount + 1) * radialCount * 3);
  const uvs = new Float32Array((ringCount + 1) * radialCount * 2);
  const indices: number[] = [];

  const smooth = (a: number, b: number, x: number) => {
    const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const profileRadius = (t: number) => {
    const p = THREE.MathUtils.clamp(t, 0, 1) * (profile.length - 1);
    const i = Math.min(profile.length - 2, Math.floor(p));
    const f = p - i;
    const s = f * f * (3 - 2 * f);
    return THREE.MathUtils.lerp(profile[i], profile[i + 1], s);
  };
  const stripeCenters = [0.265, 0.535, 0.795];

  for (let i = 0; i <= ringCount; i++) {
    const t = i / ringCount;
    const z = (t - 0.5) * bodyLength;
    const radius = profileRadius(t);
    for (let j = 0; j < radialCount; j++) {
      const theta = (j / radialCount) * Math.PI * 2;
      const x = Math.cos(theta) * radius * 0.69;
      const y = 0.015 + Math.sin(theta) * radius;
      const k = i * radialCount + j;
      positions[k * 3] = x;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = z;
      uvs[k * 2] = t;
      uvs[k * 2 + 1] = j / radialCount;

      let colour = orange.clone().lerp(amber, 0.19 + 0.11 * Math.max(0, Math.sin(theta)));
      if (Math.sin(theta) < -0.60) colour.lerp(belly, 0.34);
      let bandDistance = Infinity;
      for (const center of stripeCenters) bandDistance = Math.min(bandDistance, Math.abs(t - center));
      // Ivory bands and narrow warm-dark margins live on the same vertex-coloured surface.
      if (bandDistance < 0.045) colour.copy(ivory).lerp(new THREE.Color(0xfff8ea), Math.max(0, Math.sin(theta)) * 0.08);
      else if (bandDistance < 0.054) colour.copy(stripeEdge);
      colors[k * 3] = colour.r;
      colors[k * 3 + 1] = colour.g;
      colors[k * 3 + 2] = colour.b;
    }
  }

  for (let i = 0; i < ringCount; i++) {
    for (let j = 0; j < radialCount; j++) {
      const a = i * radialCount + j;
      const b = i * radialCount + ((j + 1) % radialCount);
      const c = (i + 1) * radialCount + j;
      const d = (i + 1) * radialCount + ((j + 1) % radialCount);
      indices.push(a, b, c, b, d, c);
    }
  }

  const bodyGeometry = trackGeometry(new THREE.BufferGeometry());
  bodyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  bodyGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  bodyGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  bodyGeometry.setIndex(indices);
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeometry, bodyMat);
  body.name = 'ContinuousAmberBody';
  body.castShadow = true;
  body.receiveShadow = true;
  root.add(body);

  const shaderUniforms = {
    uTime: { value: 0 },
    uSwimAmp: { value: 1 },
    uBioRim: { value: 0.26 },
  };
  bodyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uPelagicTime = shaderUniforms.uTime;
    shader.uniforms.uPelagicSwim = shaderUniforms.uSwimAmp;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uPelagicTime;\nuniform float uPelagicSwim;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nfloat tailInfluence = 1.0 - smoothstep(-0.73, -0.06, position.z);\ntransformed.x += sin(uPelagicTime * 2.85 + position.z * 5.0) * 0.046 * tailInfluence * uPelagicSwim;',
    );
  };
  bodyMat.customProgramCacheKey = () => 'pelagic-continuous-reef-fish-v51';

  // Spine hierarchy remains available to the existing telemetry and tail-wave animation.
  const spineBones: THREE.Bone[] = [];
  const boneStep = bodyLength / (SPINE_BONE_COUNT - 1);
  for (let i = 0; i < SPINE_BONE_COUNT; i++) {
    const bone = new THREE.Bone();
    bone.name = 'ReefFishSpine_' + i;
    bone.position.set(0, 0, i === 0 ? bodyLength * 0.5 - 0.04 : -boneStep);
    if (i === 0) root.add(bone);
    else spineBones[i - 1].add(bone);
    spineBones.push(bone);
  }

  // A rounded, swept fan fin with separate fin rays: fewer paper-triangle silhouettes.
  const tail = new THREE.Group();
  tail.name = 'AnimatedFanTail';
  spineBones[SPINE_BONE_COUNT - 1].add(tail);
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0);
  tailShape.quadraticCurveTo(0.13, 0.21, 0.39, 0.29);
  tailShape.quadraticCurveTo(0.34, 0.11, 0.27, 0.015);
  tailShape.quadraticCurveTo(0.34, -0.08, 0.39, -0.29);
  tailShape.quadraticCurveTo(0.13, -0.21, 0, 0);
  const tailGeometry = trackGeometry(new THREE.ExtrudeGeometry(tailShape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.009,
    bevelThickness: 0.008,
    curveSegments: 18,
  }));
  tailGeometry.rotateY(Math.PI / 2);
  const tailMesh = new THREE.Mesh(tailGeometry, finMat);
  tailMesh.name = 'RoundedCaudalFin';
  tailMesh.castShadow = true;
  tail.add(tailMesh);

  const addXYTube = (parent: THREE.Object3D, pts: [number, number][], radius: number, material: THREE.Material, name: string, rotateY = true) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    const geo = trackGeometry(new THREE.TubeGeometry(curve, 12, radius, 5, false));
    if (rotateY) geo.rotateY(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  for (let i = 0; i < 7; i++) {
    const u = (i / 6) * 2 - 1;
    addXYTube(tail, [[0.015, u * 0.018], [0.13, u * 0.09], [0.285, u * 0.205], [0.355, u * 0.265]], 0.0042, finRayMat, 'CaudalRay' + i);
  }

  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(-0.17, 0);
  dorsalShape.quadraticCurveTo(-0.05, 0.16, 0.12, 0.205);
  dorsalShape.quadraticCurveTo(0.31, 0.22, 0.405, 0.105);
  dorsalShape.quadraticCurveTo(0.35, 0.025, 0.18, 0);
  dorsalShape.closePath();
  const dorsalGeometry = trackGeometry(new THREE.ExtrudeGeometry(dorsalShape, {
    depth: 0.014, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.006, bevelThickness: 0.005, curveSegments: 16,
  }));
  dorsalGeometry.rotateY(Math.PI / 2);
  const dorsal = new THREE.Mesh(dorsalGeometry, finMat);
  dorsal.name = 'SweptDorsalFin';
  dorsal.position.set(0, 0.365, 0.035);
  dorsal.castShadow = true;
  root.add(dorsal);
  for (let i = 0; i < 5; i++) {
    const u = i / 4;
    const dorsalRay = addXYTube(root, [[-0.12 + u * 0.22, 0.015 + u * 0.01], [0.02 + u * 0.23, 0.09 + 0.06 * Math.sin(u * Math.PI)], [0.09 + u * 0.24, 0.17 + 0.02 * Math.sin(u * Math.PI)]], 0.0035, finRayMat, 'DorsalRay' + i);
    dorsalRay.position.y = 0.365;
    dorsalRay.position.z = 0.035;
  }

  const analGeometry = trackGeometry(dorsalGeometry.clone());
  analGeometry.rotateX(Math.PI);
  const anal = new THREE.Mesh(analGeometry, finMat);
  anal.name = 'RoundedAnalFin';
  anal.position.set(0, -0.345, -0.20);
  anal.scale.set(0.82, 0.86, 0.82);
  root.add(anal);

  // Eyes belong near the snout, not behind the gill plate. Layered socket, amber iris and pupil.
  const eyeGeo = trackGeometry(new THREE.SphereGeometry(0.066, 24, 18));
  const irisGeo = trackGeometry(new THREE.SphereGeometry(0.047, 24, 18));
  const pupilGeo = trackGeometry(new THREE.SphereGeometry(0.029, 22, 16));
  const glintGeo = trackGeometry(new THREE.SphereGeometry(0.010, 12, 10));
  for (const side of [-1, 1]) {
    const eyeRadius = profileRadius(0.82) * 0.69;
    const socket = new THREE.Mesh(eyeGeo, socketMat);
    socket.name = 'EyeSocket_' + side;
    socket.position.set(side * (eyeRadius + 0.018), 0.095, 0.485);
    socket.scale.set(0.64, 1.0, 0.98);
    root.add(socket);
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.name = 'AmberIris_' + side;
    iris.position.set(side * (eyeRadius + 0.052), 0.095, 0.491);
    iris.scale.set(0.61, 1.0, 1.0);
    root.add(iris);
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.name = 'GlossPupil_' + side;
    pupil.position.set(side * (eyeRadius + 0.073), 0.096, 0.496);
    pupil.scale.set(0.55, 1.0, 1.0);
    root.add(pupil);
    const glint = new THREE.Mesh(glintGeo, glintMat);
    glint.name = 'EyeCatchlight_' + side;
    glint.position.set(side * (eyeRadius + 0.088), 0.111, 0.507);
    root.add(glint);
  }

  // Gill slits follow the flank with shallow curves; these are intentionally low-contrast.
  for (const side of [-1, 1]) {
    for (let g = 0; g < 2; g++) {
      const z = 0.19 - g * 0.055;
      const r = profileRadius((z / bodyLength) + 0.5) * 0.69 + 0.003;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * r, 0.13, z + 0.01),
        new THREE.Vector3(side * (r + 0.012), 0.055, z - 0.006),
        new THREE.Vector3(side * r, -0.045, z - 0.018),
      ]);
      const geo = trackGeometry(new THREE.TubeGeometry(curve, 12, 0.0045, 5, false));
      const mesh = new THREE.Mesh(geo, gillMat);
      mesh.name = 'GillGroove_' + side + '_' + g;
      root.add(mesh);
    }
  }

  // Two compact, translucent pectoral fins scull independently from the body.
  const pectoralLeftBone = new THREE.Bone();
  pectoralLeftBone.name = 'PectoralLeftJoint';
  pectoralLeftBone.position.set(0.265, -0.015, 0.12);
  spineBones[3].add(pectoralLeftBone);
  const pectoralRightBone = new THREE.Bone();
  pectoralRightBone.name = 'PectoralRightJoint';
  pectoralRightBone.position.set(-0.265, -0.015, 0.12);
  spineBones[3].add(pectoralRightBone);
  const pectoralShape = new THREE.Shape();
  pectoralShape.moveTo(0, 0);
  pectoralShape.quadraticCurveTo(0.16, -0.015, 0.225, -0.19);
  pectoralShape.quadraticCurveTo(0.08, -0.17, -0.025, -0.045);
  pectoralShape.closePath();
  const pecGeometry = trackGeometry(new THREE.ShapeGeometry(pectoralShape, 16));
  pecGeometry.rotateX(Math.PI / 2);
  const pecL = new THREE.Mesh(pecGeometry, finMat);
  pecL.name = 'PectoralFinLeft';
  pectoralLeftBone.add(pecL);
  const pecR = new THREE.Mesh(pecGeometry, finMat);
  pecR.name = 'PectoralFinRight';
  pecR.scale.x = -1;
  pectoralRightBone.add(pecR);

  // Small pelvic fins make the silhouette coherent without turning into large angular paddles.
  const pelvicGeo = trackGeometry(new THREE.ShapeGeometry(pectoralShape, 12));
  pelvicGeo.rotateX(Math.PI / 2);
  const pelvicL = new THREE.Mesh(pelvicGeo, finMat);
  pelvicL.name = 'PelvicFinLeft';
  pelvicL.position.set(0.095, -0.30, -0.20);
  root.add(pelvicL);
  const pelvicR = new THREE.Mesh(pelvicGeo, finMat);
  pelvicR.name = 'PelvicFinRight';
  pelvicR.position.set(-0.095, -0.30, -0.20);
  pelvicR.scale.x = -1;
  root.add(pelvicR);

  const update = (elapsedTime: number, scrollVelocity: number, reducedMotion: boolean) => {
    const sample = evaluateSwimKinematics(elapsedTime, scrollVelocity, reducedMotion);
    const amp = reducedMotion ? 0.48 : 1.0 + Math.min(1.4, Math.abs(scrollVelocity) * 2.0) * 0.22;
    shaderUniforms.uTime.value = elapsedTime;
    shaderUniforms.uSwimAmp.value = amp;
    shaderUniforms.uBioRim.value = 0.20;
    root.rotation.y = Math.sin(elapsedTime * (reducedMotion ? 1.6 : 2.75)) * (reducedMotion ? 0.012 : 0.028);
    root.rotation.z = sample.bodyRoll * (reducedMotion ? 0.24 : 0.48);
    root.position.y = Math.sin(elapsedTime * 1.25) * (reducedMotion ? 0.002 : 0.008);
    for (let i = 0; i < SPINE_BONE_COUNT; i++) {
      spineBones[i].rotation.y = sample.spineYaw[i] * 0.78;
    }
    spineBones[0].position.x = sample.spineLateralOffset * 0.7;
    spineBones[0].rotation.z = sample.bodyRoll * 0.75;
    tail.rotation.y = Math.sin(elapsedTime * (reducedMotion ? 1.8 : 2.8) - 0.65) * (reducedMotion ? 0.24 : 0.54) * amp;
    tail.rotation.x = Math.sin(elapsedTime * 1.7) * (reducedMotion ? 0.035 : 0.075);
    pectoralLeftBone.rotation.y = Math.sin(elapsedTime * 2.35 + 0.35) * (reducedMotion ? 0.09 : 0.24);
    pectoralRightBone.rotation.y = -Math.sin(elapsedTime * 2.35 + 0.7) * (reducedMotion ? 0.09 : 0.24);
    dorsal.rotation.z = Math.sin(elapsedTime * 1.4) * (reducedMotion ? 0.004 : 0.012);
  };

  const dispose = () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  };

  return {
    root,
    spineBones,
    pectoralLeftBone,
    pectoralRightBone,
    shaderUniforms,
    update,
    dispose,
  };
}
