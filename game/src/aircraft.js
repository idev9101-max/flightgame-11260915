import * as THREE from './engine.js';
import { RUNWAY_FAR, RUNWAY_HALF_WIDTH, RUNWAY_NEAR, RUNWAY_Y } from './config.js';
import { clamp, damp, smoothstep } from './random.js';

const DEG = 180 / Math.PI;
const TRAIL_POINTS = 70;

const PANEL_W = 1024;
const PANEL_H = 512;

function padNumber(value, digits) {
  const safe = Number.isFinite(value) ? Math.round(value) : 0;
  return String(Math.max(0, safe)).padStart(digits, '0');
}

function createPanel(mission) {
  const canvas = document.createElement('canvas');
  canvas.width = PANEL_W;
  canvas.height = PANEL_H;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  let lastPaint = -1;

  function box(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function bezel(cx, cy, r) {
    const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    rim.addColorStop(0, '#69808a');
    rim.addColorStop(0.45, '#25363e');
    rim.addColorStop(1, '#0d1a21');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#09151c';
    ctx.fill();
  }

  function face(cx, cy, r) {
    bezel(cx, cy, r);
    const glass = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
    glass.addColorStop(0, '#152a34');
    glass.addColorStop(1, '#07131a');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 198, 214, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function label(text, x, y, size = 17, color = '#8fb4c3', align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px ui-monospace, "SFMono-Regular", Consolas, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function base() {
    const grad = ctx.createLinearGradient(0, 0, 0, PANEL_H);
    grad.addColorStop(0, '#22323a');
    grad.addColorStop(0.42, '#15242c');
    grad.addColorStop(1, '#09141b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, PANEL_W, PANEL_H);
    ctx.strokeStyle = 'rgba(168, 205, 218, 0.09)';
    ctx.lineWidth = 2;
    for (let x = 18; x < PANEL_W; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PANEL_H);
      ctx.stroke();
    }
    for (const x of [16, PANEL_W - 16]) {
      for (const y of [18, PANEL_H - 18]) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#3b4e56';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#101c22';
        ctx.fill();
      }
    }
    const sheen = ctx.createLinearGradient(0, 0, PANEL_W, 260);
    sheen.addColorStop(0, 'rgba(185, 226, 240, 0.10)');
    sheen.addColorStop(0.42, 'rgba(185, 226, 240, 0.02)');
    sheen.addColorStop(1, 'rgba(185, 226, 240, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, PANEL_W, 290);
  }

  function roundGauge(cx, cy, r, title, readout, fraction, needleFraction) {
    face(cx, cy, r);
    const start = Math.PI * 0.75;
    const sweep = Math.PI * 1.5;
    for (let i = 0; i <= 40; i += 1) {
      const a = start + (i / 40) * sweep;
      const major = i % 5 === 0;
      ctx.strokeStyle = major ? '#d3e4e9' : '#7997a3';
      ctx.lineWidth = major ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - (major ? 20 : 14)), cy + Math.sin(a) * (r - (major ? 20 : 14)));
      ctx.lineTo(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7));
      ctx.stroke();
    }
    label(title, cx, cy - 38, 18, '#a7c8d4');
    box(cx - 47, cy + 22, 94, 32, 7, '#061118', 'rgba(124, 178, 198, 0.4)');
    label(readout, cx, cy + 39, 21, '#ffe0a6');
    const a = start + clamp(needleFraction, 0, 1) * sweep;
    ctx.strokeStyle = '#ffb476';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * 10, cy - Math.sin(a) * 10);
    ctx.lineTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#d6e6eb';
    ctx.fill();
    void fraction;
  }

  function attitude(cx, cy, r, pitchDeg, rollRad) {
    bezel(cx, cy, r);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-rollRad);
    const horizon = clamp(pitchDeg, -40, 40) * 2.35;
    const sky = ctx.createLinearGradient(0, -r, 0, horizon);
    sky.addColorStop(0, '#1c4c7c');
    sky.addColorStop(1, '#8dbbd4');
    ctx.fillStyle = sky;
    ctx.fillRect(-r, -r, r * 2, r + horizon);
    const ground = ctx.createLinearGradient(0, horizon, 0, r);
    ground.addColorStop(0, '#a06e42');
    ground.addColorStop(1, '#4d3120');
    ctx.fillStyle = ground;
    ctx.fillRect(-r, horizon, r * 2, r * 2);
    ctx.strokeStyle = '#f2d8a3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r, horizon);
    ctx.lineTo(r, horizon);
    ctx.stroke();
    for (let deg = -30; deg <= 30; deg += 10) {
      if (deg === 0) continue;
      const y = horizon - deg * 2.35;
      if (Math.abs(y) > r - 8) continue;
      ctx.strokeStyle = 'rgba(245, 235, 210, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24, y);
      ctx.lineTo(24, y);
      ctx.stroke();
      label(String(Math.abs(deg)), 34, y, 13, '#f7e7c5');
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#9dbcc7';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#ffd48a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.52, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(r * 0.52, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd48a';
    ctx.fill();
    for (let deg = -60; deg <= 60; deg += 15) {
      const a = -Math.PI / 2 + (deg * Math.PI) / 180;
      ctx.strokeStyle = deg === 0 ? '#ffe0a6' : 'rgba(190, 216, 226, 0.8)';
      ctx.lineWidth = deg === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r - 14), Math.sin(a) * (r - 14));
      ctx.lineTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5));
      ctx.stroke();
    }
    ctx.rotate(-rollRad);
    ctx.fillStyle = '#ffcf70';
    ctx.beginPath();
    ctx.moveTo(0, -r + 12);
    ctx.lineTo(-7, -r + 25);
    ctx.lineTo(7, -r + 25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    label('ATTITUDE', cx, cy + r - 14, 15, '#c8dde4');
  }

  function verticalSpeed(cx, cy, r, fpm) {
    face(cx, cy, r);
    for (let i = -4; i <= 4; i += 1) {
      const a = -Math.PI / 2 + (i / 4) * Math.PI * 0.72;
      ctx.strokeStyle = i === 0 ? '#d9e8ec' : '#7f9da8';
      ctx.lineWidth = i === 0 ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 17), cy + Math.sin(a) * (r - 17));
      ctx.lineTo(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7));
      ctx.stroke();
    }
    const fraction = clamp(fpm / 2000, -1, 1);
    const a = -Math.PI / 2 + fraction * Math.PI * 0.72;
    ctx.strokeStyle = '#ffbe7a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 15), cy + Math.sin(a) * (r - 15));
    ctx.stroke();
    label('V/S', cx, cy - 26, 16, '#a7c8d4');
    box(cx - 39, cy + 16, 78, 26, 6, '#061118', 'rgba(124, 178, 198, 0.4)');
    label(`${fpm >= 0 ? '+' : '-'}${padNumber(Math.abs(fpm), 3)}`, cx, cy + 30, 17, fpm < -800 ? '#ff9982' : '#ffe0a6');
  }

  function headingTape(x, y, w, h, heading) {
    box(x, y, w, h, 12, '#07141b', 'rgba(142, 194, 212, 0.42)');
    label('HDG', x + 34, y + h / 2, 17, '#a7c8d4');
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 78, y + 6, w - 110, h - 12);
    ctx.clip();
    const center = x + 78 + (w - 110) / 2;
    for (let d = -70; d <= 70; d += 5) {
      const deg = ((heading + d) % 360 + 360) % 360;
      const px = center + d * 3.4;
      const major = deg % 10 === 0;
      ctx.strokeStyle = major ? '#d6e7ec' : '#6f8f9c';
      ctx.lineWidth = major ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(px, y + h - 15);
      ctx.lineTo(px, y + h - (major ? 27 : 21));
      ctx.stroke();
      if (deg % 30 === 0) {
        const cardinal = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[deg];
        label(cardinal ?? String(deg), px, y + 21, cardinal ? 19 : 16, cardinal ? '#ffcf70' : '#c6dce4');
      }
    }
    ctx.restore();
    ctx.fillStyle = '#ffcf70';
    ctx.beginPath();
    ctx.moveTo(center, y + h - 6);
    ctx.lineTo(center - 8, y + h - 19);
    ctx.lineTo(center + 8, y + h - 19);
    ctx.closePath();
    ctx.fill();
    box(x + w - 88, y + 5, 80, h - 10, 10, '#0d2029', 'rgba(142, 194, 212, 0.42)');
    label(`${padNumber(heading, 3)}°`, x + w - 48, y + h / 2, 23, '#ffe0a6');
  }

  function warnLight(x, y, w, h, text, active, color) {
    box(x, y, w, h, 7, active ? color : '#0c1b22', active ? color : 'rgba(124, 168, 188, 0.36)');
    label(text, x + w / 2, y + h / 2, 16, active ? '#09151a' : '#7f9dab');
  }

  function draw(data, force) {
    const elapsed = data.elapsed ?? 0;
    if (!force && elapsed - lastPaint < 0.06) return;
    lastPaint = elapsed;
    const speed = Number.isFinite(data.speed) ? data.speed : 0;
    const alt = Number.isFinite(data.alt) ? data.alt : 0;
    const heading = Number.isFinite(data.heading) ? data.heading : 0;
    const vsi = Number.isFinite(data.vsi) ? data.vsi : 0;
    const throttle = Number.isFinite(data.throttle) ? data.throttle : 0;
    const pitchDeg = Number.isFinite(data.pitch) ? data.pitch : 0;
    const rollRad = Number.isFinite(data.roll) ? data.roll : 0;
    const stall = Boolean(data.stall);
    const gear = Boolean(data.gear);
    const flaps = Boolean(data.flaps);
    const rollDeg = Math.abs(rollRad * 180 / Math.PI);
    base();

    box(24, 18, 332, 62, 10, '#071720', 'rgba(109, 208, 232, 0.4)');
    label('NAV / NEXT GATE', 44, 38, 16, '#8fb4c3', 'left');
    label(`GATE ${padNumber(data.gateIndex ?? 0, 2)}`, 44, 62, 22, '#ffe0a6', 'left');
    label(`BRG ${padNumber(data.bearing ?? 0, 3)}°`, 205, 38, 18, '#9fe9fa', 'left');
    label(`RNG ${Math.round(data.range ?? 0)} m`, 205, 62, 18, '#9fe9fa', 'left');

    box(668, 18, 332, 62, 10, '#071720', 'rgba(142, 194, 212, 0.36)');
    label(String(data.missionName ?? 'FLIGHT PLAN').slice(0, 18), 686, 38, 17, '#ffcf70', 'left');
    label(`T+ ${padNumber(data.timeLeft ?? 0, 3)} s`, 686, 62, 18, '#d5e8ee', 'left');
    label(`WIND ${(data.wind ?? 0).toFixed(1)}`, 978, 62, 17, '#a7c8d4', 'right');

    roundGauge(150, 184, 75, 'AIRSPEED', `${padNumber(speed, 3)} KT`, clamp(speed / 180, 0, 1), clamp(speed / 180, 0, 1));
    attitude(370, 184, 90, pitchDeg, rollRad);
    verticalSpeed(585, 184, 57, vsi);
    roundGauge(825, 184, 75, 'ALTITUDE', `${padNumber(alt, 4)} FT`, clamp(alt / 2500, 0, 1), (alt / 1000) % 1);

    headingTape(24, 300, 640, 72, heading);

    box(694, 300, 306, 72, 10, '#0b1b23', 'rgba(142, 194, 212, 0.3)');
    warnLight(706, 312, 92, 22, 'STALL', stall && Math.floor(elapsed * 4) % 2 === 0, '#ff6e62');
    warnLight(806, 312, 92, 22, 'GEAR', !gear && alt < 600, '#ffc264');
    warnLight(906, 312, 82, 22, 'BANK', rollDeg > 24, '#ffc264');
    warnLight(706, 344, 92, 22, 'SINK', vsi < -800, '#ff9978');
    warnLight(806, 344, 192, 22, gear ? 'GEAR DOWN' : 'GEAR UP', true, '#59dba0');

    box(24, 390, 430, 92, 12, '#0a1920', 'rgba(142, 194, 212, 0.32)');
    label('THROTTLE', 46, 412, 16, '#9fbfcb', 'left');
    box(46, 430, 264, 18, 8, '#050e14', 'rgba(124, 178, 198, 0.35)');
    ctx.fillStyle = throttle > 0.82 ? '#ffbc6e' : '#61d9c2';
    ctx.fillRect(49, 433, 258 * clamp(throttle, 0, 1), 12);
    label(`${Math.round(throttle * 100)}%`, 344, 440, 22, '#ffe0a6', 'left');
    label(`RPM ${padNumber(700 + throttle * 1900, 4)}`, 46, 466, 15, '#8fb4c3', 'left');
    label('FLAPS', 210, 466, 15, '#8fb4c3', 'left');
    label(flaps ? 'DOWN' : 'UP', 282, 466, 17, flaps ? '#ffcf70' : '#a7c8d4', 'left');

    box(478, 390, 522, 92, 12, '#0a1920', 'rgba(142, 194, 212, 0.32)');
    label('LANDING GEAR', 500, 412, 16, '#9fbfcb', 'left');
    for (let i = 0; i < 3; i += 1) {
      const x = 624 + i * 34;
      ctx.beginPath();
      ctx.arc(x, 440, 10, 0, Math.PI * 2);
      ctx.fillStyle = gear ? '#59dba0' : '#263b45';
      ctx.fill();
      ctx.strokeStyle = gear ? '#b6ffe0' : '#4b6672';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    label(gear ? 'DOWN & LOCKED' : 'UP', 754, 440, 19, gear ? '#a8f5cf' : '#ffc264', 'left');
    label(`AIRFRAME ${padNumber(data.integrity ?? 100, 3)}%`, 500, 466, 15, '#8fb4c3', 'left');
    label(`SCORE ${padNumber(data.score ?? 0, 6)}`, 978, 466, 15, '#8fb4c3', 'right');

    ctx.save();
    ctx.globalAlpha = 0.045;
    ctx.translate(-70, 0);
    ctx.rotate(-0.32);
    ctx.fillStyle = '#d6f6ff';
    ctx.fillRect(110, -100, 58, 760);
    ctx.fillRect(210, -100, 12, 760);
    ctx.restore();
    texture.version += 1;
  }

  return { texture, draw };
}

function buildBody() {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0xfff8e8, roughness: 0.44, metalness: 0.16, flatShading: true, emissive: 0x3c2b1c, emissiveIntensity: 0.3 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xf06a45, roughness: 0.46, metalness: 0.24, flatShading: true, emissive: 0x5b1d10, emissiveIntensity: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c2a34, roughness: 0.68, metalness: 0.34, flatShading: true });

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

  const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(13.8, 0.08, 0.5), accent);
  wingStripe.position.set(0, -0.17, -0.3);
  group.add(wingStripe);
  const leadingEdge = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.12, 0.24), paint);
  leadingEdge.position.set(0, -0.24, -1.15);
  group.add(leadingEdge);
  const bellyStripe = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 8.8), accent);
  bellyStripe.position.set(0, -0.72, 0.1);
  group.add(bellyStripe);

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
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x29343a, roughness: 0.5, metalness: 0.4, flatShading: true, emissive: 0x122c36, emissiveIntensity: 0.5 });
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.1, 0.1), bladeMaterial);
    blade.rotation.z = (i / 3) * Math.PI;
    propeller.add(blade);
  }
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1, 8), accent);
  hub.rotation.x = -Math.PI / 2;
  propeller.add(hub);
  propeller.position.z = -8.5;
  group.add(propeller);
  const propDisc = new THREE.Mesh(
    new THREE.CircleGeometry(2.05, 20),
    new THREE.MeshBasicMaterial({ color: 0xd6f4ff, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide }),
  );
  propDisc.position.z = -8.58;
  group.add(propDisc);

  const haloMaterialA = new THREE.MeshBasicMaterial({ color: 0xff5c68, transparent: true, opacity: 0.24, depthWrite: false, fog: false });
  const haloMaterialB = new THREE.MeshBasicMaterial({ color: 0x6dffb0, transparent: true, opacity: 0.24, depthWrite: false, fog: false });
  const leftLight = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff4d5e, fog: false }));
  leftLight.position.set(-7.55, -0.28, 0);
  const rightLight = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), new THREE.MeshBasicMaterial({ color: 0x65ffa8, fog: false }));
  rightLight.position.set(7.55, -0.28, 0);
  const leftHalo = new THREE.Mesh(new THREE.SphereGeometry(0.92, 8, 6), haloMaterialA);
  leftHalo.position.copy(leftLight.position);
  const rightHalo = new THREE.Mesh(new THREE.SphereGeometry(0.92, 8, 6), haloMaterialB);
  rightHalo.position.copy(rightLight.position);
  const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  tailLight.position.set(0, 0.9, 7.5);
  group.add(leftLight, rightLight, leftHalo, rightHalo, tailLight);

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

function buildCockpit(mission) {
  const group = new THREE.Group();
  const panel = createPanel(mission);
  const shell = new THREE.MeshStandardMaterial({ color: 0x1c2c34, roughness: 0.72, metalness: 0.28, flatShading: true, emissive: 0x07131a, emissiveIntensity: 0.5, fog: false });
  const trim = new THREE.MeshStandardMaterial({ color: 0x42545c, roughness: 0.58, metalness: 0.45, flatShading: true, fog: false });
  const edge = new THREE.MeshBasicMaterial({ color: 0x7d9aa4, fog: false });

  const backing = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.76, 0.18), shell);
  backing.position.set(0, -0.47, -1.2);
  backing.rotation.x = -0.2;
  group.add(backing);

  const instrumentMaterial = new THREE.MeshBasicMaterial({ map: panel.texture, fog: false, side: THREE.DoubleSide });
  instrumentMaterial.color.multiplyScalar(3.1);
  const instruments = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 0.68),
    instrumentMaterial,
  );
  instruments.position.set(0, -0.47, -1.1);
  instruments.rotation.x = -0.2;
  group.add(instruments);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.98, 0.66),
    new THREE.MeshBasicMaterial({ color: 0xaee6fa, transparent: true, opacity: 0.045, fog: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  glass.position.set(0, -0.465, -1.085);
  glass.rotation.x = -0.2;
  group.add(glass);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.1, 0.26), shell);
  hood.position.set(0, -0.09, -0.99);
  hood.rotation.x = -0.2;
  group.add(hood);
  const hoodLip = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.015, 0.025), edge);
  hoodLip.position.set(0, -0.035, -0.87);
  group.add(hoodLip);

  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 1.15, 0.075), shell);
    pillar.position.set(side * 0.88, 0.05, -1.12);
    pillar.rotation.z = side * 0.16;
    group.add(pillar);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 1.25), shell);
    sill.position.set(side * 0.99, -0.27, -0.55);
    group.add(sill);
    const windowGlint = new THREE.Mesh(
      new THREE.PlaneGeometry(0.018, 0.42),
      new THREE.MeshBasicMaterial({ color: 0xc2eaf6, transparent: true, opacity: 0.12, fog: false, depthWrite: false, side: THREE.DoubleSide }),
    );
    windowGlint.position.set(side * 0.72, 0.22, -1.13);
    windowGlint.rotation.z = side * 0.42;
    group.add(windowGlint);
  }
  const bow = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.055, 0.075), shell);
  bow.position.set(0, 0.58, -1.13);
  group.add(bow);
  const bowTrim = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.012, 0.02), trim);
  bowTrim.position.set(0, 0.545, -1.08);
  group.add(bowTrim);

  const yoke = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.045, 0.045), trim);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), shell);
  stem.position.y = -0.11;
  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.08), shell);
  yoke.add(grip, stem, hub);
  yoke.position.set(0, -0.33, -0.56);
  yoke.rotation.x = -0.3;
  group.add(yoke);

  const quadrant = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.16), shell);
  quadrant.position.set(0.75, -0.35, -0.78);
  group.add(quadrant);
  const throttle = new THREE.Group();
  throttle.position.set(0.75, -0.29, -0.76);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.17, 0.045), trim);
  lever.position.y = 0.075;
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, 0.07), shell);
  knob.position.y = 0.16;
  throttle.add(lever, knob);
  group.add(throttle);

  panel.draw({
    speed: 0, alt: 0, heading: 0, vsi: 0, throttle: 0.55, pitch: 0, roll: 0,
    stall: false, gear: true, flaps: false, gateIndex: 1, bearing: 0, range: 0,
    timeLeft: mission?.time ?? 0, missionName: mission?.name ?? 'FLIGHT PLAN',
    integrity: 100, score: 0, elapsed: 0, wind: mission?.wind ?? 0,
  }, true);

  return { group, panel, yoke, throttle };
}

export function createAircraft(scene, camera, mission) {
  const body = buildBody();
  scene.add(body.group);
  const cockpit = buildCockpit(mission);
  cockpit.group.visible = false;
  camera.add(cockpit.group);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(5, 18),
    new THREE.MeshBasicMaterial({ color: 0x071218, transparent: true, opacity: 0.24, depthWrite: false, fog: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.frustumCulled = false;
  scene.add(shadow);

  const trailMaterial = new THREE.LineBasicMaterial({ color: 0xa7f4ff, transparent: true, opacity: 0.7, depthWrite: false, fog: false });
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
  const chaseOffset = new THREE.Vector3(0, 3.2, 16.5);
  const cockpitOffset = new THREE.Vector3(0, 1.15, -2.4);
  const desiredCamera = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  let propAngle = 0;
  let shake = 0;
  let activeWorld = null;

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
      tmpA.copy(state.pos).addScaledVector(right, side * 7.55).addScaledVector(forward, 0.5).addScaledVector(up, -0.2);
      trail.array[0] = tmpA.x;
      trail.array[1] = tmpA.y;
      trail.array[2] = tmpA.z;
      trail.count = Math.min(TRAIL_POINTS, trail.count + 1);
      trail.line.geometry.setDrawRange(0, trail.count);
      trail.line.geometry.attributes.position.needsUpdate = true;
      trail.line.material.opacity = clamp(0.32 + state.vel.length() * 0.005, 0.32, 0.82);
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

  function updateShadow(world) {
    const ground = world.heightAt(state.pos.x, state.pos.z);
    const altitude = Math.max(0, state.pos.y - ground);
    shadow.position.set(state.pos.x, ground + 0.12, state.pos.z);
    const scale = 1 + clamp(altitude * 0.035, 0, 1.6);
    shadow.scale.set(scale, scale, scale);
    shadow.material.opacity = clamp(0.3 - altitude * 0.004, 0.04, 0.3);
    shadow.visible = altitude < 90 && !state.crashed;
  }

  function seedMotion() {
    propAngle = 0.72;
    body.propeller.rotation.z = propAngle;
    const speed = state.vel.length();
    for (let i = 0; i < trails.length; i += 1) {
      const trail = trails[i];
      const side = i === 0 ? -1 : 1;
      for (let point = 0; point < TRAIL_POINTS; point += 1) {
        tmpA.copy(state.pos).addScaledVector(right, side * 7.55).addScaledVector(forward, 0.5 - point * 0.6);
        tmpA.addScaledVector(up, -0.2 + Math.sin(point * 0.42 + side) * 0.28);
        trail.array[point * 3] = tmpA.x;
        trail.array[point * 3 + 1] = tmpA.y;
        trail.array[point * 3 + 2] = tmpA.z;
      }
      trail.count = TRAIL_POINTS;
      trail.line.geometry.setDrawRange(0, TRAIL_POINTS);
      trail.line.geometry.attributes.position.needsUpdate = true;
      trail.line.visible = state.flying && speed > 28 && !state.crashed;
      trail.line.material.opacity = clamp(0.32 + speed * 0.005, 0.32, 0.82);
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
    activeWorld = world;
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
    updateShadow(world);
    updateTrails(dt);
    updateSparks(dt);
  }

  function updateCamera(dt, mode, force = false) {
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
      lookTarget.copy(state.pos).addScaledVector(forward, 8.5).addScaledVector(up, 1.1);
      camera.lookAt(lookTarget);
      camera.fov = 62 + clamp(state.vel.length() * 0.045, 0, 5);
    }
    camera.updateProjectionMatrix();
    if (!cockpitMode) return;
    const speedKts = state.vel.length() * 1.94384;
    const altFt = Math.max(-20, (state.pos.y - RUNWAY_Y) * 3.28084);
    const headingDeg = ((state.heading * DEG) % 360 + 360) % 360;
    const nextRing = activeWorld?.rings?.[state.ringIndex];
    let bearing = 0;
    let range = 0;
    if (nextRing) {
      const dx = nextRing.center.x - state.pos.x;
      const dz = nextRing.center.z - state.pos.z;
      range = Math.hypot(dx, dz);
      bearing = ((Math.atan2(dx, -dz) * DEG - headingDeg) % 360 + 540) % 360;
      if (bearing > 180) bearing -= 360;
    }
    cockpit.panel.draw({
      speed: speedKts,
      alt: altFt,
      heading: headingDeg,
      vsi: state.vel.y * 196.85,
      throttle: state.throttle,
      pitch: state.pitch * DEG,
      roll: state.roll,
      stall: state.stalled,
      gear: state.gear,
      flaps: state.flaps,
      gateIndex: state.ringIndex + 1,
      bearing,
      range,
      timeLeft: state.timeLeft,
      missionName: mission.name,
      integrity: state.integrity,
      score: state.score,
      elapsed: state.elapsed,
      wind: mission.wind + Math.sin(state.elapsed * 1.7) * mission.gust,
    }, force || dt === 0);
    cockpit.yoke.rotation.z = -state.roll * 0.5;
    cockpit.throttle.rotation.z = 0.55 - state.throttle * 1.1;
  }

  return {
    state,
    update,
    updateCamera,
    updateAxes,
    syncShot(world, mode) {
      activeWorld = world;
      body.group.position.copy(state.pos);
      body.group.quaternion.copy(quaternion);
      body.gearGroup.visible = state.gear;
      updateShadow(world);
      seedMotion();
      updateCamera(0, mode, true);
    },
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
      shadow.visible = false;
      resetTrails();
      updateAxes();
      body.group.position.copy(state.pos);
      body.group.quaternion.copy(quaternion);
    },
    setCameraMode(mode, dt = 0) {
      updateCamera(dt, mode, true);
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
      scene.remove(shadow);
      shadow.geometry.dispose();
      shadow.material.dispose();
      camera.remove(cockpit.group);
      cockpit.panel.texture.dispose();
    },
  };
}
