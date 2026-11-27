import { ensureHUDLayout } from './hudLayout.js';

function timeLabel(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function scoreLabel(value) {
  return String(Math.max(0, Math.round(value))).padStart(6, '0');
}

export function createHUD() {
  ensureHUDLayout();
  const node = (id) => document.getElementById(id);
  const hud = node('hud');
  const minimap = node('minimap');
  const pen = minimap.getContext('2d');
  const refs = new Map([
    'hudMission', 'hudObjective', 'hudTime', 'hudTimeBar', 'hudScore',
    'hudHullText', 'hudHullBar', 'hudFuelText', 'hudFuelPlan', 'hudFuelGauge',
    'hudFuelBurn', 'hudEndurance', 'hudDamage', 'hudFuelBar', 'hudSpeed',
    'hudAlt', 'hudHeading', 'hudVsi', 'hudThrottle', 'hudThrottleBar',
    'hudGear', 'hudFlaps', 'hudCamera', 'hudWind', 'hudWarning',
    'hudMessage', 'hudTarget', 'hudTargetDist',
  ].map((id) => [id, node(id)]));

  function write(id, text) {
    refs.get(id).textContent = text;
  }

  function setMeter(id, fraction, tone) {
    const bar = refs.get(id);
    bar.style.width = `${Math.max(0, Math.min(1, fraction)) * 100}%`;
    bar.classList.toggle('low', tone === 'low');
    bar.classList.toggle('critical', tone === 'critical');
  }

  function drawMinimap(data) {
    const w = minimap.width;
    const h = minimap.height;
    pen.clearRect(0, 0, w, h);
    pen.fillStyle = 'rgba(4,18,27,0.88)';
    pen.fillRect(0, 0, w, h);
    const project = (x, z) => [w / 2 + (x / 330) * (w / 2 - 12), 12 + ((100 - z) / 920) * (h - 24)];

    pen.strokeStyle = 'rgba(120,180,205,0.16)';
    pen.lineWidth = 1;
    for (let g = -300; g <= 300; g += 100) {
      const [gx] = project(g, 0);
      pen.beginPath();
      pen.moveTo(gx, 0);
      pen.lineTo(gx, h);
      pen.stroke();
    }
    for (let z = -800; z <= 100; z += 150) {
      const [, gy] = project(0, z);
      pen.beginPath();
      pen.moveTo(0, gy);
      pen.lineTo(w, gy);
      pen.stroke();
    }

    const [runwayTopX, runwayTopY] = project(0, 86);
    const [runwayEndX, runwayEndY] = project(0, -154);
    pen.strokeStyle = 'rgba(235,246,249,0.8)';
    pen.lineWidth = 4;
    pen.beginPath();
    pen.moveTo(runwayTopX, runwayTopY);
    pen.lineTo(runwayEndX, runwayEndY);
    pen.stroke();

    for (let i = 0; i < data.rings.length; i += 1) {
      const center = data.rings[i].center;
      const [px, py] = project(center.x, center.z);
      const cleared = i < data.ringIndex;
      const active = i === data.ringIndex;
      pen.beginPath();
      pen.arc(px, py, active ? 6 : 4, 0, Math.PI * 2);
      pen.strokeStyle = cleared ? 'rgba(130,160,175,0.45)' : active ? '#ffcf70' : 'rgba(109,227,255,0.8)';
      pen.lineWidth = active ? 2.5 : 1.5;
      pen.stroke();
      if (active) {
        pen.beginPath();
        pen.arc(px, py, 10, 0, Math.PI * 2);
        pen.strokeStyle = 'rgba(255,207,112,0.35)';
        pen.stroke();
      }
    }

    const [aircraftX, aircraftY] = project(data.pos.x, data.pos.z);
    pen.save();
    pen.translate(aircraftX, aircraftY);
    pen.rotate(data.heading);
    pen.beginPath();
    pen.moveTo(0, -8);
    pen.lineTo(5.5, 6);
    pen.lineTo(0, 3);
    pen.lineTo(-5.5, 6);
    pen.closePath();
    pen.fillStyle = '#ffffff';
    pen.shadowColor = '#6de3ff';
    pen.shadowBlur = 8;
    pen.fill();
    pen.restore();
    pen.fillStyle = 'rgba(180,220,235,0.8)';
    pen.font = 'bold 11px ui-monospace, monospace';
    pen.fillText('N', w / 2 - 3, 10);
  }

  function readouts(data) {
    hud.classList.toggle('cockpit-view', data.cameraMode === 'cockpit');
    write('hudMission', data.mission.name);
    write('hudObjective', data.ringIndex >= data.rings.length
      ? 'ALL GATES · LAND ON 09'
      : `GATE ${data.ringIndex + 1} / ${data.rings.length} · CLEARED ${data.ringIndex}`);
    write('hudTime', timeLabel(data.timeLeft));
    setMeter('hudTimeBar', data.timeLeft / data.timeTotal, data.timeLeft < 30 ? 'low' : '');
    write('hudScore', scoreLabel(data.score));

    write('hudHullText', `AIRFRAME ${Math.round(data.integrity)}%`);
    setMeter('hudHullBar', data.integrity / 100, data.integrity < 25 ? 'critical' : data.integrity < 55 ? 'low' : '');
    write('hudFuelText', `FUEL ${Math.round(data.fuel.liters)} / ${Math.round(data.fuel.capacity)} L`);
    write('hudFuelPlan', `RES ${Math.round(data.fuel.reserve)} L · BURN ${data.fuel.burnRate.toFixed(2)} L/S`);
    write('hudFuelGauge', `${Math.round(data.fuel.liters)} L`);
    write('hudFuelBurn', `${data.fuel.burnRate.toFixed(2)} L/S`);
    write('hudEndurance', timeLabel(data.fuel.endurance));
    write('hudDamage', `${Math.round(data.integrity)}%`);
    setMeter(
      'hudFuelBar', data.fuel.fraction,
      data.engineOut || data.fuel.reserveWarning ? 'critical' : data.fuel.fraction < 0.3 ? 'low' : '',
    );

    write('hudSpeed', `${String(Math.round(data.speedKts)).padStart(3, '0')} KT`);
    write('hudAlt', `${String(Math.round(data.altFt)).padStart(4, '0')} FT`);
    write('hudHeading', `${String(Math.round(data.headingDeg)).padStart(3, '0')}°`);
    write('hudVsi', `${data.vsiFpm >= 0 ? '+' : '−'}${String(Math.abs(Math.round(data.vsiFpm))).padStart(4, '0')} FPM`);
    write('hudThrottle', `${Math.round(data.throttle * 100)}%`);
    setMeter('hudThrottleBar', data.throttle, '');

    write('hudGear', data.gear ? 'GEAR DOWN' : 'GEAR UP');
    refs.get('hudGear').classList.toggle('on', data.gear);
    write('hudFlaps', data.flaps ? 'FLAPS DOWN' : 'FLAPS UP');
    refs.get('hudFlaps').classList.toggle('on', data.flaps);
    write('hudCamera', data.cameraMode === 'cockpit' ? 'COCKPIT VIEW' : 'CHASE VIEW');
    write('hudWind', `WIND ${data.wind.toFixed(1)}`);
  }

  function warnings(data) {
    const alerts = [];
    if (data.engineOut) alerts.push('ENGINE OUT');
    else if (data.fuel.reserveWarning) alerts.push(`FUEL RESERVE · ${timeLabel(data.fuel.endurance)} LEFT`);
    if (data.integrity < 75) alerts.push('AIRFRAME DAMAGED');
    if (data.stall) alerts.push('STALL');
    const banner = refs.get('hudWarning');
    banner.textContent = alerts.join(' · ');
    banner.classList.toggle('hidden', alerts.length === 0);
    banner.classList.toggle('warn', alerts.length > 0 && !data.engineOut && !data.stall);
  }

  function update(data) {
    readouts(data);
    warnings(data);
    write('hudMessage', data.messageTime > 0 ? data.message : '');
    const target = refs.get('hudTarget');
    const gateVisible = data.ringIndex < data.rings.length && data.targetDistance < 650;
    target.classList.toggle('hidden', !gateVisible);
    if (gateVisible) write('hudTargetDist', `${Math.round(data.targetDistance)} m`);
    drawMinimap(data);
  }

  return {
    update,
    setVisible(visible) {
      hud.classList.toggle('hidden', !visible);
    },
  };
}
