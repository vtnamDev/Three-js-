import * as THREE from 'three';
import { DEFAULT_HERO_FISH_BOUNDS, HeroFishBounds } from './fishPath';

export interface SwimKinematicsSample {
  spineYaw: number[];         // 8 longitudinal spine joints (HeadThorax -> CaudalFinMembrane)
  authoredSpineYaw: number[]; // 4 progressive axial joint angles for legacy pre-skinned rigs
  headCounterYaw: number;
  spineLateralOffset: number;
  pectoralLeftFlap: number;
  pectoralRightFlap: number;
  pectoralFeatherLeft: number;
  pectoralFeatherRight: number;
  pelvicFlap: number;
  dorsalWave: number;
  gillPulse: number;
  bodyRoll: number;
  tailPhaseSin: number;
}

export const SPINE_BONE_COUNT = 8;

/**
 * Biomechanical carangiform/subcarangiform pelagic swim solver.
 * Separates `elapsedTime` (continuous biological propulsion, cranial stabilization & pectoral rowing)
 * from `scrollVelocity` (bounded burst cadence) and `curvature` (turn banking).
 * Guarantees organic multi-joint body wave & fin articulation while scroll is stationary (`velocity = 0`).
 */
export function evaluateSwimKinematics(
  elapsedTime: number,
  scrollVelocity = 0,
  reducedMotion = false,
  curvature = 0,
): SwimKinematicsSample {
  const speedFactor = Math.min(1.65, Math.abs(scrollVelocity) * 2.2);
  const ampScale = reducedMotion ? 0.42 : 1.0 + speedFactor * 0.28;
  const freq = (reducedMotion ? 1.75 : 3.15) + speedFactor * 1.25;
  const phase = elapsedTime * freq;
  const waveNumber = 3.85;

  // Incremental local joint rotations across 8 spine bones so cumulative curvature
  // stays stable at the head/thorax and builds smoothly through peduncle & caudal membrane
  const spineYaw: number[] = new Array(SPINE_BONE_COUNT);
  for (let i = 0; i < SPINE_BONE_COUNT; i++) {
    const s = i / (SPINE_BONE_COUNT - 1);
    const localEnvelope =
      i === 0
        ? 0.018
        : 0.016 + 0.055 * Math.pow(s, 1.55) + 0.095 * Math.pow(s, 2.9);
    const phaseLag = waveNumber * s + (i === SPINE_BONE_COUNT - 1 ? 0.32 : 0.0);
    spineYaw[i] = Math.sin(phase - phaseLag) * localEnvelope * ampScale;
  }

  const authoredSpineYaw = [
    Math.sin(phase - 0.55) * 0.068 * ampScale,
    Math.sin(phase - 1.35) * 0.125 * ampScale,
    Math.sin(phase - 2.15) * 0.19 * ampScale,
    Math.sin(phase - 2.95) * 0.255 * ampScale,
  ];

  const headCounterYaw = -Math.sin(phase - 0.25) * 0.036 * ampScale;
  const spineLateralOffset = -Math.sin(phase) * 0.015 * ampScale;
  const tailPhaseSin = Math.sin(phase - waveNumber);

  // Asymmetric pectoral fin sculling/feathering (calmer sleek sweep at high speed, active sculling at hover)
  const hoverFactor = 1.0 - Math.min(0.72, speedFactor * 0.5);
  const pecFreq = freq * 0.86;
  const motionScale = reducedMotion ? 0.42 : 1.0;

  const pectoralLeftFlap =
    (0.08 + Math.sin(elapsedTime * pecFreq + 0.4) * (0.22 * hoverFactor + 0.09)) * motionScale;
  const pectoralRightFlap =
    (0.08 + Math.sin(elapsedTime * pecFreq + 0.4 + 0.6) * (0.22 * hoverFactor + 0.09)) *
    motionScale;

  const pectoralFeatherLeft = Math.cos(elapsedTime * pecFreq + 0.4) * 0.15 * motionScale;
  const pectoralFeatherRight = Math.cos(elapsedTime * pecFreq + 0.4 + 0.6) * 0.15 * motionScale;

  const pelvicFlap = Math.sin(elapsedTime * pecFreq * 0.82 - 0.7) * 0.1 * motionScale;
  const dorsalWave = Math.sin(phase - 1.7) * 0.075 * ampScale;
  const gillPulse = (Math.sin(elapsedTime * 3.6) * 0.5 + 0.5) * motionScale;
  const turnBank = THREE.MathUtils.clamp(-curvature * 0.022, -0.18, 0.18);
  const bodyRoll = Math.sin(phase * 0.5) * 0.028 * ampScale + turnBank;

  return {
    spineYaw,
    authoredSpineYaw,
    headCounterYaw,
    spineLateralOffset,
    pectoralLeftFlap,
    pectoralRightFlap,
    pectoralFeatherLeft,
    pectoralFeatherRight,
    pelvicFlap,
    dorsalWave,
    gillPulse,
    bodyRoll,
    tailPhaseSin,
  };
}

export interface RiggedFishRig {
  root: THREE.Group;
  bounds: HeroFishBounds;
  skinnedMesh?: THREE.SkinnedMesh;
  spineBones: THREE.Bone[];
  tailTelemetryBone: THREE.Bone;
  pectoralLeftBone: THREE.Bone;
  pectoralRightBone: THREE.Bone;
  shaderUniforms: {
    uTime: { value: number };
    uSwimAmp: { value: number };
    uBioRim: { value: number };
    uCausticStrength: { value: number };
  };
  update: (
    elapsedTime: number,
    scrollVelocity: number,
    reducedMotion: boolean,
    curvature?: number,
  ) => SwimKinematicsSample;
  dispose: () => void;
}

const _vtx = new THREE.Vector3();
const _qDelta = new THREE.Quaternion();
const _euler = new THREE.Euler();

/**
 * Enhances PBR fish material (`E21` Fish-scale specular sweep + shallow dorsal caustics + restrained deep rim)
 * while strictly preserving color spaces (`SRGBColorSpace` on baseColor only; linear on normal/ORM/ao maps).
 */
function enhanceHeroFishMaterial(
  origMat: THREE.Material,
  shaderUniforms: RiggedFishRig['shaderUniforms'],
  useDoubleSide = false,
): THREE.MeshStandardMaterial {
  const stdMat = (origMat as THREE.MeshStandardMaterial).clone();
  stdMat.color.setHex(0xffffff);
  stdMat.emissive.setHex(0x000000);
  stdMat.emissiveMap = null;

  // Preserve authored roughness/metalness textures when present; calibrate wet biological scale response
  if (stdMat.roughnessMap || stdMat.metalnessMap) {
    stdMat.roughness = 0.78;
    stdMat.metalness = 0.18;
  } else {
    stdMat.roughness = 0.34;
    stdMat.metalness = 0.08;
  }

  if (stdMat.normalMap) {
    stdMat.normalMap.colorSpace = THREE.NoColorSpace;
    stdMat.normalScale.set(0.9, 0.9);
  }
  if (stdMat.roughnessMap) {
    stdMat.roughnessMap.colorSpace = THREE.NoColorSpace;
  }
  if (stdMat.metalnessMap) {
    stdMat.metalnessMap.colorSpace = THREE.NoColorSpace;
  }
  if (stdMat.aoMap) {
    stdMat.aoMap.colorSpace = THREE.NoColorSpace;
    stdMat.aoMapIntensity = 0.72;
  }
  if (stdMat.map) {
    stdMat.map.colorSpace = THREE.SRGBColorSpace;
  }

  stdMat.envMapIntensity = 1.15;
  stdMat.side = useDoubleSide ? THREE.DoubleSide : THREE.FrontSide;
  stdMat.vertexColors = false;

  stdMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shaderUniforms.uTime;
    shader.uniforms.uSwimAmp = shaderUniforms.uSwimAmp;
    shader.uniforms.uBioRim = shaderUniforms.uBioRim;
    shader.uniforms.uCausticStrength = shaderUniforms.uCausticStrength;

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uSwimAmp;
      varying vec3 vBioWorldPos;
      varying vec3 vBioLocalPos;
      ` +
      shader.vertexShader
        .replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vBioLocalPos = position;
          `,
        )
        .replace(
          '#include <project_vertex>',
          `
          vec4 bioWorld = modelMatrix * vec4(transformed, 1.0);
          #ifdef USE_SKINNING
            bioWorld = modelMatrix * skinMatrix * vec4(transformed, 1.0);
          #endif
          vBioWorldPos = bioWorld.xyz;
          #include <project_vertex>
          `,
        );

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform float uBioRim;
      uniform float uCausticStrength;
      varying vec3 vBioWorldPos;
      varying vec3 vBioLocalPos;
      ` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        vec3 viewDirBio = normalize(vViewPosition);
        float ndotv = abs(dot(normal, viewDirBio));
        float fresnelBio = pow(1.0 - ndotv, 3.2);

        // E21: Subtle wet-scale specular & dorsal sunlight caustic sweep in upper chapters (fades to 0 at depth)
        float dorsalUp = clamp(normal.y * 0.65 + 0.35, 0.0, 1.0);
        float cWave1 = sin(vBioWorldPos.x * 4.6 + vBioWorldPos.z * 4.1 + uTime * 2.15);
        float cWave2 = cos(vBioWorldPos.x * 3.5 - vBioWorldPos.z * 4.9 - uTime * 1.75);
        float causticGlint = pow(max(0.0, cWave1 * cWave2), 2.3) * dorsalUp * uCausticStrength;
        gl_FragColor.rgb += vec3(1.0, 0.94, 0.78) * causticGlint * 0.22;

        // Wet mucous sheen sweep along curved flank as camera/fish angle shifts (E21)
        float wetSweep = pow(max(0.0, dot(reflect(-viewDirBio, normal), normalize(vec3(0.35, 0.85, 0.4)))), 10.0);
        gl_FragColor.rgb += vec3(0.68, 0.88, 0.98) * wetSweep * (0.06 + uCausticStrength * 0.10);

        // Restrained physical water-scatter rim for deep-water readability (never a cartoon glowing halo)
        vec3 rimTint = mix(vec3(0.22, 0.58, 0.78), vec3(0.88, 0.95, 1.0), uCausticStrength);
        gl_FragColor.rgb += rimTint * fresnelBio * uBioRim;
        #include <dithering_fragment>
        `,
      );
  };

  return stdMat;
}

/**
 * Converts a high-resolution static PBR fish mesh (such as Khronos CC0 `BarramundiFish.glb`
 * with 3,864 welded triangles or Poly Haven CC0 `grey-snapper.glb` with 2,754 triangles)
 * into a genuine 10-bone `THREE.SkinnedMesh` (`8` axial spine/peduncle/caudal bones + `2` pectoral fin bones)
 * using smooth overlapping Gaussian/Hermite skin weights so deformation has zero creases or rigid hinges.
 */
function buildContinuousTenBoneSkinnedRig(
  srcMesh: THREE.Mesh,
  shaderUniforms: RiggedFishRig['shaderUniforms'],
): RiggedFishRig {
  srcMesh.updateWorldMatrix(true, false);
  const geom = srcMesh.geometry.clone();
  // Remove procedural rig-mask COLOR_0 channels (e.g. Poly Haven GreySnapper) so true PBR albedo renders cleanly
  if (geom.attributes.color) {
    geom.deleteAttribute('color');
  }
  geom.applyMatrix4(srcMesh.matrixWorld);

  geom.computeBoundingBox();
  const box0 = geom.boundingBox!;
  const size0 = new THREE.Vector3();
  const center0 = new THREE.Vector3();
  box0.getSize(size0);
  box0.getCenter(center0);

  // Center at origin first
  geom.translate(-center0.x, -center0.y, -center0.z);

  // Verify snout (+Z) vs thin vertical caudal tail fin (-Z):
  // Measure max |X| width near +Z extreme vs -Z extreme; tail fin blade is much thinner horizontally than head/jaw!
  const posAttr = geom.attributes.position as THREE.BufferAttribute;
  const halfLen0 = Math.max(1e-4, size0.z * 0.5);
  let maxWidthPlusZ = 0;
  let maxWidthMinusZ = 0;
  for (let i = 0; i < posAttr.count; i++) {
    const x = Math.abs(posAttr.getX(i));
    const z = posAttr.getZ(i);
    if (z > halfLen0 * 0.72 && x > maxWidthPlusZ) maxWidthPlusZ = x;
    if (z < -halfLen0 * 0.72 && x > maxWidthMinusZ) maxWidthMinusZ = x;
  }
  if (maxWidthMinusZ > maxWidthPlusZ * 1.25) {
    geom.rotateY(Math.PI);
  }

  // Uniformly normalize length to DEFAULT_HERO_FISH_BOUNDS.length (1.56 m)
  const targetLength = DEFAULT_HERO_FISH_BOUNDS.length;
  const scaleFactor = targetLength / Math.max(1e-4, size0.z);
  geom.scale(scaleFactor, scaleFactor, scaleFactor);
  geom.computeBoundingBox();

  const normBox = geom.boundingBox!;
  const normSize = new THREE.Vector3();
  normBox.getSize(normSize);
  const bounds: HeroFishBounds = {
    length: normSize.z,
    height: normSize.y,
    width: normSize.x,
  };

  if (!geom.attributes.normal) {
    geom.computeVertexNormals();
  }

  // Build 10-bone hierarchical skeleton:
  // Bones 0..7: Longitudinal spine chain from head/thorax (+0.50 m) to caudal membrane (-0.69 m)
  // Bones 8..9: Left (+X) and Right (-X) pectoral fin joints parented to Bone 1 (Thorax)
  const zHeadBone = bounds.length * 0.32;
  const zTailBone = -bounds.length * 0.44;
  const spineStep = (zHeadBone - zTailBone) / (SPINE_BONE_COUNT - 1);

  const spineBones: THREE.Bone[] = [];
  const boneWorldZ: number[] = [];

  for (let i = 0; i < SPINE_BONE_COUNT; i++) {
    const b = new THREE.Bone();
    b.name = `PelagicSpine_0${i}`;
    if (i === 0) {
      b.position.set(0, 0, zHeadBone);
      boneWorldZ.push(zHeadBone);
    } else {
      b.position.set(0, 0, -spineStep);
      spineBones[i - 1].add(b);
      boneWorldZ.push(zHeadBone - i * spineStep);
    }
    spineBones.push(b);
  }

  const pectoralLeftBone = new THREE.Bone();
  pectoralLeftBone.name = 'PelagicPectoral_L';
  pectoralLeftBone.position.set(bounds.width * 0.24, -bounds.height * 0.1, -spineStep * 0.25);
  spineBones[1].add(pectoralLeftBone);

  const pectoralRightBone = new THREE.Bone();
  pectoralRightBone.name = 'PelagicPectoral_R';
  pectoralRightBone.position.set(-bounds.width * 0.24, -bounds.height * 0.1, -spineStep * 0.25);
  spineBones[1].add(pectoralRightBone);

  const allBones: THREE.Bone[] = [...spineBones, pectoralLeftBone, pectoralRightBone];

  // Compute smooth 4-influence skinIndex & skinWeight per vertex
  const vCount = posAttr.count;
  const skinIndices = new Uint16Array(vCount * 4);
  const skinWeights = new Float32Array(vCount * 4);

  const halfWidth = Math.max(1e-4, bounds.width * 0.5);
  const pecZCenter = boneWorldZ[1] - spineStep * 0.35;
  const sigma = spineStep * 0.92;

  for (let i = 0; i < vCount; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);

    // Detect lateral pectoral fin membrane region (protruding past body flank near thorax/ventral side)
    const absXRatio = Math.abs(vx) / halfWidth;
    const zDistPec = Math.abs(vz - pecZCenter) / (bounds.length * 0.18);
    const lateralMask = THREE.MathUtils.smoothstep(absXRatio, 0.58, 0.92);
    const zMask = 1.0 - THREE.MathUtils.smoothstep(zDistPec, 0.45, 1.05);
    const ventralMask = 1.0 - THREE.MathUtils.smoothstep(vy / Math.max(1e-4, bounds.height), -0.02, 0.16);
    const pecWeight = THREE.MathUtils.clamp(lateralMask * zMask * ventralMask * 0.62, 0, 0.62);

    // Evaluate Gaussian kernel across 8 spine bones for liquid-smooth axial bending
    const candidates: { idx: number; w: number }[] = [];
    for (let b = 0; b < SPINE_BONE_COUNT; b++) {
      let dist = vz - boneWorldZ[b];
      // Vertices ahead of Bone 0 (snout/eyes/mouth) clamp cleanly onto Bone 0 so face never distorts
      if (b === 0 && vz > boneWorldZ[0]) dist = 0;
      if (b === SPINE_BONE_COUNT - 1 && vz < boneWorldZ[SPINE_BONE_COUNT - 1]) dist = 0;
      const w = Math.exp(-(dist * dist) / (2 * sigma * sigma));
      candidates.push({ idx: b, w });
    }
    candidates.sort((a, b) => b.w - a.w);

    const topSpine = pecWeight > 0.005 ? candidates.slice(0, 3) : candidates.slice(0, 4);
    let spineSum = 0;
    for (const c of topSpine) spineSum += c.w;
    spineSum = Math.max(1e-6, spineSum);

    const remaining = 1.0 - pecWeight;
    for (let k = 0; k < 4; k++) {
      if (k < topSpine.length) {
        skinIndices[i * 4 + k] = topSpine[k].idx;
        skinWeights[i * 4 + k] = (topSpine[k].w / spineSum) * remaining;
      } else if (pecWeight > 0.005) {
        skinIndices[i * 4 + k] = vx >= 0 ? 8 : 9;
        skinWeights[i * 4 + k] = pecWeight;
      } else {
        skinIndices[i * 4 + k] = 0;
        skinWeights[i * 4 + k] = 0;
      }
    }
  }

  geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

  const origMat = Array.isArray(srcMesh.material) ? srcMesh.material[0] : srcMesh.material;
  const heroMat = enhanceHeroFishMaterial(origMat, shaderUniforms, true);

  const skinnedMesh = new THREE.SkinnedMesh(geom, heroMat);
  skinnedMesh.name = 'PelagicHeroSkinnedMesh';
  skinnedMesh.castShadow = true;
  skinnedMesh.receiveShadow = true;
  skinnedMesh.frustumCulled = false;

  const root = new THREE.Group();
  root.name = 'PelagicHeroFishRoot';
  root.add(spineBones[0]);
  root.add(skinnedMesh);

  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(allBones);
  skinnedMesh.bind(skeleton, skinnedMesh.matrixWorld);

  const headRestZ = spineBones[0].position.z;

  const update = (
    elapsedTime: number,
    scrollVelocity: number,
    reducedMotion: boolean,
    curvature = 0,
  ): SwimKinematicsSample => {
    const sample = evaluateSwimKinematics(elapsedTime, scrollVelocity, reducedMotion, curvature);
    shaderUniforms.uTime.value = elapsedTime;
    shaderUniforms.uSwimAmp.value = reducedMotion ? 0.42 : 1.0;

    spineBones[0].position.set(sample.spineLateralOffset, 0, headRestZ);
    spineBones[0].rotation.set(0, sample.spineYaw[0] + sample.headCounterYaw * 0.45, sample.bodyRoll);

    for (let i = 1; i < SPINE_BONE_COUNT; i++) {
      const pitchWave = i >= 5 ? sample.dorsalWave * 0.14 : 0;
      spineBones[i].rotation.set(pitchWave, sample.spineYaw[i], 0);
    }

    pectoralLeftBone.rotation.set(
      sample.pectoralFeatherLeft * 0.5,
      -sample.pectoralLeftFlap,
      sample.pectoralLeftFlap * 0.28,
    );
    pectoralRightBone.rotation.set(
      -sample.pectoralFeatherRight * 0.5,
      sample.pectoralRightFlap,
      -sample.pectoralRightFlap * 0.28,
    );

    return sample;
  };

  const dispose = () => {
    geom.dispose();
    heroMat.dispose();
    skeleton.dispose();
  };

  return {
    root,
    bounds,
    skinnedMesh,
    spineBones,
    tailTelemetryBone: spineBones[SPINE_BONE_COUNT - 1],
    pectoralLeftBone,
    pectoralRightBone,
    shaderUniforms,
    update,
    dispose,
  };
}

/**
 * Builds the living hero fish rig from a loaded glTF scene:
 * - For high-resolution static PBR meshes (`hero-barramundi.glb`, `grey-snapper.glb`), constructs
 *   a smooth 10-bone Hermite-weighted `THREE.SkinnedMesh` (`buildContinuousTenBoneSkinnedRig`).
 * - For pre-skinned glTF rigs (`clownfish-hero.optimized.glb` during candidate comparison),
 *   binds directly to its authored skeleton hierarchy.
 */
export function buildAnatomicalSkinnedFish(loadedScene: THREE.Object3D): RiggedFishRig {
  let foundSkinned: THREE.SkinnedMesh | null = null;
  let foundStatic: THREE.Mesh | null = null;

  loadedScene.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh && !foundSkinned) {
      foundSkinned = child as THREE.SkinnedMesh;
    } else if ((child as THREE.Mesh).isMesh && !foundStatic) {
      foundStatic = child as THREE.Mesh;
    }
  });

  const shaderUniforms = {
    uTime: { value: 0 },
    uSwimAmp: { value: 1 },
    uBioRim: { value: 0.15 },
    uCausticStrength: { value: 1.0 },
  };

  if (foundStatic && !foundSkinned) {
    return buildContinuousTenBoneSkinnedRig(foundStatic, shaderUniforms);
  }

  if (foundSkinned) {
    const skinned = foundSkinned as THREE.SkinnedMesh;
    skinned.frustumCulled = false;
    skinned.castShadow = true;
    skinned.receiveShadow = true;

    const origMat = Array.isArray(skinned.material) ? skinned.material[0] : skinned.material;
    const heroMat = enhanceHeroFishMaterial(origMat, shaderUniforms, true);
    skinned.material = heroMat;

    loadedScene.updateMatrixWorld(true);
    skinned.skeleton.update();

    const rawBox = new THREE.Box3();
    const posAttr = skinned.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      skinned.getVertexPosition(i, _vtx);
      _vtx.applyMatrix4(skinned.matrixWorld);
      rawBox.expandByPoint(_vtx);
    }

    const rawSize = new THREE.Vector3();
    const rawCenter = new THREE.Vector3();
    rawBox.getSize(rawSize);
    rawBox.getCenter(rawCenter);

    const targetLength = DEFAULT_HERO_FISH_BOUNDS.length;
    const scaleFactor = targetLength / Math.max(0.001, rawSize.z);

    const bounds: HeroFishBounds = {
      length: rawSize.z * scaleFactor,
      height: rawSize.y * scaleFactor,
      width: rawSize.x * scaleFactor,
    };

    const pivotGroup = new THREE.Group();
    pivotGroup.name = 'NormalizedPreSkinnedPivot';
    loadedScene.position.set(-rawCenter.x, -rawCenter.y, -rawCenter.z);
    pivotGroup.add(loadedScene);
    pivotGroup.scale.setScalar(scaleFactor);

    const root = new THREE.Group();
    root.name = 'PelagicHeroFishRoot';
    root.add(pivotGroup);

    const bones = skinned.skeleton.bones;
    const findBone = (pattern: RegExp): THREE.Bone | undefined =>
      bones.find((b) => pattern.test(b.name));

    const rootBone = findBone(/:Root/i) ?? bones[0];
    const headBone = findBone(/:head(\.|$)/i) ?? rootBone;
    const spine01 = findBone(/:Spine_01/i) ?? rootBone;
    const spine02 = findBone(/:Spine_02/i) ?? spine01;
    const spine03 = findBone(/:Spine_03/i) ?? spine02;
    const spine04 = findBone(/:Spine_04/i) ?? spine03;
    const pecL = findBone(/:L_Upper_fin(\.|$)/i) ?? spine01;
    const pecR = findBone(/:R_Upper_fin(\.|$)/i) ?? spine01;
    const pelvL = findBone(/:L_lower_fin1?(\.|$)/i);
    const pelvR = findBone(/:R_lower_fin1?(\.|$)/i);

    const spineChain = [spine01, spine02, spine03, spine04];
    const restQuats = new Map<THREE.Bone, THREE.Quaternion>();
    for (const b of bones) {
      restQuats.set(b, b.quaternion.clone());
    }
    const rootRestPos = rootBone.position.clone();
    const rigLateralScale = 1.0 / Math.max(0.001, scaleFactor * 0.01);

    const applyLocalDelta = (bone: THREE.Bone | undefined, rx: number, ry: number, rz: number) => {
      if (!bone) return;
      const rq = restQuats.get(bone);
      if (!rq) return;
      _euler.set(rx, ry, rz, 'XYZ');
      _qDelta.setFromEuler(_euler);
      bone.quaternion.copy(rq).multiply(_qDelta);
    };

    const update = (
      elapsedTime: number,
      scrollVelocity: number,
      reducedMotion: boolean,
      curvature = 0,
    ): SwimKinematicsSample => {
      const sample = evaluateSwimKinematics(
        elapsedTime,
        scrollVelocity,
        reducedMotion,
        curvature,
      );
      shaderUniforms.uTime.value = elapsedTime;
      shaderUniforms.uSwimAmp.value = reducedMotion ? 0.42 : 1.0;

      rootBone.position.set(
        rootRestPos.x + sample.spineLateralOffset * rigLateralScale * 0.35,
        rootRestPos.y,
        rootRestPos.z,
      );
      applyLocalDelta(rootBone, 0, 0, sample.bodyRoll);
      applyLocalDelta(headBone, 0, sample.headCounterYaw, 0);

      for (let i = 0; i < spineChain.length; i++) {
        applyLocalDelta(spineChain[i], 0, sample.authoredSpineYaw[i], 0);
      }

      applyLocalDelta(
        pecL,
        sample.pectoralFeatherLeft,
        -sample.pectoralLeftFlap,
        sample.pectoralLeftFlap * 0.35,
      );
      applyLocalDelta(
        pecR,
        -sample.pectoralFeatherRight,
        sample.pectoralRightFlap,
        -sample.pectoralRightFlap * 0.35,
      );
      applyLocalDelta(pelvL, 0, -sample.pelvicFlap, sample.pelvicFlap * 0.3);
      applyLocalDelta(pelvR, 0, sample.pelvicFlap, -sample.pelvicFlap * 0.3);

      return sample;
    };

    const dispose = () => {
      skinned.geometry.dispose();
      heroMat.dispose();
    };

    return {
      root,
      bounds,
      skinnedMesh: skinned,
      spineBones: [headBone, ...spineChain],
      tailTelemetryBone: spine04,
      pectoralLeftBone: pecL,
      pectoralRightBone: pecR,
      shaderUniforms,
      update,
      dispose,
    };
  }

  return buildProceduralFallbackFish();
}

/**
 * Tertiary emergency fallback (`?fish=emergency` or total offline dual-GLB load failure)
 * so the viewport never becomes blank even if every `.glb` request fails.
 */
export function buildProceduralFallbackFish(): RiggedFishRig {
  const root = new THREE.Group();
  root.name = 'EmergencyFallbackFishRoot';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x8ea9ba,
    roughness: 0.32,
    metalness: 0.16,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xd4e2ec,
    roughness: 0.36,
    metalness: 0.12,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x6f8b9e,
    roughness: 0.44,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x111820,
    roughness: 0.08,
    metalness: 0.12,
  });

  const spineBones: THREE.Bone[] = [];
  const totalLen = 1.5;
  const step = totalLen / (SPINE_BONE_COUNT - 1);

  for (let i = 0; i < SPINE_BONE_COUNT; i++) {
    const b = new THREE.Bone();
    b.position.set(0, 0, i === 0 ? totalLen * 0.5 : -step);
    if (i > 0) spineBones[i - 1].add(b);
    spineBones.push(b);
  }
  root.add(spineBones[0]);

  const radii = [0.06, 0.21, 0.27, 0.26, 0.21, 0.14, 0.08, 0.04];
  const geometries: THREE.BufferGeometry[] = [];

  for (let i = 0; i < SPINE_BONE_COUNT - 1; i++) {
    const pts = [
      new THREE.Vector2(radii[i], 0),
      new THREE.Vector2((radii[i] + radii[i + 1]) * 0.52, step * 0.5),
      new THREE.Vector2(radii[i + 1], step),
    ];
    const lathe = new THREE.LatheGeometry(pts, 24);
    lathe.rotateX(-Math.PI / 2);
    lathe.scale(0.52, 1.0, 1.0);
    geometries.push(lathe);
    const seg = new THREE.Mesh(lathe, i % 2 === 0 ? bodyMat : bellyMat);
    spineBones[i].add(seg);
  }

  const eyeGeo = new THREE.SphereGeometry(0.03, 14, 14);
  geometries.push(eyeGeo);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.072, 0.045, -0.14);
  const eyeR = eyeL.clone();
  eyeR.position.x = -0.072;
  spineBones[0].add(eyeL, eyeR);

  const caudalShape = new THREE.Shape();
  caudalShape.moveTo(0, 0.04);
  caudalShape.quadraticCurveTo(-0.18, 0.22, -0.34, 0.2);
  caudalShape.quadraticCurveTo(-0.24, 0.0, -0.34, -0.2);
  caudalShape.quadraticCurveTo(-0.18, -0.22, 0, -0.04);
  caudalShape.closePath();
  const caudalGeo = new THREE.ExtrudeGeometry(caudalShape, { depth: 0.01, bevelEnabled: false });
  caudalGeo.rotateY(Math.PI / 2);
  geometries.push(caudalGeo);
  spineBones[SPINE_BONE_COUNT - 1].add(new THREE.Mesh(caudalGeo, finMat));

  const pectoralLeftBone = new THREE.Bone();
  pectoralLeftBone.position.set(0.12, -0.05, -0.04);
  spineBones[2].add(pectoralLeftBone);

  const pectoralRightBone = new THREE.Bone();
  pectoralRightBone.position.set(-0.12, -0.05, -0.04);
  spineBones[2].add(pectoralRightBone);

  const pecShape = new THREE.Shape();
  pecShape.moveTo(0, 0);
  pecShape.quadraticCurveTo(0.14, 0.09, 0.24, 0.01);
  pecShape.quadraticCurveTo(0.2, -0.11, 0, -0.05);
  const pecGeo = new THREE.ExtrudeGeometry(pecShape, { depth: 0.008, bevelEnabled: false });
  geometries.push(pecGeo);

  const pecMeshL = new THREE.Mesh(pecGeo, finMat);
  pecMeshL.rotation.y = -0.45;
  pectoralLeftBone.add(pecMeshL);

  const pecMeshR = new THREE.Mesh(pecGeo, finMat);
  pecMeshR.scale.x = -1;
  pecMeshR.rotation.y = 0.45;
  pectoralRightBone.add(pecMeshR);

  const shaderUniforms = {
    uTime: { value: 0 },
    uSwimAmp: { value: 1 },
    uBioRim: { value: 0.16 },
    uCausticStrength: { value: 1.0 },
  };

  const update = (
    elapsedTime: number,
    scrollVelocity: number,
    reducedMotion: boolean,
    curvature = 0,
  ): SwimKinematicsSample => {
    const sample = evaluateSwimKinematics(elapsedTime, scrollVelocity, reducedMotion, curvature);
    for (let i = 0; i < SPINE_BONE_COUNT; i++) {
      spineBones[i].rotation.y = sample.spineYaw[i];
    }
    spineBones[0].position.x = sample.spineLateralOffset;
    spineBones[0].rotation.z = sample.bodyRoll;
    pectoralLeftBone.rotation.y = -0.35 - sample.pectoralLeftFlap;
    pectoralRightBone.rotation.y = 0.35 + sample.pectoralRightFlap;
    return sample;
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    bodyMat.dispose();
    bellyMat.dispose();
    finMat.dispose();
    eyeMat.dispose();
  };

  return {
    root,
    bounds: { length: 1.5, height: 0.68, width: 0.38 },
    spineBones,
    tailTelemetryBone: spineBones[SPINE_BONE_COUNT - 1],
    pectoralLeftBone,
    pectoralRightBone,
    shaderUniforms,
    update,
    dispose,
  };
}
