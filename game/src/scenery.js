import * as THREE from '../vendor/engine.js';
import { makeBroadleafGeometry, makeConiferGeometry, makeMountainGeometry, makeRockGeometry } from '../vendor/worldAssets.js';
import { shorelineAt } from './terrain.js';

function writeInstance(mesh, index, dummy) {
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

function stripMesh(root, points, width, material, heightFor) {
  const verts = [];
  const indices = [];
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next[0] - previous[0];
    const dz = next[1] - previous[1];
    const length = Math.hypot(dx, dz) || 1;
    const nx = (-dz / length) * width * 0.5;
    const nz = (dx / length) * width * 0.5;
    const y = heightFor(point);
    verts.push(point[0] - nx, y, point[1] - nz, point[0] + nx, y, point[1] + nz);
    if (i > 0) {
      const base = (i - 1) * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  root.add(mesh);
  return mesh;
}

export function ribbon(root, points, width, offset, material, heightAt) {
  return stripMesh(root, points, width, material, (point) => heightAt(point[0], point[1]) + offset);
}

export function flatRibbon(root, points, width, y, material) {
  return stripMesh(root, points, width, material, () => y);
}

export function createGroundDetails(root, mission, random, heightAt, guideX) {
  const river = [];
  for (let z = -940; z <= 250; z += 12) {
    river.push([105 + 38 * Math.sin(z * 0.0085) + 13 * Math.sin(z * 0.021), z]);
  }
  flatRibbon(root, river, 13, 0.42, new THREE.MeshBasicMaterial({
    color: 0x3c9fbd, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false,
  }));

  if (mission.id !== 'canyon') {
    const beach = [];
    for (let z = -940; z <= 250; z += 14) beach.push([shorelineAt(z), z]);
    flatRibbon(root, beach, 6, 0.48, new THREE.MeshBasicMaterial({
      color: 0xf2e6c8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false,
    }));
  }

  const roadRoute = (z) => -205 + 34 * Math.sin(z * 0.0105) + 12 * Math.sin(z * 0.031);
  const road = [];
  for (let z = -940; z <= 250; z += 14) road.push([roadRoute(z), z]);
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3b4144, roughness: 1, side: THREE.DoubleSide });
  ribbon(root, road, 8, 0.35, asphalt, heightAt);

  const spur = [];
  for (let t = 0; t <= 1; t += 0.04) {
    const z = -325 + t * 120;
    spur.push([-205 + 34 * Math.sin(z * 0.0105) + t * 120, z]);
  }
  ribbon(root, spur, 5.5, 0.32, asphalt, heightAt);

  const dashes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.5, 0.12, 4.5),
    new THREE.MeshBasicMaterial({ color: 0xe8c57a }),
    100,
  );
  const dummy = new THREE.Object3D();
  let dashCount = 0;
  for (let z = -920; z <= 240 && dashCount < 100; z += 12) {
    const x = roadRoute(z);
    dummy.position.set(x, heightAt(x, z) + 0.42, z);
    dummy.scale.setScalar(1);
    dummy.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
    writeInstance(dashes, dashCount, dummy);
    dashCount += 1;
  }
  dashes.count = dashCount;
  dashes.instanceMatrix.needsUpdate = true;
  root.add(dashes);
  void guideX;
}

export function createCanyonScenery(root, mission, random, heightAt, guideX) {
  const dummy = new THREE.Object3D();

  function pose(x, y, z, sx, sy, sz, yaw = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
    return dummy;
  }

  function paintCanyonBands() {
    const shadow = new THREE.MeshBasicMaterial({
      color: 0x3a2119, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
    });
    const rimGlow = new THREE.MeshBasicMaterial({
      color: 0xf3c393, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false,
    });
    for (const side of [-1, 1]) {
      const shadePoints = [];
      const rimPoints = [];
      for (let z = -160; z >= -910; z -= 16) {
        shadePoints.push([guideX(z) + side * 78, z]);
        rimPoints.push([guideX(z) + side * 166, z]);
      }
      ribbon(root, shadePoints, 24, 0.22, shadow, heightAt);
      ribbon(root, rimPoints, 12, 0.24, rimGlow, heightAt);
    }
  }

  function buildStrata() {
    const capacity = 168;
    const slabs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }),
      capacity,
    );
    const strataColors = [0x8b4a31, 0xb87246, 0xd59a66, 0x71412e, 0xc48754];
    let index = 0;
    for (let i = 0; i < 56; i += 1) {
      const z = -190 - (i / 56) * 750 + random.range(-14, 14);
      const side = i % 2 === 0 ? -1 : 1;
      const x = guideX(z) + side * random.range(118, 250);
      const base = heightAt(x, z);
      const width = random.range(30, 64);
      const depth = random.range(32, 72);
      for (let layer = 0; layer < 3 && index < capacity; layer += 1) {
        const shrink = 1 - layer * 0.13;
        const layerHeight = random.range(7, 13);
        const lift = layer * random.range(8, 14);
        const yaw = random.range(-0.16, 0.16);
        writeInstance(slabs, index, pose(x, base + layerHeight * 0.5 + lift, z, width * shrink, layerHeight, depth * shrink, yaw));
        const tint = strataColors[(i + layer) % strataColors.length];
        slabs.setColorAt(index, new THREE.Color(tint).multiplyScalar(0.86 + random() * 0.16));
        index += 1;
      }
    }
    slabs.count = index;
    slabs.instanceMatrix.needsUpdate = true;
    if (slabs.instanceColor) slabs.instanceColor.needsUpdate = true;
    root.add(slabs);
  }

  function scatterRocks(options) {
    const { count, zSpan, distance, size, lift, colorAt } = options;
    const mesh = new THREE.InstancedMesh(
      makeRockGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true }),
      count,
    );
    for (let i = 0; i < count; i += 1) {
      const z = -210 - (i / count) * zSpan + random.range(-16, 16);
      const side = i % 2 === 0 ? -1 : 1;
      const x = guideX(z) + side * random.range(distance[0], distance[1]);
      const ground = heightAt(x, z);
      writeInstance(mesh, i, pose(
        x, ground + lift, z,
        random.range(size[0][0], size[0][1]),
        random.range(size[1][0], size[1][1]),
        random.range(size[2][0], size[2][1]),
        random.range(0, Math.PI),
      ));
      mesh.setColorAt(i, colorAt(i));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    root.add(mesh);
    return mesh;
  }

  function buildGateMarkers() {
    const count = mission.rings.length * 2;
    const poles = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.34, 0.48, 11, 6),
      new THREE.MeshStandardMaterial({ color: 0xe7e2cb, roughness: 0.75, flatShading: true }),
      count,
    );
    const caps = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffc95f, fog: false }),
      count,
    );
    for (let i = 0; i < count; i += 1) {
      const ring = mission.rings[Math.floor(i / 2)];
      const z = ring[2] + 14;
      const x = ring[0] + (i % 2 === 0 ? -27 : 27);
      const ground = heightAt(x, z);
      writeInstance(poles, i, pose(x, ground + 5.5, z, 1, 1, 1));
      writeInstance(caps, i, pose(x, ground + 11.4, z, 1, 1, 1));
    }
    poles.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    root.add(poles, caps);
  }

  paintCanyonBands();
  buildStrata();
  scatterRocks({
    count: 34, zSpan: 700, distance: [82, 190], size: [[9, 22], [3, 8], [9, 24]], lift: 1.6,
    colorAt: (i) => new THREE.Color(i % 3 === 0 ? 0x8a5237 : 0xc08055).multiplyScalar(0.84 + random() * 0.2),
  });
  scatterRocks({
    count: 80, zSpan: 740, distance: [30, 76], size: [[1.4, 3.4], [0.6, 1.6], [1.4, 3.4]], lift: 0.4,
    colorAt: (i) => new THREE.Color(i % 4 === 0 ? 0xc9985a : 0x8e8b56).multiplyScalar(0.8 + random() * 0.24),
  });
  buildGateMarkers();
}

export function createVegetation(root, mission, random, heightAt, guideX) {
  const dummy = new THREE.Object3D();
  const treeCount = 900;

  function placeTrees() {
    const foliage = new THREE.InstancedMesh(
      mission.id === 'harbor' ? makeBroadleafGeometry() : makeConiferGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true, detail: 0.16 }),
      treeCount,
    );
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.3, 0.42, 2.4, 5),
      new THREE.MeshStandardMaterial({ color: 0x6b4b32, roughness: 1, flatShading: true }),
      treeCount,
    );
    const shadows = new THREE.InstancedMesh(
      new THREE.CircleGeometry(2.6, 6),
      new THREE.MeshBasicMaterial({
        color: 0x0a1718, transparent: true, opacity: 0.24,
        depthWrite: false, side: THREE.DoubleSide, fog: false,
      }),
      treeCount,
    );
    const leafColor = mission.id === 'harbor' ? 0x7c9b5c : mission.sky === 'day' ? 0x4d8353 : 0x3e6a55;
    let planted = 0;

    for (let attempt = 0; attempt < treeCount * 4 && planted < treeCount; attempt += 1) {
      const x = random.range(-610, 610);
      const z = random.range(-1010, 260);
      const ground = heightAt(x, z);
      if (ground < 2.2 || ground > 39) continue;
      if (mission.id === 'canyon' && Math.abs(x - guideX(z)) < 215) continue;
      if (Math.abs(x) < 72 && z > -190 && z < 120) continue;
      if (Math.abs(x) < 34 && z < -180) continue;
      const scale = random.range(0.72, 1.45);

      dummy.position.set(x, ground + 0.1, z);
      dummy.scale.setScalar(scale);
      dummy.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      writeInstance(shadows, planted, dummy);

      dummy.position.set(x, ground + 0.1 * scale, z);
      dummy.scale.setScalar(scale * 1.18);
      dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(0, Math.PI * 2), 0));
      writeInstance(foliage, planted, dummy);
      foliage.setColorAt(planted, new THREE.Color(leafColor).multiplyScalar(0.82 + random() * 0.36));

      dummy.position.y = ground + 1.15 * scale;
      writeInstance(trunks, planted, dummy);
      planted += 1;
    }

    foliage.count = planted;
    trunks.count = planted;
    shadows.count = planted;
    foliage.instanceMatrix.needsUpdate = true;
    trunks.instanceMatrix.needsUpdate = true;
    shadows.instanceMatrix.needsUpdate = true;
    if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
    root.add(foliage, trunks, shadows);
  }

  function raisePeaks() {
    const count = mission.id === 'canyon' ? 24 : 34;
    const peaks = new THREE.InstancedMesh(
      makeMountainGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, flatShading: true, detail: 0.12 }),
      count,
    );
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + random.range(-0.08, 0.08);
      const radius = random.range(720, 880);
      const x = Math.cos(angle) * radius;
      const z = -340 + Math.sin(angle) * radius * 0.92;
      const height = mission.id === 'canyon' ? random.range(58, 118) : random.range(70, 155);
      dummy.position.set(x, height / 2 - 8, z);
      dummy.scale.set(random.range(52, 94), height, random.range(52, 94));
      dummy.quaternion.setFromEuler(new THREE.Euler(0, random.range(0, 6), 0));
      writeInstance(peaks, i, dummy);
      const tint = mission.id === 'canyon' ? 0xb89478 : 0x8b9aa6;
      peaks.setColorAt(i, new THREE.Color(tint).multiplyScalar(0.84 + random() * 0.22));
    }
    peaks.instanceMatrix.needsUpdate = true;
    if (peaks.instanceColor) peaks.instanceColor.needsUpdate = true;
    root.add(peaks);
  }

  placeTrees();
  raisePeaks();
}

export function createHaze(root, preset, guideX) {
  const material = new THREE.MeshBasicMaterial({
    color: preset.fog, transparent: true, opacity: 0.026,
    depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  for (const [y, spread, shift] of [[18, 200, 0], [36, 280, 70]]) {
    for (const side of [-1, 1]) {
      const points = [];
      for (let z = -940; z <= 180; z += 40) points.push([guideX(z) + side * (spread * 0.42 + shift), z]);
      const haze = flatRibbon(root, points, spread, y, material);
      haze.renderOrder = 1;
    }
  }
}
