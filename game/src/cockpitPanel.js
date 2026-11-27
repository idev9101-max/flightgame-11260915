import * as THREE from '../vendor/engine.js';
import { clamp } from '../vendor/random.js';

const PANEL_WIDTH = 1024;
const PANEL_HEIGHT = 512;
const MONO_FACE = 'ui-monospace, "SFMono-Regular", Consolas, monospace';

function numeric(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function padded(value, digits) {
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;
  return String(Math.max(0, rounded)).padStart(digits, '0');
}

function clock(value) {
  const total = Math.max(0, Math.round(numeric(value)));
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const COMPASS_POINTS = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

export function createPanel(mission) {
  const canvas = document.createElement('canvas');
  canvas.width = PANEL_WIDTH;
  canvas.height = PANEL_HEIGHT;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  if (THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  let lastPaint = -1;

  function roundedBox(x, y, w, h, radius, fill, stroke) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
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

  function glowText(text, x, y, size = 18, color = '#b9dce8', align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px ${MONO_FACE}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = size >= 19 ? 12 : 6;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  function metalBezel(cx, cy, radius) {
    const rim = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    rim.addColorStop(0, '#98b3bf');
    rim.addColorStop(0.45, '#3a5664');
    rim.addColorStop(1, '#142831');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 9, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#0a1b24';
    ctx.fill();
  }

  function gaugeFace(cx, cy, radius) {
    metalBezel(cx, cy, radius);
    const glass = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
    glass.addColorStop(0, '#376e84');
    glass.addColorStop(1, '#153444');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.strokeStyle = 'rgba(178, 230, 248, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function radialTicks(cx, cy, radius, ticks, isMajor, majorInset, minorInset, ink) {
    for (const tick of ticks) {
      const major = isMajor(tick.step);
      const angle = tick.angle;
      const inner = radius - (major ? majorInset : minorInset);
      ctx.strokeStyle = major ? ink.major : ink.minor;
      ctx.lineWidth = major ? ink.majorWidth : ink.minorWidth;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * (radius - 7), cy + Math.sin(angle) * (radius - 7));
      ctx.stroke();
    }
  }

  function needle(cx, cy, angle, tailLength, tipRadius, ink, width) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(angle) * tailLength, cy - Math.sin(angle) * tailLength);
    ctx.lineTo(cx + Math.cos(angle) * tipRadius, cy + Math.sin(angle) * tipRadius);
    ctx.stroke();
  }

  function paintBackdrop() {
    const body = ctx.createLinearGradient(0, 0, 0, PANEL_HEIGHT);
    body.addColorStop(0, '#55798a');
    body.addColorStop(0.38, '#2d4d5d');
    body.addColorStop(1, '#183440');
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

    const wash = ctx.createLinearGradient(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    wash.addColorStop(0, 'rgba(255,204,139,0.12)');
    wash.addColorStop(0.5, 'rgba(130,232,255,0.06)');
    wash.addColorStop(1, 'rgba(255,165,108,0.1)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);

    ctx.strokeStyle = 'rgba(186, 225, 240, 0.11)';
    ctx.lineWidth = 2;
    for (let x = 18; x < PANEL_WIDTH; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, PANEL_HEIGHT);
      ctx.stroke();
    }

    const sheen = ctx.createLinearGradient(0, 0, PANEL_WIDTH, 280);
    sheen.addColorStop(0, 'rgba(205, 241, 255, 0.14)');
    sheen.addColorStop(0.5, 'rgba(205, 241, 255, 0.03)');
    sheen.addColorStop(1, 'rgba(205, 241, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, PANEL_WIDTH, 300);
  }

  function roundGauge(cx, cy, radius, title, readout, fraction) {
    gaugeFace(cx, cy, radius);
    const dialStart = Math.PI * 0.75;
    const dialSweep = Math.PI * 1.5;
    const ticks = Array.from({ length: 41 }, (_, i) => ({ step: i, angle: dialStart + (i / 40) * dialSweep }));
    radialTicks(cx, cy, radius, ticks, (step) => step % 5 === 0, 20, 14, {
      major: '#e8f6f9', minor: '#a0c2ce', majorWidth: 4, minorWidth: 2,
    });
    glowText(title, cx, cy - 40, 19, '#c7e6f0');
    roundedBox(cx - 52, cy + 22, 104, 36, 8, '#06131a', 'rgba(150, 208, 228, 0.5)');
    glowText(readout, cx, cy + 41, 24, '#fff4cf');
    needle(cx, cy, dialStart + clamp(fraction, 0, 1) * dialSweep, 10, radius - 12, '#ffc07e', 5);
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#e6f4f7';
    ctx.fill();
  }

  function attitude(cx, cy, radius, pitchDeg, rollRad) {
    metalBezel(cx, cy, radius);
    const pitchStep = 2.35;
    const horizon = clamp(pitchDeg, -40, 40) * pitchStep;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-rollRad);
    const sky = ctx.createLinearGradient(0, -radius, 0, horizon);
    sky.addColorStop(0, '#245f96');
    sky.addColorStop(1, '#a9d8ea');
    ctx.fillStyle = sky;
    ctx.fillRect(-radius, -radius, radius * 2, radius + horizon);
    const ground = ctx.createLinearGradient(0, horizon, 0, radius);
    ground.addColorStop(0, '#c38a51');
    ground.addColorStop(1, '#68412a');
    ctx.fillStyle = ground;
    ctx.fillRect(-radius, horizon, radius * 2, radius * 2);
    ctx.strokeStyle = '#fff1c9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-radius, horizon);
    ctx.lineTo(radius, horizon);
    ctx.stroke();
    for (let deg = -30; deg <= 30; deg += 10) {
      if (deg === 0) continue;
      const y = horizon - deg * pitchStep;
      if (Math.abs(y) > radius - 8) continue;
      ctx.strokeStyle = 'rgba(255, 245, 220, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-24, y);
      ctx.lineTo(24, y);
      ctx.stroke();
      glowText(String(Math.abs(deg)), 35, y, 14, '#fff3d4');
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#b7dce8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#ffdc93';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.52, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(radius * 0.52, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdc93';
    ctx.fill();
    for (let deg = -60; deg <= 60; deg += 15) {
      const angle = -Math.PI / 2 + (deg * Math.PI) / 180;
      ctx.strokeStyle = deg === 0 ? '#ffe5b2' : 'rgba(210, 234, 242, 0.86)';
      ctx.lineWidth = deg === 0 ? 5 : 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (radius - 14), Math.sin(angle) * (radius - 14));
      ctx.lineTo(Math.cos(angle) * (radius - 5), Math.sin(angle) * (radius - 5));
      ctx.stroke();
    }
    ctx.rotate(-rollRad);
    ctx.fillStyle = '#ffd57a';
    ctx.beginPath();
    ctx.moveTo(0, -radius + 12);
    ctx.lineTo(-8, -radius + 27);
    ctx.lineTo(8, -radius + 27);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    glowText('ATTITUDE', cx, cy + radius - 14, 16, '#d7edf4');
  }

  function verticalSpeed(cx, cy, radius, fpm) {
    gaugeFace(cx, cy, radius);
    const sweep = Math.PI * 0.72;
    const ticks = Array.from({ length: 9 }, (_, i) => ({
      step: i - 4,
      angle: -Math.PI / 2 + ((i - 4) / 4) * sweep,
    }));
    radialTicks(cx, cy, radius, ticks, (step) => step === 0, 17, 17, {
      major: '#e6f3f6', minor: '#9bbcc8', majorWidth: 3, minorWidth: 2,
    });
    needle(cx, cy, -Math.PI / 2 + clamp(fpm / 2000, -1, 1) * sweep, 0, radius - 15, '#ffc982', 5);
    glowText('V/S', cx, cy - 28, 17, '#c1e1eb');
    roundedBox(cx - 41, cy + 16, 82, 28, 6, '#06131a', 'rgba(150, 208, 228, 0.5)');
    const signed = `${fpm >= 0 ? '+' : '-'}${padded(Math.abs(fpm), 3)}`;
    glowText(signed, cx, cy + 31, 18, fpm < -800 ? '#ff9e83' : '#ffe8b6');
  }

  function headingTape(x, y, w, h, heading) {
    roundedBox(x, y, w, h, 12, '#071822', 'rgba(164, 216, 235, 0.52)');
    glowText('HDG', x + 38, y + h / 2, 19, '#c1e1eb');
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 82, y + 6, w - 116, h - 12);
    ctx.clip();
    const center = x + 82 + (w - 116) / 2;
    for (let offset = -70; offset <= 70; offset += 5) {
      const degree = ((heading + offset) % 360 + 360) % 360;
      const px = center + offset * 3.4;
      const major = degree % 10 === 0;
      ctx.strokeStyle = major ? '#e2f1f5' : '#8badba';
      ctx.lineWidth = major ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(px, y + h - 15);
      ctx.lineTo(px, y + h - (major ? 28 : 21));
      ctx.stroke();
      if (degree % 30 === 0) {
        const cardinal = COMPASS_POINTS[degree];
        glowText(cardinal ?? String(degree), px, y + 21, cardinal ? 21 : 17, cardinal ? '#ffd57a' : '#d7edf4');
      }
    }
    ctx.restore();
    ctx.fillStyle = '#ffd57a';
    ctx.beginPath();
    ctx.moveTo(center, y + h - 6);
    ctx.lineTo(center - 9, y + h - 20);
    ctx.lineTo(center + 9, y + h - 20);
    ctx.closePath();
    ctx.fill();
    roundedBox(x + w - 92, y + 5, 84, h - 10, 10, '#102934', 'rgba(164, 216, 235, 0.52)');
    glowText(`${padded(heading, 3)}°`, x + w - 50, y + h / 2, 25, '#ffe8b6');
  }

  function statusLight(x, y, w, h, text, active, color) {
    roundedBox(x, y, w, h, 7, active ? color : '#10242d', active ? color : 'rgba(150, 195, 214, 0.42)');
    glowText(text, x + w / 2, y + h / 2, 17, active ? '#0a171c' : '#9fbecb');
  }

  function paintHeader(data, fuel) {
    roundedBox(24, 16, 332, 68, 10, '#081b25', 'rgba(120, 220, 246, 0.54)');
    glowText('NAV / NEXT GATE', 44, 36, 17, '#b9dce8', 'left');
    glowText(`GATE ${padded(data.gateIndex ?? 0, 2)}`, 44, 63, 24, '#ffe0a6', 'left');
    glowText(`BRG ${padded(data.bearing ?? 0, 3)}°`, 205, 36, 19, '#a8f0ff', 'left');
    glowText(`RNG ${Math.round(data.range ?? 0)} m`, 205, 63, 19, '#a8f0ff', 'left');

    roundedBox(668, 16, 332, 68, 10, '#081b25', 'rgba(164, 216, 235, 0.5)');
    const planName = String(data.missionName ?? mission?.name ?? 'FLIGHT PLAN').slice(0, 18);
    glowText(planName, 686, 36, 19, '#ffcf70', 'left');
    glowText(`T+ ${clock(data.timeLeft ?? 0)}`, 686, 63, 19, '#e0f2f7', 'left');
    glowText(`BURN ${(fuel.burnRate ?? 0).toFixed(2)} L/S`, 986, 36, 16, '#a8f0ff', 'right');
    glowText(`END ${clock(fuel.endurance ?? 0)}`, 986, 63, 18, fuel.reserveWarning ? '#ff9e83' : '#ffe0a6', 'right');
  }

  function paintWarnings(data, fuel, elapsed, fpm, alt) {
    const blink = Math.floor(elapsed * 4) % 2 === 0;
    const frameLabel = data.integrity < 75 ? 'AIRFRAME' : data.gear ? 'GEAR DOWN' : 'GEAR UP';
    const lamps = [
      [706, 314, 92, 24, 'STALL', Boolean(data.stall) && blink, '#ff6e62'],
      [806, 314, 92, 24, 'GEAR', !data.gear && alt < 600, '#ffc264'],
      [906, 314, 82, 24, 'FUEL', fuel.reserveWarning || fuel.engineOut, '#ff6e62'],
      [706, 346, 92, 24, 'SINK', fpm < -800, '#ff9978'],
      [806, 346, 192, 24, frameLabel, true, data.integrity < 75 ? '#ff9978' : '#59dba0'],
    ];
    roundedBox(694, 302, 306, 76, 10, '#0d202b', 'rgba(164, 216, 235, 0.42)');
    for (const [x, y, w, h, text, active, color] of lamps) {
      statusLight(x, y, w, h, text, active, color);
    }
  }

  function paintFuelStrip(fuel) {
    const fill = clamp(fuel.fraction ?? 0, 0, 1);
    const reserveMark = clamp(fuel.reserveFraction ?? 0.16, 0, 1);
    roundedBox(24, 378, 976, 16, 5, '#071822', 'rgba(164, 216, 235, 0.36)');
    glowText('FUEL', 42, 386, 13, '#b9dce8', 'left');
    ctx.fillStyle = '#050e14';
    ctx.fillRect(96, 383, 780, 7);
    ctx.fillStyle = fuel.engineOut ? '#ff6e62' : fuel.reserveWarning ? '#ffc264' : '#7ae8c0';
    ctx.fillRect(97, 384, 778 * fill, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(97 + 778 * reserveMark, 381, 3, 10);
    glowText(
      `${Math.round(fuel.liters)} / ${Math.round(fuel.capacity)} L · RES ${Math.round(fuel.reserve ?? 0)} L`,
      978, 386, 14, fuel.reserveWarning ? '#ffc264' : '#d7edf4', 'right',
    );
  }

  function paintSystems(data, fuel, throttle) {
    roundedBox(24, 400, 470, 92, 12, '#0b1e28', 'rgba(164, 216, 235, 0.4)');
    glowText('THROTTLE', 46, 424, 18, '#b9dce8', 'left');
    roundedBox(46, 444, 286, 20, 8, '#050e14', 'rgba(150, 208, 228, 0.45)');
    ctx.fillStyle = throttle > 0.82 ? '#ffbc6e' : '#61d9c2';
    ctx.fillRect(49, 447, 280 * clamp(throttle, 0, 1), 14);
    glowText(`${Math.round(throttle * 100)}%`, 352, 454, 24, '#ffe0a6', 'left');
    glowText(`RPM ${padded(700 + throttle * 1900, 4)}`, 46, 476, 16, '#b9dce8', 'left');
    glowText(`FLAPS ${data.flaps ? 'DOWN' : 'UP'}`, 246, 476, 16, data.flaps ? '#ffcf70' : '#b9dce8', 'left');
    const integrity = data.integrity ?? 100;
    glowText(`AIRFRAME ${padded(integrity, 3)}%`, 388, 476, 16, integrity < 75 ? '#ff9e83' : '#b9dce8', 'left');

    roundedBox(510, 400, 490, 92, 12, '#0b1e28', 'rgba(164, 216, 235, 0.4)');
    glowText('LANDING GEAR', 532, 424, 18, '#b9dce8', 'left');
    for (let i = 0; i < 3; i += 1) {
      const x = 696 + i * 36;
      ctx.beginPath();
      ctx.arc(x, 452, 11, 0, Math.PI * 2);
      ctx.fillStyle = data.gear ? '#59dba0' : '#263b45';
      ctx.fill();
      ctx.strokeStyle = data.gear ? '#c6ffea' : '#597681';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    glowText(data.gear ? 'DOWN & LOCKED' : 'UP', 810, 452, 20, data.gear ? '#a8f5cf' : '#ffc264', 'left');
    glowText(`ENDURANCE ${clock(fuel.endurance ?? 0)}`, 532, 476, 17, fuel.reserveWarning ? '#ff9e83' : '#b9dce8', 'left');
    glowText(`SCORE ${padded(data.score ?? 0, 6)}`, 978, 476, 16, '#b9dce8', 'right');
  }

  function paintEdgeLight() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const strip = ctx.createLinearGradient(0, 0, PANEL_WIDTH, 0);
    strip.addColorStop(0, 'rgba(100,220,255,0.3)');
    strip.addColorStop(0.5, 'rgba(255,210,130,0.2)');
    strip.addColorStop(1, 'rgba(100,220,255,0.3)');
    ctx.fillStyle = strip;
    ctx.fillRect(30, 10, PANEL_WIDTH - 60, 4);
    ctx.fillRect(30, PANEL_HEIGHT - 16, PANEL_WIDTH - 60, 3);
    ctx.restore();
  }

  function draw(data, force = false) {
    const elapsed = numeric(data.elapsed);
    if (!force && elapsed - lastPaint < 0.06) return;
    lastPaint = elapsed;
    const speed = numeric(data.speed);
    const alt = numeric(data.alt);
    const heading = numeric(data.heading);
    const fpm = numeric(data.vsi);
    const throttle = numeric(data.throttle);
    const pitchDeg = numeric(data.pitch);
    const rollRad = numeric(data.roll);
    const fuel = data.fuel ?? {
      liters: 0, capacity: 1, fraction: 0, reserveWarning: false,
      engineOut: false, burnRate: 0, endurance: 0,
    };

    paintBackdrop();
    paintHeader(data, fuel);
    roundGauge(150, 190, 78, 'AIRSPEED', `${padded(speed, 3)} KT`, clamp(speed / 180, 0, 1));
    attitude(370, 190, 92, pitchDeg, rollRad);
    verticalSpeed(585, 190, 59, fpm);
    roundGauge(825, 190, 78, 'ALTITUDE', `${padded(alt, 4)} FT`, (alt / 1000) % 1);
    headingTape(24, 302, 640, 76, heading);
    paintWarnings(data, fuel, elapsed, fpm, alt);
    paintFuelStrip(fuel);
    paintSystems(data, fuel, throttle);
    paintEdgeLight();
    texture.version += 1;
  }

  return { texture, draw };
}
