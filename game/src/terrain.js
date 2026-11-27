import * as THREE from './engine.js';
import { makeSurfaceTexture } from './worldAssets.js';

export function createTerrain(root, mission, heightAt, terrainColor, random) {
  const size = 1500;
  const segments = 160;
  const vertexCount = (segments + 1) * (segments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(positions.length);
  const uvs = new Float32Array(vertexCount * 2);
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
      uvs[(vi / 3) * 2] = i / segments;
      uvs[(vi / 3) * 2 + 1] = j / segments;
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true, map: makeSurfaceTexture(), detail: 0.3, groundShade: 1,
      flatShading: true, roughness: 0.96, metalness: 0,
    }),
  );
  root.add(mesh);
  return mesh;
}
