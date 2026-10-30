import * as THREE from 'three';
import {
  BlendedAtmosphere,
  getChapterVisibilityWeight,
  getEffectStrengthAtProgress,
} from '../lib/chapterConfig';
import { getSightlineBasisAtProgress, SightlineBasis } from '../lib/fishPath';
import { QualityProfile } from '../lib/qualityTier';
import { createOceanEffectRegistry, OceanEffectRegistryRig } from './effectRegistry';
import { ProceduralTextureSet } from './proceduralTextures';

export interface OceanWorldRig {
  root: THREE.Group;
  effectRegistry: OceanEffectRegistryRig;
  attachReefSchoolModel: (loadedTangScene: THREE.Object3D) => void;
  attachDeepSchoolModel: (loadedSnapperScene: THREE.Object3D) => void;
  setQualityProfile: (profile: QualityProfile) => void;
  update: (
    elapsedTime: number,
    dt: number,
    progress: number,
    atmosphere: BlendedAtmosphere,
    reducedMotion: boolean,
    fishWorldPos: THREE.Vector3,
    fishForwardDir: THREE.Vector3,
    tailPhaseSin: number,
    scrollVelocity: number,
  ) => void;
  dispose: () => void;
}

interface SchoolAgent {
  anchor: THREE.Vector3;
  orbitRadiusX: number;
  orbitRadiusZ: number;
  speed: number;
  phase: number;
  scale: number;
}

interface JellyAgent {
  group: THREE.Group;
  bellMesh: THREE.Mesh;
  tentacles: THREE.Mesh[];
  basePos: THREE.Vector3;
  phase: number;
  pulseSpeed: number;
}

interface BioOrganismNode {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
  baseColor: THREE.Color;
}

function detHash(n: number): number {
  const x = Math.sin(n * 91.3458 + 17.231) * 47453.5453;
  return x - Math.floor(x);
}

function placeOnSightline(
  basis: SightlineBasis,
  forwardDist: number,
  rightOffset: number,
  yOffset: number,
): THREE.Vector3 {
  return basis.fishPos
    .clone()
    .addScaledVector(basis.sightDir, forwardDist)
    .addScaledVector(basis.sightRight, rightOffset)
    .add(new THREE.Vector3(0, yOffset, 0));
}

function sculptStratifiedRock(
  geo: THREE.BufferGeometry,
  amp: number,
  freqX: number,
  freqY: number,
  freqZ: number,
): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  geo.computeVertexNormals();
  const norm = geo.attributes.normal;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(norm, i);
    const strata = Math.sin(v.y * freqY * 2.4) * 0.32;
    const ridge = Math.sin(v.x * freqX + v.z * freqZ) * Math.cos(v.z * freqZ * 0.8 - v.y * 0.4);
    const crag = Math.cos(v.x * freqX * 2.1 - v.z * freqZ * 1.7) * 0.38;
    const disp = (strata + ridge + crag) * amp;
    pos.setXYZ(i, v.x + n.x * disp, v.y + n.y * disp * 0.35, v.z + n.z * disp);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function mergeSimpleGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const converted = geos.map((g) => {
    const nonIdx = g.index ? g.toNonIndexed() : g.clone();
    nonIdx.computeVertexNormals();
    return nonIdx;
  });

  let totalVerts = 0;
  for (const g of converted) {
    totalVerts += g.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;

  for (const g of converted) {
    const p = g.attributes.position.array as Float32Array;
    const n = g.attributes.normal.array as Float32Array;
    positions.set(p, offset * 3);
    normals.set(n, offset * 3);
    offset += g.attributes.position.count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}

function createStaghornCoralGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.06, 0.12, 0.42, 7);
  trunk.translate(0, 0.21, 0);
  parts.push(trunk);

  const branchSpecs = [
    [0.26, 0.08, 0.56, 0.14, 0.0],
    [-0.28, 0.12, 0.52, -0.15, 0.05],
    [0.08, -0.28, 0.54, 0.04, -0.14],
    [-0.12, 0.28, 0.5, -0.05, 0.14],
    [0.36, 0.24, 0.42, 0.2, 0.12],
    [-0.34, -0.22, 0.44, -0.18, -0.11],
  ];

  for (const [rx, rz, len, ox, oz] of branchSpecs) {
    const b = new THREE.CylinderGeometry(0.026, 0.052, len, 6);
    b.translate(0, len * 0.5, 0);
    b.rotateX(rz);
    b.rotateZ(-rx);
    b.translate(ox * 0.42, 0.26, oz * 0.42);
    parts.push(b);
  }
  return mergeSimpleGeometries(parts);
}

function createTableCoralGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const ped = new THREE.CylinderGeometry(0.14, 0.24, 0.44, 8);
  ped.translate(0, 0.22, 0);
  parts.push(ped);

  const plate1 = new THREE.CylinderGeometry(0.95, 0.68, 0.08, 14);
  const pPos = plate1.attributes.position;
  for (let i = 0; i < pPos.count; i++) {
    const vx = pPos.getX(i);
    const vz = pPos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const wave = 1.0 + 0.13 * Math.sin(ang * 5.0) + 0.06 * Math.cos(ang * 9.0);
    pPos.setX(i, vx * wave);
    pPos.setZ(i, vz * wave);
  }
  plate1.translate(0, 0.44, 0);
  parts.push(plate1);

  const plate2 = plate1.clone();
  plate2.scale(0.68, 0.9, 0.68);
  plate2.rotateY(0.9);
  plate2.translate(0.14, 0.15, -0.08);
  parts.push(plate2);

  return mergeSimpleGeometries(parts);
}

function createKelpFrondTowerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const frondCount = 5;
  for (let f = 0; f < frondCount; f++) {
    const angle = (f / frondCount) * Math.PI * 2 + f * 0.45;
    const h = 2.4 + (f % 3) * 0.75;
    const segs = 10;
    const blade = new THREE.PlaneGeometry(0.16, h, 1, segs);
    blade.translate(0, h * 0.5, 0);
    const pos = blade.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = Math.max(0, Math.min(1, y / Math.max(1e-4, h)));
      const taper = 1.0 - Math.pow(t, 1.6) * 0.78;
      pos.setX(i, pos.getX(i) * taper + Math.sin(t * 4.2 + f) * 0.14);
      pos.setZ(i, Math.sin(t * 3.1 + f * 0.8) * 0.22);
    }
    blade.rotateY(angle);
    blade.translate(Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12);
    parts.push(blade);
  }
  return mergeSimpleGeometries(parts);
}

/**
 * Builds an undulating abyssal/hadal seafloor terrain grid with drooped outer perimeter skirts
 * (eliminating radial pole spokes while hiding any thin edges).
 */
function createBenthicBasinGeometry(
  width: number,
  depth: number,
  seed: number,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, depth, 32, 32);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const halfW = width * 0.5;
  const halfD = depth * 0.5;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const edgeFrac = Math.max(Math.abs(vx) / halfW, Math.abs(vz) / halfD);
    const skirtDrop = THREE.MathUtils.smoothstep(edgeFrac, 0.72, 1.0) * 6.5;
    const dune =
      Math.sin(vx * 0.24 + seed) * 0.55 +
      Math.cos(vz * 0.22 - seed * 0.8) * 0.48 +
      Math.sin((vx + vz) * 0.48 + seed * 1.7) * 0.22;
    pos.setY(i, dune - skirtDrop);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds an organic rounded basalt seamount/outcrop boulder (replacing truncated flat-top cones).
 */
function createBasaltOutcropGeometry(): THREE.BufferGeometry {
  const ico = new THREE.IcosahedronGeometry(1.45, 2);
  const pos = ico.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const crag =
      1.0 +
      0.18 * Math.sin(vx * 2.1 + vy * 1.7) +
      0.14 * Math.cos(vz * 2.3 - vy * 1.4);
    // Wider base, naturally rounded volcanic crown
    const baseFlare = vy < 0 ? 1.18 : 0.92;
    pos.setXYZ(i, vx * crag * baseFlare, vy * 1.45 * crag, vz * crag * baseFlare);
  }
  ico.computeVertexNormals();
  return ico;
}

/**
 * Builds a skirted rocky reef terrace slab (top undulating plateau + tapered rocky cliff underside)
 * so descending past a terrace NEVER reveals a thin floating PlaneGeometry underside.
 */
function createSkirtedReefTerraceGeometry(
  radiusTop: number,
  radiusBottom: number,
  thickness: number,
  seed: number,
): THREE.BufferGeometry {
  const cyl = new THREE.CylinderGeometry(radiusTop, radiusBottom, thickness, 28, 6, false);
  const pos = cyl.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const ang = Math.atan2(vz, vx);
    const rad = Math.hypot(vx, vz);
    const lobe =
      1.0 +
      0.18 * Math.sin(ang * 3.0 + seed) +
      0.11 * Math.cos(ang * 5.0 - seed * 1.4) +
      0.06 * Math.sin(vy * 0.9 + ang * 7.0);
    const newX = vx * lobe;
    const newZ = vz * lobe;
    const topMask = THREE.MathUtils.smoothstep(vy, -thickness * 0.2, thickness * 0.5);
    const yDisp =
      topMask * (Math.sin(newX * 0.35 + seed) * 0.38 + Math.cos(newZ * 0.32 - seed) * 0.34) -
      (1.0 - topMask) * (rad * 0.08);
    pos.setXYZ(i, newX, vy + yDisp, newZ);
  }
  cyl.computeVertexNormals();
  return cyl;
}

export function buildOceanWorld(
  initialProfile: QualityProfile,
  textures: ProceduralTextureSet,
): OceanWorldRig {
  let profile = initialProfile;
  const root = new THREE.Group();
  root.name = 'PelagicEightChapterWorld';

  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  // Create modular Effect Registry (owns E05, E06, E11, E12, E17, E22, E23, E24 + 24-effect manifest)
  const effectRegistry = createOceanEffectRegistry(profile, textures);
  root.add(effectRegistry.root);

  // ============================================================================
  // SHARED SHADER UNIFORMS & MATERIALS (E01 Caustics, E02 Shafts, E03 Water Ceiling, E07 Sway, E08 School)
  // ============================================================================
  const reefCausticUniforms = {
    uTime: { value: 0 },
    uCausticStrength: { value: 0.9 },
    uCausticTex: { value: textures.causticMap },
  };

  const applyCausticProjection = (mat: THREE.MeshStandardMaterial, weight: number) => {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = reefCausticUniforms.uTime;
      shader.uniforms.uCausticStrength = reefCausticUniforms.uCausticStrength;
      shader.uniforms.uCausticTex = reefCausticUniforms.uCausticTex;

      shader.vertexShader =
        `
        varying vec3 vReefWorldPos;
        varying vec3 vReefWorldNormal;
        ` +
        shader.vertexShader.replace(
          '#include <worldpos_vertex>',
          `
          #include <worldpos_vertex>
          vec4 wpTmp = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wpTmp = instanceMatrix * wpTmp;
          #endif
          wpTmp = modelMatrix * wpTmp;
          vReefWorldPos = wpTmp.xyz;
          vReefWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
          `,
        );

      shader.fragmentShader =
        `
        uniform float uTime;
        uniform float uCausticStrength;
        uniform sampler2D uCausticTex;
        varying vec3 vReefWorldPos;
        varying vec3 vReefWorldNormal;
        ` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `
          float upFacing = clamp(vReefWorldNormal.y * 0.75 + 0.25, 0.0, 1.0);
          vec2 uvA = vReefWorldPos.xz * 0.075 + vec2(uTime * 0.022, -uTime * 0.017);
          vec2 uvB = vReefWorldPos.xz * 0.058 - vec2(uTime * 0.016, uTime * 0.021);
          float cA = texture2D(uCausticTex, uvA).g;
          float cB = texture2D(uCausticTex, uvB).b;
          float causticNet = smoothstep(0.24, 0.88, (cA + cB) * 0.54);
          gl_FragColor.rgb += vec3(0.55, 0.88, 0.98) * causticNet * upFacing * uCausticStrength * ${weight.toFixed(2)};
          #include <dithering_fragment>
          `,
        );
    };
  };

  const shallowLimestoneMat = new THREE.MeshStandardMaterial({
    color: 0x3b768c,
    roughness: 0.84,
    metalness: 0.04,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.26,
    roughnessMap: textures.rockRoughnessMap,
  });
  applyCausticProjection(shallowLimestoneMat, 0.42);
  disposableMaterials.push(shallowLimestoneMat);

  const reefSandMat = new THREE.MeshStandardMaterial({
    color: 0x567f8b,
    roughness: 0.88,
    metalness: 0.03,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.14,
  });
  applyCausticProjection(reefSandMat, 0.48);
  disposableMaterials.push(reefSandMat);

  const continentalRockMat = new THREE.MeshStandardMaterial({
    color: 0x1a445e,
    roughness: 0.88,
    metalness: 0.06,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.34,
    roughnessMap: textures.rockRoughnessMap,
  });
  applyCausticProjection(continentalRockMat, 0.28);
  disposableMaterials.push(continentalRockMat);

  const deepBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x132b40,
    roughness: 0.87,
    metalness: 0.08,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.38,
    roughnessMap: textures.rockRoughnessMap,
  });
  disposableMaterials.push(deepBasaltMat);

  const coralBranchMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.62,
    metalness: 0.04,
    bumpMap: textures.coralBumpMap,
    bumpScale: 0.14,
  });
  applyCausticProjection(coralBranchMat, 0.32);
  disposableMaterials.push(coralBranchMat);

  const tableCoralMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.66,
    metalness: 0.04,
    bumpMap: textures.coralBumpMap,
    bumpScale: 0.16,
  });
  applyCausticProjection(tableCoralMat, 0.34);
  disposableMaterials.push(tableCoralMat);

  const swayUniforms = {
    uTime: { value: 0 },
    uSwayScale: { value: 1.0 },
  };
  const kelpMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.52,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  kelpMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = swayUniforms.uTime;
    shader.uniforms.uSwayScale = swayUniforms.uSwayScale;
    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uSwayScale;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float hWeight = clamp(position.y / 2.6, 0.0, 1.4);
        float instSeed = 0.0;
        #ifdef USE_INSTANCING
          instSeed = instanceMatrix[3][0] * 0.65 + instanceMatrix[3][2] * 0.55;
        #endif
        float swayX = sin(uTime * 1.45 + instSeed + position.y * 1.1) * 0.24 * hWeight * hWeight * uSwayScale;
        float swayZ = cos(uTime * 1.15 + instSeed * 1.3 + position.y * 0.9) * 0.16 * hWeight * hWeight * uSwayScale;
        transformed.x += swayX;
        transformed.z += swayZ;
        `,
      );
  };
  disposableMaterials.push(kelpMat);

  // ============================================================================
  // E03: UNDULATING WATER SURFACE CEILING & E02: DEPTH-AWARE SUN SHAFTS
  // ============================================================================
  const surfaceGroup = new THREE.Group();
  surfaceGroup.name = 'Ch01_SurfaceOptics';
  root.add(surfaceGroup);

  const surfaceUniforms = {
    uTime: { value: 0 },
    uStrength: { value: 1.0 },
    uCausticTex: { value: textures.causticMap },
  };
  const ceilingGeo = new THREE.PlaneGeometry(130, 130, 44, 44);
  ceilingGeo.rotateX(Math.PI / 2);
  disposableGeometries.push(ceilingGeo);

  const ceilingMat = new THREE.ShaderMaterial({
    uniforms: surfaceUniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vElev;
      void main() {
        vUv = uv;
        vec3 p = position;
        float swell = sin(p.x * 0.14 + uTime * 1.05) * 0.38
                    + cos(p.z * 0.16 - uTime * 0.85) * 0.32
                    + sin((p.x + p.z) * 0.28 + uTime * 1.55) * 0.14;
        p.y += swell;
        vElev = swell;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uStrength;
      uniform sampler2D uCausticTex;
      varying vec2 vUv;
      varying float vElev;
      void main() {
        vec2 cUv1 = vUv * 5.0 + vec2(uTime * 0.018, -uTime * 0.014);
        vec2 cUv2 = vUv * 3.8 - vec2(uTime * 0.013, uTime * 0.019);
        float c1 = texture2D(uCausticTex, cUv1).g;
        float c2 = texture2D(uCausticTex, cUv2).b;
        float caustic = smoothstep(0.22, 0.88, (c1 + c2) * 0.55);
        float radialFade = 1.0 - smoothstep(0.18, 0.5, distance(vUv, vec2(0.5)));
        vec3 col = mix(vec3(0.055, 0.31, 0.48), vec3(0.42, 0.72, 0.82), caustic * 0.58 + vElev * 0.10);
        gl_FragColor = vec4(col, radialFade * uStrength * (0.19 + caustic * 0.22));
      }
    `,
  });
  disposableMaterials.push(ceilingMat);
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.position.set(0, 6.2, -10);
  surfaceGroup.add(ceilingMesh);

  // E02: Depth-aware volumetric sun shafts (scaled by quality tier)
  const sunShaftGroup = new THREE.Group();
  sunShaftGroup.name = 'E02_SunShafts';
  root.add(sunShaftGroup);

  const shaftUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0.34 },
  };
  const shaftGeo = new THREE.CylinderGeometry(0.65, 3.1, 38, 16, 1, true);
  disposableGeometries.push(shaftGeo);

  const shaftMat = new THREE.ShaderMaterial({
    uniforms: shaftUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      void main() {
        float edgeSoft = pow(abs(dot(vNormalView, vViewDir)), 1.95);
        float verticalFade = smoothstep(0.0, 0.26, vUv.y) * smoothstep(1.0, 0.68, vUv.y);
        float shimmer = 0.78 + 0.22 * sin(uTime * 0.9 + vUv.x * 12.566);
        vec3 col = mix(vec3(0.16, 0.52, 0.70), vec3(0.56, 0.78, 0.82), vUv.y);
        gl_FragColor = vec4(col, edgeSoft * verticalFade * shimmer * uOpacity * 0.24);
      }
    `,
  });
  disposableMaterials.push(shaftMat);

  const bCh1 = getSightlineBasisAtProgress(0.02);
  const bCh2 = getSightlineBasisAtProgress(0.17);
  const bCh3 = getSightlineBasisAtProgress(0.29);

  const shaftMeshes: THREE.Mesh[] = [];
  const shaftAnchors = [
    placeOnSightline(bCh1, 9.5, -4.2, -5.0),
    placeOnSightline(bCh1, 14.0, 2.8, -6.5),
    placeOnSightline(bCh1, 18.5, -1.0, -7.0),
    placeOnSightline(bCh2, 12.5, -3.5, -4.0),
    placeOnSightline(bCh2, 16.5, 3.8, -5.5),
    placeOnSightline(bCh3, 14.5, -2.5, -3.0),
    placeOnSightline(bCh3, 18.5, 2.2, -4.5),
  ];

  shaftAnchors.forEach((pos, idx) => {
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.copy(pos);
    shaft.rotation.z = -0.14 + (idx % 3) * 0.05;
    shaft.rotation.x = 0.08;
    const sScale = idx >= 5 ? 0.62 : 1.0; // Narrowing shafts in Ch03 Last Sunlight
    shaft.scale.set(sScale, idx >= 5 ? 1.15 : 1.0, sScale);
    sunShaftGroup.add(shaft);
    shaftMeshes.push(shaft);
  });

  // ============================================================================
  // CHAPTER 01: MẶT NƯỚC ÁNH DƯƠNG (SUNLIT SKIRTED REEF TERRACES & CORAL ATOLL)
  // ============================================================================
  const ch01Group = new THREE.Group();
  ch01Group.name = 'Ch01_EpipelagicSurface';
  root.add(ch01Group);

  const ch01TerraceMainGeo = createSkirtedReefTerraceGeometry(17.5, 11.5, 7.5, 1.2);
  const ch01TerraceSideGeo = createSkirtedReefTerraceGeometry(10.5, 6.8, 6.5, 3.7);
  disposableGeometries.push(ch01TerraceMainGeo, ch01TerraceSideGeo);

  const ch01MainCenter = placeOnSightline(bCh1, 9.5, -0.8, -6.2);
  const ch01MainTerrace = new THREE.Mesh(ch01TerraceMainGeo, reefSandMat);
  ch01MainTerrace.position.copy(ch01MainCenter);
  ch01MainTerrace.receiveShadow = true;
  ch01Group.add(ch01MainTerrace);

  // Low-profile natural limestone reef bommies (kept well below HUD title & rail zones!)
  const bommieSpecs: [number, number, number, number][] = [
    [8.2, -5.2, -5.4, 0.82],
    [13.8, 4.4, -5.8, 0.9],
    [16.5, -2.2, -6.2, 0.95],
  ];
  for (const [fwd, right, yOff, sc] of bommieSpecs) {
    const bommie = new THREE.Mesh(ch01TerraceSideGeo, shallowLimestoneMat);
    bommie.position.copy(placeOnSightline(bCh1, fwd, right, yOff));
    bommie.scale.set(sc, sc * 0.68, sc);
    bommie.rotation.y = fwd * 0.4;
    ch01Group.add(bommie);
  }

  // ============================================================================
  // CHAPTER 02: VƯỜN XANH ĐẠI DƯƠNG (KELP FOREST TOWERS & STEPPED CORAL SLOPE)
  // ============================================================================
  const ch02Group = new THREE.Group();
  ch02Group.name = 'Ch02_BlueGarden';
  root.add(ch02Group);

  const ch02TerraceGeo = createSkirtedReefTerraceGeometry(19.0, 12.0, 9.0, 5.1);
  disposableGeometries.push(ch02TerraceGeo);

  const ch02MainTerrace = new THREE.Mesh(ch02TerraceGeo, shallowLimestoneMat);
  ch02MainTerrace.position.copy(placeOnSightline(bCh2, 10.5, 0.5, -7.2));
  ch02Group.add(ch02MainTerrace);

  const ch02UpperLedge = new THREE.Mesh(ch01TerraceSideGeo, continentalRockMat);
  ch02UpperLedge.position.copy(placeOnSightline(bCh2, 15.5, -5.8, -5.6));
  ch02UpperLedge.scale.set(1.15, 0.95, 1.15);
  ch02Group.add(ch02UpperLedge);

  // Instanced Multi-Branch Staghorn Corals, Table Corals & Kelp Frond Towers across Ch01 + Ch02
  const staghornGeo = createStaghornCoralGeometry();
  const tableCoralGeo = createTableCoralGeometry();
  const kelpTowerGeo = createKelpFrondTowerGeometry();
  disposableGeometries.push(staghornGeo, tableCoralGeo, kelpTowerGeo);

  const staghornCount = 68;
  const tableCount = 30;
  const kelpCount = 74;

  const staghornInst = new THREE.InstancedMesh(staghornGeo, coralBranchMat, staghornCount);
  const tableInst = new THREE.InstancedMesh(tableCoralGeo, tableCoralMat, tableCount);
  const kelpInst = new THREE.InstancedMesh(kelpTowerGeo, kelpMat, kelpCount);
  staghornInst.frustumCulled = false;
  tableInst.frustumCulled = false;
  kelpInst.frustumCulled = false;

  const coralPalette = [
    new THREE.Color(0xd97d6c),
    new THREE.Color(0xd4a45e),
    new THREE.Color(0x9a7bc8),
    new THREE.Color(0x52b6b0),
    new THREE.Color(0xcf728f),
  ];
  const tablePalette = [
    new THREE.Color(0xc5b28f),
    new THREE.Color(0x7cb0a6),
    new THREE.Color(0xb88b7d),
  ];
  const kelpPalette = [
    new THREE.Color(0x287c6e),
    new THREE.Color(0x348f76),
    new THREE.Color(0x1f6964),
  ];

  const _dummy = new THREE.Object3D();

  for (let i = 0; i < staghornCount; i++) {
    const inCh1 = i < 38;
    const basis = inCh1 ? bCh1 : bCh2;
    const fwd = 5.2 + detHash(i * 7 + 1) * 12.5;
    const right = (detHash(i * 7 + 2) - 0.5) * 14.5;
    const yBase = inCh1 ? -2.35 : -2.65;
    const pos = placeOnSightline(basis, fwd, right, yBase - detHash(i * 7 + 3) * 0.45);
    _dummy.position.copy(pos);
    _dummy.rotation.set(0, detHash(i * 7 + 4) * Math.PI * 2, 0);
    _dummy.scale.setScalar(0.72 + detHash(i * 7 + 5) * 0.62);
    _dummy.updateMatrix();
    staghornInst.setMatrixAt(i, _dummy.matrix);
    staghornInst.setColorAt(i, coralPalette[i % coralPalette.length]);
  }
  staghornInst.instanceMatrix.needsUpdate = true;
  if (staghornInst.instanceColor) staghornInst.instanceColor.needsUpdate = true;

  for (let i = 0; i < tableCount; i++) {
    const inCh1 = i < 16;
    const basis = inCh1 ? bCh1 : bCh2;
    const fwd = 6.0 + detHash(i * 11 + 1) * 12.0;
    const right = (detHash(i * 11 + 2) - 0.5) * 14.0;
    const yBase = inCh1 ? -2.4 : -2.7;
    _dummy.position.copy(placeOnSightline(basis, fwd, right, yBase - detHash(i * 11 + 3) * 0.4));
    _dummy.rotation.set(0, detHash(i * 11 + 4) * Math.PI * 2, 0);
    _dummy.scale.setScalar(0.75 + detHash(i * 11 + 5) * 0.55);
    _dummy.updateMatrix();
    tableInst.setMatrixAt(i, _dummy.matrix);
    tableInst.setColorAt(i, tablePalette[i % tablePalette.length]);
  }
  tableInst.instanceMatrix.needsUpdate = true;
  if (tableInst.instanceColor) tableInst.instanceColor.needsUpdate = true;

  for (let i = 0; i < kelpCount; i++) {
    // Concentrate tall kelp forest towers especially in Ch02 Blue Garden while framing Ch01 outer reef
    const inCh1 = i < 20;
    const basis = inCh1 ? bCh1 : bCh2;
    const fwd = 5.0 + detHash(i * 13 + 1) * 14.0;
    const rightSpread = (detHash(i * 13 + 2) - 0.5) * 16.0;
    // Keep central fish lane clear in Ch02 while framing left & right with lush kelp towers
    const right = !inCh1 && Math.abs(rightSpread) < 1.8 ? (rightSpread >= 0 ? 2.4 : -2.4) : rightSpread;
    const yBase = inCh1 ? -2.5 : -3.1;
    _dummy.position.copy(placeOnSightline(basis, fwd, right, yBase - detHash(i * 13 + 3) * 0.5));
    _dummy.rotation.set(0, detHash(i * 13 + 4) * Math.PI * 2, 0);
    const kScale = inCh1 ? 0.58 + detHash(i * 13 + 5) * 0.35 : 0.95 + detHash(i * 13 + 5) * 0.78;
    _dummy.scale.setScalar(kScale);
    _dummy.updateMatrix();
    kelpInst.setMatrixAt(i, _dummy.matrix);
    kelpInst.setColorAt(i, kelpPalette[i % kelpPalette.length]);
  }
  kelpInst.instanceMatrix.needsUpdate = true;
  if (kelpInst.instanceColor) kelpInst.instanceColor.needsUpdate = true;

  const shallowFloraGroup = new THREE.Group();
  shallowFloraGroup.add(staghornInst, tableInst, kelpInst);
  root.add(shallowFloraGroup);

  // ============================================================================
  // E08: GPU-INSTANCED SECONDARY FISH SHOALS (TANGS IN CH01-02, SNAPPERS IN CH02-04)
  // ============================================================================
  const schoolSwimUniforms = { uTime: { value: 0 } };
  const enhanceSchoolMaterial = (orig: THREE.Material): THREE.MeshStandardMaterial => {
    const m = (orig as THREE.MeshStandardMaterial).clone();
    m.color.setHex(0xffffff);
    m.vertexColors = false;
    m.roughness = 0.4;
    m.metalness = 0.06;
    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = schoolSwimUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float phase = 0.0;
          #ifdef USE_INSTANCING
            phase = instanceMatrix[3][0] * 1.3 + instanceMatrix[3][2] * 0.9;
          #endif
          transformed.x += sin(uTime * 6.2 + position.z * 0.12 + phase) * 0.045;
          `,
        );
    };
    disposableMaterials.push(m);
    return m;
  };

  const tangAgents: SchoolAgent[] = [];
  const snapperAgents: SchoolAgent[] = [];
  const tangMax = 18;
  const snapperMax = 18;

  for (let i = 0; i < tangMax; i++) {
    const basis = i < 9 ? bCh1 : bCh2;
    tangAgents.push({
      anchor: placeOnSightline(
        basis,
        7.5 + detHash(i * 5 + 1) * 9.5,
        (detHash(i * 5 + 2) - 0.5) * 11.0,
        -0.5 + (detHash(i * 5 + 3) - 0.5) * 2.4,
      ),
      orbitRadiusX: 1.6 + detHash(i * 5 + 4) * 2.2,
      orbitRadiusZ: 1.3 + detHash(i * 7 + 2) * 1.9,
      speed: 0.42 + detHash(i * 7 + 3) * 0.24,
      phase: (i / tangMax) * Math.PI * 2,
      scale: 0.34 + detHash(i * 7 + 5) * 0.14,
    });
  }

  const bCh4 = getSightlineBasisAtProgress(0.43);
  for (let i = 0; i < snapperMax; i++) {
    const basis = i < 6 ? bCh2 : i < 13 ? bCh3 : bCh4;
    snapperAgents.push({
      anchor: placeOnSightline(
        basis,
        8.5 + detHash(i * 9 + 1) * 12.0,
        (detHash(i * 9 + 2) - 0.5) * 13.5,
        (detHash(i * 9 + 3) - 0.5) * 3.8,
      ),
      orbitRadiusX: 2.2 + detHash(i * 9 + 4) * 2.8,
      orbitRadiusZ: 1.8 + detHash(i * 11 + 2) * 2.3,
      speed: 0.34 + detHash(i * 11 + 3) * 0.2,
      phase: (i / snapperMax) * Math.PI * 2,
      scale: 0.42 + detHash(i * 11 + 5) * 0.16,
    });
  }

  let tangInstanced: THREE.InstancedMesh | null = null;
  let snapperInstanced: THREE.InstancedMesh | null = null;
  let tangNormScale = 1;
  let snapperNormScale = 1;

  const extractInstancedSchool = (
    sceneObj: THREE.Object3D,
    agents: SchoolAgent[],
  ): { inst: THREE.InstancedMesh; normScale: number } | null => {
    let found: THREE.Mesh | null = null;
    sceneObj.traverse((c) => {
      if ((c as THREE.Mesh).isMesh && !found) found = c as THREE.Mesh;
    });
    if (!found) return null;
    const src = found as THREE.Mesh;
    src.updateWorldMatrix(true, false);
    const geo = src.geometry.clone();
    if (geo.attributes.color) {
      geo.deleteAttribute('color');
    }
    geo.applyMatrix4(src.matrixWorld);
    geo.computeBoundingBox();
    const sz = new THREE.Vector3();
    const ctr = new THREE.Vector3();
    geo.boundingBox!.getSize(sz);
    geo.boundingBox!.getCenter(ctr);
    geo.translate(-ctr.x, -ctr.y, -ctr.z);
    disposableGeometries.push(geo);

    const rawMat = Array.isArray(src.material) ? src.material[0] : src.material;
    const mat = enhanceSchoolMaterial(rawMat);
    const inst = new THREE.InstancedMesh(geo, mat, agents.length);
    inst.frustumCulled = false;
    const maxDim = Math.max(0.001, sz.x, sz.y, sz.z);
    root.add(inst);
    return { inst, normScale: 1.0 / maxDim };
  };

  const attachReefSchoolModel = (loadedTangScene: THREE.Object3D) => {
    if (tangInstanced) return;
    const built = extractInstancedSchool(loadedTangScene, tangAgents);
    if (built) {
      tangInstanced = built.inst;
      tangNormScale = built.normScale;
    }
  };

  const attachDeepSchoolModel = (loadedSnapperScene: THREE.Object3D) => {
    if (snapperInstanced) return;
    const built = extractInstancedSchool(loadedSnapperScene, snapperAgents);
    if (built) {
      snapperInstanced = built.inst;
      snapperNormScale = built.normScale;
    }
  };

  // ============================================================================
  // CHAPTER 03: TIA NẮNG CUỐI (ASYMMETRIC STEPPED CONTINENTAL SHELF DROP-OFF)
  // Replaces the blocky right-hand wall with terraced port-side ledges + open abyssal vista!
  // ============================================================================
  const ch03Group = new THREE.Group();
  ch03Group.name = 'Ch03_LastSunlightDropoff';
  root.add(ch03Group);

  const shelfStepGeo = sculptStratifiedRock(
    new THREE.CylinderGeometry(5.2, 8.4, 14.0, 16, 10),
    0.85,
    0.45,
    0.35,
    0.42,
  );
  disposableGeometries.push(shelfStepGeo);

  // 3 stepped continental terraces along the port/left flank — leaving open cobalt pelagic drop-off on right!
  const ch03Terraces: [number, number, number, number, number][] = [
    [11.5, -10.4, -1.5, 1.05, 0.3],
    [16.5, -12.2, -7.2, 1.25, 1.1],
    [22.5, -9.6, -13.0, 1.4, 2.0],
  ];
  for (const [fwd, right, yOff, sc, rotY] of ch03Terraces) {
    const ledge = new THREE.Mesh(shelfStepGeo, continentalRockMat);
    ledge.position.copy(placeOnSightline(bCh3, fwd, right, yOff));
    ledge.scale.set(sc, sc * 1.05, sc);
    ledge.rotation.y = rotY;
    ch03Group.add(ledge);
  }

  // Distant deep seamount pinnacle on far right horizon for multi-plane scale (never blocking fish!)
  const distantSpire = new THREE.Mesh(shelfStepGeo, deepBasaltMat);
  distantSpire.position.copy(placeOnSightline(bCh3, 28.5, 9.5, -9.0));
  distantSpire.scale.set(1.2, 1.65, 1.2);
  ch03Group.add(distantSpire);

  // Gorgonian sea-fans anchored along Ch03 shelf steps
  const seaFanGeo = createStaghornCoralGeometry();
  disposableGeometries.push(seaFanGeo);
  const seaFanMat = new THREE.MeshStandardMaterial({
    color: 0x3b96b8,
    emissive: 0x0e4466,
    emissiveIntensity: 0.35,
    roughness: 0.55,
  });
  disposableMaterials.push(seaFanMat);
  for (let g = 0; g < 8; g++) {
    const fan = new THREE.Mesh(seaFanGeo, seaFanMat);
    fan.position.copy(
      placeOnSightline(bCh3, 9.5 + g * 1.6, -5.2 - (g % 3) * 1.4, 2.5 - g * 1.2),
    );
    fan.rotation.z = -0.85;
    fan.scale.setScalar(1.1 + (g % 3) * 0.25);
    ch03Group.add(fan);
  }

  // ============================================================================
  // CHAPTER 04 & 05: VÙNG CHẠNG VẠNG & NỬA ĐÊM ĐẠI DƯƠNG (BASALT STACKS, E09 JELLIES, E10 BIO-NODES)
  // ============================================================================
  const ch04Group = new THREE.Group();
  ch04Group.name = 'Ch04_MesopelagicTwilight';
  root.add(ch04Group);

  const ch05Group = new THREE.Group();
  ch05Group.name = 'Ch05_BathypelagicMidnight';
  root.add(ch05Group);

  const seaStackGeo = sculptStratifiedRock(
    new THREE.CylinderGeometry(1.6, 3.4, 24.0, 12, 14),
    0.72,
    0.6,
    0.32,
    0.58,
  );
  disposableGeometries.push(seaStackGeo);

  const bCh5 = getSightlineBasisAtProgress(0.56);

  // Ch04 Basalt Sea-Stacks framing the 32° camera orbit
  const ch04Stacks: [number, number, number, number][] = [
    [11.5, -6.2, -2.0, 1.05],
    [16.5, 6.8, -4.5, 1.22],
    [22.5, -3.4, -6.0, 1.38],
  ];
  for (const [fwd, right, yOff, sc] of ch04Stacks) {
    const st = new THREE.Mesh(seaStackGeo, deepBasaltMat);
    st.position.copy(placeOnSightline(bCh4, fwd, right, yOff));
    st.scale.setScalar(sc);
    ch04Group.add(st);
  }

  // Ch05 Distant Bathypelagic Monoliths (wide negative space)
  const ch05Stacks: [number, number, number, number][] = [
    [18.5, -9.5, -4.0, 1.45],
    [24.5, 8.8, -6.5, 1.6],
  ];
  for (const [fwd, right, yOff, sc] of ch05Stacks) {
    const st = new THREE.Mesh(seaStackGeo, deepBasaltMat);
    st.position.copy(placeOnSightline(bCh5, fwd, right, yOff));
    st.scale.setScalar(sc);
    ch05Group.add(st);
  }

  // E09: Bioluminescent Medusa Jellyfish with Bell Contraction + Phase-Lagging Tentacles
  const jellyBellGeo = new THREE.SphereGeometry(0.46, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const jellyCoreGeo = new THREE.SphereGeometry(0.18, 12, 10);
  const tentacleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, -0.45, 0.03),
    new THREE.Vector3(-0.04, -0.95, -0.03),
    new THREE.Vector3(0.03, -1.45, 0.02),
  ]);
  const tentacleGeo = new THREE.TubeGeometry(tentacleCurve, 12, 0.014, 5, false);
  disposableGeometries.push(jellyBellGeo, jellyCoreGeo, tentacleGeo);

  const jellyBellMat = new THREE.MeshStandardMaterial({
    color: 0x6ce6ff,
    emissive: 0x1da8d8,
    emissiveIntensity: 0.65,
    roughness: 0.18,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const jellyCoreMat = new THREE.MeshStandardMaterial({
    color: 0xbaf8ff,
    emissive: 0x4ae8ff,
    emissiveIntensity: 1.15,
    roughness: 0.22,
  });
  disposableMaterials.push(jellyBellMat, jellyCoreMat);

  const jellyAgents: JellyAgent[] = [];
  const totalJellies = profile.tier === 'low' ? 6 : 12;
  for (let j = 0; j < totalJellies; j++) {
    const inCh4 = j < Math.ceil(totalJellies * 0.6);
    const basis = inCh4 ? bCh4 : bCh5;
    const basePos = placeOnSightline(
      basis,
      6.5 + detHash(j * 7 + 1) * 12.5,
      (detHash(j * 7 + 2) - 0.5) * 12.5,
      (detHash(j * 7 + 3) - 0.4) * 5.5,
    );

    const jGroup = new THREE.Group();
    jGroup.position.copy(basePos);
    const bell = new THREE.Mesh(jellyBellGeo, jellyBellMat);
    const core = new THREE.Mesh(jellyCoreGeo, jellyCoreMat);
    core.position.y = 0.08;
    jGroup.add(bell, core);

    const tentacles: THREE.Mesh[] = [];
    for (let t = 0; t < 6; t++) {
      const ang = (t / 6) * Math.PI * 2;
      const tent = new THREE.Mesh(tentacleGeo, jellyBellMat);
      tent.position.set(Math.cos(ang) * 0.22, -0.02, Math.sin(ang) * 0.22);
      jGroup.add(tent);
      tentacles.push(tent);
    }

    jGroup.scale.setScalar(0.72 + detHash(j * 11 + 4) * 0.48);
    (inCh4 ? ch04Group : ch05Group).add(jGroup);
    jellyAgents.push({
      group: jGroup,
      bellMesh: bell,
      tentacles,
      basePos,
      phase: j * 1.15,
      pulseSpeed: 1.55 + detHash(j * 13 + 2) * 0.65,
    });
  }

  // E10: Sparse Bioluminescent Photophore & Ctenophore Nodes across Ch04–Ch08
  const bioGroup = new THREE.Group();
  bioGroup.name = 'E10_BioluminescentOrganisms';
  root.add(bioGroup);

  const bioOrbGeo = new THREE.SphereGeometry(0.085, 10, 10);
  disposableGeometries.push(bioOrbGeo);

  const bioNodes: BioOrganismNode[] = [];
  const bioProgressAnchors = [0.41, 0.46, 0.53, 0.58, 0.68, 0.73, 0.81, 0.94];
  const bioColors = [0x3be8ff, 0x45f2c8, 0x5cc4ff];

  for (let i = 0; i < 24; i++) {
    const pAnc = bioProgressAnchors[i % bioProgressAnchors.length];
    const basis = getSightlineBasisAtProgress(pAnc);
    const col = new THREE.Color(bioColors[i % bioColors.length]);
    const mat = new THREE.MeshStandardMaterial({
      color: col,
      emissive: col,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });
    disposableMaterials.push(mat);

    const orb = new THREE.Mesh(bioOrbGeo, mat);
    orb.position.copy(
      placeOnSightline(
        basis,
        6.0 + detHash(i * 7 + 1) * 13.0,
        (detHash(i * 7 + 2) - 0.5) * 14.0,
        -2.2 + detHash(i * 7 + 3) * 4.4,
      ),
    );
    orb.scale.setScalar(0.65 + detHash(i * 7 + 5) * 0.7);
    bioGroup.add(orb);
    bioNodes.push({
      mesh: orb,
      mat,
      phase: i * 0.85,
      speed: 1.3 + detHash(i * 9 + 2) * 0.9,
      baseColor: col,
    });
  }

  // ============================================================================
  // CHAPTER 06: ĐỒNG BẰNG VỰC SÂU (SKIRTED ABYSSAL SEDIMENT PLAIN & CHIMNEYS)
  // ============================================================================
  const ch06Group = new THREE.Group();
  ch06Group.name = 'Ch06_AbyssalPlain';
  root.add(ch06Group);

  const bCh6 = getSightlineBasisAtProgress(0.69);
  const abyssPlainGeo = createBenthicBasinGeometry(56.0, 56.0, 8.4);
  disposableGeometries.push(abyssPlainGeo);

  const abyssSedimentMat = new THREE.MeshStandardMaterial({
    color: 0x183247,
    roughness: 0.93,
    metalness: 0.04,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.26,
  });
  disposableMaterials.push(abyssSedimentMat);

  const abyssFloor = new THREE.Mesh(abyssPlainGeo, abyssSedimentMat);
  abyssFloor.position.copy(placeOnSightline(bCh6, 11.0, 0.0, -3.6));
  ch06Group.add(abyssFloor);

  const outcropGeo = createBasaltOutcropGeometry();
  disposableGeometries.push(outcropGeo);

  const chimneySpecs: [number, number, number, number][] = [
    [8.6, -5.6, -2.5, 1.05],
    [13.2, 5.2, -2.7, 1.28],
    [17.5, -3.1, -2.4, 1.4],
    [20.2, 6.8, -2.8, 1.15],
  ];
  for (const [fwd, right, yOff, sc] of chimneySpecs) {
    const chim = new THREE.Mesh(outcropGeo, deepBasaltMat);
    chim.position.copy(placeOnSightline(bCh6, fwd, right, yOff));
    chim.scale.set(sc, sc * 1.2, sc * 0.95);
    chim.rotation.y = fwd * 0.7;
    ch06Group.add(chim);
  }

  // ============================================================================
  // CHAPTER 07: HẺM VỰC THẲM (ASYMMETRIC CANYON WALLS & BASALT GATEWAY ARCH)
  // ============================================================================
  const ch07Group = new THREE.Group();
  ch07Group.name = 'Ch07_AbyssalCanyon';
  root.add(ch07Group);

  const bCh7 = getSightlineBasisAtProgress(0.82);

  const canyonWallGeo = sculptStratifiedRock(
    new THREE.CylinderGeometry(4.2, 6.8, 30.0, 14, 14),
    1.05,
    0.48,
    0.28,
    0.45,
  );
  disposableGeometries.push(canyonWallGeo);

  const leftWall = new THREE.Mesh(canyonWallGeo, deepBasaltMat);
  leftWall.position.copy(placeOnSightline(bCh7, 11.5, -8.2, -2.0));
  const rightWall = new THREE.Mesh(canyonWallGeo, deepBasaltMat);
  rightWall.position.copy(placeOnSightline(bCh7, 13.5, 8.6, -3.5));
  rightWall.scale.set(1.15, 1.05, 1.15);
  ch07Group.add(leftWall, rightWall);

  // Tectonic Basalt Archway spanning safely across the canyon sightline ahead of the fish
  const archSpanL = placeOnSightline(bCh7, 12.5, -7.8, -11.0);
  const archMidL = placeOnSightline(bCh7, 12.5, -4.5, 4.2);
  const archCrown = placeOnSightline(bCh7, 12.5, 0.2, 6.2);
  const archMidR = placeOnSightline(bCh7, 12.5, 4.8, 3.8);
  const archSpanR = placeOnSightline(bCh7, 12.5, 8.2, -11.5);

  const archCurve = new THREE.CatmullRomCurve3([
    archSpanL,
    archMidL,
    archCrown,
    archMidR,
    archSpanR,
  ]);
  const archGeo = sculptStratifiedRock(
    new THREE.TubeGeometry(archCurve, 28, 1.45, 10, false),
    0.35,
    0.8,
    0.8,
    0.8,
  );
  disposableGeometries.push(archGeo);
  ch07Group.add(new THREE.Mesh(archGeo, deepBasaltMat));

  // ============================================================================
  // CHAPTER 08: ĐÁY RÃNH HADAL (CHALLENGER FLOOR & LUMINOUS COLD-SEEP FISSURE)
  // ============================================================================
  const ch08Group = new THREE.Group();
  ch08Group.name = 'Ch08_HadalSanctuary';
  root.add(ch08Group);

  const bCh8 = getSightlineBasisAtProgress(0.95);

  const hadalBasinGeo = createBenthicBasinGeometry(60.0, 60.0, 11.2);
  disposableGeometries.push(hadalBasinGeo);
  const hadalBasin = new THREE.Mesh(hadalBasinGeo, deepBasaltMat);
  hadalBasin.position.copy(placeOnSightline(bCh8, 11.5, 0.0, -3.8));
  ch08Group.add(hadalBasin);

  const buttressL = new THREE.Mesh(outcropGeo, deepBasaltMat);
  buttressL.position.copy(placeOnSightline(bCh8, 16.5, -9.2, -1.2));
  buttressL.scale.set(2.4, 3.2, 2.2);
  const buttressR = new THREE.Mesh(outcropGeo, deepBasaltMat);
  buttressR.position.copy(placeOnSightline(bCh8, 18.0, 9.4, -1.4));
  buttressR.scale.set(2.6, 3.4, 2.4);
  ch08Group.add(buttressL, buttressR);

  const fissureUniforms = {
    uTime: { value: 0 },
    uReveal: { value: 1.0 },
  };
  const fissurePts = [
    placeOnSightline(bCh8, 4.5, -1.8, -3.45),
    placeOnSightline(bCh8, 8.0, 0.6, -3.5),
    placeOnSightline(bCh8, 11.8, -1.2, -3.4),
    placeOnSightline(bCh8, 15.8, 0.9, -3.35),
  ];
  const fissureCurve = new THREE.CatmullRomCurve3(fissurePts);
  const fissureGeo = new THREE.TubeGeometry(fissureCurve, 32, 0.72, 10, false);
  fissureGeo.scale(1.0, 0.32, 1.0);
  disposableGeometries.push(fissureGeo);

  const fissureMat = new THREE.ShaderMaterial({
    uniforms: fissureUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uReveal;
      varying vec2 vUv;
      void main() {
        float core = sin(vUv.y * 3.14159265);
        float endFade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
        float pulse = 0.82 + 0.18 * sin(uTime * 1.35 - vUv.x * 7.5);
        vec3 col = mix(vec3(0.08, 0.48, 0.72), vec3(0.55, 0.94, 1.0), pow(core, 2.0));
        gl_FragColor = vec4(col, core * endFade * pulse * 0.78 * uReveal);
      }
    `,
  });
  disposableMaterials.push(fissureMat);
  ch08Group.add(new THREE.Mesh(fissureGeo, fissureMat));

  const plumeGeo = new THREE.CylinderGeometry(1.5, 0.48, 9.5, 16, 1, true);
  disposableGeometries.push(plumeGeo);
  const plumeMat = new THREE.ShaderMaterial({
    uniforms: fissureUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uReveal;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float fres = pow(abs(dot(vN, vV)), 1.75);
        float vMask = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.14, vUv.y);
        float wave = 0.76 + 0.24 * sin(uTime * 1.05 - vUv.y * 5.8 + vUv.x * 6.28);
        vec3 col = vec3(0.22, 0.76, 0.95);
        gl_FragColor = vec4(col, fres * vMask * wave * 0.24 * uReveal);
      }
    `,
  });
  disposableMaterials.push(plumeMat);

  for (let k = 0; k < 3; k++) {
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.copy(placeOnSightline(bCh8, 6.5 + k * 3.2, (k - 1) * 1.4, 0.8));
    ch08Group.add(plume);
  }

  const hadalSeepLight = new THREE.PointLight(0x4be3fa, 3.8, 28, 1.7);
  hadalSeepLight.position.copy(placeOnSightline(bCh8, 8.2, 0.0, -1.8));
  ch08Group.add(hadalSeepLight);

  const applyQualityTierBudgets = (prof: QualityProfile) => {
    profile = prof;
    effectRegistry.setQuality(prof);
    const ratio = prof.tier === 'high' ? 1.0 : prof.tier === 'balanced' ? 0.7 : 0.42;
    staghornInst.count = Math.max(18, Math.floor(staghornCount * ratio));
    tableInst.count = Math.max(10, Math.floor(tableCount * ratio));
    kelpInst.count = Math.max(24, Math.floor(kelpCount * ratio));
    shaftMeshes.forEach((m, idx) => {
      m.visible = prof.tier === 'low' ? idx % 2 === 0 : true;
    });
  };
  applyQualityTierBudgets(initialProfile);

  const _schoolTarget = new THREE.Vector3();

  const update = (
    elapsedTime: number,
    dt: number,
    progress: number,
    atmosphere: BlendedAtmosphere,
    reducedMotion: boolean,
    fishWorldPos: THREE.Vector3,
    fishForwardDir: THREE.Vector3,
    tailPhaseSin: number,
    scrollVelocity: number,
  ) => {
    const animTime = reducedMotion ? elapsedTime * 0.26 : elapsedTime;

    // Asymmetric chapter-window culling: generous lead-in ahead, crisp trail-out (0.012) once descended past
    // so upper-chapter floors/pillars NEVER hang overhead in deeper chapters!
    ch01Group.visible = getChapterVisibilityWeight(progress, 0, 0.06, 0.012) > 0.005;
    ch02Group.visible = getChapterVisibilityWeight(progress, 1, 0.055, 0.012) > 0.005;
    shallowFloraGroup.visible = progress < 0.255;
    ch03Group.visible = getChapterVisibilityWeight(progress, 2, 0.055, 0.014) > 0.005;
    ch04Group.visible = getChapterVisibilityWeight(progress, 3, 0.055, 0.014) > 0.005;
    ch05Group.visible = getChapterVisibilityWeight(progress, 4, 0.055, 0.012) > 0.005;
    ch06Group.visible = getChapterVisibilityWeight(progress, 5, 0.055, 0.012) > 0.005;
    ch07Group.visible = getChapterVisibilityWeight(progress, 6, 0.055, 0.012) > 0.005;
    ch08Group.visible = getChapterVisibilityWeight(progress, 7, 0.065, 0.05) > 0.005;

    // E01 & E03: Surface undulation + caustics fade cleanly with depth
    surfaceUniforms.uTime.value = animTime;
    surfaceUniforms.uStrength.value = atmosphere.causticStrength;
    ceilingMesh.visible = atmosphere.causticStrength > 0.01 && progress < 0.25;

    reefCausticUniforms.uTime.value = animTime;
    reefCausticUniforms.uCausticStrength.value = atmosphere.causticStrength;

    // E02: Depth-attenuated sun shafts
    shaftUniforms.uTime.value = animTime;
    shaftUniforms.uOpacity.value = atmosphere.sunShaftOpacity;
    sunShaftGroup.visible = atmosphere.sunShaftOpacity > 0.005 && progress < 0.39;

    // E07: Kelp & seagrass secondary sway
    swayUniforms.uTime.value = animTime;
    swayUniforms.uSwayScale.value = reducedMotion ? 0.35 : 1.0;

    // E08: Coordinated GPU-instanced fish shoals
    schoolSwimUniforms.uTime.value = elapsedTime;
    const updateInstancedShoal = (
      inst: THREE.InstancedMesh | null,
      agents: SchoolAgent[],
      normScale: number,
      minP: number,
      maxP: number,
    ) => {
      if (!inst) return;
      if (progress < minP - 0.05 || progress > maxP + 0.05) {
        inst.visible = false;
        return;
      }
      inst.visible = true;
      const activeCount = profile.tier === 'low' ? Math.ceil(agents.length * 0.5) : agents.length;
      inst.count = activeCount;
      for (let i = 0; i < activeCount; i++) {
        const ag = agents[i];
        const ang = animTime * ag.speed + ag.phase;
        const nx = ag.anchor.x + Math.cos(ang) * ag.orbitRadiusX;
        const nz = ag.anchor.z + Math.sin(ang) * ag.orbitRadiusZ;
        const ny = ag.anchor.y + Math.sin(ang * 2.0 + ag.phase) * 0.36;

        const nextAng = ang + 0.06;
        _schoolTarget.set(
          ag.anchor.x + Math.cos(nextAng) * ag.orbitRadiusX,
          ag.anchor.y + Math.sin(nextAng * 2.0 + ag.phase) * 0.36,
          ag.anchor.z + Math.sin(nextAng) * ag.orbitRadiusZ,
        );
        _dummy.position.set(nx, ny, nz);
        _dummy.lookAt(_schoolTarget);
        _dummy.scale.setScalar(ag.scale * normScale);
        _dummy.updateMatrix();
        inst.setMatrixAt(i, _dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    };

    updateInstancedShoal(tangInstanced, tangAgents, tangNormScale, 0.0, 0.28);
    updateInstancedShoal(snapperInstanced, snapperAgents, snapperNormScale, 0.14, 0.52);

    // E09: Jellyfish bell contraction + phase-lagging trailing tentacles
    jellyBellMat.emissiveIntensity = 0.35 + atmosphere.bioGlowIntensity * 0.8;
    jellyCoreMat.emissiveIntensity = 0.65 + atmosphere.bioGlowIntensity * 1.15;

    for (let j = 0; j < jellyAgents.length; j++) {
      const ja = jellyAgents[j];
      const pulse = Math.sin(animTime * ja.pulseSpeed + ja.phase);
      ja.group.position.y = ja.basePos.y + pulse * 0.28;
      ja.group.position.x = ja.basePos.x + Math.cos(animTime * 0.38 + ja.phase) * 0.2;
      const bellRadial = 1.0 + pulse * 0.1;
      ja.bellMesh.scale.set(bellRadial, 1.0 - pulse * 0.08, bellRadial);

      // Trailing tentacles sway with 0.72 rad phase lag behind bell contraction
      const lagWave = Math.sin(animTime * ja.pulseSpeed + ja.phase - 0.72);
      for (let t = 0; t < ja.tentacles.length; t++) {
        ja.tentacles[t].rotation.z = lagWave * 0.16 * (t % 2 === 0 ? 1 : -1);
        ja.tentacles[t].rotation.x = Math.cos(animTime * ja.pulseSpeed + ja.phase - 0.9 + t) * 0.12;
      }
    }

    // E10: Bioluminescent organism pulses (sparse, organic phase offset)
    const bioStrength = getEffectStrengthAtProgress('E10', progress);
    bioGroup.visible = bioStrength > 0.01;
    if (bioGroup.visible) {
      for (let i = 0; i < bioNodes.length; i++) {
        const bn = bioNodes[i];
        const wave = 0.5 + 0.5 * Math.sin(animTime * bn.speed + bn.phase);
        bn.mat.emissiveIntensity = (0.25 + Math.pow(wave, 2.4) * 1.35) * bioStrength;
      }
    }

    // Ch08 Hadal Cold-Seep Fissure & Seep PointLight (E24)
    const hadalFactor = getEffectStrengthAtProgress('E24', progress);
    fissureUniforms.uTime.value = animTime;
    fissureUniforms.uReveal.value = hadalFactor;
    hadalSeepLight.intensity = hadalFactor * 3.8;

    // Update modular EffectRegistry (E05, E06, E11, E12, E17, E22, E23, E24)
    effectRegistry.update({
      elapsedTime,
      dt,
      progress,
      atmosphere,
      quality: profile,
      reducedMotion,
      fishWorldPos,
      fishForwardDir,
      tailPhaseSin,
      scrollVelocity,
    });
  };

  const dispose = () => {
    effectRegistry.dispose();
    disposableGeometries.forEach((g) => g.dispose());
    disposableMaterials.forEach((m) => m.dispose());
  };

  return {
    root,
    effectRegistry,
    attachReefSchoolModel,
    attachDeepSchoolModel,
    setQualityProfile: applyQualityTierBudgets,
    update,
    dispose,
  };
}
