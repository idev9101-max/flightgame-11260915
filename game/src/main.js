import * as THREE from './engine.js';
import { BEST_KEY, MISSIONS, QUALITY_KEY, SEED, STEP } from './config.js';
import { createWorld } from './world.js';
import { createAircraft } from './aircraft.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { createSound } from './audio.js';
import { stageShot } from './shots.js';
import { clamp } from './random.js';

const DEG = 180 / Math.PI;
const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : SEED;
const shotName = shotParam && ['start', 'takeoff', 'chase', 'cockpit'].includes(shotParam) ? shotParam : null;

function stored(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

let best = Number.parseInt(stored(BEST_KEY, '0'), 10) || 0;
let quality = stored(QUALITY_KEY, 'high') === 'low' ? 'low' : 'high';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 2600);
scene.add(camera);

const sound = createSound();
const input = createInput(canvas);
let ui;
let screen = 'title';
let helpFrom = 'title';
let missionIndex = 0;
let mission = MISSIONS[0];
let world = null;
let aircraft = null;
let cameraMode = 'chase';
let resultData = null;
let accumulator = 0;
let last = performance.now();
let time = 0;

function buildMission(index) {
  if (aircraft) aircraft.dispose();
  if (world) world.destroy();
  missionIndex = index;
  mission = MISSIONS[index];
  world = createWorld(scene, mission, missionIndex, seed);
  aircraft = createAircraft(scene, camera, mission);
  cameraMode = 'chase';
  aircraft.updateAxes();
  aircraft.updateCamera(0, cameraMode, true);
  resultData = null;
  accumulator = 0;
}

function launchMission(index) {
  sound.unlock();
  sound.click();
  buildMission(index);
  screen = 'play';
  ui.clearNotice();
  ui.showPlay();
  input.allowPointerLock(true);
  sound.setMode('play', 0.2);
  ui.announce(`${mission.name} launched. Hold Shift for throttle, then climb at 80 knots.`);
}

function missionData() {
  const state = aircraft.state;
  const next = world.rings[state.ringIndex];
  return {
    mission,
    timeLeft: state.timeLeft,
    timeTotal: mission.time,
    score: state.score,
    integrity: state.integrity,
    ringIndex: state.ringIndex,
    rings: world.rings.length,
    speedKts: state.vel.length() * 1.94384,
    altFt: Math.max(-20, (state.pos.y - 6) * 3.28084),
    headingDeg: ((state.heading * DEG) % 360 + 360) % 360,
    vsiFpm: state.vel.y * 196.85,
    throttle: state.throttle,
    gear: state.gear,
    flaps: state.flaps,
    cameraMode,
    stall: state.stalled,
    message: state.message,
    messageTime: state.messageTime,
    wind: mission.wind + Math.sin(state.elapsed * 1.7) * mission.gust,
    targetDistance: next ? state.pos.distanceTo(next.center) : Infinity,
    pos: state.pos,
    ringCenters: world.rings.map((ring) => ring.center),
  };
}

function showPause() {
  screen = 'pause';
  input.allowPointerLock(false);
  input.unlock();
  const data = missionData();
  ui.showPause({ ...data, quality });
  sound.setMode('title');
}

function resumeFlight() {
  screen = 'play';
  ui.showPlay();
  input.allowPointerLock(true);
  sound.setMode('play', aircraft.state.timeLeft < 30 ? 0.9 : 0.25);
  last = performance.now();
}

function goBriefing() {
  screen = 'briefing';
  input.allowPointerLock(false);
  input.unlock();
  ui.showBriefing(missionIndex, best);
  sound.setMode('title');
  ui.announce('Flight briefing. Choose a mission.');
}

function goTitle() {
  screen = 'title';
  input.allowPointerLock(false);
  input.unlock();
  ui.showTitle(best);
  sound.setMode('dawn');
  ui.announce('Skyline Rush title screen.');
}

function openHelp() {
  helpFrom = screen === 'help' ? helpFrom : screen;
  screen = 'help';
  input.allowPointerLock(false);
  input.unlock();
  ui.showHelp(helpFrom, { quality });
}

function closeHelp() {
  if (helpFrom === 'pause') showPause();
  else if (helpFrom === 'title') goTitle();
  else if (helpFrom === 'briefing') goBriefing();
  else resumeFlight();
}

function finish(success, reason) {
  if (screen !== 'play') return;
  const state = aircraft.state;
  if (success) {
    state.score += Math.round((state.timeLeft * 45 * mission.multiplier + state.integrity * 14) / 10) * 10;
  }
  if (state.score > best) {
    best = state.score;
    save(BEST_KEY, best);
  }
  resultData = {
    success,
    reason,
    score: state.score,
    best,
    ringIndex: state.ringIndex,
    rings: world.rings.length,
    elapsed: state.elapsed,
    integrity: state.integrity,
    mission,
  };
  screen = success ? 'success' : 'fail';
  input.allowPointerLock(false);
  input.unlock();
  ui.clearNotice();
  ui.showResult(resultData);
  sound.setMode(success ? 'dawn' : 'storm');
  if (success) sound.success();
  ui.announce(`${success ? 'Mission complete' : 'Mission failed'}. Score ${state.score}.`);
}

function handleEvents(events) {
  for (const event of events) {
    if (event.type === 'ring') {
      sound.ring(event.index);
      ui.flash(`GATE ${String(event.index + 1).padStart(2, '0')} CLEARED  +${event.points}`);
    } else if (event.type === 'liftoff') {
      sound.click();
      ui.flash('AIRBORNE · FOLLOW THE GATES', 'warn');
    } else if (event.type === 'touchdown') {
      sound.touchdown();
      if (event.complete) finish(true, 'CLEAN LANDING ON RUNWAY 09');
      else ui.flash('TOUCHDOWN · GATES STILL OPEN', 'warn');
    } else if (event.type === 'damage') {
      sound.touchdown();
      ui.flash('HARD LANDING · AIRFRAME DAMAGED', 'bad');
    } else if (event.type === 'crash') {
      sound.crash();
      finish(false, 'AIRFRAME LOST');
      return;
    } else if (event.type === 'timeout') {
      finish(false, 'TIME EXPIRED');
      return;
    }
  }
}

function step(dt) {
  const controls = input.controls(true, dt);
  if (controls.throttleDelta) aircraft.adjustThrottle(controls.throttleDelta);
  const events = [];
  aircraft.update(dt, controls, world, events);
  handleEvents(events);
}

function handleAction(action, value = 0) {
  if (screen === 'help' && action !== 'resume' && action !== 'quality' && action !== 'mute') {
    if (action === 'confirm' || action === 'escape') {
      closeHelp();
      return;
    }
  }
  if (action === 'confirm') {
    if (screen === 'title') goBriefing();
    else if (screen === 'briefing') launchMission(missionIndex);
    else if (screen === 'success' || screen === 'fail') launchMission(missionIndex);
    else if (screen === 'pause') resumeFlight();
    else if (screen === 'help') closeHelp();
    return;
  }
  if (action === 'escape') {
    if (screen === 'play') showPause();
    else if (screen === 'pause') resumeFlight();
    else if (screen === 'help') closeHelp();
    else if (screen === 'briefing') goTitle();
    else if (screen === 'success' || screen === 'fail') goBriefing();
    return;
  }
  if (action === 'pause') {
    if (screen === 'play') showPause();
    else if (screen === 'pause') resumeFlight();
    return;
  }
  if (action === 'briefing') {
    goBriefing();
    return;
  }
  if (action === 'title') {
    goTitle();
    return;
  }
  if (action === 'missions') {
    goBriefing();
    return;
  }
  if (action === 'launch') {
    launchMission(clamp(value, 0, MISSIONS.length - 1));
    return;
  }
  if (action === 'select' || action.startsWith('select') || action === 'prev' || action === 'next') {
    if (screen === 'briefing') {
      let next = missionIndex;
      if (action === 'prev') next = (missionIndex + MISSIONS.length - 1) % MISSIONS.length;
      else if (action === 'next') next = (missionIndex + 1) % MISSIONS.length;
      else if (action.startsWith('select')) next = Number(action.replace('select', '')) || 0;
      if (next !== missionIndex) {
        missionIndex = clamp(next, 0, MISSIONS.length - 1);
        sound.click();
        ui.showBriefing(missionIndex, best);
      }
    }
    return;
  }
  if (action === 'restart') {
    if (screen === 'play' || screen === 'pause' || screen === 'help' || screen === 'success' || screen === 'fail') launchMission(missionIndex);
    return;
  }
  if (action === 'resume') {
    if (screen === 'help') closeHelp();
    else if (screen === 'pause') resumeFlight();
    return;
  }
  if (action === 'help') {
    if (screen === 'help') closeHelp();
    else if (screen !== 'success' && screen !== 'fail') openHelp();
    return;
  }
  if (action === 'quality') {
    quality = quality === 'high' ? 'low' : 'high';
    save(QUALITY_KEY, quality);
    renderer.setPixelRatio(quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    ui.flash(`GRAPHICS · ${quality.toUpperCase()}`);
    if (screen === 'pause') showPause();
    else if (screen === 'help') ui.showHelp(helpFrom, { quality });
    return;
  }
  if (action === 'mute') {
    const muted = sound.toggleMute();
    ui.flash(`SOUND · ${muted ? 'MUTED' : 'ON'}`);
    return;
  }
  if (action === 'canvasClick') {
    if (screen === 'play') ui.flash('MOUSE FLIGHT ACTIVE · ESC TO RELEASE', 'warn');
    return;
  }
  if (screen !== 'play') return;
  if (action === 'camera') {
    cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    aircraft.updateCamera(0, cameraMode, true);
    sound.click();
    ui.flash(cameraMode === 'cockpit' ? 'COCKPIT VIEW' : 'CHASE VIEW');
  } else if (action === 'gear') {
    const gear = aircraft.toggleGear();
    sound.click();
    ui.flash(gear ? 'LANDING GEAR DOWN' : 'LANDING GEAR UP', 'warn');
  } else if (action === 'flaps') {
    const flaps = aircraft.toggleFlaps();
    sound.click();
    ui.flash(flaps ? 'FLAPS DOWN' : 'FLAPS UP');
  }
}

ui = createUI((action, value) => {
  sound.unlock();
  sound.click();
  handleAction(action, value);
});

function updateTitleCamera(dt, fixed = false) {
  const angle = fixed ? 0.72 : time * 0.075 + 0.4;
  const p = aircraft.state.pos;
  camera.position.set(p.x + Math.sin(angle) * 36, p.y + 12 + Math.sin(time * 0.3) * 1.5, p.z + Math.cos(angle) * 36);
  camera.up.set(0, 1, 0);
  camera.lookAt(p.x, p.y + 1.5, p.z - 7);
  camera.fov = 63;
  camera.updateProjectionMatrix();
  aircraft.updateCamera(dt || 0.016, 'chase');
  camera.position.set(p.x + Math.sin(angle) * 36, p.y + 12 + Math.sin(time * 0.3) * 1.5, p.z + Math.cos(angle) * 36);
  camera.up.set(0, 1, 0);
  camera.lookAt(p.x, p.y + 1.5, p.z - 7);
  camera.fov = 63;
  camera.updateProjectionMatrix();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.25);
  last = now;
  time += dt;
  const queued = input.takeActions();
  if (queued.length) sound.unlock();
  for (const action of queued) handleAction(action);

  if (screen === 'play') {
    accumulator += dt;
    let safety = 0;
    while (accumulator >= STEP && safety < 8 && screen === 'play') {
      step(STEP);
      accumulator -= STEP;
      safety += 1;
    }
    aircraft.updateCamera(dt, cameraMode);
  } else {
    accumulator = 0;
    if (screen === 'title' || screen === 'briefing') updateTitleCamera(dt);
    else aircraft.updateCamera(dt, cameraMode);
  }

  world.update(dt, time, camera.position);
  const data = missionData();
  if (screen !== 'title' && screen !== 'briefing') ui.updateHUD(data);
  const intensity = screen === 'play' ? clamp(0.2 + (1 - aircraft.state.timeLeft / mission.time) * 0.7 + (100 - aircraft.state.integrity) / 180, 0, 1) : 0;
  sound.update(dt, { throttle: aircraft.state.throttle, speed: aircraft.state.vel.length(), stall: aircraft.state.stalled });
  if (screen === 'play') sound.setMode(mission.sky === 'storm' ? 'storm' : 'play', intensity);
  renderer.render(scene, camera);
}

buildMission(0);
goTitle();

if (shotName) {
  const shotMission = shotName === 'chase' ? 1 : 0;
  buildMission(shotMission);
  const staged = stageShot(shotName, { aircraft, world, mission, selectedMission: shotMission });
  screen = staged.screen;
  cameraMode = staged.camera;
  time = staged.time;
  aircraft.updateAxes();
  aircraft.updateCamera(0, cameraMode, true);
  if (screen === 'title') {
    updateTitleCamera(0, true);
    ui.showTitle(0);
  } else {
    ui.showPlay();
    ui.updateHUD(missionData());
  }
  let painted = 0;
  function paintShot() {
    world.update(0, staged.time, camera.position);
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
} else {
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'play') showPause();
});
