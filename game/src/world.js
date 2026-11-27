import * as THREE from './engine.js';
import { RUNWAY_NEAR, RUNWAY_Y, SEED } from './config.js';
import { clamp, createRandom, fbm, lerp, smoothstep } from './random.js';
import {
  makeBroadleafGeometry, makeConiferGeometry, makeGlowTexture,
  makeMountainGeometry, makeRockGeometry,
} from './worldAssets.js';
import { createTerrain } from './terrain.js';
import { createSkyLighting, updateSkyLighting } from './sky.js';
import { createWater, updateWater } from './water.js';
import { createClouds, updateClouds } from './clouds.js';
import { createRunway } from './runway.js';
import { createGates, updateGates } from './gates.js';

const SKY_PRESETS = {
  dawn: {
    top: 0x18396a,
    bottom: 0xffc186,
    sun: 0xffd49a,
    fog: 0xd9ad8f,
    sunDir: [-0.72, 0.13, -0.69],
    hemiSky: 0xffd9b4,
    hemiGround: 0x4a5a54,
    sunPower: 2.65,
  },
  day: {
    top: 0x246aa8,
    bottom: 0xd7ecf2,
    sun: 0xfff0c4,
    fog: 0xb6d3e2,
    sunDir: [-0.42, 0.66, -0.62],
    hemiSky: 0xd9f0ff,
    hemiGround: 0x53644f,
    sunPower: 2.8,
  },
  storm: {
    top: 0x142232,
    bottom: 0x71828e,
    sun: 0xc6d5dc,
    fog: 0x798c99,
    sunDir: [0.4, 0.27, -0.88],
    hemiSky: 0xa2b7c5,
    hemiGround: 0x36464a,
    sunPower: 1.35,
  },
};


function terrainColor(height, x, z, mission, random) {
  const color = new THREE.Color();
  const warm = mission.id === 'canyon';
  const harbor = mission.id === 'harbor';
  const storm = mission.sky === 'storm';
  const moisture = fbm(x * 0.011, z * 0.011, 1207, 3);
  if (height < 1.2) color.setHex(warm ? 0xd6ab7d : harbor ? 0xc8b894 : storm ? 0x8d9a92 : 0xe3d4aa);
  else if (height < 5) color.setHex(warm ? 0xc8905e : harbor ? 0xa49d7d : 0xbab28a);
  else if (height < 20) {
    const t = clamp((height - 5) / 15, 0, 1);
    color.setHex(warm ? 0x8f432d : harbor ? 0x4d6259 : storm ? 0x39564c : 0x487653)
      .lerp(new THREE.Color(warm ? 0xc87a45 : harbor ? 0x7e8a6b : storm ? 0x597263 : 0x7ca960), t);
  } else if (height < 58) {
    const t = clamp((height - 20) / 38, 0, 1);
    color.setHex(warm ? 0xa04c31 : harbor ? 0x586660 : storm ? 0x4f6062 : 0x647767)
      .lerp(new THREE.Color(warm ? 0xe3a56b : harbor ? 0x9aa093 : storm ? 0x82908c : 0xa3a78d), t);
  } else {
    color.setHex(warm ? 0xdbb68f : harbor ? 0x98a3a0 : 0xaab6b4).lerp(new THREE.Color(0xf1f5f2), clamp((height - 62) / 52, 0, 1));
  }
  if (warm && height > 6) {
    const bands = Math.sin(height * 0.31 + x * 0.0026 + z * 0.0009 + moisture * 2.4);
    const strata = 0.78 + (bands > 0.32 ? 0.27 : bands < -0.48 ? -0.16 : 0.06);
    color.multiplyScalar(strata);
    if (height < 28) color.lerp(new THREE.Color(0x48291f), 0.18);
    if (moisture > 0.62 && height < 36) color.lerp(new THREE.Color(0x6c4a32), 0.13);
  }
  if (harbor && height > 2 && height < 24) {
    color.lerp(new THREE.Color(0x6c7866), moisture * 0.16);
    color.multiplyScalar(0.95 + Math.abs(Math.sin(z * 0.05 + x * 0.02)) * 0.09);
  }
  const jitter = 0.965 + random() * 0.07;
  color.multiplyScalar(jitter);
  return color;
}

export function createWorld(scene, mission, missionIndex, seedValue = SEED) {
  const root = new THREE.Group();
  scene.add(root);
  const seed = seedValue + missionIndex * 137;
  const preset = SKY_PRESETS[mission.sky] ?? SKY_PRESETS.day;
  const random = createRandom(seed * 7919);

  const skyParts = createSkyLighting(root, scene, preset, mission);

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
    return 272 + 42 * Math.sin(z * 0.0062 + 0.5) + 18 * Math.sin(z * 0.017 + 1.2);
  }

  function heightAt(x, z) {
    const large = fbm(x * 0.0031, z * 0.0031, seed, 4);
    const detail = fbm(x * 0.013, z * 0.013, seed + 31, 3);
    const ridge = fbm(x * 0.0022 + 8, z * 0.0022 - 3, seed + 73, 3);
    const fine = fbm(x * 0.037, z * 0.037, seed + 509, 3);
    const ridged = 1 - Math.abs(fbm(x * 0.008, z * 0.008, seed + 613, 3) * 2 - 1);
    let h = -2.5 + large * 22 + detail * 7 + (fine - 0.5) * 3.8 + Math.pow(ridged, 3) * 8;
    const dist = Math.hypot(x * 0.92, (z + 330) * 0.78);
    h += smoothstep(250, 700, dist) * ridge * 54;
    h -= smoothstep(540, 880, dist) * 20;
    const canyon = mission.id === 'canyon';
    if (canyon) {
      const offset = Math.abs(x - guideX(z));
      const floor = 7 + fbm(x * 0.012, z * 0.012, seed + 211, 3) * 8;
      h = lerp(h, floor, (1 - smoothstep(62, 124, offset)) * 0.96);
      const terrace = 0.82 + Math.floor((h - 8) / 11) * 0.035;
      h += smoothstep(74, 152, offset) * (1 - smoothstep(280, 390, offset)) * (34 + ridge * 64) * terrace;
      const bench = Math.floor(h / 7) * 7;
      h = lerp(h, bench + smoothstep(0.42, 0.95, (h - bench) / 7) * 2.2, 0.26 * smoothstep(80, 180, offset));
    } else {
      const shoreline = shorelineX(z);
      const sea = smoothstep(shoreline - 34, shoreline + 24, x);
      const bay = (1 - smoothstep(40, 165, Math.hypot((x - 178) * 1.12, (z + 435) * 0.62))) * smoothstep(38, 92, x);
      const inlet = Math.max(sea, bay);
      h = lerp(h, -8 - fbm(x * 0.02, z * 0.02, seed + 401, 2) * 3, inlet);
      if (x < shoreline - 12) h += (1 - smoothstep(10, 52, shoreline - x)) * 1.9;
    }
    const riverX = 105 + 38 * Math.sin(z * 0.0085) + 13 * Math.sin(z * 0.021);
    const river = 1 - smoothstep(7, 26, Math.abs(x - riverX));
    h -= river * 10;
    const flatX = 1 - smoothstep(25, 62, Math.abs(x));
    const flatZ = 1 - smoothstep(122, 176, Math.abs(z + 34));
    h = lerp(h, RUNWAY_Y, flatX * flatZ);
    return h;
  }

  createTerrain(root, mission, heightAt, terrainColor, random);

  const waterParts = createWater(root, mission);

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
    const mesh = new THREE.Mesh(geometry, material);
    root.add(mesh);
    return mesh;
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
  const harborWindows = [];
  let buildingCount = 0;
  const towns = mission.id === 'harbor'
    ? [[-255, -325, 18], [185, -635, 22], [166, -305, 20], [238, -205, 9]]
    : [[-255, -325, 18], [242, -540, 14], [-170, -780, 11], [300, -215, 9]];
  for (const [cx, cz, count] of towns) {
    for (let i = 0; i < count && buildingCount < 120; i += 1) {
      const x = cx + random.range(-52, 52);
      const z = cz + random.range(-48, 48);
      const h = heightAt(x, z);
      if (h < 2 || h > 45) continue;
      const w = random.range(5, 13);
      const d = random.range(5, 13);
      const bh = random.range(5, 20);
      const yaw = random.range(-0.2, 0.2);
      dummy.position.set(x, h + bh / 2, z);
      dummy.scale.set(w, bh, d);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
      dummy.updateMatrix();
      buildings.setMatrixAt(buildingCount, dummy.matrix);
      const shade = mission.sky === 'day' ? 0.72 + random() * 0.28 : 0.6 + random() * 0.3;
      buildings.setColorAt(buildingCount, new THREE.Color(mission.id === 'harbor' && cx > 150 ? 0xb8ab95 : 0x9fb0b8).multiplyScalar(shade));
      buildingCount += 1;
      if (mission.id === 'harbor' && cx > 150) {
        for (let j = 0; j < 3; j += 1) {
          harborWindows.push({
            x: x - Math.sin(yaw) * (d * 0.5 + 0.18) + Math.cos(yaw) * random.range(-w * 0.3, w * 0.3),
            y: h + bh * (0.32 + j * 0.2),
            z: z + Math.cos(yaw) * (d * 0.5 + 0.18) + Math.sin(yaw) * random.range(-w * 0.3, w * 0.3),
            yaw,
            w,
          });
        }
      }
    }
  }
  buildings.count = buildingCount;
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  root.add(buildings);

  if (harborWindows.length > 0) {
    const windows = new THREE.InstancedMesh(
      buildingGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffd889 }),
      harborWindows.length,
    );
    for (let i = 0; i < harborWindows.length; i += 1) {
      const win = harborWindows[i];
      dummy.position.set(win.x, win.y, win.z);
      dummy.scale.set(win.w * 0.22, 0.75, 0.12);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, win.yaw, 0));
      dummy.updateMatrix();
      windows.setMatrixAt(i, dummy.matrix);
    }
    windows.instanceMatrix.needsUpdate = true;
    root.add(windows);
  }

  if (mission.id !== 'canyon') {
    const pierMaterial = new THREE.MeshStandardMaterial({ color: mission.id === 'harbor' ? 0x715339 : 0x6b4d36, roughness: 0.92, flatShading: true });
    const pierLight = new THREE.MeshBasicMaterial({ color: 0xffd17c, fog: false });
    for (const z of [-620, -490, -360, -230]) {
      const start = shorelineX(z) - 12;
      const length = mission.id === 'harbor' ? 86 : 62;
      const width = mission.id === 'harbor' ? 12 : 9;
      const pier = new THREE.Mesh(new THREE.BoxGeometry(length, 1.4, width), pierMaterial);
      pier.position.set(start + length / 2, 1.1, z);
      root.add(pier);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(length - 5, 0.18, width - 3), new THREE.MeshStandardMaterial({ color: 0x8a6847, roughness: 0.95, flatShading: true }));
      deck.position.set(pier.position.x, 1.9, z);
      root.add(deck);
      for (let i = 0; i < 5; i += 1) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 6, 6), pierMaterial);
        post.position.set(start + 8 + i * (length - 12) / 4, -1.2, z + width / 2 - 1);
        root.add(post);
        if (mission.id === 'harbor' && i % 2 === 0) {
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 5), pierLight);
          lamp.position.set(post.position.x, 4.2, z - width / 2 + 1);
          root.add(lamp);
        }
      }
      if (mission.id === 'harbor') {
        for (let i = 0; i < 4; i += 1) {
          const crate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xc0a068 : 0x6f8c83, roughness: 0.9, flatShading: true }));
          crate.position.set(start + 12 + i * 5.2, 3.1, z + 1.5);
          root.add(crate);
        }
      }
    }
    const lighthouse = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.8, 22, 8), new THREE.MeshStandardMaterial({ color: 0xe8ece6, roughness: 0.8, flatShading: true }));
    lighthouse.position.set(shorelineX(-410) - 14, 14, -410);
    root.add(lighthouse);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 3, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    beacon.position.set(lighthouse.position.x, 27, -410);
    root.add(beacon);
  }

  if (mission.id === 'harbor') {
    const quayPoints = [];
    for (let z = -900; z <= 220; z += 14) quayPoints.push([shorelineX(z) - 15, z]);
    flatRibbon(quayPoints, 17, 0.62, new THREE.MeshStandardMaterial({ color: 0x59605a, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
    const surfPoints = [];
    for (let z = -860; z <= 120; z += 28) surfPoints.push([shorelineX(z) - 25, z]);
    flatRibbon(surfPoints, 4.5, 0.72, new THREE.MeshBasicMaterial({ color: 0xe7f4e8, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));

    const warehouses = new THREE.InstancedMesh(
      buildingGeometry,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true }),
      60,
    );
    const warehouseRoofs = new THREE.InstancedMesh(
      buildingGeometry,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }),
      60,
    );
    const warehouseColors = [0x93836b, 0x62757c, 0xa68868, 0x5f6e71];
    const roofColors = [0xa75b4c, 0x3b6672, 0xc9a15d, 0x4b6869];
    const roofTransforms = [];
    let warehouseCount = 0;
    for (let i = 0; i < 60 && warehouseCount < 60; i += 1) {
      const z = -790 + i * 15 + random.range(-6, 6);
      const x = shorelineX(z) - random.range(18, 82);
      const h = heightAt(x, z);
      if (h < 1 || h > 26) continue;
      const w = random.range(10, 25);
      const d = random.range(8, 18);
      const bh = random.range(6, 17);
      const yaw = random.range(-0.16, 0.16);
      dummy.position.set(x, h + bh / 2, z);
      dummy.scale.set(w, bh, d);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
      dummy.updateMatrix();
      warehouses.setMatrixAt(warehouseCount, dummy.matrix);
      warehouses.setColorAt(warehouseCount, new THREE.Color(warehouseColors[i % warehouseColors.length]).multiplyScalar(0.88 + random() * 0.2));
      dummy.position.y = h + bh + 0.35;
      dummy.scale.set(w + 0.8, 0.7, d + 0.8);
      dummy.updateMatrix();
      warehouseRoofs.setMatrixAt(warehouseCount, dummy.matrix);
      warehouseRoofs.setColorAt(warehouseCount, new THREE.Color(roofColors[i % roofColors.length]));
      if (i % 3 === 0) roofTransforms.push([x, h + bh + 0.9, z + d * 0.5 + 0.3, w]);
      warehouseCount += 1;
    }
    warehouses.count = warehouseCount;
    warehouseRoofs.count = warehouseCount;
    warehouses.instanceMatrix.needsUpdate = true;
    warehouseRoofs.instanceMatrix.needsUpdate = true;
    if (warehouses.instanceColor) warehouses.instanceColor.needsUpdate = true;
    if (warehouseRoofs.instanceColor) warehouseRoofs.instanceColor.needsUpdate = true;
    root.add(warehouses, warehouseRoofs);
    const windowStrip = new THREE.MeshBasicMaterial({ color: 0xffd389, fog: false });
    for (const [x, y, z, w] of roofTransforms) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.7, 0.2), windowStrip);
      strip.position.set(x, y, z);
      root.add(strip);
    }

    const steel = new THREE.MeshStandardMaterial({ color: 0x3d4a50, roughness: 0.68, metalness: 0.32, flatShading: true });
    const warning = new THREE.MeshStandardMaterial({ color: 0xd66843, roughness: 0.7, flatShading: true });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xffc36d, fog: false });
    for (const cz of [-660, -480, -300, -150]) {
      const cx = shorelineX(cz) + 10;
      const pieces = [
        [new THREE.BoxGeometry(14, 1.4, 12), cx, 1.4, cz, steel],
        [new THREE.BoxGeometry(1.6, 31, 1.6), cx - 5, 16, cz, steel],
        [new THREE.BoxGeometry(1.6, 31, 1.6), cx + 5, 16, cz, steel],
        [new THREE.BoxGeometry(12, 1.4, 2), cx, 30.5, cz, steel],
        [new THREE.BoxGeometry(70, 1.6, 2.4), cx + 17, 32.5, cz, warning],
        [new THREE.BoxGeometry(0.35, 15, 0.35), cx + 45, 24.5, cz, steel],
        [new THREE.BoxGeometry(2.4, 2.4, 2.4), cx + 45, 17, cz, steel],
        [new THREE.BoxGeometry(5, 3.8, 5), cx - 12, 30.5, cz, steel],
        [new THREE.BoxGeometry(4.8, 3.6, 4.8), cx, 27, cz, steel],
      ];
      for (const [geometry, x, y, z, material] of pieces) {
        const piece = new THREE.Mesh(geometry, material);
        piece.position.set(x, y, z);
        root.add(piece);
      }
      for (const dx of [-7, 7]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.5, 26, 0.5), steel);
        brace.position.set(cx + dx, 18, cz);
        brace.rotation.z = dx > 0 ? -0.38 : 0.38;
        root.add(brace);
      }
      const cabinLight = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.24), lamp);
      cabinLight.position.set(cx, 27.4, cz + 2.6);
      root.add(cabinLight);
      const tipLight = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), lamp);
      tipLight.position.set(cx + 51, 33.5, cz);
      root.add(tipLight);
    }

    const hulls = new THREE.InstancedMesh(
      buildingGeometry,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, flatShading: true }),
      14,
    );
    const cabins = new THREE.InstancedMesh(
      buildingGeometry,
      new THREE.MeshStandardMaterial({ color: 0xe3dfd1, roughness: 0.78, flatShading: true }),
      14,
    );
    const masts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 5, 5), steel, 14);
    const shipColors = [0xd8d6c8, 0x7b4b42, 0x355d6c, 0xb8a77d];
    let boatCount = 0;
    for (let i = 0; i < 20 && boatCount < 14; i += 1) {
      const z = -810 + i * 36 + random.range(-12, 12);
      const x = shorelineX(z) + random.range(18, 115);
      const len = random.range(11, 23);
      const wid = random.range(3.6, 7);
      const yaw = random.range(-0.4, 0.4);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
      dummy.position.set(x, 0.75, z);
      dummy.scale.set(wid, 2.2, len);
      dummy.updateMatrix();
      hulls.setMatrixAt(boatCount, dummy.matrix);
      hulls.setColorAt(boatCount, new THREE.Color(shipColors[i % shipColors.length]).multiplyScalar(0.9 + random() * 0.15));
      dummy.position.set(x, 2.5, z + len * 0.08);
      dummy.scale.set(wid * 0.58, 2.1, len * 0.28);
      dummy.updateMatrix();
      cabins.setMatrixAt(boatCount, dummy.matrix);
      dummy.position.set(x, 4.1, z - len * 0.23);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      masts.setMatrixAt(boatCount, dummy.matrix);
      boatCount += 1;
    }
    hulls.count = boatCount;
    cabins.count = boatCount;
    masts.count = boatCount;
    hulls.instanceMatrix.needsUpdate = true;
    cabins.instanceMatrix.needsUpdate = true;
    masts.instanceMatrix.needsUpdate = true;
    if (hulls.instanceColor) hulls.instanceColor.needsUpdate = true;
    root.add(hulls, cabins, masts);

    const freighterHull = new THREE.MeshStandardMaterial({ color: 0x354c58, roughness: 0.72, flatShading: true });
    const freighterDeck = new THREE.MeshStandardMaterial({ color: 0x79898c, roughness: 0.8, flatShading: true });
    const containerColors = [0xb46a4c, 0x476c7a, 0xc4a96f, 0x5b7868];
    for (const [cz, offset, length] of [[-430, 58, 68], [-580, 74, 82], [-300, 46, 58]]) {
      const cx = shorelineX(cz) + offset;
      const yaw = cz === -430 ? 0.2 : -0.15;
      const group = new THREE.Group();
      group.position.set(cx, 0, cz);
      group.rotation.y = yaw;
      const hull = new THREE.Mesh(new THREE.BoxGeometry(15, 5.4, length), freighterHull);
      hull.position.y = 1.5;
      group.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.5, length * 0.92), freighterDeck);
      deck.position.y = 4.3;
      group.add(deck);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(9, 8, 12), freighterDeck);
      bridge.position.set(0, 8.4, length * 0.31);
      group.add(bridge);
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 5, 6), freighterHull);
      funnel.position.set(0, 13.8, length * 0.3);
      group.add(funnel);
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          const container = new THREE.Mesh(
            new THREE.BoxGeometry(3.8, 3.2, 7),
            new THREE.MeshStandardMaterial({ color: containerColors[(row + col + (cz === -430 ? 0 : 1)) % 4], roughness: 0.84, flatShading: true }),
          );
          container.position.set(-4.8 + col * 4.8, 6.2 + (row % 2) * 3.3, -length * 0.24 + row * 8);
          group.add(container);
        }
      }
      for (const dx of [-7.8, 7.8]) {
        const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.65, 6, 5), new THREE.MeshBasicMaterial({ color: dx < 0 ? 0xff5963 : 0x76ffae, fog: false }));
        navLight.position.set(dx, 5.5, 0);
        group.add(navLight);
      }
      root.add(group);
      const wake = flatRibbon([[cx - 2, cz - length * 0.5], [cx - 5, cz - length * 0.8], [cx - 9, cz - length * 1.12]], 9, 0.4, new THREE.MeshBasicMaterial({ color: 0xe7fbff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
      wake.renderOrder = 2;
    }

    const buoys = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.8, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffc660 }),
      18,
    );
    for (let i = 0; i < 18; i += 1) {
      const z = -840 + i * 48;
      dummy.position.set(shorelineX(z) + 34, 1, z);
      dummy.scale.setScalar(1);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      dummy.updateMatrix();
      buoys.setMatrixAt(i, dummy.matrix);
    }
    buoys.instanceMatrix.needsUpdate = true;
    root.add(buoys);

    const breakwaterMaterial = new THREE.MeshStandardMaterial({ color: 0x49545a, roughness: 0.98, flatShading: true });
    const breakwaterLight = new THREE.MeshBasicMaterial({ color: 0xff6d5b, fog: false });
    for (let z = -740; z <= -220; z += 28) {
      const x = shorelineX(z) + 118;
      const rock = new THREE.Mesh(new THREE.BoxGeometry(16, 2.4, 30), breakwaterMaterial);
      rock.position.set(x, 0.9, z);
      rock.rotation.y = Math.sin(z * 0.01) * 0.14;
      root.add(rock);
      if ((z + 740) % 84 === 0) {
        const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 7, 6), breakwaterMaterial);
        lampPost.position.set(x, 4.4, z);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), breakwaterLight);
        lamp.position.set(x, 8.1, z);
        root.add(lampPost, lamp);
      }
    }

    const glitterMaterial = new THREE.MeshBasicMaterial({ color: 0xbfe9f2, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    for (let z = -840; z <= -180; z += 34) {
      const x = shorelineX(z) + random.range(70, 175);
      const glint = new THREE.Mesh(new THREE.PlaneGeometry(random.range(7, 20), random.range(2, 5)), glitterMaterial);
      glint.rotation.x = -Math.PI / 2;
      glint.position.set(x, 0.62, z);
      root.add(glint);
    }
    const reflectionMaterial = new THREE.MeshBasicMaterial({
      map: makeGlowTexture('#ffd99c', 256), transparent: true, opacity: 0.24,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    for (const [z, width, length] of [[-430, 34, 210], [-640, 24, 150]]) {
      const reflection = new THREE.Mesh(new THREE.PlaneGeometry(width, length), reflectionMaterial);
      reflection.rotation.x = -Math.PI / 2;
      reflection.position.set(shorelineX(z) + 92, 0.66, z);
      root.add(reflection);
    }

    const channelLight = new THREE.MeshBasicMaterial({ color: 0xffd383 });
    for (let z = -172; z > -310; z -= 16) {
      for (const side of [-1, 1]) {
        const marker = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 4.5), channelLight);
        marker.position.set(side * 11, heightAt(side * 11, z) + 0.6, z);
        root.add(marker);
      }
    }
  }

  if (mission.id === 'canyon') {
    const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x2a1711, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false });
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0xf0b078, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false });
    for (const side of [-1, 1]) {
      const shadowPoints = [];
      const rimPoints = [];
      for (let z = -160; z >= -910; z -= 16) {
        shadowPoints.push([guideX(z) + side * 72, z]);
        rimPoints.push([guideX(z) + side * 158, z]);
      }
      ribbon(shadowPoints, 26, 0.22, shadowMaterial);
      ribbon(rimPoints, 14, 0.24, rimMaterial);
    }

    const ledges = new THREE.InstancedMesh(
      buildingGeometry,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }),
      140,
    );
    const strataColors = [0x7c3c29, 0xb2663d, 0xd79a63, 0x5d3427, 0xa85b36];
    for (let i = 0; i < 140; i += 1) {
      const z = -180 - (i / 140) * 740 + random.range(-10, 10);
      const side = i % 2 === 0 ? -1 : 1;
      const x = guideX(z) + side * random.range(86, 200);
      const h = heightAt(x, z);
      const tall = i % 8 === 0;
      dummy.position.set(x, h + (tall ? random.range(6, 20) : random.range(-0.5, 8)), z);
      dummy.scale.set(random.range(15, 34), tall ? random.range(30, 62) : random.range(5, 13), random.range(14, 38));
      dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(0, Math.PI), 0));
      dummy.updateMatrix();
      ledges.setMatrixAt(i, dummy.matrix);
      ledges.setColorAt(i, new THREE.Color(strataColors[i % strataColors.length]).multiplyScalar(0.8 + random() * 0.24));
    }
    ledges.instanceMatrix.needsUpdate = true;
    if (ledges.instanceColor) ledges.instanceColor.needsUpdate = true;
    root.add(ledges);

    const rockGeometry = makeRockGeometry();
    const spires = new THREE.InstancedMesh(
      rockGeometry,
      new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true, detail: 0.3 }),
      74,
    );
    for (let i = 0; i < 74; i += 1) {
      const z = -210 - (i / 74) * 690 + random.range(-18, 18);
      const side = i % 2 === 0 ? -1 : 1;
      const x = guideX(z) + side * random.range(68, 168);
      const height = random.range(20, 74);
      const h = heightAt(x, z);
      dummy.position.set(x, h + height * 0.42, z);
      dummy.scale.set(random.range(4.5, 12), height * 0.55, random.range(4.5, 12));
      dummy.quaternion.setFromEuler(new THREE.Euler(random.range(-0.09, 0.09), random.range(0, Math.PI), random.range(-0.09, 0.09)));
      dummy.updateMatrix();
      spires.setMatrixAt(i, dummy.matrix);
      spires.setColorAt(i, new THREE.Color(i % 3 === 0 ? 0x79402c : 0xcf8857).multiplyScalar(0.82 + random() * 0.25));
    }
    spires.instanceMatrix.needsUpdate = true;
    if (spires.instanceColor) spires.instanceColor.needsUpdate = true;
    root.add(spires);

    const shrubs = new THREE.InstancedMesh(
      makeRockGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true }),
      190,
    );
    for (let i = 0; i < 190; i += 1) {
      const z = -180 - (i / 190) * 740 + random.range(-22, 22);
      const side = i % 2 === 0 ? -1 : 1;
      const x = guideX(z) + side * random.range(28, 74);
      const h = heightAt(x, z);
      dummy.position.set(x, h + 0.4, z);
      dummy.scale.set(random.range(1.6, 4.4), random.range(0.7, 2.1), random.range(1.6, 4.4));
      dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(0, Math.PI), 0));
      dummy.updateMatrix();
      shrubs.setMatrixAt(i, dummy.matrix);
      shrubs.setColorAt(i, new THREE.Color(i % 4 === 0 ? 0xc9985a : i % 3 === 0 ? 0x8e8b56 : 0x537342).multiplyScalar(0.82 + random() * 0.3));
    }
    shrubs.instanceMatrix.needsUpdate = true;
    if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;
    root.add(shrubs);

    const markerCount = mission.rings.length * 2;
    const markerPoles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.48, 11, 6), new THREE.MeshStandardMaterial({ color: 0xe7e2cb, roughness: 0.75, flatShading: true }), markerCount);
    const markerCaps = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffc95f, fog: false }), markerCount);
    for (let i = 0; i < markerCount; i += 1) {
      const ring = mission.rings[Math.floor(i / 2)];
      const z = ring[2] + 14;
      const x = ring[0] + (i % 2 === 0 ? -27 : 27);
      const ground = heightAt(x, z);
      dummy.position.set(x, ground + 5.5, z);
      dummy.scale.setScalar(1);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
      dummy.updateMatrix();
      markerPoles.setMatrixAt(i, dummy.matrix);
      dummy.position.y = ground + 11.4;
      dummy.updateMatrix();
      markerCaps.setMatrixAt(i, dummy.matrix);
    }
    markerPoles.instanceMatrix.needsUpdate = true;
    markerCaps.instanceMatrix.needsUpdate = true;
    root.add(markerPoles, markerCaps);
  }

  const treeCount = 900;
  const treeGeometry = mission.id === 'harbor' ? makeBroadleafGeometry() : makeConiferGeometry();
  const foliage = new THREE.InstancedMesh(
    treeGeometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true, detail: 0.16 }),
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
    if (mission.id === 'canyon' && Math.abs(x - guideX(z)) < 215) continue;
    if (Math.abs(x) < 72 && z > -190 && z < 120) continue;
    if (Math.abs(x) < 34 && z < -180) continue;
    const scale = random.range(0.72, 1.45);
    dummy.position.set(x, h + 0.1, z);
    dummy.scale.setScalar(scale);
    dummy.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    dummy.updateMatrix();
    treeShadows.setMatrixAt(treeIndex, dummy.matrix);
    dummy.position.set(x, h + 0.1 * scale, z);
    dummy.scale.setScalar(scale * 1.18);
    dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(0, Math.PI * 2), 0));
    dummy.updateMatrix();
    foliage.setMatrixAt(treeIndex, dummy.matrix);
    const foliageColor = mission.id === 'harbor' ? 0x7c9b5c : mission.sky === 'day' ? 0x4d8353 : 0x3e6a55;
    foliage.setColorAt(treeIndex, new THREE.Color(foliageColor).multiplyScalar(0.82 + random() * 0.36));
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
    makeMountainGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true, detail: 0.12 }),
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

  createRunway(root);
  const clouds = createClouds(root, mission, random);

  const hazeMaterial = new THREE.MeshBasicMaterial({
    color: preset.fog, transparent: true, opacity: 0.032,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  for (const [y, spread, shift] of [[16, 190, 0], [31, 260, 70], [52, 320, -60]]) {
    for (const side of [-1, 1]) {
      const points = [];
      for (let z = -940; z <= 180; z += 40) points.push([guideX(z) + side * (spread * 0.42 + shift), z]);
      const haze = flatRibbon(points, spread, y, hazeMaterial);
      haze.renderOrder = 1;
    }
  }

  const ringGroups = createGates(root, mission);

  const startPad = new THREE.Mesh(
    new THREE.CircleGeometry(3.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  startPad.rotation.x = -Math.PI / 2;
  startPad.position.set(0, RUNWAY_Y + 0.55, RUNWAY_NEAR - 28);
  root.add(startPad);

  return {
    root,
    rings: ringGroups,
    heightAt,
    preset,
    update(dt, time, cameraPos) {
      updateWater(waterParts, dt);
      updateClouds(clouds, dt, time);
      updateGates(ringGroups, time);
      updateSkyLighting(skyParts, mission, time, cameraPos);
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
