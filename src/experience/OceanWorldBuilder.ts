import * as THREE from 'three';
import { QualityProfile } from '../lib/qualityTier';
import { BlendedAtmosphere } from '../lib/chapterConfig';
import { ProceduralTextureSet } from './proceduralTextures';

export interface OceanWorldRig {
  root: THREE.Group;
  attachSchoolModel: (loadedSnapperScene: THREE.Object3D) => void;
  update: (
    elapsedTime: number,
    progress: number,
    atmosphere: BlendedAtmosphere,
    reducedMotion: boolean,
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
  basePos: THREE.Vector3;
  phase: number;
  pulseSpeed: number;
}

function deterministicHash(n: number): number {
  const x = Math.sin(n * 91.3458 + 17.231) * 47453.5453;
  return x - Math.floor(x);
}

/**
 * Displaces vertices of a rock/cliff BufferGeometry deterministically for organic geological silhouette.
 */
function sculptGeologicalMesh(
  geo: THREE.BufferGeometry,
  amplitude: number,
  freqX: number,
  freqY: number,
  freqZ: number,
): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  geo.computeVertexNormals();
  const norm = geo.attributes.normal;

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(norm, i);
    const n1 = Math.sin(v.x * freqX + v.y * freqY) * Math.cos(v.z * freqZ + v.y * 0.35);
    const n2 = Math.sin(v.x * freqX * 2.3 - v.z * freqZ * 1.9) * 0.45;
    const disp = (n1 + n2) * amplitude;
    pos.setXYZ(i, v.x + n.x * disp, v.y + n.y * disp * 0.45, v.z + n.z * disp);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function buildOceanWorld(
  profile: QualityProfile,
  textures: ProceduralTextureSet,
): OceanWorldRig {
  const root = new THREE.Group();
  root.name = 'PelagicOceanWorld';

  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  // Shared geological PBR materials (varied roughness across strata)
  const shallowReefMat = new THREE.MeshStandardMaterial({
    color: 0x2c5c6e,
    roughness: 0.78,
    metalness: 0.06,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.38,
    roughnessMap: textures.rockRoughnessMap,
  });
  const deepBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x172b3d,
    roughness: 0.84,
    metalness: 0.12,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.55,
    roughnessMap: textures.rockRoughnessMap,
  });
  const abyssalSedimentMat = new THREE.MeshStandardMaterial({
    color: 0x1a3142,
    roughness: 0.92,
    metalness: 0.04,
    bumpMap: textures.rockBumpMap,
    bumpScale: 0.26,
  });
  disposableMaterials.push(shallowReefMat, deepBasaltMat, abyssalSedimentMat);

  // ============================================================================
  // CHAPTER 01: SUNLIT SURFACE CANOPY, SNELL'S WINDOW & VOLUMETRIC SUN SHAFTS
  // ============================================================================
  const surfaceGroup = new THREE.Group();
  surfaceGroup.name = 'Ch01_SurfaceZone';
  root.add(surfaceGroup);

  const surfaceUniforms = {
    uTime: { value: 0 },
    uCausticTex: { value: textures.causticMap },
    uStrength: { value: 1.0 },
  };

  const ceilingGeo = new THREE.PlaneGeometry(95, 95, 48, 48);
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
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(p.x * 0.35 + uTime * 1.35) * 0.28 + cos(p.z * 0.42 + uTime * 1.1) * 0.24;
        vec4 wp = modelMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform sampler2D uCausticTex;
      uniform float uStrength;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vec2 uv1 = vUv * 5.0 + vec2(uTime * 0.025, uTime * 0.018);
        vec2 uv2 = vUv * 7.0 - vec2(uTime * 0.019, uTime * 0.027);
        vec3 c1 = texture2D(uCausticTex, uv1).rgb;
        vec3 c2 = texture2D(uCausticTex, uv2).rgb;
        float dist = length(vWorldPos.xz - vec2(0.0, -3.0));
        // Snell's window bright overhead aperture fading smoothly toward horizon
        float snell = smoothstep(42.0, 2.0, dist);
        vec3 skyCore = mix(vec3(0.05, 0.36, 0.52), vec3(0.78, 0.96, 1.0), pow(snell, 1.8));
        vec3 col = skyCore + (c1 + c2) * 0.65 * snell;
        float alpha = clamp(snell * 0.88 * uStrength, 0.0, 0.92);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  disposableMaterials.push(ceilingMat);

  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.position.set(0, 4.9, -4);
  surfaceGroup.add(ceilingMesh);

  // Volumetric God-Ray Shafts (Chapters 01 -> 03)
  const shaftUniforms = {
    uTime: { value: 0 },
    uOpacity: { value: 0.42 },
  };
  const shaftGeo = new THREE.CylinderGeometry(0.45, 2.8, 36, 16, 1, true);
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
        float edgeSoft = pow(abs(dot(vNormalView, vViewDir)), 1.9);
        float verticalFade = smoothstep(0.0, 0.72, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        float shimmer = 0.78 + 0.22 * sin(uTime * 0.9 + vUv.x * 12.56);
        float alpha = edgeSoft * verticalFade * shimmer * uOpacity;
        vec3 beamCol = mix(vec3(0.22, 0.72, 0.92), vec3(0.86, 0.97, 1.0), vUv.y);
        gl_FragColor = vec4(beamCol, alpha);
      }
    `,
  });
  disposableMaterials.push(shaftMat);

  const sunShaftGroup = new THREE.Group();
  for (let i = 0; i < profile.sunShaftCount; i++) {
    const beam = new THREE.Mesh(shaftGeo, shaftMat);
    const angle = (i / profile.sunShaftCount) * Math.PI * 2;
    const radius = 3.5 + deterministicHash(i * 7 + 1) * 14.0;
    const depthOffset = -deterministicHash(i * 7 + 2) * 24.0;
    beam.position.set(
      Math.cos(angle) * radius,
      -10.5 + depthOffset * 0.85,
      -5.0 + Math.sin(angle) * radius * 0.8 + depthOffset * 0.45,
    );
    beam.rotation.z = -0.18 + (deterministicHash(i * 7 + 3) - 0.5) * 0.12;
    beam.rotation.x = 0.12;
    const scaleW = 0.65 + deterministicHash(i * 7 + 4) * 0.9;
    beam.scale.set(scaleW, 0.85 + deterministicHash(i * 7 + 5) * 0.55, scaleW);
    sunShaftGroup.add(beam);
  }
  root.add(sunShaftGroup);

  // Distant Shallow Seamount Silhouettes in Ch01 background so Surface frame has 3D horizon depth
  const surfaceRidgeGeo = sculptGeologicalMesh(
    new THREE.ConeGeometry(9.5, 16, 18, 8),
    1.35,
    0.45,
    0.35,
    0.45,
  );
  disposableGeometries.push(surfaceRidgeGeo);
  const farRidgeL = new THREE.Mesh(surfaceRidgeGeo, shallowReefMat);
  farRidgeL.position.set(-15.5, -9.5, -22.0);
  farRidgeL.scale.set(1.3, 0.85, 1.1);
  const farRidgeR = new THREE.Mesh(surfaceRidgeGeo, shallowReefMat);
  farRidgeR.position.set(17.5, -11.5, -26.0);
  farRidgeR.scale.set(1.6, 1.05, 1.25);
  surfaceGroup.add(farRidgeL, farRidgeR);

  // Rising Micro-Bubbles near surface (InstancedMesh)
  const bubbleCount = 48;
  const bubbleGeo = new THREE.SphereGeometry(0.045, 10, 10);
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0xe6fbff,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.62,
  });
  disposableGeometries.push(bubbleGeo);
  disposableMaterials.push(bubbleMat);
  const bubbleInstances = new THREE.InstancedMesh(bubbleGeo, bubbleMat, bubbleCount);
  bubbleInstances.frustumCulled = false;
  surfaceGroup.add(bubbleInstances);

  // ============================================================================
  // CHAPTER 02: BLUE GARDEN — REEF TERRACES, SWAYING KELP & SNAPPER SCHOOL
  // ============================================================================
  const gardenGroup = new THREE.Group();
  gardenGroup.name = 'Ch02_BlueGarden';
  root.add(gardenGroup);

  const reefShelfGeo = sculptGeologicalMesh(
    new THREE.SphereGeometry(6.8, 26, 18),
    0.85,
    0.48,
    0.42,
    0.48,
  );
  reefShelfGeo.scale(1.25, 0.72, 1.15);
  disposableGeometries.push(reefShelfGeo);

  const shelfLeft = new THREE.Mesh(reefShelfGeo, shallowReefMat);
  shelfLeft.position.set(-6.4, -27.5, -16.5);
  shelfLeft.scale.set(1.2, 1.05, 1.3);

  const shelfRight = new THREE.Mesh(reefShelfGeo, shallowReefMat);
  shelfRight.position.set(12.6, -29.5, -20.5);
  shelfRight.scale.set(1.4, 1.25, 1.25);
  gardenGroup.add(shelfLeft, shelfRight);

  // Swaying Giant Kelp Blades (InstancedMesh with vertex current sway)
  const kelpUniforms = { uTime: { value: 0 } };
  const kelpBladeShape = new THREE.Shape();
  kelpBladeShape.moveTo(0, 0);
  kelpBladeShape.quadraticCurveTo(0.24, 2.2, 0.14, 5.8);
  kelpBladeShape.quadraticCurveTo(0.03, 7.6, 0.0, 8.5);
  kelpBladeShape.quadraticCurveTo(-0.03, 7.6, -0.14, 5.8);
  kelpBladeShape.quadraticCurveTo(-0.24, 2.2, 0, 0);

  const kelpGeo = new THREE.ShapeGeometry(kelpBladeShape, 18);
  disposableGeometries.push(kelpGeo);

  const kelpMat = new THREE.MeshStandardMaterial({
    color: 0x266c63,
    roughness: 0.52,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  kelpMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = kelpUniforms.uTime;
    shader.vertexShader =
      `uniform float uTime;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float hRatio = clamp(position.y / 8.5, 0.0, 1.0);
        transformed.x += sin(uTime * 1.45 + position.y * 0.75) * 0.65 * hRatio * hRatio;
        transformed.z += cos(uTime * 1.15 + position.y * 0.55) * 0.42 * hRatio * hRatio;
        `,
      );
  };
  disposableMaterials.push(kelpMat);

  const kelpCount = 46;
  const kelpInstanced = new THREE.InstancedMesh(kelpGeo, kelpMat, kelpCount);
  kelpInstanced.frustumCulled = false;
  const _dummy = new THREE.Object3D();
  const _col = new THREE.Color();

  for (let i = 0; i < kelpCount; i++) {
    const onLeft = i % 2 === 0;
    const baseX = onLeft
      ? -3.2 - deterministicHash(i * 5 + 1) * 5.2
      : 8.2 + deterministicHash(i * 5 + 1) * 5.6;
    const baseZ = -8.0 - deterministicHash(i * 5 + 2) * 11.5;
    const baseY = onLeft ? -21.5 - deterministicHash(i * 5 + 3) * 5.5 : -24.0 - deterministicHash(i * 5 + 3) * 5.5;
    _dummy.position.set(baseX, baseY, baseZ);
    _dummy.rotation.set(0, deterministicHash(i * 5 + 4) * Math.PI * 2, (deterministicHash(i * 5 + 5) - 0.5) * 0.25);
    const s = 0.72 + deterministicHash(i * 5 + 6) * 0.75;
    _dummy.scale.set(s, s * (0.85 + deterministicHash(i * 5 + 7) * 0.45), s);
    _dummy.updateMatrix();
    kelpInstanced.setMatrixAt(i, _dummy.matrix);
    _col.setHSL(0.47 + (deterministicHash(i * 3) - 0.5) * 0.06, 0.48, 0.24 + deterministicHash(i * 9) * 0.1);
    kelpInstanced.setColorAt(i, _col);
  }
  kelpInstanced.instanceMatrix.needsUpdate = true;
  if (kelpInstanced.instanceColor) kelpInstanced.instanceColor.needsUpdate = true;
  gardenGroup.add(kelpInstanced);

  // Pelagic School Container (populated with grey-snapper.glb instances)
  const schoolGroup = new THREE.Group();
  schoolGroup.name = 'PelagicSnapperSchool';
  root.add(schoolGroup);

  const schoolAgents: SchoolAgent[] = [];
  const schoolNodes: THREE.Object3D[] = [];
  const schoolSwimUniforms = { uTime: { value: 0 } };

  for (let i = 0; i < profile.schoolCount; i++) {
    const inSurface = i < 4;
    const inTwilight = i >= Math.floor(profile.schoolCount * 0.72);
    schoolAgents.push({
      anchor: new THREE.Vector3(
        inSurface
          ? -4.8 - deterministicHash(i * 11 + 1) * 4.5
          : (deterministicHash(i * 11 + 1) - 0.55) * 11.5,
        inSurface
          ? -1.4 - deterministicHash(i * 11 + 2) * 2.8
          : inTwilight
            ? -39 - deterministicHash(i * 11 + 2) * 12
            : -22.5 - deterministicHash(i * 11 + 2) * 7.5,
        inSurface
          ? -7.5 - deterministicHash(i * 11 + 3) * 5.0
          : inTwilight
            ? -21 - deterministicHash(i * 11 + 3) * 9
            : -13.5 - deterministicHash(i * 11 + 3) * 8.5,
      ),
      orbitRadiusX: inSurface ? 2.2 : 2.8 + deterministicHash(i * 11 + 4) * 3.6,
      orbitRadiusZ: inSurface ? 1.6 : 1.9 + deterministicHash(i * 11 + 5) * 2.8,
      speed: 0.36 + deterministicHash(i * 11 + 6) * 0.22,
      phase: deterministicHash(i * 11 + 7) * Math.PI * 2,
      scale: 0.46 + deterministicHash(i * 11 + 8) * 0.28,
    });
  }

  const attachSchoolModel = (loadedSnapperScene: THREE.Object3D) => {
    let snapperMesh: THREE.Mesh | null = null;
    loadedSnapperScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !snapperMesh) {
        snapperMesh = child as THREE.Mesh;
      }
    });
    if (!snapperMesh) return;

    const sMesh = snapperMesh as THREE.Mesh;
    const geo = sMesh.geometry.clone();
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const len = Math.max(0.001, box.max.z - box.min.z);
    // Normalize each schooling fish to ~0.95m length; snout is already +Z in greySnapper.glb
    const normScale = 0.95 / len;
    geo.scale(normScale, normScale, normScale);
    disposableGeometries.push(geo);

    const origMat = (Array.isArray(sMesh.material) ? sMesh.material[0] : sMesh.material) as THREE.MeshStandardMaterial;
    const mat = origMat.clone();
    mat.roughness = 0.38;
    mat.metalness = 0.16;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = schoolSwimUniforms.uTime;
      shader.vertexShader =
        `uniform float uTime;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          float tailFactor = clamp((0.48 - position.z) / 0.95, 0.0, 1.0);
          transformed.x += sin(uTime * 5.8 - tailFactor * 4.5) * 0.075 * tailFactor * tailFactor;
          `,
        );
    };
    disposableMaterials.push(mat);

    while (schoolGroup.children.length > 0) {
      schoolGroup.remove(schoolGroup.children[0]);
    }
    schoolNodes.length = 0;

    for (let i = 0; i < schoolAgents.length; i++) {
      const m = new THREE.Mesh(geo, mat);
      const s = schoolAgents[i].scale;
      m.scale.setScalar(s);
      schoolGroup.add(m);
      schoolNodes.push(m);
    }
  };

  // ============================================================================
  // CHAPTER 03: LAST SUNLIGHT — CONTINENTAL SHELF DROP-OFF ESCARPMENT & SEA FANS
  // ============================================================================
  const dropoffGroup = new THREE.Group();
  dropoffGroup.name = 'Ch03_ContinentalDropoff';
  root.add(dropoffGroup);

  const escarpmentGeo = sculptGeologicalMesh(
    new THREE.BoxGeometry(11.5, 29.0, 22.0, 18, 28, 20),
    1.65,
    0.38,
    0.32,
    0.36,
  );
  disposableGeometries.push(escarpmentGeo);

  const escarpmentMain = new THREE.Mesh(escarpmentGeo, deepBasaltMat);
  escarpmentMain.position.set(9.4, -43.0, -21.0);
  escarpmentMain.rotation.y = -0.24;
  dropoffGroup.add(escarpmentMain);

  const outcroppingL = new THREE.Mesh(reefShelfGeo, deepBasaltMat);
  outcroppingL.position.set(-10.5, -46.5, -24.5);
  outcroppingL.scale.set(1.1, 1.65, 1.15);
  dropoffGroup.add(outcroppingL);

  // Composite Gorgonian Sea-Fan Colonies anchored flush on cliff ledges
  const fanMat = new THREE.MeshStandardMaterial({
    color: 0x2c6e85,
    emissive: 0x0b2a3b,
    roughness: 0.62,
    metalness: 0.05,
  });
  disposableMaterials.push(fanMat);
  const branchGeo = new THREE.CylinderGeometry(0.025, 0.055, 1.4, 7);
  disposableGeometries.push(branchGeo);

  for (let f = 0; f < 6; f++) {
    const fanCluster = new THREE.Group();
    for (let b = 0; b < 5; b++) {
      const br = new THREE.Mesh(branchGeo, fanMat);
      const spread = (b - 2) * 0.28;
      br.position.set(0, 0.65, Math.sin(spread) * 0.25);
      br.rotation.x = spread;
      br.rotation.z = 0.45;
      fanCluster.add(br);
    }
    fanCluster.position.set(3.9 + deterministicHash(f * 3) * 0.8, -37.0 - f * 2.8, -16.5 - f * 1.4);
    dropoffGroup.add(fanCluster);
  }

  // ============================================================================
  // CHAPTER 04 & 05: TWILIGHT SEA-STACKS, MIDNIGHT SEAMOUNTS & BIOLUMINESCENT JELLIES
  // ============================================================================
  const mesoBathyGroup = new THREE.Group();
  mesoBathyGroup.name = 'Ch04_05_TwilightAndMidnight';
  root.add(mesoBathyGroup);

  const seaStackGeo = sculptGeologicalMesh(
    new THREE.CylinderGeometry(1.9, 5.2, 34.0, 20, 18),
    1.25,
    0.48,
    0.28,
    0.48,
  );
  disposableGeometries.push(seaStackGeo);

  const stackPort = new THREE.Mesh(seaStackGeo, deepBasaltMat);
  stackPort.position.set(-10.8, -63.0, -28.5);
  const stackStarboard = new THREE.Mesh(seaStackGeo, deepBasaltMat);
  stackStarboard.position.set(7.4, -67.5, -33.5);
  stackStarboard.scale.set(1.25, 1.15, 1.25);

  // Colossal distant bathypelagic seamounts in Chapter 05 Midnight for vast scale cues
  const seamountLeft = new THREE.Mesh(seaStackGeo, deepBasaltMat);
  seamountLeft.position.set(-19.5, -86.0, -48.0);
  seamountLeft.scale.set(2.4, 1.55, 2.2);
  const seamountRight = new THREE.Mesh(seaStackGeo, deepBasaltMat);
  seamountRight.position.set(21.0, -90.0, -52.0);
  seamountRight.scale.set(2.7, 1.65, 2.4);

  mesoBathyGroup.add(stackPort, stackStarboard, seamountLeft, seamountRight);

  // Composite Multi-Part Bioluminescent Deep-Sea Medusae / Comb Jellies (6 parts per organism)
  const jellyBellPoints = [
    new THREE.Vector2(0.0, 0.55),
    new THREE.Vector2(0.24, 0.5),
    new THREE.Vector2(0.44, 0.32),
    new THREE.Vector2(0.48, 0.08),
    new THREE.Vector2(0.42, 0.0),
  ];
  const jellyBellGeo = new THREE.LatheGeometry(jellyBellPoints, 20);
  const jellyCoreGeo = new THREE.SphereGeometry(0.16, 12, 12);
  const tentacleGeo = new THREE.CylinderGeometry(0.014, 0.004, 1.45, 6, 8);
  tentacleGeo.translate(0, -0.72, 0);
  disposableGeometries.push(jellyBellGeo, jellyCoreGeo, tentacleGeo);

  const jellyBellMat = new THREE.MeshStandardMaterial({
    color: 0x3ec8e8,
    emissive: 0x16789c,
    emissiveIntensity: 0.75,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const jellyCoreMat = new THREE.MeshStandardMaterial({
    color: 0x9cf4ff,
    emissive: 0x3cd8f5,
    emissiveIntensity: 1.35,
    roughness: 0.25,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const tentacleMat = new THREE.MeshStandardMaterial({
    color: 0x56d8f0,
    emissive: 0x1c84a8,
    emissiveIntensity: 0.65,
    roughness: 0.4,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
  });
  disposableMaterials.push(jellyBellMat, jellyCoreMat, tentacleMat);

  const jellyAgents: JellyAgent[] = [];
  for (let j = 0; j < profile.jellyCount; j++) {
    const jGroup = new THREE.Group();
    const bell = new THREE.Mesh(jellyBellGeo, jellyBellMat);
    const core = new THREE.Mesh(jellyCoreGeo, jellyCoreMat);
    core.position.y = 0.24;
    jGroup.add(bell, core);

    for (let t = 0; t < 4; t++) {
      const ang = (t / 4) * Math.PI * 2;
      const tent = new THREE.Mesh(tentacleGeo, tentacleMat);
      tent.position.set(Math.cos(ang) * 0.18, 0.05, Math.sin(ang) * 0.18);
      jGroup.add(tent);
    }

    // Distribute across Twilight (Ch04), Midnight (Ch05), and Hadal Reveal background (Ch08)
    let py: number;
    let pz: number;
    let px: number;
    if (j >= profile.jellyCount - 3) {
      // Hadal sanctuary midground drifters right above the cold-seep rift
      px = (j - (profile.jellyCount - 2)) * 3.6 - 0.8;
      py = -160.8 - deterministicHash(j * 13 + 2) * 3.6;
      pz = -65.5 - deterministicHash(j * 13 + 3) * 6.5;
    } else {
      const tNorm = j / Math.max(1, profile.jellyCount - 4);
      py = -58.5 - tNorm * 34.0;
      px = -1.2 + deterministicHash(j * 17 + 1) * 9.5;
      if (Math.abs(px - -3.2) < 2.2) px += 3.2; // Keep clear of hero fish path while visible in sightline
      pz = -28.5 - tNorm * 14.0 - deterministicHash(j * 17 + 4) * 5.0;
    }

    const s = 0.65 + deterministicHash(j * 19 + 5) * 0.55;
    jGroup.scale.setScalar(s);
    jGroup.position.set(px, py, pz);
    root.add(jGroup);

    jellyAgents.push({
      group: jGroup,
      basePos: new THREE.Vector3(px, py, pz),
      phase: deterministicHash(j * 23 + 7) * Math.PI * 2,
      pulseSpeed: 1.35 + deterministicHash(j * 29 + 3) * 0.65,
    });
  }

  // ============================================================================
  // CHAPTER 06: ABYSSAL PLAIN — EXPANSIVE SEDIMENT FLOOR & MINERAL CHIMNEYS
  // ============================================================================
  const abyssPlainGroup = new THREE.Group();
  abyssPlainGroup.name = 'Ch06_AbyssalPlain';
  root.add(abyssPlainGroup);

  const plainSegs = profile.terrainSegments;
  const plainGeo = new THREE.PlaneGeometry(96, 76, plainSegs, plainSegs);
  plainGeo.rotateX(-Math.PI / 2);
  const pPos = plainGeo.attributes.position;

  const plainHeightOffset = (x: number, z: number): number => {
    // Keep central corridor smooth & safely below fish (fish is at Y=-108, plain base at Y=-114.2)
    const ridgeFactor = Math.min(1, Math.max(0, (Math.abs(x) - 4.0) / 14.0));
    const dunes = Math.sin(x * 0.22 + z * 0.18) * 0.65 + Math.cos(x * 0.48 - z * 0.35) * 0.28;
    const outerRise = ridgeFactor * ridgeFactor * (3.2 + Math.sin(z * 0.25) * 1.4);
    return dunes + outerRise;
  };

  for (let i = 0; i < pPos.count; i++) {
    const vx = pPos.getX(i);
    const vz = pPos.getZ(i);
    pPos.setY(i, plainHeightOffset(vx, vz));
  }
  pPos.needsUpdate = true;
  plainGeo.computeVertexNormals();
  disposableGeometries.push(plainGeo);

  const abyssFloorY = -114.2;
  const plainMesh = new THREE.Mesh(plainGeo, abyssalSedimentMat);
  plainMesh.position.set(2.0, abyssFloorY, -45.0);
  plainMesh.receiveShadow = true;
  abyssPlainGroup.add(plainMesh);

  // Grounded Composite Mineral Chimneys & Soft Radial Contact Shadows
  const chimneyBaseGeo = sculptGeologicalMesh(
    new THREE.CylinderGeometry(0.42, 1.35, 4.6, 14, 6),
    0.18,
    1.8,
    0.9,
    1.8,
  );
  chimneyBaseGeo.translate(0, 2.3, 0); // Bottom-center pivot for exact ground flush alignment!
  const chimneyCrownGeo = sculptGeologicalMesh(
    new THREE.CylinderGeometry(0.24, 0.52, 2.2, 12, 4),
    0.1,
    2.2,
    1.2,
    2.2,
  );
  chimneyCrownGeo.translate(0, 1.1, 0);
  const contactShadowGeo = new THREE.CircleGeometry(1.9, 20);
  contactShadowGeo.rotateX(-Math.PI / 2);
  disposableGeometries.push(chimneyBaseGeo, chimneyCrownGeo, contactShadowGeo);

  const contactShadowMat = new THREE.MeshBasicMaterial({
    color: 0x01050a,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposableMaterials.push(contactShadowMat);

  const chimneyOffsets: [number, number, number][] = [
    [-5.8, -41.5, 1.15],
    [8.6, -44.0, 1.35],
    [-9.2, -49.5, 1.5],
    [6.4, -52.5, 0.95],
    [12.5, -56.0, 1.65],
  ];

  for (const [cx, cz, cs] of chimneyOffsets) {
    const localX = cx - 2.0;
    const localZ = cz - -45.0;
    const groundY = abyssFloorY + plainHeightOffset(localX, localZ);

    const spireGroup = new THREE.Group();
    const base = new THREE.Mesh(chimneyBaseGeo, deepBasaltMat);
    const crown = new THREE.Mesh(chimneyCrownGeo, deepBasaltMat);
    crown.position.y = 3.85;
    spireGroup.add(base, crown);
    spireGroup.scale.setScalar(cs);
    spireGroup.position.set(cx, groundY - 0.12, cz);

    const shadowDisc = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    shadowDisc.scale.setScalar(cs);
    shadowDisc.position.set(cx, groundY + 0.03, cz);

    abyssPlainGroup.add(spireGroup, shadowDisc);
  }

  // ============================================================================
  // CHAPTER 07: ABYSSAL CANYON — ASYMMETRIC TRENCH WALLS & TECTONIC ARCHWAY
  // ============================================================================
  const canyonGroup = new THREE.Group();
  canyonGroup.name = 'Ch07_AbyssalCanyon';
  root.add(canyonGroup);

  const canyonWallGeo = sculptGeologicalMesh(
    new THREE.BoxGeometry(10.5, 36.0, 26.0, 16, 28, 20),
    1.55,
    0.42,
    0.26,
    0.38,
  );
  disposableGeometries.push(canyonWallGeo);

  // Fish path at p=0.82 is X=-1.8, Z=-50.5; Camera is around X=-3.9.
  // Place walls at X=-13.2 (inner face ~ -7.8) and X=+8.6 (inner face ~ +3.2) -> >11m clear corridor!
  const leftCanyonWall = new THREE.Mesh(canyonWallGeo, deepBasaltMat);
  leftCanyonWall.position.set(-13.4, -136.0, -51.0);
  leftCanyonWall.rotation.y = 0.14;

  const rightCanyonWall = new THREE.Mesh(canyonWallGeo, deepBasaltMat);
  rightCanyonWall.position.set(8.8, -138.0, -52.5);
  rightCanyonWall.rotation.y = -0.18;

  // Overhead Tectonic Basalt Archway at entrance to Hadal Sanctuary (Y=-145, Z=-55)
  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10.5, -152.0, -55.5),
    new THREE.Vector3(-6.2, -141.5, -55.0),
    new THREE.Vector3(0.0, -139.0, -54.8),
    new THREE.Vector3(5.8, -142.0, -55.2),
    new THREE.Vector3(9.5, -153.0, -56.0),
  ]);
  const archGeo = sculptGeologicalMesh(
    new THREE.TubeGeometry(archCurve, 28, 1.85, 12, false),
    0.45,
    0.9,
    0.9,
    0.9,
  );
  disposableGeometries.push(archGeo);
  const canyonArch = new THREE.Mesh(archGeo, deepBasaltMat);

  canyonGroup.add(leftCanyonWall, rightCanyonWall, canyonArch);

  // ============================================================================
  // CHAPTER 08: HADAL REVEAL — LUMINOUS COLD-SEEP FISSURE CATHEDRAL
  // ============================================================================
  const hadalGroup = new THREE.Group();
  hadalGroup.name = 'Ch08_HadalSanctuary';
  root.add(hadalGroup);

  // Hadal Sanctuary Floor (Y = -170.0; fish hovers at Y = -158..-164 in foreground)
  const hadalFloorGeo = new THREE.PlaneGeometry(86, 68, 56, 56);
  hadalFloorGeo.rotateX(-Math.PI / 2);
  const hfPos = hadalFloorGeo.attributes.position;
  for (let i = 0; i < hfPos.count; i++) {
    const vx = hfPos.getX(i);
    const vz = hfPos.getZ(i);
    // Carve central tectonic rift valley along X ~ -0.8 * sin(vz * 0.15)
    const riftCenter = Math.sin(vz * 0.14) * 2.2;
    const distFromRift = Math.abs(vx - riftCenter);
    const canyonRise = Math.pow(Math.min(1, Math.max(0, (distFromRift - 3.2) / 18.0)), 1.6) * 14.0;
    const riftTrench = -Math.exp(-distFromRift * distFromRift * 0.35) * 1.8;
    const roughness = Math.sin(vx * 0.55 + vz * 0.45) * 0.38;
    hfPos.setY(i, canyonRise + riftTrench + roughness);
  }
  hfPos.needsUpdate = true;
  hadalFloorGeo.computeVertexNormals();
  disposableGeometries.push(hadalFloorGeo);

  const hadalFloorY = -166.6;
  const hadalFloor = new THREE.Mesh(hadalFloorGeo, deepBasaltMat);
  hadalFloor.position.set(-1.5, hadalFloorY, -67.5);
  hadalGroup.add(hadalFloor);

  // Towering Cathedral Buttresses framing the distant Hadal rift
  const buttressL = new THREE.Mesh(seaStackGeo, deepBasaltMat);
  buttressL.position.set(-12.5, -158.0, -70.5);
  buttressL.scale.set(1.75, 1.45, 1.65);
  const buttressR = new THREE.Mesh(seaStackGeo, deepBasaltMat);
  buttressR.position.set(11.5, -157.5, -73.0);
  buttressR.scale.set(1.85, 1.5, 1.75);
  hadalGroup.add(buttressL, buttressR);

  // Luminous Cold-Seep Fissure Core & Crystalline Carbonate Vents
  const fissureUniforms = {
    uTime: { value: 0 },
    uReveal: { value: 1.0 },
  };

  const fissureCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.2, -167.4, -62.5),
    new THREE.Vector3(-0.6, -167.5, -66.8),
    new THREE.Vector3(-2.4, -167.3, -71.8),
    new THREE.Vector3(-0.5, -167.1, -77.5),
  ]);
  const fissureGeo = new THREE.TubeGeometry(fissureCurve, 36, 1.05, 12, false);
  fissureGeo.scale(1.65, 0.35, 1.0);
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
        float pulse = 0.82 + 0.18 * sin(uTime * 1.4 - vUv.x * 8.0);
        vec3 col = mix(vec3(0.08, 0.48, 0.72), vec3(0.55, 0.94, 1.0), pow(core, 2.0));
        gl_FragColor = vec4(col, core * endFade * pulse * 0.82 * uReveal);
      }
    `,
  });
  disposableMaterials.push(fissureMat);
  const fissureMesh = new THREE.Mesh(fissureGeo, fissureMat);
  hadalGroup.add(fissureMesh);

  // Subtle Volumetric Cold-Seep Plume Curtains rising gently from the fissure
  const plumeGeo = new THREE.CylinderGeometry(1.8, 0.55, 11.5, 16, 1, true);
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
        float fres = pow(abs(dot(vN, vV)), 1.7);
        float vMask = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.15, vUv.y);
        float wave = 0.75 + 0.25 * sin(uTime * 1.1 - vUv.y * 6.0 + vUv.x * 6.28);
        vec3 col = vec3(0.22, 0.76, 0.95);
        gl_FragColor = vec4(col, fres * vMask * wave * 0.26 * uReveal);
      }
    `,
  });
  disposableMaterials.push(plumeMat);

  for (let k = 0; k < 3; k++) {
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.set(-1.5 + (k - 1) * 1.8, -161.8, -65.2 - k * 3.8);
    hadalGroup.add(plume);
  }

  // Localized Hadal Cold-Seep PointLight (unshadowed, physical falloff)
  const hadalSeepLight = new THREE.PointLight(0x4be3fa, 4.2, 30, 1.7);
  hadalSeepLight.position.set(-1.2, -162.5, -65.5);
  hadalGroup.add(hadalSeepLight);

  // ============================================================================
  // GLOBAL SPATIAL MARINE SNOW & PLANKTON VOLUME (ALL 8 CHAPTERS)
  // ============================================================================
  const snowCount = profile.snowCount;
  const snowPositions = new Float32Array(snowCount * 3);
  const snowBasePositions = new Float32Array(snowCount * 3);
  const snowSeeds = new Float32Array(snowCount);

  for (let i = 0; i < snowCount; i++) {
    const tCurve = deterministicHash(i * 7 + 3);
    // Distribute in a spatial cylinder surrounding the descent trajectory
    const py = 4.0 - tCurve * 176.0;
    const approxZ = -tCurve * 64.0 + (deterministicHash(i * 7 + 5) - 0.5) * 22.0;
    const approxX = (deterministicHash(i * 7 + 9) - 0.5) * 24.0;

    snowBasePositions[i * 3] = approxX;
    snowBasePositions[i * 3 + 1] = py;
    snowBasePositions[i * 3 + 2] = approxZ;

    snowPositions[i * 3] = approxX;
    snowPositions[i * 3 + 1] = py;
    snowPositions[i * 3 + 2] = approxZ;
    snowSeeds[i] = deterministicHash(i * 13 + 11) * Math.PI * 2;
  }

  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
  disposableGeometries.push(snowGeo);

  const snowMat = new THREE.PointsMaterial({
    size: 0.14,
    map: textures.particleMap,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  disposableMaterials.push(snowMat);

  const snowPoints = new THREE.Points(snowGeo, snowMat);
  snowPoints.frustumCulled = false;
  root.add(snowPoints);

  // Scratch vectors for zero-GC per-frame updates
  const _schoolTarget = new THREE.Vector3();

  const update = (
    elapsedTime: number,
    progress: number,
    atmosphere: BlendedAtmosphere,
    reducedMotion: boolean,
  ) => {
    const animTime = reducedMotion ? elapsedTime * 0.25 : elapsedTime;

    surfaceUniforms.uTime.value = animTime;
    surfaceUniforms.uStrength.value = atmosphere.causticStrength;
    ceilingMesh.visible = atmosphere.causticStrength > 0.01;

    shaftUniforms.uTime.value = animTime;
    shaftUniforms.uOpacity.value = atmosphere.sunShaftOpacity;
    sunShaftGroup.visible = atmosphere.sunShaftOpacity > 0.005;

    kelpUniforms.uTime.value = animTime;
    schoolSwimUniforms.uTime.value = elapsedTime;

    // Update rising surface bubbles
    if (progress < 0.28) {
      bubbleInstances.visible = true;
      for (let i = 0; i < bubbleCount; i++) {
        const seed = deterministicHash(i * 5 + 3);
        const bx = (deterministicHash(i * 5 + 1) - 0.5) * 9.5;
        const bz = -1.5 - deterministicHash(i * 5 + 2) * 10.5;
        const cycle = ((animTime * (0.45 + seed * 0.35) + seed * 12.0) % 14.0);
        const by = -9.5 + cycle;
        const bScale = 0.65 + 0.55 * Math.sin(animTime * 2.5 + i);
        _dummy.position.set(bx, by, bz);
        _dummy.scale.setScalar(bScale);
        _dummy.updateMatrix();
        bubbleInstances.setMatrixAt(i, _dummy.matrix);
      }
      bubbleInstances.instanceMatrix.needsUpdate = true;
    } else {
      bubbleInstances.visible = false;
    }

    // Update pelagic snapper school orbits along smooth elliptical trajectories
    if (schoolNodes.length > 0 && progress < 0.58) {
      schoolGroup.visible = true;
      for (let i = 0; i < schoolNodes.length; i++) {
        const ag = schoolAgents[i];
        const node = schoolNodes[i];
        const ang = animTime * ag.speed + ag.phase;
        const nx = ag.anchor.x + Math.cos(ang) * ag.orbitRadiusX;
        const nz = ag.anchor.z + Math.sin(ang) * ag.orbitRadiusZ;
        const ny = ag.anchor.y + Math.sin(ang * 2.0 + ag.phase) * 0.55;

        const nextAng = ang + 0.05;
        _schoolTarget.set(
          ag.anchor.x + Math.cos(nextAng) * ag.orbitRadiusX,
          ag.anchor.y + Math.sin(nextAng * 2.0 + ag.phase) * 0.55,
          ag.anchor.z + Math.sin(nextAng) * ag.orbitRadiusZ,
        );

        node.position.set(nx, ny, nz);
        node.lookAt(_schoolTarget);
      }
    } else {
      schoolGroup.visible = false;
    }

    // Update bioluminescent jellies gentle bell contraction & drift
    jellyBellMat.emissiveIntensity = 0.35 + atmosphere.bioGlowIntensity * 0.85;
    jellyCoreMat.emissiveIntensity = 0.65 + atmosphere.bioGlowIntensity * 1.25;

    for (let j = 0; j < jellyAgents.length; j++) {
      const ja = jellyAgents[j];
      const pulse = Math.sin(animTime * ja.pulseSpeed + ja.phase);
      ja.group.position.y = ja.basePos.y + pulse * 0.32;
      ja.group.position.x = ja.basePos.x + Math.cos(animTime * 0.4 + ja.phase) * 0.22;
      const bellContraction = 1.0 + pulse * 0.08;
      ja.group.children[0].scale.set(bellContraction, 1.0 - pulse * 0.07, bellContraction);
    }

    // Update Hadal fissure reveal intensity smoothly in Chapters 07 -> 08
    const hadalFactor = THREE.MathUtils.smoothstep(progress, 0.78, 0.93);
    fissureUniforms.uTime.value = animTime;
    fissureUniforms.uReveal.value = 0.25 + hadalFactor * 0.85;
    hadalSeepLight.intensity = 1.2 + hadalFactor * 3.4;

    // Update marine snow drift & color attenuation
    snowMat.color.setRGB(
      atmosphere.particleColor[0],
      atmosphere.particleColor[1],
      atmosphere.particleColor[2],
    );
    snowMat.opacity = atmosphere.particleOpacity;

    if (!reducedMotion) {
      const posAttr = snowGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < snowCount; i++) {
        const s = snowSeeds[i];
        const bx = snowBasePositions[i * 3];
        const by = snowBasePositions[i * 3 + 1];
        const bz = snowBasePositions[i * 3 + 2];
        posAttr.setXYZ(
          i,
          bx + Math.sin(elapsedTime * 0.32 + s) * 0.38,
          by + Math.cos(elapsedTime * 0.24 + s * 1.3) * 0.42,
          bz + Math.sin(elapsedTime * 0.28 + s * 0.7) * 0.34,
        );
      }
      posAttr.needsUpdate = true;
    }
  };

  const dispose = () => {
    disposableGeometries.forEach((g) => g.dispose());
    disposableMaterials.forEach((m) => m.dispose());
  };

  return {
    root,
    attachSchoolModel,
    update,
    dispose,
  };
}
