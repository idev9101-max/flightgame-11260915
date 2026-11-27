import * as THREE from './engine.js';
import { RUNWAY_FAR, RUNWAY_HALF_WIDTH, RUNWAY_NEAR, RUNWAY_Y } from './config.js';
import { makeGlowTexture, makeRunwayTexture } from './worldAssets.js';
import { makeCanvasTexture } from './textures.js';

export function createRunway(root) {
  const length = RUNWAY_NEAR - RUNWAY_FAR;
  const center = (RUNWAY_NEAR + RUNWAY_FAR) / 2;
  const asphalt = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY_HALF_WIDTH * 2, 0.6, length),
    new THREE.MeshStandardMaterial({ color: 0x8d99a2, map: makeRunwayTexture(), detail: 0.14, roughness: 0.94, metalness: 0.02 }),
  );
  asphalt.position.set(0, RUNWAY_Y + 0.15, center);
  root.add(asphalt);

  const marking = new THREE.MeshBasicMaterial({ color: 0xe9f4f4 });
  const dashGeometry = new THREE.BoxGeometry(1.2, 0.08, 9);
  for (let z = RUNWAY_FAR + 22; z < RUNWAY_NEAR - 18; z += 21) {
    const dash = new THREE.Mesh(dashGeometry, marking);
    dash.position.set(0, RUNWAY_Y + 0.48, z);
    root.add(dash);
  }
  const stripeGeometry = new THREE.BoxGeometry(0.8, 0.08, length - 10);
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(stripeGeometry, marking);
    stripe.position.set(side * (RUNWAY_HALF_WIDTH - 1.8), RUNWAY_Y + 0.48, center);
    root.add(stripe);
  }
  for (const end of [RUNWAY_FAR + 10, RUNWAY_NEAR - 10]) {
    for (let i = -3; i <= 3; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.09, 7), marking);
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

  const rubber = new THREE.MeshBasicMaterial({ color: 0x161d22, transparent: true, opacity: 0.3, depthWrite: false });
  for (const side of [-1, 1]) {
    for (const z of [RUNWAY_NEAR - 58, RUNWAY_FAR + 58]) {
      const skid = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 34), rubber);
      skid.rotation.x = -Math.PI / 2;
      skid.position.set(side * 3.4, RUNWAY_Y + 0.485, z);
      root.add(skid);
    }
  }
  const aiming = new THREE.MeshBasicMaterial({ color: 0xf0f6f3, transparent: true, opacity: 0.86 });
  for (const z of [RUNWAY_NEAR - 76, RUNWAY_FAR + 76]) {
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 15), aiming);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(side * 6.2, RUNWAY_Y + 0.486, z);
      root.add(bar);
    }
  }
  for (const z of [RUNWAY_NEAR - 5, RUNWAY_FAR + 5]) {
    for (let i = -5; i <= 5; i += 1) {
      const key = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 13), marking);
      key.rotation.x = -Math.PI / 2;
      key.position.set(i * 3.4, RUNWAY_Y + 0.487, z);
      root.add(key);
    }
  }

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
  const lightA = new THREE.MeshBasicMaterial({ color: 0x7ef0ff });
  const lightB = new THREE.MeshBasicMaterial({ color: 0xffb15c });
  const glowA = new THREE.SpriteMaterial({ map: makeGlowTexture('#7ef0ff'), transparent: true, opacity: 0.46, depthWrite: false, fog: false });
  const glowB = new THREE.SpriteMaterial({ map: makeGlowTexture('#ffb15c'), transparent: true, opacity: 0.42, depthWrite: false, fog: false });
  for (let z = RUNWAY_FAR; z <= RUNWAY_NEAR; z += 18) {
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(lightGeometry, z % 36 === 0 ? lightA : lightB);
      light.position.set(side * (RUNWAY_HALF_WIDTH + 1.6), RUNWAY_Y + 0.6, z);
      root.add(light);
      const glow = new THREE.Sprite(z % 36 === 0 ? glowA : glowB);
      glow.position.set(light.position.x, RUNWAY_Y + 0.7, z);
      glow.scale.set(3.2, 3.2, 1);
      root.add(glow);
    }
  }
  const approach = [];
  for (let z = RUNWAY_FAR - 12; z > RUNWAY_FAR - 150; z -= 16) {
    approach.push([0, z]);
    for (const side of [-1, 1]) approach.push([side * 13, z]);
  }
  const lights = new THREE.InstancedMesh(
    lightGeometry,
    new THREE.MeshBasicMaterial({ color: 0xffd79a }),
    approach.length,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < approach.length; i += 1) {
    const [x, z] = approach[i];
    dummy.position.set(x, RUNWAY_Y + 0.55, z);
    dummy.scale.setScalar(0.7);
    dummy.quaternion.setFromEuler(new THREE.Euler(0, 0, 0));
    dummy.updateMatrix();
    lights.setMatrixAt(i, dummy.matrix);
  }
  lights.instanceMatrix.needsUpdate = true;
  root.add(lights);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 11, 6), new THREE.MeshStandardMaterial({ color: 0xb9c6c5, roughness: 0.7 }));
  pole.position.set(35, RUNWAY_Y + 5.5, 54);
  root.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(1.2, 5, 7, 1, true), new THREE.MeshStandardMaterial({ color: 0xff8a50, emissive: 0x51200d, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(38, RUNWAY_Y + 10.4, 54);
  root.add(sock);

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
}
