import * as THREE from './engine.js';
import { makeCloudTexture } from './worldAssets.js';

export function createClouds(root, mission, random) {
  const storm = mission.sky === 'storm';
  const textures = storm
    ? ['#84929b', '#6e7d88', '#9ca8ae'].map((color) => makeCloudTexture(color))
    : ['#fff6e8', '#ffffff', '#dce9ec'].map((color) => makeCloudTexture(color));
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    const cloud = new THREE.Group();
    const baseX = random.range(-620, 620);
    const baseZ = random.range(-980, 220);
    const baseY = storm ? random.range(58, 92) : random.range(105, 178);
    const s = random.range(30, storm ? 58 : 48);
    for (let layer = 0; layer < 4; layer += 1) {
      const material = new THREE.SpriteMaterial({
        map: textures[(i + layer) % textures.length],
        transparent: true,
        opacity: storm ? 0.68 : 0.5,
        depthWrite: false,
        fog: false,
      });
      const puff = new THREE.Sprite(material);
      puff.position.set(random.range(-0.42, 0.42) * s, random.range(-0.12, 0.16) * s, random.range(-0.2, 0.2) * s);
      const layerScale = s * random.range(0.58, 1.05);
      puff.scale.set(layerScale * 1.8, layerScale * 0.72, 1);
      cloud.add(puff);
    }
    cloud.position.set(baseX, baseY, baseZ);
    cloud.userData.speed = random.range(1.2, 3.4);
    cloud.userData.baseY = baseY;
    clouds.push(cloud);
    root.add(cloud);
  }
  return clouds;
}

export function updateClouds(clouds, dt, time) {
  for (const cloud of clouds) {
    cloud.position.x += cloud.userData.speed * dt;
    if (cloud.position.x > 700) cloud.position.x = -700;
    cloud.position.y = cloud.userData.baseY + Math.sin(time * 0.25 + cloud.position.z) * 2.5;
  }
}
