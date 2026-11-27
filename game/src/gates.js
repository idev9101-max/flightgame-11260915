import * as THREE from './engine.js';
import { RUNWAY_NEAR, RUNWAY_Y } from './config.js';
import { makeRingGlowTexture } from './worldAssets.js';
import { makeLabelTexture } from './textures.js';

export function createGates(root, mission) {
  const groups = [];
  const color = mission.sky === 'storm' ? 0xffbe63 : mission.sky === 'day' ? 0x7be7ff : 0xffd783;
  for (let i = 0; i < mission.rings.length; i += 1) {
    const [x, y, z] = mission.rings[i];
    const previous = i === 0 ? [0, RUNWAY_Y + 18, RUNWAY_NEAR - 40] : mission.rings[i - 1];
    const normal = new THREE.Vector3(previous[0] - x, previous[1] - y, previous[2] - z).normalize();
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.lookAt(previous[0], previous[1], previous[2]);
    const radius = (mission.ringScale ?? 1) * (mission.sky === 'day' ? 15.5 : 16);
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 1.2, 7, 32),
      new THREE.MeshStandardMaterial({ color: 0x20323d, emissive: color, emissiveIntensity: 0.55, roughness: 0.5, metalness: 0.25 }),
    );
    group.add(torus);
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(radius - 1.9, 0.32, 5, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    group.add(inner);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(radius + 1.7, 0.5, 5, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, fog: false }),
    );
    group.add(halo);
    const ringGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeRingGlowTexture(`#${color.toString(16).padStart(6, '0')}`),
      transparent: true, opacity: 0.16, depthWrite: false, fog: false,
    }));
    ringGlow.scale.set(radius * 1.28, radius * 1.28, 1);
    group.add(ringGlow);
    const veil = new THREE.Mesh(
      new THREE.CircleGeometry(radius - 2.2, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false }),
    );
    veil.position.z = 0.12;
    group.add(veil);
    for (let b = 0; b < 4; b += 1) {
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.85, 6, 5), new THREE.MeshBasicMaterial({ color }));
      const angle = (b / 4) * Math.PI * 2;
      beacon.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      beacon.userData.angle = angle;
      group.add(beacon);
    }
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeLabelTexture(String(i + 1).padStart(2, '0'), '#6de3ff'), transparent: true, depthWrite: false }),
    );
    label.position.set(0, radius + 6.5, 0);
    label.scale.set(9.5, 4.75, 1);
    group.add(label);
    root.add(group);
    groups.push({
      group,
      center: new THREE.Vector3(x, y, z),
      normal,
      radius,
      torus,
      inner,
      halo,
      ringGlow,
      veil,
      label,
      passed: false,
      home: new THREE.Vector3(x, y, z),
    });
  }
  return groups;
}

export function updateGates(groups, time) {
  for (let i = 0; i < groups.length; i += 1) {
    const ring = groups[i];
    ring.group.position.y = ring.home.y + Math.sin(time * 1.1 + i) * 0.8;
    ring.center.copy(ring.group.position);
    const isNext = groups.findIndex((r) => !r.passed) === i;
    const pulse = isNext ? 1 + Math.sin(time * 3) * 0.035 : 1;
    ring.group.scale.setScalar(pulse);
    ring.torus.material.emissiveIntensity = ring.passed ? 0.12 : isNext ? 1.85 + Math.sin(time * 4) * 0.2 : 0.55;
    ring.inner.material.opacity = ring.passed ? 0.12 : isNext ? 1 : 0.38;
    ring.halo.material.opacity = ring.passed ? 0.05 : isNext ? 0.34 + Math.sin(time * 3) * 0.08 : 0.14;
    ring.ringGlow.material.opacity = ring.passed ? 0.015 : isNext ? 0.1 + Math.sin(time * 3) * 0.02 : 0.035;
    ring.veil.material.opacity = ring.passed ? 0.008 : isNext ? 0.055 : 0.025;
    ring.label.material.opacity = ring.passed ? 0.28 : isNext ? 1 : 0.6;
    for (const child of ring.group.children) {
      if (child.userData.angle !== undefined) {
        const a = child.userData.angle + time * (isNext ? 1.8 : 0.5);
        child.position.set(Math.cos(a) * ring.radius, Math.sin(a) * ring.radius, 0);
      }
    }
  }
}
