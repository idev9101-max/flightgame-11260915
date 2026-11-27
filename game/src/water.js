import * as THREE from './engine.js';
import { makeWaterTexture } from './worldAssets.js';

export function createWater(root, mission) {
  const segments = 34;
  const geometry = new THREE.PlaneGeometry(1600, 1700, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const base = Float32Array.from(geometry.attributes.position.array);
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3));
  const water = new THREE.Mesh(
    geometry,
    new THREE.MeshPhongMaterial({
      color: mission.sky === 'storm' ? 0x2e596b : mission.id === 'harbor' ? 0x2f7ea3 : 0x2b7e9c,
      specular: 0xffedcf,
      shininess: 128,
      map: makeWaterTexture(),
      detail: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  );
  water.position.set(0, 0.15, -350);
  root.add(water);
  return { water, geometry, base, time: 0 };
}

export function updateWater(parts, dt) {
  parts.time += dt;
  const time = parts.time;
  const attribute = parts.geometry.attributes.position;
  for (let i = 0; i < attribute.count; i += 1) {
    const x = parts.base[i * 3];
    const z = parts.base[i * 3 + 2];
    attribute.array[i * 3 + 1] = Math.sin(x * 0.032 + time * 0.8) * 0.42 + Math.cos(z * 0.026 - time * 0.55) * 0.32;
  }
  attribute.needsUpdate = true;
  const colors = parts.geometry.attributes.color;
  for (let i = 0; i < colors.count; i += 1) {
    const x = parts.base[i * 3];
    const z = parts.base[i * 3 + 2];
    const ripple = Math.sin(x * 0.043 + z * 0.021 + time * 1.3) * 0.5 + 0.5;
    const glint = Math.pow(Math.max(0, Math.sin(x * 0.09 - z * 0.035 + time * 2.1)), 12);
    const value = 0.74 + ripple * 0.2 + glint * 0.55;
    colors.array[i * 3] = value;
    colors.array[i * 3 + 1] = value * (0.96 + glint * 0.08);
    colors.array[i * 3 + 2] = value * (1.02 + glint * 0.04);
  }
  colors.needsUpdate = true;
  if (Math.floor(time * 8) % 2 === 0) parts.geometry.computeVertexNormals();
}
