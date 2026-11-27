import * as THREE from '../vendor/engine.js';
import { makeGlowTexture } from '../vendor/worldAssets.js';
import { flatRibbon } from './scenery.js';
import { shorelineAt } from './terrain.js';

export function createSettlements(root, mission, random, heightAt) {
  const harbor = mission.id === 'harbor';
  const daylight = mission.sky === 'day';
  const dummy = new THREE.Object3D();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  function setInstance(mesh, index, x, y, z, sx, sy, sz, yaw = 0) {
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.quaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }

  function commitInstances(meshes) {
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  function addPiece(parent, geometry, material, x, y, z) {
    const piece = new THREE.Mesh(geometry, material);
    piece.position.set(x, y, z);
    parent.add(piece);
    return piece;
  }

  function addBox(parent, material, w, h, d, x, y, z) {
    return addPiece(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  }

  function populateTowns() {
    const sites = harbor
      ? [[-255, -325, 18], [185, -635, 22], [166, -305, 20], [238, -205, 9]]
      : [[-255, -325, 18], [242, -540, 14], [-170, -780, 11], [300, -215, 9]];
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true });
    const buildings = new THREE.InstancedMesh(unitBox, material, 120);
    const harborWindows = [];
    let count = 0;

    for (const [cx, cz, target] of sites) {
      for (let i = 0; i < target && count < 120; i += 1) {
        const x = cx + random.range(-52, 52);
        const z = cz + random.range(-48, 48);
        const ground = heightAt(x, z);
        if (ground < 2 || ground > 45) continue;
        const w = random.range(5, 13);
        const d = random.range(5, 13);
        const height = random.range(5, 20);
        const yaw = random.range(-0.2, 0.2);
        setInstance(buildings, count, x, ground + height / 2, z, w, height, d, yaw);
        const shade = daylight ? 0.72 + random() * 0.28 : 0.6 + random() * 0.3;
        const tint = harbor && cx > 150 ? 0xb8ab95 : 0x9fb0b8;
        buildings.setColorAt(count, new THREE.Color(tint).multiplyScalar(shade));
        count += 1;

        if (harbor && cx > 150) {
          for (let row = 0; row < 3; row += 1) {
            harborWindows.push({
              x: x - Math.sin(yaw) * (d * 0.5 + 0.18) + Math.cos(yaw) * random.range(-w * 0.3, w * 0.3),
              y: ground + height * (0.32 + row * 0.2),
              z: z + Math.cos(yaw) * (d * 0.5 + 0.18) + Math.sin(yaw) * random.range(-w * 0.3, w * 0.3),
              yaw, w,
            });
          }
        }
      }
    }

    buildings.count = count;
    commitInstances([buildings]);
    root.add(buildings);
    if (harborWindows.length === 0) return;

    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffd889 });
    const windows = new THREE.InstancedMesh(unitBox, windowMaterial, harborWindows.length);
    for (let i = 0; i < harborWindows.length; i += 1) {
      const win = harborWindows[i];
      setInstance(windows, i, win.x, win.y, win.z, win.w * 0.22, 0.75, 0.12, win.yaw);
    }
    commitInstances([windows]);
    root.add(windows);
  }

  function buildPiers() {
    const wood = new THREE.MeshStandardMaterial({ color: harbor ? 0x715339 : 0x6b4d36, roughness: 0.92, flatShading: true });
    const deckWood = new THREE.MeshStandardMaterial({ color: 0x8a6847, roughness: 0.95, flatShading: true });
    const pierLamp = new THREE.MeshBasicMaterial({ color: 0xffd17c, fog: false });
    const crateColors = [0xc0a068, 0x6f8c83].map((color) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }));

    for (const z of [-620, -490, -360, -230]) {
      const start = shorelineAt(z) - 12;
      const length = harbor ? 86 : 62;
      const width = harbor ? 12 : 9;
      const pier = addBox(root, wood, length, 1.4, width, start + length / 2, 1.1, z);
      addBox(root, deckWood, length - 5, 0.18, width - 3, pier.position.x, 1.9, z);
      for (let i = 0; i < 5; i += 1) {
        const post = addPiece(
          root, new THREE.CylinderGeometry(0.7, 0.95, 6, 6), wood,
          start + 8 + i * (length - 12) / 4, -1.2, z + width / 2 - 1,
        );
        if (harbor && i % 2 === 0) {
          addPiece(root, new THREE.SphereGeometry(0.7, 6, 5), pierLamp, post.position.x, 4.2, z - width / 2 + 1);
        }
      }
      if (harbor) {
        for (let i = 0; i < 4; i += 1) {
          addBox(root, crateColors[i % 2], 3.4, 2.2, 2.8, start + 12 + i * 5.2, 3.1, z + 1.5);
        }
      }
    }

    const tower = addPiece(
      root, new THREE.CylinderGeometry(2.6, 3.8, 22, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8ece6, roughness: 0.8, flatShading: true }),
      shorelineAt(-410) - 14, 14, -410,
    );
    addPiece(
      root, new THREE.CylinderGeometry(3, 3, 3, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), tower.position.x, 27, -410,
    );
  }

  function buildQuays() {
    const quayPoints = [];
    for (let z = -900; z <= 220; z += 14) quayPoints.push([shorelineAt(z) - 15, z]);
    flatRibbon(root, quayPoints, 17, 0.62, new THREE.MeshStandardMaterial({
      color: 0x59605a, roughness: 0.95, flatShading: true, side: THREE.DoubleSide,
    }));

    const surfPoints = [];
    for (let z = -860; z <= 120; z += 28) surfPoints.push([shorelineAt(z) - 25, z]);
    flatRibbon(root, surfPoints, 4.5, 0.72, new THREE.MeshBasicMaterial({
      color: 0xe7f4e8, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false,
    }));
  }

  function buildWarehouses() {
    const walls = new THREE.InstancedMesh(
      unitBox,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, flatShading: true }),
      60,
    );
    const roofs = new THREE.InstancedMesh(
      unitBox,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }),
      60,
    );
    const wallColors = [0x93836b, 0x62757c, 0xa68868, 0x5f6e71];
    const roofColors = [0xa75b4c, 0x3b6672, 0xc9a15d, 0x4b6869];
    const roofLights = [];
    let count = 0;

    for (let i = 0; i < 60 && count < 60; i += 1) {
      const z = -790 + i * 15 + random.range(-6, 6);
      const x = shorelineAt(z) - random.range(18, 82);
      const ground = heightAt(x, z);
      if (ground < 1 || ground > 26) continue;
      const w = random.range(10, 25);
      const d = random.range(8, 18);
      const height = random.range(6, 17);
      const yaw = random.range(-0.16, 0.16);
      setInstance(walls, count, x, ground + height / 2, z, w, height, d, yaw);
      const shade = 0.88 + random() * 0.2;
      walls.setColorAt(count, new THREE.Color(wallColors[i % wallColors.length]).multiplyScalar(shade));
      setInstance(roofs, count, x, ground + height + 0.35, z, w + 0.8, 0.7, d + 0.8, yaw);
      roofs.setColorAt(count, new THREE.Color(roofColors[i % roofColors.length]));
      if (i % 3 === 0) roofLights.push([x, ground + height + 0.9, z + d * 0.5 + 0.3, w]);
      count += 1;
    }

    walls.count = count;
    roofs.count = count;
    commitInstances([walls, roofs]);
    root.add(walls, roofs);
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd389, fog: false });
    for (const [x, y, z, w] of roofLights) {
      addBox(root, glow, w * 0.7, 0.7, 0.2, x, y, z);
    }
  }

  function buildCranes() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x3d4a50, roughness: 0.68, metalness: 0.32, flatShading: true });
    const caution = new THREE.MeshStandardMaterial({ color: 0xd66843, roughness: 0.7, flatShading: true });
    const lamp = new THREE.MeshBasicMaterial({ color: 0xffc36d, fog: false });

    for (const cz of [-660, -480, -300, -150]) {
      const cx = shorelineAt(cz) + 10;
      const framework = [
        [14, 1.4, 12, cx, 1.4, cz, steel],
        [1.6, 31, 1.6, cx - 5, 16, cz, steel],
        [1.6, 31, 1.6, cx + 5, 16, cz, steel],
        [12, 1.4, 2, cx, 30.5, cz, steel],
        [70, 1.6, 2.4, cx + 17, 32.5, cz, caution],
        [0.35, 15, 0.35, cx + 45, 24.5, cz, steel],
        [2.4, 2.4, 2.4, cx + 45, 17, cz, steel],
        [5, 3.8, 5, cx - 12, 30.5, cz, steel],
        [4.8, 3.6, 4.8, cx, 27, cz, steel],
      ];
      for (const [w, h, d, x, y, z, material] of framework) {
        addBox(root, material, w, h, d, x, y, z);
      }
      for (const dx of [-7, 7]) {
        const brace = addBox(root, steel, 0.5, 26, 0.5, cx + dx, 18, cz);
        brace.rotation.z = dx > 0 ? -0.38 : 0.38;
      }
      addBox(root, lamp, 3.6, 0.7, 0.24, cx, 27.4, cz + 2.6);
      addPiece(root, new THREE.SphereGeometry(0.8, 6, 5), lamp, cx + 51, 33.5, cz);
    }
  }

  function buildFleet() {
    const hulls = new THREE.InstancedMesh(
      unitBox,
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, flatShading: true }),
      14,
    );
    const cabins = new THREE.InstancedMesh(
      unitBox,
      new THREE.MeshStandardMaterial({ color: 0xe3dfd1, roughness: 0.78, flatShading: true }),
      14,
    );
    const masts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.13, 0.13, 5, 5),
      new THREE.MeshStandardMaterial({ color: 0x3d4a50, roughness: 0.68, metalness: 0.32, flatShading: true }),
      14,
    );
    const boatColors = [0xd8d6c8, 0x7b4b42, 0x355d6c, 0xb8a77d];
    let count = 0;

    for (let i = 0; i < 20 && count < 14; i += 1) {
      const z = -810 + i * 36 + random.range(-12, 12);
      const x = shorelineAt(z) + random.range(18, 115);
      const length = random.range(11, 23);
      const beam = random.range(3.6, 7);
      const yaw = random.range(-0.4, 0.4);
      setInstance(hulls, count, x, 0.75, z, beam, 2.2, length, yaw);
      const shade = 0.9 + random() * 0.15;
      hulls.setColorAt(count, new THREE.Color(boatColors[i % boatColors.length]).multiplyScalar(shade));
      setInstance(cabins, count, x, 2.5, z + length * 0.08, beam * 0.58, 2.1, length * 0.28, yaw);
      setInstance(masts, count, x, 4.1, z - length * 0.23, 1, 1, 1, yaw);
      count += 1;
    }

    hulls.count = count;
    cabins.count = count;
    masts.count = count;
    commitInstances([hulls, cabins, masts]);
    root.add(hulls, cabins, masts);
  }

  function buildFreighters() {
    const hullPaint = new THREE.MeshStandardMaterial({ color: 0x354c58, roughness: 0.72, flatShading: true });
    const deckPaint = new THREE.MeshStandardMaterial({ color: 0x79898c, roughness: 0.8, flatShading: true });
    const containerColors = [0xb46a4c, 0x476c7a, 0xc4a96f, 0x5b7868];
    const containers = containerColors.map((color) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.84, flatShading: true }));

    for (const [cz, offset, length] of [[-430, 58, 68], [-580, 74, 82], [-300, 46, 58]]) {
      const cx = shorelineAt(cz) + offset;
      const group = new THREE.Group();
      group.position.set(cx, 0, cz);
      group.rotation.y = cz === -430 ? 0.2 : -0.15;
      addBox(group, hullPaint, 15, 5.4, length, 0, 1.5, 0);
      addBox(group, deckPaint, 15.5, 0.5, length * 0.92, 0, 4.3, 0);
      addBox(group, deckPaint, 9, 8, 12, 0, 8.4, length * 0.31);
      addPiece(group, new THREE.CylinderGeometry(1.3, 1.5, 5, 6), hullPaint, 0, 13.8, length * 0.3);
      const colorShift = cz === -430 ? 0 : 1;
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          addBox(
            group, containers[(row + col + colorShift) % 4], 3.8, 3.2, 7,
            -4.8 + col * 4.8, 6.2 + (row % 2) * 3.3, -length * 0.24 + row * 8,
          );
        }
      }
      for (const dx of [-7.8, 7.8]) {
        addPiece(
          group, new THREE.SphereGeometry(0.65, 6, 5),
          new THREE.MeshBasicMaterial({ color: dx < 0 ? 0xff5963 : 0x76ffae, fog: false }),
          dx, 5.5, 0,
        );
      }
      root.add(group);
      const wake = flatRibbon(root, [
        [cx - 2, cz - length * 0.5], [cx - 5, cz - length * 0.8], [cx - 9, cz - length * 1.12],
      ], 9, 0.4, new THREE.MeshBasicMaterial({
        color: 0xe7fbff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
      }));
      wake.renderOrder = 2;
    }
  }

  function buildChannelFurniture() {
    const buoys = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.8, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffc660 }),
      18,
    );
    for (let i = 0; i < 18; i += 1) {
      const z = -840 + i * 48;
      setInstance(buoys, i, shorelineAt(z) + 34, 1, z, 1, 1, 1);
    }
    commitInstances([buoys]);
    root.add(buoys);

    const rock = new THREE.MeshStandardMaterial({ color: 0x49545a, roughness: 0.98, flatShading: true });
    const redLamp = new THREE.MeshBasicMaterial({ color: 0xff6d5b, fog: false });
    for (let z = -740; z <= -220; z += 28) {
      const x = shorelineAt(z) + 118;
      const block = addBox(root, rock, 16, 2.4, 30, x, 0.9, z);
      block.rotation.y = Math.sin(z * 0.01) * 0.14;
      if ((z + 740) % 84 === 0) {
        addPiece(root, new THREE.CylinderGeometry(0.3, 0.4, 7, 6), rock, x, 4.4, z);
        addPiece(root, new THREE.SphereGeometry(0.8, 6, 5), redLamp, x, 8.1, z);
      }
    }

    const glitter = new THREE.MeshBasicMaterial({
      color: 0xbfe9f2, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let z = -840; z <= -180; z += 34) {
      const x = shorelineAt(z) + random.range(70, 175);
      const glint = addPiece(
        root, new THREE.PlaneGeometry(random.range(7, 20), random.range(2, 5)), glitter, x, 0.62, z,
      );
      glint.rotation.x = -Math.PI / 2;
    }

    const reflection = new THREE.MeshBasicMaterial({
      map: makeGlowTexture('#ffd99c', 256), transparent: true, opacity: 0.24,
      depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    for (const [z, width, length] of [[-430, 34, 210], [-640, 24, 150]]) {
      const sheet = addPiece(root, new THREE.PlaneGeometry(width, length), reflection, shorelineAt(z) + 92, 0.66, z);
      sheet.rotation.x = -Math.PI / 2;
    }

    const channelLight = new THREE.MeshBasicMaterial({ color: 0xffd383 });
    for (let z = -172; z > -310; z -= 16) {
      for (const side of [-1, 1]) {
        addBox(root, channelLight, 1.4, 0.22, 4.5, side * 11, heightAt(side * 11, z) + 0.6, z);
      }
    }
  }

  populateTowns();
  buildPiers();
  if (!harbor) return;
  buildQuays();
  buildWarehouses();
  buildCranes();
  buildFleet();
  buildFreighters();
  buildChannelFurniture();
}
