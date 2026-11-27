import * as THREE from '../vendor/engine.js';
import { clamp } from '../vendor/random.js';
import { makeGlowTexture, makePropTexture } from '../vendor/worldAssets.js';

function loftFuselage(sections, radialSteps) {
  const positions = [];
  const indices = [];
  for (const [z, rx, ry] of sections) {
    for (let k = 0; k < radialSteps; k += 1) {
      const angle = (k / radialSteps) * Math.PI * 2;
      positions.push(Math.cos(angle) * rx, Math.sin(angle) * ry + 0.04, z);
    }
  }
  for (let section = 0; section < sections.length - 1; section += 1) {
    for (let k = 0; k < radialSteps; k += 1) {
      const a = section * radialSteps + k;
      const b = section * radialSteps + (k + 1) % radialSteps;
      const c = (section + 1) * radialSteps + k;
      const d = (section + 1) * radialSteps + (k + 1) % radialSteps;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function plateGeometry(outline, thickness, offsetY, dihedral) {
  const positions = [];
  const indices = [];
  let centroidX = 0;
  let centroidZ = 0;
  for (const [x, z] of outline) {
    centroidX += x;
    centroidZ += z;
  }
  centroidX /= outline.length;
  centroidZ /= outline.length;
  const centerY = offsetY + Math.abs(centroidX) * dihedral;
  for (const [x, z] of outline) {
    const y = offsetY + Math.abs(x) * dihedral;
    positions.push(x, y + thickness / 2, z);
  }
  for (const [x, z] of outline) {
    const y = offsetY + Math.abs(x) * dihedral;
    positions.push(x, y - thickness / 2, z);
  }
  positions.push(centroidX, centerY + thickness / 2, centroidZ, centroidX, centerY - thickness / 2, centroidZ);
  const topCenter = outline.length * 2;
  const bottomCenter = topCenter + 1;
  for (let i = 0; i < outline.length; i += 1) {
    const next = (i + 1) % outline.length;
    indices.push(topCenter, i, next);
    indices.push(bottomCenter, outline.length + next, outline.length + i);
    indices.push(i, outline.length + i, next, next, outline.length + i, outline.length + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function fanGeometry(points) {
  const positions = [];
  for (const [x, y] of points) positions.push(x, y, 0);
  const indices = [];
  for (let i = 1; i < points.length - 1; i += 1) indices.push(0, i, i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function aimCylinder(mesh, from, to) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const delta = end.clone().sub(start);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  const direction = delta.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const axis = up.clone().cross(direction);
  if (axis.lengthSq() > 0.000001) {
    mesh.quaternion.setFromAxisAngle(axis.normalize(), Math.acos(clamp(up.dot(direction), -1, 1)));
  }
  return mesh;
}

export function buildBody() {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: 0xfff7e6, roughness: 0.36, metalness: 0.2, shininess: 48,
    detail: 0.12, flatShading: true, emissive: 0x3d2b1e, emissiveIntensity: 0.3,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0xf06a45, roughness: 0.38, metalness: 0.26, shininess: 56,
    detail: 0.1, flatShading: true, emissive: 0x5c1f10, emissiveIntensity: 0.42,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1b2932, roughness: 0.62, metalness: 0.4, shininess: 36, flatShading: true,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0xd8e8ea, roughness: 0.4, metalness: 0.58, shininess: 70, flatShading: true,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x8fd9ee, transparent: true, opacity: 0.72, roughness: 0.14,
    metalness: 0.32, emissive: 0x174255, emissiveIntensity: 0.75, side: THREE.DoubleSide,
  });

  function attach(parent, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function addBox(parent, material, w, h, d, x = 0, y = 0, z = 0) {
    return attach(parent, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  }

  function addPlate(outline, thickness, material, offsetY = 0, dihedral = 0) {
    return attach(group, plateGeometry(outline, thickness, offsetY, dihedral), material);
  }

  function braceBetween(from, to, radius, material) {
    const span = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)).length();
    const brace = attach(group, new THREE.CylinderGeometry(radius, radius, span, 6), material);
    return aimCylinder(brace, from, to);
  }

  function buildFuselage() {
    const sections = [
      [-8.1, 0.16, 0.14], [-7.5, 0.48, 0.42], [-6.3, 0.78, 0.7], [-4.6, 0.9, 0.8],
      [-1.2, 0.94, 0.84], [1.8, 0.9, 0.8], [4.5, 0.74, 0.66], [6.2, 0.5, 0.46], [7.4, 0.2, 0.19],
    ];
    attach(group, loftFuselage(sections, 12), paint);

    const cowl = attach(group, new THREE.CylinderGeometry(0.84, 0.76, 1.5, 10), accent, 0, 0, -6.35);
    cowl.rotation.x = Math.PI / 2;
    for (const z of [-7.02, -6.05, -5.62]) {
      attach(group, new THREE.TorusGeometry(z === -6.05 ? 0.79 : 0.81, 0.045, 5, 12), trim, 0, 0, z);
    }
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2;
      const seam = addBox(group, dark, 0.035, 1.18, 0.025, Math.cos(angle) * 0.78, Math.sin(angle) * 0.78, -6.35);
      seam.rotation.z = angle;
    }
    const spinner = attach(group, new THREE.ConeGeometry(0.44, 1.2, 10), trim, 0, 0, -8.45);
    spinner.rotation.x = -Math.PI / 2;
    const tailBand = attach(group, new THREE.CylinderGeometry(0.53, 0.4, 0.7, 10), accent, 0, 0, 6.55);
    tailBand.rotation.x = Math.PI / 2;
  }

  function buildWings() {
    const wingOutline = [
      [-8.2, -1.7], [-5.4, -1.35], [-2, -0.95], [0, -0.82], [2, -0.95], [5.4, -1.35], [8.2, -1.7],
      [8.2, 0.2], [4.8, 0.95], [0, 1.12], [-4.8, 0.95], [-8.2, 0.2],
    ];
    addPlate(wingOutline, 0.28, paint, -0.34, 0.028);
    addPlate([[-7.7, -1.45], [7.7, -1.45], [7.7, -1.08], [-7.7, -1.08]], 0.1, accent, -0.34, 0.028);
    addPlate([[-7.9, 0.1], [7.9, 0.1], [7.9, 0.26], [-7.9, 0.26]], 0.08, dark, -0.34, 0.028);
    for (const side of [-1, 1]) {
      addBox(group, accent, 0.3, 0.56, 2.1, side * 8.15, -0.06, -0.72);
      addBox(group, trim, 0.035, 0.035, 7.6, side * 0.9, 0.16, 0.6);
      addBox(group, accent, 0.045, 0.36, 3.2, side * 0.92, 0.02, 2.2);
      addBox(group, trim, 4.4, 0.055, 0.26, side * 4.7, -0.16, -0.72);
    }
    addBox(group, accent, 1.5, 0.1, 9.4, 0, -0.8, 0.1);
    for (const side of [-1, 1]) {
      braceBetween([side * 0.72, -0.52, -1.9], [side * 4.9, -0.22, -1.05], 0.07, trim);
      braceBetween([side * 0.72, -0.52, -0.2], [side * 4.9, -0.22, -1.05], 0.07, trim);
    }
  }

  function buildEmpennage() {
    addPlate([[-2.9, 4.6], [2.9, 4.6], [2.3, 6.2], [-2.3, 6.2]], 0.18, paint, 0.4);
    for (const side of [-1, 1]) {
      addBox(group, trim, 2.2, 0.12, 0.95, side * 1.45, 0.48, 6.15);
      addBox(group, accent, 0.18, 0.4, 1.2, side * 2.78, 0.48, 5.4);
    }
    const finVertices = [
      [-0.17, 0.55, 4.8], [0.17, 0.55, 4.8],
      [-0.17, 3.45, 6.55], [0.17, 3.45, 6.55],
      [-0.17, 0.7, 7.35], [0.17, 0.7, 7.35],
    ];
    const finPositions = [];
    for (const vertex of finVertices) finPositions.push(...vertex);
    const finGeometry = new THREE.BufferGeometry();
    finGeometry.setAttribute('position', new THREE.Float32BufferAttribute(finPositions, 3));
    finGeometry.setIndex([0, 2, 4, 1, 5, 3, 0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 0, 5, 1, 0]);
    finGeometry.computeVertexNormals();
    attach(group, finGeometry, accent);
    addBox(group, trim, 0.38, 0.26, 1.9, 0, 3.42, 6.4);
    addBox(group, paint, 0.32, 1.35, 1.05, 0, 1.7, 6.6);
    for (const y of [1.35, 1.72]) addBox(group, accent, 0.36, 0.11, 1.08, 0, y, 6.6);
  }

  function buildCanopy() {
    const canopy = attach(
      group, new THREE.SphereGeometry(0.95, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), glass, 0, 0.68, -1.35,
    );
    canopy.scale.set(0.96, 1.15, 2.1);
    for (const side of [-1, 1]) {
      const frame = addBox(group, trim, 0.07, 0.08, 3.3, side * 0.86, 0.66, -1.35);
      frame.rotation.x = 0.06;
    }
    addBox(group, trim, 1.7, 0.09, 0.1, 0, 0.75, -3.1);
  }

  function buildPropeller() {
    const propeller = new THREE.Group();
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0x29343a, roughness: 0.48, metalness: 0.42, flatShading: true,
      emissive: 0x132c37, emissiveIntensity: 0.55, side: THREE.DoubleSide,
    });
    const bladeShape = [[-0.14, 0], [-0.34, 1.3], [-0.26, 2.25], [0.08, 2.42], [0.24, 1.6], [0.14, 0]];
    const bladeGeometry = fanGeometry(bladeShape);
    for (let i = 0; i < 3; i += 1) {
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.rotation.z = (i / 3) * Math.PI * 2;
      propeller.add(blade);
    }
    const hub = attach(propeller, new THREE.CylinderGeometry(0.34, 0.4, 0.5, 8), accent);
    hub.rotation.x = Math.PI / 2;
    propeller.position.z = -8.62;
    group.add(propeller);

    const propDisc = attach(
      group, new THREE.PlaneGeometry(4.7, 4.7),
      new THREE.MeshBasicMaterial({
        map: makePropTexture(), transparent: true, opacity: 0.55,
        depthWrite: false, side: THREE.DoubleSide, fog: false,
      }),
      0, 0, -8.86,
    );
    propDisc.rotation.z = 0.4;
    attach(
      group, new THREE.CircleGeometry(2.42, 24),
      new THREE.MeshBasicMaterial({
        color: 0xc5eaff, transparent: true, opacity: 0.09,
        depthWrite: false, side: THREE.DoubleSide, fog: false,
      }),
      0, 0, -8.92,
    );
    return { propeller, propDisc };
  }

  function buildLights() {
    const redHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('#ff4d5e'), transparent: true, opacity: 0.42, depthWrite: false, fog: false,
    }));
    const greenHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture('#65ffa8'), transparent: true, opacity: 0.42, depthWrite: false, fog: false,
    }));
    const leftLight = attach(
      group, new THREE.SphereGeometry(0.32, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xff4d5e, fog: false }), -8.18, -0.06, -0.72,
    );
    const rightLight = attach(
      group, new THREE.SphereGeometry(0.32, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x65ffa8, fog: false }), 8.18, -0.06, -0.72,
    );
    redHalo.position.copy(leftLight.position);
    redHalo.scale.set(2.4, 2.4, 1);
    greenHalo.position.copy(rightLight.position);
    greenHalo.scale.set(2.4, 2.4, 1);
    attach(
      group, new THREE.SphereGeometry(0.3, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xffe4a3, fog: false }), 0, 1.2, 7.2,
    );
    group.add(redHalo, greenHalo);
    return [redHalo, greenHalo];
  }

  function buildGear() {
    const gearGroup = new THREE.Group();
    const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.28, 12);
    const hubGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.32, 8);
    for (const [x, z] of [[-2.5, -2.1], [2.5, -2.1], [0, 5.6]]) {
      const wheel = attach(gearGroup, wheelGeometry, dark, x, -1.62, z);
      wheel.rotation.z = Math.PI / 2;
      const hubWheel = attach(gearGroup, hubGeometry, trim, x, -1.62, z);
      hubWheel.rotation.z = Math.PI / 2;
      attach(gearGroup, new THREE.CylinderGeometry(0.1, 0.12, 1.75, 6), trim, x, -0.85, z);
      const brace = attach(gearGroup, new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), trim, x * 0.72, -0.9, z + 0.45);
      brace.rotation.z = x === 0 ? 0 : -Math.sign(x) * 0.5;
      const door = addBox(gearGroup, paint, 0.72, 0.06, 1.9, x * 1.08, -0.47, z + 0.2);
      door.rotation.z = x === 0 ? 0 : -Math.sign(x) * 0.24;
      attach(gearGroup, new THREE.CylinderGeometry(0.075, 0.075, 0.75, 6), dark, x, -1.32, z);
    }
    group.add(gearGroup);
    return gearGroup;
  }

  function buildControlSurfaces() {
    const flaps = [];
    const ailerons = [];
    for (const side of [-1, 1]) {
      flaps.push(addBox(group, accent, 4.5, 0.1, 0.9, side * 3.6, -0.3, 1.12));
      ailerons.push(addBox(group, trim, 2.3, 0.1, 0.85, side * 6.6, -0.17, 0.65));
    }
    for (const side of [-1, 1]) {
      const port = attach(group, new THREE.CylinderGeometry(0.14, 0.16, 0.5, 8), dark, side * 0.62, -0.16, -5.6);
      port.rotation.x = Math.PI / 2;
    }
    const exhaust = attach(
      group, new THREE.ConeGeometry(0.5, 1.7, 8),
      new THREE.MeshBasicMaterial({
        color: 0x7be7ff, transparent: true, opacity: 0.5, depthWrite: false, fog: false,
      }),
      0, 0, 7.65,
    );
    exhaust.rotation.x = Math.PI / 2;
    return { flaps, ailerons, exhaust };
  }

  buildFuselage();
  buildWings();
  buildEmpennage();
  buildCanopy();
  const { propeller, propDisc } = buildPropeller();
  const halos = buildLights();
  const gearGroup = buildGear();
  const { flaps, ailerons, exhaust } = buildControlSurfaces();
  return { group, propeller, propDisc, gearGroup, flaps, ailerons, exhaust, halos };
}
