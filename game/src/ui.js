import { MISSIONS } from './config.js';

const CONTROL_GUIDE = `
  <div class="control-grid">
    <div><b>Pitch / climb</b><span><span class="kbd">W</span><span class="kbd">↑</span> up · <span class="kbd">S</span><span class="kbd">↓</span> down</span></div>
    <div><b>Roll / bank</b><span><span class="kbd">A</span><span class="kbd">←</span> left · <span class="kbd">D</span><span class="kbd">→</span> right</span></div>
    <div><b>Rudder / yaw</b><span><span class="kbd">Q</span> left · <span class="kbd">E</span> right</span></div>
    <div><b>Throttle</b><span><span class="kbd">Shift</span> up · <span class="kbd">Ctrl</span> down</span></div>
    <div><b>Flaps / gear</b><span><span class="kbd">F</span> flaps · <span class="kbd">G</span> gear</span></div>
    <div><b>Camera</b><span><span class="kbd">C</span> chase / cockpit</span></div>
    <div><b>Mouse flying</b><span>Click the flight view, then move the mouse</span></div>
    <div><b>Airbrake / pause</b><span><span class="kbd">Space</span> brake · <span class="kbd">P</span> pause</span></div>
    <div><b>Restart / help</b><span><span class="kbd">R</span> restart · <span class="kbd">H</span> guide</span></div>
    <div><b>Missions / mute</b><span><span class="kbd">M</span> select · <span class="kbd">N</span> sound</span></div>
  </div>`;

function fmtTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function padScore(value) {
  return String(Math.max(0, Math.round(value))).padStart(6, '0');
}

export function createUI(onAction) {
  const overlay = document.getElementById('overlay');
  const hud = document.getElementById('hud');
  const notice = document.getElementById('notice');
  const status = document.getElementById('status');
  const minimap = document.getElementById('minimap');
  const mapCtx = minimap.getContext('2d');
  let noticeTimer = 0;
  let lastScreen = 'title';

  overlay.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    const value = Number(target.dataset.value ?? 0);
    onAction(action, value);
  });

  function setHudVisible(visible) {
    hud.classList.toggle('hidden', !visible);
  }

  function setOverlay(html, visible = true) {
    overlay.innerHTML = html;
    overlay.classList.toggle('hidden', !visible);
  }

  function missionCards(selected) {
    return MISSIONS.map((mission, index) => `
      <div class="mission-card-ui ${index === selected ? 'selected' : ''}" data-action="select" data-value="${index}" role="button" tabindex="0">
        <div class="mission-index">0${index + 1} / FLIGHT PLAN</div>
        <div class="mission-name">${mission.name}</div>
        <div class="mission-sub">${mission.subtitle}</div>
        <div class="mission-meta">
          GATES <b>${mission.rings.length}</b> · LIMIT <b>${fmtTime(mission.time)}</b><br>
          WIND <b>${mission.wind.toFixed(1)}</b> · BONUS <b>×${mission.multiplier.toFixed(1)}</b>
        </div>
      </div>`).join('');
  }

  function showTitle(best) {
    lastScreen = 'title';
    setHudVisible(false);
    setOverlay(`
      <div class="panel">
        <div class="title-line">
          <div class="title-mark">SR</div>
          <div>
            <h1 class="brand">SKYLINE<br>RUSH</h1>
            <div class="brand-sub">Low-poly flight arcade · Edition 01</div>
          </div>
        </div>
        <p class="lede">Runway 09 is yours. Rotate a hand-built prop plane over a procedural coast, thread the luminous gates, and bring it home in one piece. Three flight plans. No downloads, no fuel gauge, no excuses.</p>
        <div class="divider"></div>
        ${CONTROL_GUIDE}
        <div class="button-row">
          <button class="primary" data-action="briefing">Enter flight briefing</button>
          <button data-action="help">Full control guide</button>
          <button class="ghost" data-action="mute">Sound: toggle</button>
        </div>
        <div class="prompt">PRESS ENTER TO CONTINUE · BEST ${padScore(best)}</div>
      </div>`);
  }

  function showBriefing(selected, best) {
    lastScreen = 'briefing';
    setHudVisible(false);
    const mission = MISSIONS[selected];
    setOverlay(`
      <div class="panel">
        <div class="label">OPERATIONS / FLIGHT BRIEFING</div>
        <h1>Choose your flight plan</h1>
        <div class="missions">${missionCards(selected)}</div>
        <div class="brief"><strong>${mission.name}</strong><span>${mission.brief}</span></div>
        <div class="divider"></div>
        ${CONTROL_GUIDE}
        <div class="button-row">
          <button class="primary" data-action="launch" data-value="${selected}">Launch ${mission.name}</button>
          <button data-action="title">Back to title</button>
          <button class="ghost" data-action="help">Controls</button>
        </div>
        <div class="prompt">ENTER LAUNCHES · ← → SELECT · BEST ${padScore(best)}</div>
      </div>`);
  }

  function showPlay() {
    lastScreen = 'play';
    setOverlay('', false);
    setHudVisible(true);
  }

  function showPause(data) {
    lastScreen = 'pause';
    setHudVisible(true);
    setOverlay(`
      <div class="panel compact">
        <div class="label">SIMULATION HOLD</div>
        <h1>Paused</h1>
        <div class="stats">
          <div class="stat"><span class="label">GATES</span><span class="num">${data.ringIndex} / ${data.rings.length}</span></div>
          <div class="stat"><span class="label">SCORE</span><span class="num">${padScore(data.score)}</span></div>
          <div class="stat"><span class="label">TIME</span><span class="num">${fmtTime(data.timeLeft)}</span></div>
        </div>
        <div class="button-row">
          <button class="primary" data-action="resume">Resume flight</button>
          <button data-action="restart">Restart mission</button>
          <button data-action="help">Control guide</button>
          <button data-action="missions">Mission select</button>
          <button class="ghost" data-action="quality">Graphics: ${data.quality.toUpperCase()}</button>
        </div>
        <div class="prompt">P OR ESC TO RESUME</div>
      </div>`);
  }

  function showHelp(from, data) {
    lastScreen = 'help';
    setHudVisible(true);
    setOverlay(`
      <div class="panel narrow">
        <div class="label">PILOT'S NOTES</div>
        <h1>Control guide</h1>
        <p class="lede">Hold <b>Shift</b> to build speed, then ease the nose up at <b>80 kt</b>. Bank into each gate with <b>A/D</b>; use the rudder to fine-tune the nose. Lower gear with <b>G</b> before landing, keep wings level, and touch down between 40 and 140 kt on runway 09.</p>
        ${CONTROL_GUIDE}
        <div class="divider"></div>
        <p class="lede">The mouse can fly too: click the 3D view to capture the pointer, steer with movement, and use the wheel for throttle. Press Esc to release the pointer and pause. <b>N</b> mutes audio, <b>L</b> toggles graphics quality.</p>
        <div class="button-row">
          <button class="primary" data-action="resume">Return to flight</button>
          <button class="ghost" data-action="${from === 'pause' ? 'pause' : from === 'title' ? 'title' : from === 'briefing' ? 'briefing' : 'resume'}">Back</button>
        </div>
        <div class="prompt">H TO CLOSE · QUALITY ${data.quality.toUpperCase()}</div>
      </div>`);
  }

  function showResult(data) {
    lastScreen = data.success ? 'success' : 'fail';
    setHudVisible(true);
    const rank = data.score > 12000 ? 'S' : data.score > 8500 ? 'A' : data.score > 5000 ? 'B' : 'C';
    setOverlay(`
      <div class="panel compact">
        <div class="label">${data.mission.name} / DEBRIEF</div>
        <h1 class="result-title ${data.success ? 'good' : 'bad'}">${data.success ? 'Mission complete' : 'Mission failed'}</h1>
        <div class="result-tag">${data.reason}</div>
        <div class="stats">
          <div class="stat"><span class="label">SCORE</span><span class="num good">${padScore(data.score)}</span></div>
          <div class="stat"><span class="label">RANK</span><span class="num">${data.success ? rank : '—'}</span></div>
          <div class="stat"><span class="label">GATES</span><span class="num">${data.ringIndex} / ${data.rings.length}</span></div>
          <div class="stat"><span class="label">TIME USED</span><span class="num">${fmtTime(data.elapsed)}</span></div>
          <div class="stat"><span class="label">AIRFRAME</span><span class="num ${data.integrity < 40 ? 'bad' : ''}">${Math.round(data.integrity)}%</span></div>
          <div class="stat"><span class="label">BEST</span><span class="num warn">${padScore(data.best)}</span></div>
        </div>
        <div class="button-row">
          <button class="primary" data-action="restart">Fly again</button>
          <button data-action="missions">Mission select</button>
          <button class="ghost" data-action="title">Title screen</button>
        </div>
        <div class="prompt">R RESTARTS · M MISSION SELECT</div>
      </div>`);
  }

  function drawMinimap(data) {
    const w = minimap.width;
    const h = minimap.height;
    mapCtx.clearRect(0, 0, w, h);
    mapCtx.fillStyle = 'rgba(4,18,27,0.88)';
    mapCtx.fillRect(0, 0, w, h);
    const project = (x, z) => [w / 2 + (x / 330) * (w / 2 - 12), 12 + ((100 - z) / 920) * (h - 24)];
    mapCtx.strokeStyle = 'rgba(120,180,205,0.16)';
    mapCtx.lineWidth = 1;
    for (let g = -300; g <= 300; g += 100) {
      const [gx] = project(g, 0);
      mapCtx.beginPath();
      mapCtx.moveTo(gx, 0);
      mapCtx.lineTo(gx, h);
      mapCtx.stroke();
    }
    for (let z = -800; z <= 100; z += 150) {
      const [, gy] = project(0, z);
      mapCtx.beginPath();
      mapCtx.moveTo(0, gy);
      mapCtx.lineTo(w, gy);
      mapCtx.stroke();
    }
    const [rx1, ry1] = project(0, 86);
    const [rx2, ry2] = project(0, -154);
    mapCtx.strokeStyle = 'rgba(235,246,249,0.8)';
    mapCtx.lineWidth = 4;
    mapCtx.beginPath();
    mapCtx.moveTo(rx1, ry1);
    mapCtx.lineTo(rx2, ry2);
    mapCtx.stroke();
    for (let i = 0; i < data.rings.length; i += 1) {
      const c = data.rings[i].center;
      const [px, py] = project(c.x, c.z);
      const passed = i < data.ringIndex;
      const next = i === data.ringIndex;
      mapCtx.beginPath();
      mapCtx.arc(px, py, next ? 6 : 4, 0, Math.PI * 2);
      mapCtx.strokeStyle = passed ? 'rgba(130,160,175,0.45)' : next ? '#ffcf70' : 'rgba(109,227,255,0.8)';
      mapCtx.lineWidth = next ? 2.5 : 1.5;
      mapCtx.stroke();
      if (next) {
        mapCtx.beginPath();
        mapCtx.arc(px, py, 10, 0, Math.PI * 2);
        mapCtx.strokeStyle = 'rgba(255,207,112,0.35)';
        mapCtx.stroke();
      }
    }
    const [ax, ay] = project(data.pos.x, data.pos.z);
    mapCtx.save();
    mapCtx.translate(ax, ay);
    mapCtx.rotate(data.heading);
    mapCtx.beginPath();
    mapCtx.moveTo(0, -8);
    mapCtx.lineTo(5.5, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-5.5, 6);
    mapCtx.closePath();
    mapCtx.fillStyle = '#ffffff';
    mapCtx.shadowColor = '#6de3ff';
    mapCtx.shadowBlur = 8;
    mapCtx.fill();
    mapCtx.restore();
    mapCtx.fillStyle = 'rgba(180,220,235,0.8)';
    mapCtx.font = 'bold 11px ui-monospace, monospace';
    mapCtx.fillText('N', w / 2 - 3, 10);
  }

  function updateHUD(data) {
    document.getElementById('hudMission').textContent = data.mission.name;
    document.getElementById('hudObjective').textContent = data.ringIndex >= data.rings.length
      ? 'ALL GATES · LAND ON 09'
      : `GATE ${data.ringIndex + 1} / ${data.rings.length} · CLEARED ${data.ringIndex}`;
    document.getElementById('hudTime').textContent = fmtTime(data.timeLeft);
    document.getElementById('hudTimeBar').style.width = `${Math.max(0, (data.timeLeft / data.timeTotal) * 100)}%`;
    document.getElementById('hudTimeBar').classList.toggle('low', data.timeLeft < 30);
    document.getElementById('hudScore').textContent = padScore(data.score);
    document.getElementById('hudHullBar').style.width = `${Math.max(0, data.integrity)}%`;
    document.getElementById('hudHullBar').classList.toggle('low', data.integrity < 55);
    document.getElementById('hudHullBar').classList.toggle('critical', data.integrity < 25);
    document.getElementById('hudHullText').textContent = `AIRFRAME ${Math.round(data.integrity)}%`;
    document.getElementById('hudSpeed').textContent = `${String(Math.round(data.speedKts)).padStart(3, '0')} KT`;
    document.getElementById('hudAlt').textContent = `${String(Math.round(data.altFt)).padStart(4, '0')} FT`;
    document.getElementById('hudHeading').textContent = `${String(Math.round(data.headingDeg)).padStart(3, '0')}°`;
    document.getElementById('hudVsi').textContent = `${data.vsiFpm >= 0 ? '+' : '−'}${String(Math.abs(Math.round(data.vsiFpm))).padStart(4, '0')} FPM`;
    document.getElementById('hudThrottle').textContent = `${Math.round(data.throttle * 100)}%`;
    document.getElementById('hudThrottleBar').style.width = `${Math.round(data.throttle * 100)}%`;
    document.getElementById('hudGear').textContent = data.gear ? 'GEAR DOWN' : 'GEAR UP';
    document.getElementById('hudGear').classList.toggle('on', data.gear);
    document.getElementById('hudFlaps').textContent = data.flaps ? 'FLAPS DOWN' : 'FLAPS UP';
    document.getElementById('hudFlaps').classList.toggle('on', data.flaps);
    document.getElementById('hudCamera').textContent = data.cameraMode === 'cockpit' ? 'COCKPIT VIEW' : 'CHASE VIEW';
    document.getElementById('hudWind').textContent = `WIND ${data.wind.toFixed(1)}`;
    document.getElementById('hudWarning').classList.toggle('hidden', !data.stall);
    document.getElementById('hudMessage').textContent = data.messageTime > 0 ? data.message : '';
    const target = document.getElementById('hudTarget');
    if (data.ringIndex < data.rings.length && data.targetDistance < 900) {
      target.classList.remove('hidden');
      document.getElementById('hudTargetDist').textContent = `${Math.round(data.targetDistance)} m`;
    } else {
      target.classList.add('hidden');
    }
    drawMinimap(data);
  }

  return {
    showTitle,
    showBriefing,
    showPlay,
    showPause,
    showHelp,
    showResult,
    updateHUD,
    get screen() {
      return lastScreen;
    },
    flash(text, tone = '') {
      notice.textContent = text;
      notice.className = `notice show ${tone}`;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => { notice.className = 'notice'; }, 1800);
    },
    announce(text) {
      status.textContent = text;
    },
    clearNotice() {
      clearTimeout(noticeTimer);
      notice.className = 'notice';
    },
  };
}
