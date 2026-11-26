import * as THREE from './engine.js';
import { RUNWAY_FAR, RUNWAY_HALF_WIDTH, RUNWAY_NEAR, RUNWAY_Y, SEED } from './config.js';
import { clamp, createRandom, fbm, lerp, smoothstep } from './random.js';

const SKY_PRESETS = {
  dawn: {
    top: 0x16365f,
    bottom: 0xffb682,
    sun: 0xffd7a6,
    fog: 0xd7a98c,
    sunDir: [-0.55, 0.22, -0.8],
    hemiSky: 0xffd6b0,
    hemiGround: 0x4a5d54,
    sunPower: 2.3,
  },
  day: {
    top: 0x2c76b7,
    bottom: 0xd6ecf5,
    sun: 0xfff3d2,
    fog: 0xbcd7e5,
    sunDir: [-0.35, 0.68, -0.62],
    hemiSky: 0xd9f0ff,
    hemiGround: 0x5d6b55,
    sunPower: 2.6,
  },
  storm: {
    top: 0x1d2b3c,
    bottom: 0x6c7e8d,
    sun: 0xbccbd5,
    fog: 0x7f919e,
    sunDir: [0.4, 0.32, -0.85],
    hemiSky: 0x9fb5c4,
    hemiGround: 0x3c4b4c,
    sunPower: 1.25,
  },
};

function makeCanvasTexture(draw, width = 256, height = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeLabelTexture(text, accent) {
  return makeCanvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(5,18,28,0.82)';
    ctx.beginPath();
    ctx.roundRect(8, 30, w - 16, h - 56, 18);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#e9f8ff';
    ctx.font = 'bold 62px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

function terrainColor(height, x, z, mission, random) {
  const color = new THREE.Color();
  const warm = mission.id === 'canyon';
  const storm = mission.sky === 'storm';
  if (height < 1.2) color.setHex(warm ? 0xd0a47a : storm ? 0x8f9b91 : 0xe0d0a6);
  else if (height < 5) color.setHex(warm ? 0xc48c5c : 0xb8b083);
  else if (height < 20) {
    const t = clamp((height - 5) / 15, 0, 1);
    color.setHex(warm ? 0x94492f : storm ? 0x3d5b4f : 0x4c8057).lerp(new THREE.Color(warm ? 0xc47643 : storm ? 0x5b7461 : 0x78a562), t);
  } else if (height < 58) {
    const t = clamp((height - 20) / 38, 0, 1);
    color.setHex(warm ? 0xa85532 : storm ? 0x536363 : 0x687969).lerp(new THREE.Color(warm ? 0xe0a066 : storm ? 0x7c8b87 : 0x9a9b84), t);
  } else {
    color.setHex(warm ? 0xd9b08a : 0xa9b5b2).lerp(new THREE.Color(0xeef3f0), clamp((height - 62) / 52, 0, 1));
  }
  if (warm && height > 12 && height < 60) {
    const strata = 0.94 + Math.abs(Math.sin(height * 0.34 + x * 0.004)) * 0.12;
    color.multiplyScalar(strata);
  }
  const jitter = 0.93 + random() * 0.14;
  color.multiplyScalar(jitter);
  return color;
}

export function createWorld(scene, mission, missionIndex, seedValue = SEED) {
  const root = new THREE.Group();
  scene.add(root);
  const seed = seedValue + missionIndex * 137;
  const preset = SKY_PRESETS[mission.sky] ?? SKY_PRESETS.day;
  const random = createRandom(seed * 7919);

  scene.fog = new THREE.FogExp2(preset.fog, mission.sky === 'storm' ? 0.00092 : mission.sky === 'dawn' ? 0.00042 : 0.00058);
  scene.background = new THREE.Color(preset.fog);

  const skyUniforms = {
    topColor: { value: new THREE.Color(preset.top) },
    bottomColor: { value: new THREE.Color(preset.bottom) },
    sunColor: { value: new THREE.Color(preset.sun) },
    sunDirection: { value: new THREE.Vector3(...preset.sunDir).normalize() },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 16),
    new THREE.ShaderMaterial({
      uniforms: skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * uModelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 bottomColor; uniform vec3 sunColor; uniform vec3 sunDirection;
        varying vec3 vDir;
        void main(){
          vec3 dir = normalize(vDir);
          float h = smoothstep(-0.18, 0.7, dir.y);
          vec3 col = mix(bottomColor, topColor, h);
          float sun = pow(max(0.0, dot(dir, normalize(sunDirection))), 140.0);
          float glow = pow(max(0.0, dot(dir, normalize(sunDirection))), 8.0) * 0.18;
          col += sunColor * (sun * 1.5 + glow);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  sky.position.set(0, 0, -350);
  sky.frustumCulled = false;
  root.add(sky);

  const hemi = new THREE.HemisphereLight(preset.hemiSky, preset.hemiGround, 1.35);
  root.add(hemi);
  const sun = new THREE.DirectionalLight(preset.sun, preset.sunPower);
  sun.position.set(preset.sunDir[0] * 400, preset.sunDir[1] * 400 + 100, preset.sunDir[2] * 400 - 250);
  root.add(sun);
  root.add(new THREE.AmbientLight(0x8fa9b5, 0.35));

  const gatePath = [[0, RUNWAY_NEAR], ...mission.rings.map(([x, , z]) => [x, z]), [0, -920]];
  function guideX(z) {
    if (z >= gatePath[0][1]) return gatePath[0][0];
    for (let i = 0; i < gatePath.length - 1; i += 1) {
      const [x0, z0] = gatePath[i];
      const [x1, z1] = gatePath[i + 1];
      if (z <= z0 && z >= z1) return lerp(x0, x1, (z0 - z) / (z0 - z1));
    }
    return gatePath[gatePath.length - 1][0];
  }

  function shorelineX(z) {
    return 310 + 48 * Math.sin(z * 0.0062) + 22 * Math.sin(z * 0.017);
  }

  function heightAt(x, z) {
    const large = fbm(x * 0.0031, z * 0.0031, seed, 4);
    const detail = fbm(x * 0.013, z * 0.013, seed + 31, 3);
    const ridge = fbm(x * 0.0022 + 8, z * 0.0022 - 3, seed + 73, 3);
    let h = -2.5 + large * 22 + detail * 7;
    const dist = Math.hypot(x * 0.92, (z + 330) * 0.78);
    h += smoothstep(250, 700, dist) * ridge * 54;
    h -= smoothstep(540, 880, dist) * 20;
    const canyon = mission.id === 'canyon';
    if (canyon) {
      const offset = Math.abs(x - guideX(z));
      const floor = 9 + fbm(x * 0.012, z * 0.012, seed + 211, 3) * 10;
      h = lerp(h, floor, (1 - smoothstep(85, 165, offset)) * 0.92);
      h += smoothstep(120, 245, offset) * (1 - smoothstep(330, 460, offset)) * (22 + ridge * 52);
    } else {
      const shoreline = shorelineX(z);
      const sea = smoothstep(shoreline - 20, shoreline + 120, x);
      h -= sea * 24;
      h += (1 - smoothstep(40, 110, Math.abs(x - shoreline))) * 1.6;
      const bay = 1 - smoothstep(60, 190, Math.hypot(x - 210, (z + 390) * 0.7));
      h -= bay * 9;
    }
    const riverX = 105 + 38 * Math.sin(z * 0.0085) + 13 * Math.sin(z * 0.021);
    const river = 1 - smoothstep(7, 26, Math.abs(x - riverX));
    h -= river * 10;
    const flatX = 1 - smoothstep(25, 62, Math.abs(x));
    const flatZ = 1 - smoothstep(122, 176, Math.abs(z + 34));
    h = lerp(h, RUNWAY_Y, flatX * flatZ);
    return h;
  }

  const size = 1500;
  const segments = 132;
  const positions = new Float32Array((segments + 1) * (segments + 1) * 3);
  const colors = new Float32Array(positions.length);
  const indices = [];
  let vi = 0;
  for (let j = 0; j <= segments; j += 1) {
    const z = -350 - size / 2 + (j / segments) * size;
    for (let i = 0; i <= segments; i += 1) {
      const x = -size / 2 + (i / segments) * size;
      const h = heightAt(x, z);
      positions[vi] = x;
      positions[vi + 1] = h;
      positions[vi + 2] = z;
      const c = terrainColor(h, x, z, mission, random);
      colors[vi] = c.r;
      colors[vi + 1] = c.g;
      colors[vi + 2] = c.b;
      vi += 3;
    }
  }
  for (let j = 0; j < segments; j += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = j * (segments + 1) + i;
      const b = a + 1;
      const c = a + segments + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const terrainGeometry = new THREE.BufferGeometry();
  terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeometry.setIndex(indices);
  terrainGeometry.computeVertexNormals();
  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.96, metalness: 0 }),
  );
  root.add(terrain);

  const waterSegments = 34;
  const waterGeometry = new THREE.PlaneGeometry(1600, 1700, waterSegments, waterSegments);
  waterGeometry.rotateX(-Math.PI / 2);
  const waterBase = Float32Array.from(waterGeometry.attributes.position.array);
  const water = new THREE.Mesh(
    waterGeometry,
    new THREE.MeshPhongMaterial({
      color: mission.sky === 'storm' ? 0x2e596b : 0x2b7e9c,
      specular: 0xc9f2ff,
      shininess: 80,
      transparent: true,
      opacity: 0.93,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
  water.position.set(0, 0.15, -350);
  root.add(water);

  function ribbon(points, width, offset, material) {
    const verts = [];
    const idx = [];
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next[0] - prev[0];
      const dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * width * 0.5;
      const nz = (dx / len) * width * 0.5;
      const y = heightAt(p[0], p[1]) + offset;
      verts.push(p[0] - nx, y, p[1] - nz, p[0] + nx, y, p[1] + nz);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setIndex(idx);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    root.add(mesh);
    return mesh;
  }

  function flatRibbon(points, width, y, material) {
    const verts = [];
    const idx = [];
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next[0] - prev[0];
      const dz = next[1] - prev[1];
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * width * 0.5;
      const nz = (dx / len) * width * 0.5;
      verts.push(p[0] - nx, y, p[1] - nz, p[0] + nx, y, p[1] + nz);
      if (i > 0) {
        const a = (i - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.setIndex(idx);
    geometry.computeVertexNormals();
    root.add(new THREE.Mesh(geometry, material));
  }

  const riverPoints = [];
  for (let z = -940; z <= 250; z += 12) {
    riverPoints.push([105 + 38 * Math.sin(z * 0.0085) + 13 * Math.sin(z * 0.021), z]);
  }
  flatRibbon(riverPoints, 13, 0.42, new THREE.MeshBasicMaterial({ color: 0x3c9fbd, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }));
  if (mission.id !== 'canyon') {
    const shorePoints = [];
    for (let z = -940; z <= 250; z += 14) shorePoints.push([shorelineX(z), z]);
    flatRibbon(shorePoints, 6, 0.48, new THREE.MeshBasicMaterial({ color: 0xf2e6c8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  }

  const roadPoints = [];
  for (let z = -940; z <= 250; z += 14) {
    roadPoints.push([-205 + 34 * Math.sin(z * 0.0105) + 12 * Math.sin(z * 0.031), z]);
  }
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x3b4144, roughness: 1, side: THREE.DoubleSide });
  ribbon(roadPoints, 8, 0.35, roadMaterial);
  const spur = [];
  for (let t = 0; t <= 1; t += 0.04) {
    const z = -325 + t * 120;
    spur.push([-205 + 34 * Math.sin(z * 0.0105) + t * 120, z]);
  }
  ribbon(spur, 5.5, 0.32, roadMaterial);
  const roadDashes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.5, 0.12, 4.5),
    new THREE.MeshBasicMaterial({ color: 0xe8c57a }),
    100,
  );
  const roadDummy = new THREE.Object3D();
  let dashCount = 0;
  for (let z = -920; z <= 240 && dashCount < 100; z += 12) {
    const x = -205 + 34 * Math.sin(z * 0.0105) + 12 * Math.sin(z * 0.031);
    roadDummy.position.set(x, heightAt(x, z) + 0.42, z);
    roadDummy.scale.setScalar(1);
    roadDummy.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
    roadDummy.updateMatrix();
    roadDashes.setMatrixAt(dashCount, roadDummy.matrix);
    dashCount += 1;
  }
  roadDashes.count = dashCount;
  roadDashes.instanceMatrix.needsUpdate = true;
  root.add(roadDashes);

  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
  const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true });
  const buildings = new THREE.InstancedMesh(buildingGeometry, buildingMaterial, 120);
  const dummy = new THREE.Object3D();
  let buildingCount = 0;
  const towns = [
    [-255, -325, 18],
    [242, -540, 14],
    [-170, -780, 11],
    [300, -215, 9],
  ];
  for (const [cx, cz, count] of towns) {
    for (let i = 0; i < count && buildingCount < 120; i += 1) {
      const x = cx + random.range(-52, 52);
      const z = cz + random.range(-48, 48);
      const h = heightAt(x, z);
      if (h < 2 || h > 45) continue;
      const w = random.range(5, 13);
      const d = random.range(5, 13);
      const bh = random.range(5, 20);
      dummy.position.set(x, h + bh / 2, z);
      dummy.scale.set(w, bh, d);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(-0.2, 0.2), 0));
      dummy.updateMatrix();
      buildings.setMatrixAt(buildingCount, dummy.matrix);
      const shade = mission.sky === 'day' ? 0.72 + random() * 0.28 : 0.6 + random() * 0.3;
      buildings.setColorAt(buildingCount, new THREE.Color(0x9fb0b8).multiplyScalar(shade));
      buildingCount += 1;
    }
  }
  buildings.count = buildingCount;
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  root.add(buildings);

  if (mission.id !== 'canyon') {
    const pierMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4d36, roughness: 0.92, flatShading: true });
    for (const z of [-620, -490, -360, -230]) {
      const start = shorelineX(z) - 8;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(62, 1.4, 9), pierMaterial);
      pier.position.set(start + 31, 1.1, z);
      root.add(pier);
      for (let i = 0; i < 3; i += 1) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 5, 6), pierMaterial);
        post.position.set(start + 14 + i * 18, -0.6, z + 4);
        root.add(post);
      }
    }
    const lighthouse = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.8, 22, 8), new THREE.MeshStandardMaterial({ color: 0xe8ece6, roughness: 0.8, flatShading: true }));
    lighthouse.position.set(shorelineX(-410) - 14, 14, -410);
    root.add(lighthouse);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 3, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    beacon.position.set(lighthouse.position.x, 27, -410);
    root.add(beacon);
  }

  const treeCount = 900;
  const foliage = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.6, 8, 5),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }),
    treeCount,
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.3, 0.42, 2.4, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b4b32, roughness: 1, flatShading: true }),
    treeCount,
  );
  const treeShadows = new THREE.InstancedMesh(
    new THREE.CircleGeometry(2.6, 6),
    new THREE.MeshBasicMaterial({ color: 0x0a1718, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    treeCount,
  );
  let treeIndex = 0;
  for (let attempt = 0; attempt < treeCount * 4 && treeIndex < treeCount; attempt += 1) {
    const x = random.range(-610, 610);
    const z = random.range(-1010, 260);
    const h = heightAt(x, z);
    if (h < 2.2 || h > 39) continue;
    if (Math.abs(x) < 72 && z > -190 && z < 120) continue;
    if (Math.abs(x) < 34 && z < -180) continue;
    const scale = random.range(0.72, 1.45);
    dummy.position.set(x, h + 0.1, z);
    dummy.scale.setScalar(scale);
    dummy.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    dummy.updateMatrix();
    treeShadows.setMatrixAt(treeIndex, dummy.matrix);
    dummy.position.set(x, h + 4.1 * scale, z);
    dummy.scale.setScalar(scale);
    dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(0, Math.PI * 2), 0));
    dummy.updateMatrix();
    foliage.setMatrixAt(treeIndex, dummy.matrix);
    foliage.setColorAt(treeIndex, new THREE.Color(mission.sky === 'day' ? 0x3d6f4b : 0x365e4b).multiplyScalar(0.8 + random() * 0.4));
    dummy.position.y = h + 1.15 * scale;
    dummy.updateMatrix();
    trunks.setMatrixAt(treeIndex, dummy.matrix);
    treeIndex += 1;
  }
  foliage.count = treeIndex;
  trunks.count = treeIndex;
  treeShadows.count = treeIndex;
  foliage.instanceMatrix.needsUpdate = true;
  trunks.instanceMatrix.needsUpdate = true;
  treeShadows.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  root.add(foliage, trunks, treeShadows);

  const peakCount = 34;
  const peaks = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1, 1, 5),
    new THREE.MeshStandardMaterial({ color: 0x8797a0, roughness: 1, flatShading: true }),
    peakCount,
  );
  for (let i = 0; i < peakCount; i += 1) {
    const angle = (i / peakCount) * Math.PI * 2 + random.range(-0.08, 0.08);
    const radius = random.range(720, 880);
    const x = Math.cos(angle) * radius;
    const z = -340 + Math.sin(angle) * radius * 0.92;
    const h = random.range(70, 155);
    dummy.position.set(x, h / 2 - 8, z);
    dummy.scale.set(random.range(45, 85), h, random.range(45, 85));
    dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(0, 6), 0));
    dummy.updateMatrix();
    peaks.setMatrixAt(i, dummy.matrix);
    peaks.setColorAt(i, new THREE.Color(0x8b9aa6).multiplyScalar(0.8 + random() * 0.3));
  }
  peaks.instanceMatrix.needsUpdate = true;
  if (peaks.instanceColor) peaks.instanceColor.needsUpdate = true;
  root.add(peaks);

  const runwayLength = RUNWAY_NEAR - RUNWAY_FAR;
  const runwayCenter = (RUNWAY_NEAR + RUNWAY_FAR) / 2;
  const asphalt = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY_HALF_WIDTH * 2, 0.6, runwayLength),
    new THREE.MeshStandardMaterial({ color: 0x303740, roughness: 0.95 }),
  );
  asphalt.position.set(0, RUNWAY_Y + 0.15, runwayCenter);
  root.add(asphalt);

  const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xe9f4f4 });
  const dashGeometry = new THREE.BoxGeometry(1.2, 0.08, 9);
  for (let z = RUNWAY_FAR + 22; z < RUNWAY_NEAR - 18; z += 21) {
    const dash = new THREE.Mesh(dashGeometry, markingMaterial);
    dash.position.set(0, RUNWAY_Y + 0.48, z);
    root.add(dash);
  }
  const stripeGeometry = new THREE.BoxGeometry(0.8, 0.08, runwayLength - 10);
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(stripeGeometry, markingMaterial);
    stripe.position.set(side * (RUNWAY_HALF_WIDTH - 1.8), RUNWAY_Y + 0.48, runwayCenter);
    root.add(stripe);
  }
  for (const end of [RUNWAY_FAR + 10, RUNWAY_NEAR - 10]) {
    for (let i = -3; i <= 3; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.09, 7), markingMaterial);
      bar.position.set(i * 4.7, RUNWAY_Y + 0.49, end);
      root.add(bar);
    }
  }
  const numberTexture = makeCanvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#eaf5f4';
    ctx.font = 'bold 118px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('09', w / 2, h / 2);
  }, 256, 256);
  const numberPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({ map: numberTexture, transparent: true, depthWrite: false }),
  );
  numberPlane.rotation.x = -Math.PI / 2;
  numberPlane.position.set(0, RUNWAY_Y + 0.52, RUNWAY_NEAR - 36);
  root.add(numberPlane);
  const farNumber = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshBasicMaterial({ map: numberTexture, transparent: true, depthWrite: false }),
  );
  farNumber.rotation.x = -Math.PI / 2;
  farNumber.rotation.z = Math.PI;
  farNumber.position.set(0, RUNWAY_Y + 0.53, RUNWAY_FAR + 38);
  root.add(farNumber);

  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(64, 0.4, 106),
    new THREE.MeshStandardMaterial({ color: 0x404b50, roughness: 0.96 }),
  );
  apron.position.set(-58, RUNWAY_Y + 0.04, -25);
  root.add(apron);
  const taxiway = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.4, 154),
    new THREE.MeshStandardMaterial({ color: 0x353e44, roughness: 0.96 }),
  );
  taxiway.position.set(-34, RUNWAY_Y + 0.07, -8);
  root.add(taxiway);
  const taxiLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.08, 148),
    new THREE.MeshBasicMaterial({ color: 0xe0b765 }),
  );
  taxiLine.position.set(-34, RUNWAY_Y + 0.29, -8);
  root.add(taxiLine);

  const lightGeometry = new THREE.SphereGeometry(0.55, 6, 5);
  const lightMaterialA = new THREE.MeshBasicMaterial({ color: 0x7ef0ff });
  const lightMaterialB = new THREE.MeshBasicMaterial({ color: 0xffb15c });
  for (let z = RUNWAY_FAR; z <= RUNWAY_NEAR; z += 18) {
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(lightGeometry, z % 36 === 0 ? lightMaterialA : lightMaterialB);
      light.position.set(side * (RUNWAY_HALF_WIDTH + 1.6), RUNWAY_Y + 0.6, z);
      root.add(light);
    }
  }
  const approachPositions = [];
  for (let z = RUNWAY_FAR - 12; z > RUNWAY_FAR - 150; z -= 16) {
    approachPositions.push([0, z]);
    for (const side of [-1, 1]) approachPositions.push([side * 13, z]);
  }
  const approachLights = new THREE.InstancedMesh(
    lightGeometry,
    new THREE.MeshBasicMaterial({ color: 0xffd79a }),
    approachPositions.length,
  );
  for (let i = 0; i < approachPositions.length; i += 1) {
    const [x, z] = approachPositions[i];
    dummy.position.set(x, RUNWAY_Y + 0.55, z);
    dummy.scale.setScalar(0.7);
    dummy.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
    dummy.updateMatrix();
    approachLights.setMatrixAt(i, dummy.matrix);
  }
  approachLights.instanceMatrix.needsUpdate = true;
  root.add(approachLights);

  const windsockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 11, 6), new THREE.MeshStandardMaterial({ color: 0xb9c6c5, roughness: 0.7 }));
  windsockPole.position.set(35, RUNWAY_Y + 5.5, 54);
  root.add(windsockPole);
  const windsock = new THREE.Mesh(new THREE.ConeGeometry(1.2, 5, 7, 1, true), new THREE.MeshStandardMaterial({ color: 0xff8a50, emissive: 0x51200d, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
  windsock.rotation.z = Math.PI / 2;
  windsock.position.set(38, RUNWAY_Y + 10.4, 54);
  root.add(windsock);

  const hangarMaterial = new THREE.MeshStandardMaterial({ color: 0x537080, roughness: 0.8, flatShading: true });
  for (let i = 0; i < 3; i += 1) {
    const hangar = new THREE.Mesh(new THREE.BoxGeometry(24, 11, 30), hangarMaterial);
    hangar.position.set(-58, RUNWAY_Y + 5.5, 20 - i * 34);
    root.add(hangar);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(18, 7, 4), new THREE.MeshStandardMaterial({ color: 0x2f4b5a, flatShading: true }));
    roof.rotation.y = Math.PI / 4;
    roof.position.set(-58, RUNWAY_Y + 17, 20 - i * 34);
    root.add(roof);
    for (const side of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 0.4), new THREE.MeshStandardMaterial({ color: 0x243a45, roughness: 0.85 }));
      door.position.set(-58 + side * 6, RUNWAY_Y + 4.2, 35.3 - i * 34);
      root.add(door);
    }
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 5, 28, 6), hangarMaterial);
  tower.position.set(54, RUNWAY_Y + 14, 5);
  root.add(tower);
  const towerTop = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 4, 6), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0x6b4814, emissiveIntensity: 0.7 }));
  towerTop.position.set(54, RUNWAY_Y + 30, 5);
  root.add(towerTop);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const window = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x9ceaff }));
    window.position.set(54 + Math.sin(angle) * 6.6, RUNWAY_Y + 30, 5 + Math.cos(angle) * 6.6);
    window.rotation.y = angle;
    root.add(window);
  }

  const storm = mission.sky === 'storm';
  const cloudMaterials = storm
    ? [0x566774, 0x6d7d88, 0x83919a].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, transparent: true, opacity: 0.88 }))
    : [0xeaf2f2, 0xffffff, 0xd8e7ea].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true, transparent: true, opacity: 0.78 }));
  const cloudGeometry = new THREE.IcosahedronGeometry(1, 0);
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    const group = new THREE.Group();
    const baseX = random.range(-620, 620);
    const baseZ = random.range(-980, 220);
    const baseY = storm ? random.range(64, 105) : random.range(110, 190);
    const puffs = storm ? 7 : 5;
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(cloudGeometry, cloudMaterials[p % cloudMaterials.length]);
      puff.position.set(random.range(-20, 20), random.range(-5, 6), random.range(-14, 14));
      const s = random.range(11, storm ? 26 : 23);
      puff.scale.set(s * 1.6, s * 0.5, s);
      group.add(puff);
    }
    group.position.set(baseX, baseY, baseZ);
    group.userData.speed = random.range(1.2, 3.4);
    group.userData.baseY = baseY;
    clouds.push(group);
    root.add(group);
  }

  const ringGroups = [];
  const ringColor = mission.sky === 'storm' ? 0xffbe63 : mission.sky === 'day' ? 0x7be7ff : 0xffd783;
  const ringDefinitions = mission.rings;
  for (let i = 0; i < ringDefinitions.length; i += 1) {
    const [x, y, z] = ringDefinitions[i];
    const previous = i === 0 ? [0, RUNWAY_Y + 18, RUNWAY_NEAR - 40] : ringDefinitions[i - 1];
    const normal = new THREE.Vector3(previous[0] - x, previous[1] - y, previous[2] - z).normalize();
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.lookAt(previous[0], previous[1], previous[2]);
    const radius = (mission.ringScale ?? 1) * (mission.sky === 'day' ? 13 : 15);
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 1.05, 7, 28),
      new THREE.MeshStandardMaterial({ color: 0x20323d, emissive: ringColor, emissiveIntensity: 0.55, roughness: 0.5, metalness: 0.25 }),
    );
    group.add(torus);
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(radius - 1.8, 0.24, 5, 28),
      new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.8 }),
    );
    group.add(inner);
    for (let b = 0; b < 4; b += 1) {
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.85, 6, 5), new THREE.MeshBasicMaterial({ color: ringColor }));
      const angle = (b / 4) * Math.PI * 2;
      beacon.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      beacon.userData.angle = angle;
      group.add(beacon);
    }
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeLabelTexture(String(i + 1).padStart(2, '0'), '#6de3ff'), transparent: true, depthWrite: false }),
    );
    label.position.set(0, radius + 8, 0);
    label.scale.set(13, 6.5, 1);
    group.add(label);
    root.add(group);
    ringGroups.push({
      group,
      center: new THREE.Vector3(x, y, z),
      normal,
      radius,
      torus,
      inner,
      label,
      passed: false,
      home: new THREE.Vector3(x, y, z),
    });
  }

  const startPad = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  startPad.rotation.x = -Math.PI / 2;
  startPad.position.set(0, RUNWAY_Y + 0.55, RUNWAY_NEAR - 28);
  root.add(startPad);

  let waterTime = 0;

  return {
    root,
    rings: ringGroups,
    heightAt,
    preset,
    update(dt, time, cameraPos) {
      waterTime += dt;
      const attribute = waterGeometry.attributes.position;
      for (let i = 0; i < attribute.count; i += 1) {
        const x = waterBase[i * 3];
        const z = waterBase[i * 3 + 2];
        attribute.array[i * 3 + 1] = Math.sin(x * 0.032 + waterTime * 0.8) * 0.42 + Math.cos(z * 0.026 - waterTime * 0.55) * 0.32;
      }
      attribute.needsUpdate = true;
      if (Math.floor(time * 8) % 2 === 0) waterGeometry.computeVertexNormals();
      if (storm) {
        const flash = Math.max(0, Math.sin(time * 0.83 + 1.7)) ** 24;
        hemi.intensity = 1.35 + flash * 1.7;
        sun.intensity = preset.sunPower + flash * 0.9;
      }
      for (const cloud of clouds) {
        cloud.position.x += cloud.userData.speed * dt;
        if (cloud.position.x > 700) cloud.position.x = -700;
        cloud.position.y = cloud.userData.baseY + Math.sin(time * 0.25 + cloud.position.z) * 2.5;
      }
      for (let i = 0; i < ringGroups.length; i += 1) {
        const ring = ringGroups[i];
        ring.group.position.y = ring.home.y + Math.sin(time * 1.1 + i) * 0.8;
        ring.center.copy(ring.group.position);
        const isNext = ringGroups.findIndex((r) => !r.passed) === i;
        const pulse = isNext ? 1 + Math.sin(time * 3) * 0.035 : 1;
        ring.group.scale.setScalar(pulse);
        ring.torus.material.emissiveIntensity = ring.passed ? 0.12 : isNext ? 1.25 + Math.sin(time * 4) * 0.2 : 0.5;
        ring.inner.material.opacity = ring.passed ? 0.12 : isNext ? 0.95 : 0.35;
        ring.label.material.opacity = ring.passed ? 0.28 : isNext ? 1 : 0.6;
        for (const child of ring.group.children) {
          if (child.userData.angle !== undefined) {
            const a = child.userData.angle + time * (isNext ? 1.8 : 0.5);
            const r = ring.radius;
            child.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
          }
        }
      }
      sky.position.set(cameraPos.x, cameraPos.y, cameraPos.z - 350);
    },
    setPassed(index, value) {
      const ring = ringGroups[index];
      if (ring) ring.passed = value;
    },
    resetRings() {
      for (const ring of ringGroups) ring.passed = false;
    },
    destroy() {
      scene.remove(root);
      root.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (material.map) material.map.dispose();
            material.dispose();
          }
        }
      });
    },
  };
}
