import * as THREE from './engine.js';
import { RUNWAY_FAR, RUNWAY_HALF_WIDTH, RUNWAY_NEAR, RUNWAY_Y } from './config.js';
import { clamp, damp, smoothstep } from './random.js';

const DEG = 180 / Math.PI;
const TRAIL_POINTS = 70;

function cockpitTexture(title, value, ticks) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#08141c';
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6de3ff';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = '#b8d8e6';
  ctx.lineWidth = 4;
  for (let i = 0; i < ticks; i += 1) {
    const a = (i / ticks) * Math.PI * 1.5 + Math.PI * 0.75;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
    ctx.lineTo(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108);
    ctx.stroke();
  }
  ctx.fillStyle = '#8fdcf2';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 128, 82);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#eaf8ff';
  ctx.fillText(value, 128, 182);
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildBody() {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xf2f5f1, roughness: 0.55, metalness: 0.18, flatShading: true });
  const accent = new THREE.MeshStandardMaterial({ color: 0x2b8fa8, roughness: 0.5, metalness: 0.2, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x24313b, roughness: 0.7, metalness: 0.3, flatShading: true });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.62, 10.5, 8), paint);
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.82, 3.4, 8), accent);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -6.9;
  group.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.8, 8), paint);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = 6.6;
  group.add(tailCone);

  const outline = [[-7.6, 1.5], [-1.2, -0.4], [1.2, -0.4], [7.6, 1.5], [7.6, -1.6], [1.4, -2], [-1.4, -2], [-7.6, -1.6]];
  const wingPositions = [];
  const wingIndices = [];
  for (const height of [0.13, -0.13]) {
    for (const [x, z] of outline) wingPositions.push(x, height, -z);
  }
  wingPositions.push(0, 0.13, 0.5, 0, -0.13, 0.5);
  const wingCount = outline.length;
  const topCenter = wingCount * 2;
  const bottomCenter = topCenter + 1;
  for (let i = 0; i < wingCount; i += 1) {
    const next = (i + 1) % wingCount;
    wingIndices.push(topCenter, i, next);
    wingIndices.push(bottomCenter, wingCount + next, wingCount + i);
    wingIndices.push(i, wingCount + i, next);
    wingIndices.push(next, wingCount + i, wingCount + next);
  }
  const wingGeometry = new THREE.BufferGeometry();
  wingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wingPositions, 3));
  wingGeometry.setIndex(wingIndices);
  wingGeometry.computeVertexNormals();
  const wing = new THREE.Mesh(wingGeometry, paint);
  wing.position.set(0, -0.35, -0.9);
  group.add(wing);

  const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.05, 0.45), accent);
  wingStripe.position.set(0, -0.18, -0.2);
  group.add(wingStripe);

  const tailPlane = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.24, 2.0), paint);
  tailPlane.position.set(0, 0.35, 5.2);
  group.add(tailPlane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.5, 2.5), accent);
  fin.position.set(0, 1.5, 5.6);
  group.add(fin);

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8fd9ee, transparent: true, opacity: 0.68, roughness: 0.15, metalness: 0.3, emissive: 0x163b4a, emissiveIntensity: 0.7, side: THREE.DoubleSide }),
  );
  canopy.scale.set(1, 1.05, 2.2);
  canopy.position.set(0, 0.62, -1.2);
  group.add(canopy);

  const propeller = new THREE.Group();
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.9, 0.08), dark);
    blade.rotation.z = (i / 3) * Math.PI;
    propeller.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 8), dark);
  hub.rotation.x = -Math.PI / 2;
  propeller.add(hub);
  propeller.position.z = -8.5;
  group.add(propeller);

  const leftLight = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff4d5e }));
  leftLight.position.set(-7.55, -0.28, 0);
  const rightLight = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0x65ffa8 }));
  rightLight.position.set(7.55, -0.28, 0);
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tailLight.position.set(0, 0.9, 7.5);
  group.add(leftLight, rightLight, tailLight);

  const gearGroup = new THREE.Group();
  const wheelGeometry = new THREE.CylinderGeometry(0.62, 0.62, 0.26, 10);
  const strutGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.7, 6);
  for (const [x, z] of [[-2.5, -2.2], [2.5, -2.2], [0, 5.4]]) {
    const wheel = new THREE.Mesh(wheelGeometry, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -1.65, z);
    const strut = new THREE.Mesh(strutGeometry, dark);
    strut.position.set(x, -0.85, z);
    gearGroup.add(wheel, strut);
  }
  group.add(gearGroup);

  const flaps = [];
  for (const side of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.09, 1.0), accent);
    flap.position.set(side * 4.4, -0.22, 0.4);
    group.add(flap);
    flaps.push(flap);
  }

  const exhaust = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.7, 8),
    new THREE.MeshBasicMaterial({ color: 0x7be7ff, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.z = 7.7;
  group.add(exhaust);

  return { group, propeller, gearGroup, flaps, exhaust };
}

function buildCockpit() {
  const group = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: 0x1b2a33, roughness: 0.6, metalness: 0.45, flatShading: true, fog: false });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x12242f, emissive: 0x0b3444, emissiveIntensity: 0.9, roughness: 0.7, fog: false });
  const glow = new THREE.MeshBasicMaterial({ color: 0x7ce9ff, fog: false });

  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.52, 0.34), panelMat);
  panel.position.set(0, -0.48, -0.92);
  panel.rotation.x = -0.28;
  group.add(panel);

  const dials = [];
  const dialInfo = [
    { title: 'AIRSPEED', value: 'KT', x: -0.62 },
    { title: 'ALTITUDE', value: 'FT', x: 0 },
    { title: 'HEADING', value: 'HDG', x: 0.62 },
  ];
  for (const info of dialInfo) {
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 24),
      new THREE.MeshBasicMaterial({ map: cockpitTexture(info.title, info.value, 10), fog: false }),
    );
    face.position.set(info.x, -0.39, -0.775);
    face.rotation.x = -0.28;
    group.add(face);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.016, 6, 24), glow);
    bezel.position.copy(face.position);
    bezel.position.z += 0.012;
    bezel.rotation.x = -0.28;
    group.add(bezel);
    const needlePivot = new THREE.Group();
    needlePivot.position.copy(face.position);
    needlePivot.position.z += 0.022;
    needlePivot.rotation.x = -0.28;
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.17, 0.012), new THREE.MeshBasicMaterial({ color: 0xff9d72, fog: false }));
    needle.position.y = 0.07;
    needlePivot.add(needle);
    group.add(needlePivot);
    dials.push(needlePivot);
  }

  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.25, 0.07), frame);
    strut.position.set(side * 0.88, 0.02, -1.05);
    strut.rotation.z = side * 0.13;
    group.add(strut);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 1.4), frame);
    rail.position.set(side * 0.98, -0.42, -0.55);
    group.add(rail);
  }
  const topStrut = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.06, 0.08), frame);
  topStrut.position.set(0, 0.62, -1.06);
  group.add(topStrut);

  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.024, 6, 18), frame);
  yoke.position.set(0, -0.36, -0.52);
  yoke.rotation.x = 0.35;
  group.add(yoke);
  const yokeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), frame);
  yokeStem.position.set(0, -0.55, -0.6);
  yokeStem.rotation.x = 0.6;
  group.add(yokeStem);

  const glare = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.04, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x2e6879, transparent: true, opacity: 0.65, fog: false }),
  );
  glare.position.set(0, -0.21, -0.93);
  group.add(glare);

  const lamp = new THREE.PointLight(0x8ce8ff, 1.4, 2.4);
  lamp.position.set(0, -0.1, -0.3);
  group.add(lamp);

  const hudGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x7ce9ff, transparent: true, opacity: 0.12, fog: false, depthWrite: false }),
  );
  hudGlass.position.set(0, 0.05, -0.94);
  group.add(hudGlass);

  return { group, dials, yoke, lamp };
}

export function createAircraft(scene, camera, mission) {
  const body = buildBody();
  scene.add(body.group);
  const cockpit = buildCockpit();
  cockpit.group.visible = false;
  camera.add(cockpit.group);

  const trailMaterial = new THREE.LineBasicMaterial({ color: 0xc3f5ff, transparent: true, opacity: 0.55, depthWrite: false });
  const trails = [];
  for (let i = 0; i < 2; i += 1) {
    const geometry = new THREE.BufferGeometry();
    const array = new Float32Array(TRAIL_POINTS * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(array, 3));
    geometry.setDrawRange(0, 0);
    const line = new THREE.Line(geometry, trailMaterial.clone());
    line.frustumCulled = false;
    scene.add(line);
    trails.push({ line, array, count: 0 });
  }

  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(72 * 3);
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparks = new THREE.Points(
    sparkGeometry,
    new THREE.PointsMaterial({ color: 0xffb363, size: 0.7, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  sparks.frustumCulled = false;
  sparks.visible = false;
  scene.add(sparks);
  const sparkVelocities = [];
  let sparkLife = 0;

  const state = {
    pos: new THREE.Vector3(0, RUNWAY_Y + 1.45, RUNWAY_NEAR - 28),
    vel: new THREE.Vector3(0, 0, 0),
    heading: 0,
    pitch: 0,
    roll: 0,
    throttle: 0.55,
    throttleTarget: 0.55,
    gear: true,
    flaps: false,
    flying: false,
    stalled: false,
    integrity: 100,
    score: 0,
    ringIndex: 0,
    elapsed: 0,
    timeLeft: mission.time,
    message: 'THROTTLE UP · ROTATE AT 80 KT',
    messageTime: 4,
    crashed: false,
    landed: false,
  };

  const quaternion = new THREE.Quaternion();
  const forward = new THREE.Vector3(0, 0, -1);
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3(1, 0, 0);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  const prevPos = new THREE.Vector3();
  const chaseOffset = new THREE.Vector3(0, 4.4, 21);
  const cockpitOffset = new THREE.Vector3(0, 1.15, -2.4);
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let cameraMode = 'chase';
  let propAngle = 0;
  let shake = 0;

  function updateAxes() {
    euler.set(state.pitch, -state.heading, state.roll);
    quaternion.setFromEuler(euler);
    forward.set(0, 0, -1).applyQuaternion(quaternion);
    up.set(0, 1, 0).applyQuaternion(quaternion);
    right.set(1, 0, 0).applyQuaternion(quaternion);
  }

  function updateTrails(dt) {
    const visible = state.flying && state.vel.length() > 28 && !state.crashed;
    for (const trail of trails) {
      trail.line.visible = visible;
      if (!visible) continue;
      trail.array.copyWithin(3, 0, (TRAIL_POINTS - 1) * 3);
      const side = trails.indexOf(trail) === 0 ? -1 : 1;
      tmpA.copy(state.pos).addScaledVector(right, side * 7.2).addScaledVector(forward, 0.6);
      trail.array[0] = tmpA.x;
      trail.array[1] = tmpA.y;
      trail.array[2] = tmpA.z;
      trail.count = Math.min(TRAIL_POINTS, trail.count + 1);
      trail.line.geometry.setDrawRange(0, trail.count);
      trail.line.geometry.attributes.position.needsUpdate = true;
      trail.line.material.opacity = clamp(0.15 + state.vel.length() * 0.004, 0.15, 0.55);
    }
  }

  function resetTrails() {
    for (const trail of trails) {
      trail.count = 0;
      trail.array.fill(0);
      trail.line.geometry.setDrawRange(0, 0);
      trail.line.visible = false;
    }
  }

  function burst() {
    sparks.visible = true;
    sparkLife = 1.6;
    for (let i = 0; i < sparkVelocities.length; i += 1) {
      sparkVelocities[i] = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).multiplyScalar(22);
    }
  }

  function updateSparks(dt) {
    if (!sparks.visible) return;
    sparkLife -= dt;
    if (sparkLife <= 0) {
      sparks.visible = false;
      return;
    }
    for (let i = 0; i < sparkVelocities.length; i += 1) {
      const v = sparkVelocities[i];
      sparkPositions[i * 3] = state.pos.x + v.x * (1.6 - sparkLife) * 0.5;
      sparkPositions[i * 3 + 1] = state.pos.y + v.y * (1.6 - sparkLife) * 0.5 - (1.6 - sparkLife) * (1.6 - sparkLife) * 5;
      sparkPositions[i * 3 + 2] = state.pos.z + v.z * (1.6 - sparkLife) * 0.5;
      v.multiplyScalar(1 - dt * 0.8);
    }
    sparks.geometry.attributes.position.needsUpdate = true;
    sparks.material.opacity = clamp(sparkLife / 1.6, 0, 1);
  }

  function setMessage(text, duration = 2.4) {
    state.message = text;
    state.messageTime = duration;
  }

  function update(dt, controls, world, events) {
    if (state.crashed) {
      updateSparks(dt);
      updateAxes();
      return;
    }
    state.elapsed += dt;
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.messageTime = Math.max(0, state.messageTime - dt);

    state.throttle = damp(state.throttle, state.throttleTarget, 2.4, dt);
    const pitchTarget = clamp(controls.pitch, -1, 1) * 0.38;
    const rollTarget = clamp(controls.roll, -1, 1) * 0.66;
    state.pitch = damp(state.pitch, state.flying ? pitchTarget : pitchTarget * 0.28, state.flying ? 3.1 : 5, dt);
    state.roll = damp(state.roll, state.flying ? rollTarget : 0, 3.6, dt);
    const yawRate = controls.yaw * 0.42 + Math.sin(state.roll) * 0.28;
    state.heading += yawRate * dt;
    if (!state.flying) {
      state.heading = damp(state.heading, 0, 1.8, dt);
      state.pitch = damp(state.pitch, 0, 4, dt);
    }
    updateAxes();

    prevPos.copy(state.pos);
    const speed = state.vel.length();
    const thrust = state.throttle * 32;
    const drag = 0.55 + 0.0038 * speed * speed + (state.gear ? 1.8 : 0) + (state.flaps ? 1.6 : 0) + (controls.brake ? 11 : 0);
    state.vel.addScaledVector(forward, thrust * dt);
    tmpB.copy(state.vel).normalize();
    state.vel.addScaledVector(tmpB, -drag * dt);

    const stallFactor = smoothstep(17, 34, speed) * (1 - 0.45 * smoothstep(0.2, 0.48, state.pitch));
    state.stalled = stallFactor < 0.72 && state.flying;
    const lift = 0.003 * speed * speed * (1 + (state.flaps ? 0.34 : 0)) * stallFactor * Math.cos(state.roll * 0.55);
    state.vel.addScaledVector(up, lift * dt);
    state.vel.y -= 9.81 * dt;
    const wind = mission.wind * Math.sin(state.elapsed * 0.37) + mission.gust * Math.sin(state.elapsed * 1.9 + 1.2);
    state.vel.x += wind * dt;

    const forwardSpeed = state.vel.dot(forward);
    tmpC.copy(state.vel).addScaledVector(forward, -forwardSpeed);
    tmpC.multiplyScalar(Math.exp(-3.4 * dt));
    state.vel.copy(forward).multiplyScalar(forwardSpeed).add(tmpC);
    state.vel.clampLength(0, 145);
    state.pos.addScaledVector(state.vel, dt);

    const ground = world.heightAt(state.pos.x, state.pos.z) + 1.45;
    if (state.pos.y <= ground) {
      if (!state.flying) {
        state.pos.y = ground;
        state.vel.y = 0;
        const speedNow = state.vel.length();
        if (speedNow > 42 && controls.pitch > 0.42) {
          state.flying = true;
          setMessage('AIRBORNE · CLIMB TO THE FIRST GATE', 3.2);
          events.push({ type: 'liftoff' });
        }
      } else {
        const bank = Math.abs(state.roll) * DEG;
        const pitchDeg = Math.abs(state.pitch) * DEG;
        const speedNow = state.vel.length();
        const onRunway = Math.abs(state.pos.x) < RUNWAY_HALF_WIDTH - 1 && state.pos.z < RUNWAY_NEAR && state.pos.z > RUNWAY_FAR;
        const aligned = Math.abs(Math.sin(state.heading)) < 0.42;
        const safe = state.gear && onRunway && aligned && speedNow < 76 && bank < 20 && pitchDeg < 17 && state.vel.y > -6.5;
        if (safe) {
          state.flying = false;
          state.pos.y = ground;
          state.vel.y = 0;
          state.vel.multiplyScalar(0.72);
          state.throttleTarget = 0.1;
          state.landed = true;
          setMessage('TOUCHDOWN · WELCOME HOME', 3.5);
          events.push({ type: 'touchdown', complete: state.ringIndex >= world.rings.length });
        } else if (speedNow < 34 && state.gear && state.vel.y > -5 && !state.stalled) {
          state.integrity = Math.max(0, state.integrity - 22);
          state.flying = false;
          state.pos.y = ground;
          state.vel.y = 0;
          state.vel.multiplyScalar(0.35);
          setMessage('HARD LANDING · AIRFRAME DAMAGED', 3.4);
          events.push({ type: 'damage' });
        } else {
          state.integrity = 0;
          state.crashed = true;
          burst();
          events.push({ type: 'crash' });
        }
      }
    }
    if (state.pos.y < 0.6 && state.flying) {
      state.integrity = 0;
      state.crashed = true;
      burst();
      events.push({ type: 'crash' });
    }

    if (!state.crashed && state.ringIndex < world.rings.length) {
      const ring = world.rings[state.ringIndex];
      const d0 = tmpA.copy(prevPos).sub(ring.center).dot(ring.normal);
      const d1 = tmpB.copy(state.pos).sub(ring.center).dot(ring.normal);
      if (d0 > 0 && d1 <= 0) {
        const t = d0 / Math.max(0.0001, d0 - d1);
        tmpC.copy(prevPos).lerp(state.pos, t).sub(ring.center);
        if (tmpC.length() < ring.radius * 1.12) {
          const points = Math.round((900 + Math.max(0, 10 - state.timeLeft * 0.02) * 40) * mission.multiplier);
          state.score += points;
          state.ringIndex += 1;
          world.setPassed(state.ringIndex - 1, true);
          setMessage(state.ringIndex >= world.rings.length ? 'ALL GATES CLEAR · RETURN AND LAND' : `GATE ${state.ringIndex} CLEAR · +${points}`, 2.8);
          events.push({ type: 'ring', index: state.ringIndex - 1, points });
        }
      }
    }

    if (state.timeLeft <= 0 && !state.crashed) {
      state.crashed = true;
      events.push({ type: 'timeout' });
    }
    if (state.integrity <= 0 && !state.crashed) {
      state.crashed = true;
      burst();
      events.push({ type: 'crash' });
    }

    if (state.stalled && Math.random() < dt * 1.4) shake = Math.max(shake, 0.25);
    shake = Math.max(0, shake - dt * 0.9);
    propAngle += dt * (3 + state.throttle * 34);
    body.propeller.rotation.z = propAngle;
    body.gearGroup.visible = state.gear;
    body.flaps[0].rotation.x = state.flaps ? 0.42 : 0;
    body.flaps[1].rotation.x = state.flaps ? 0.42 : 0;
    body.exhaust.scale.setScalar(0.5 + state.throttle * 0.95 + Math.sin(state.elapsed * 22) * 0.07);
    body.exhaust.material.opacity = 0.2 + state.throttle * 0.45;
    body.group.position.copy(state.pos);
    body.group.quaternion.copy(quaternion);
    updateTrails(dt);
    updateSparks(dt);
  }

  function updateCamera(dt, mode, force = false) {
    cameraMode = mode;
    const cockpitMode = mode === 'cockpit';
    cockpit.group.visible = cockpitMode;
    body.group.visible = !cockpitMode;
    const shakeAmount = shake * 0.16;
    if (cockpitMode) {
      tmpA.copy(cockpitOffset).applyQuaternion(quaternion).add(state.pos);
      camera.position.copy(tmpA);
      camera.quaternion.copy(quaternion);
      camera.up.copy(up);
      if (shakeAmount > 0) {
        camera.rotateZ(Math.sin(state.elapsed * 37) * shakeAmount * 0.3);
      }
      camera.fov = 74 + clamp(state.vel.length() * 0.045, 0, 5);
    } else {
      desiredCamera.copy(chaseOffset).applyQuaternion(quaternion).add(state.pos);
      if (force) camera.position.copy(desiredCamera);
      else camera.position.lerp(desiredCamera, 1 - Math.exp(-5.5 * dt));
      if (shakeAmount > 0) camera.position.x += Math.sin(state.elapsed * 41) * shakeAmount;
      camera.up.set(0, 1, 0).lerp(up, 0.32).normalize();
      lookTarget.copy(state.pos).addScaledVector(forward, 11).addScaledVector(up, 1.6);
      camera.lookAt(lookTarget);
      camera.fov = 68 + clamp(state.vel.length() * 0.07, 0, 8);
    }
    camera.updateProjectionMatrix();
    cockpit.dials[0].rotation.z = -clamp(state.vel.length() * 1.94 / 180, 0, 1) * 4.5 + 2.25;
    cockpit.dials[1].rotation.z = -clamp((state.pos.y - RUNWAY_Y) * 3.28084 / 2200, 0, 1) * 4.5 + 2.25;
    cockpit.dials[2].rotation.z = -(state.heading / 360) * Math.PI * 2;
    cockpit.yoke.rotation.z = -state.roll * 0.5;
  }

  return {
    state,
    update,
    updateCamera,
    updateAxes,
    reset() {
      state.pos.set(0, RUNWAY_Y + 1.45, RUNWAY_NEAR - 28);
      state.vel.set(0, 0, 0);
      state.heading = 0;
      state.pitch = 0;
      state.roll = 0;
      state.throttle = 0.55;
      state.throttleTarget = 0.55;
      state.gear = true;
      state.flaps = false;
      state.flying = false;
      state.stalled = false;
      state.integrity = 100;
      state.score = 0;
      state.ringIndex = 0;
      state.elapsed = 0;
      state.timeLeft = mission.time;
      state.message = 'THROTTLE UP · ROTATE AT 80 KT';
      state.messageTime = 4;
      state.crashed = false;
      state.landed = false;
      shake = 0;
      sparks.visible = false;
      resetTrails();
      updateAxes();
      body.group.position.copy(state.pos);
      body.group.quaternion.copy(quaternion);
    },
    setCameraMode(mode, dt = 0) {
      updateCamera(dt || STEP_PLACEHOLDER, mode, true);
    },
    adjustThrottle(delta) {
      state.throttleTarget = clamp(state.throttleTarget + delta, 0, 1);
    },
    toggleGear() {
      state.gear = !state.gear;
      return state.gear;
    },
    toggleFlaps() {
      state.flaps = !state.flaps;
      return state.flaps;
    },
    burst,
    dispose() {
      scene.remove(body.group);
      for (const trail of trails) {
        scene.remove(trail.line);
        trail.line.geometry.dispose();
        trail.line.material.dispose();
      }
      scene.remove(sparks);
      camera.remove(cockpit.group);
    },
  };
}

const STEP_PLACEHOLDER = 1 / 60;
