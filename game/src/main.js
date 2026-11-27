import * as THREE from '../vendor/engine.js';
import { BEST_KEY, MISSIONS, QUALITY_KEY, SEED, STEP } from './config.js';
import { createWorld } from './world.js';
import { createAircraft } from './aircraft.js';
import { createInput } from './input.js';
import { createUI } from './ui.js';
import { createSound } from './audio.js';
import { stageShot } from './screenshots.js';
import { buildResultData, missionTelemetry, scoreCompletedMission } from './missionLogic.js';
import { clamp } from '../vendor/random.js';

const SHOT_NAMES = ['start', 'takeoff', 'cover', 'chase', 'cockpit', 'final', 'approach', 'landing', 'harbor'];

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : SEED;
const shotName = shotParam && SHOT_NAMES.includes(shotParam) ? shotParam : null;

function readSetting(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeSetting(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

let bestScore = Number.parseInt(readSetting(BEST_KEY, '0'), 10) || 0;
let graphicsQuality = readSetting(QUALITY_KEY, 'high') === 'low' ? 'low' : 'high';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

function applyGraphicsQuality() {
  const ratio = graphicsQuality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(ratio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

applyGraphicsQuality();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 2600);
scene.add(camera);
const sound = createSound();
const input = createInput(canvas);

let ui;
let phase = 'title';
let helpOrigin = 'title';
let missionIndex = 0;
let mission = MISSIONS[0];
let world = null;
let aircraft = null;
let cameraMode = 'chase';
let resultData = null;
let simAccumulator = 0;
let lastFrameAt = performance.now();
let clockTime = 0;

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
  simAccumulator = 0;
}

function launchMission(index) {
  sound.unlock();
  sound.click();
  buildMission(index);
  phase = 'play';
  ui.clearNotice();
  ui.showPlay();
  input.allowPointerLock(true);
  sound.setMode('play', 0.2);
  ui.announce(`${mission.name} launched. Hold Shift for throttle, then climb at 80 knots.`);
}

function flightTelemetry() {
  return missionTelemetry(mission, aircraft.state, world, cameraMode, aircraft.state.elapsed);
}

function releasePointer() {
  input.allowPointerLock(false);
  input.unlock();
}

function showPause() {
  phase = 'pause';
  releasePointer();
  ui.showPause({ ...flightTelemetry(), quality: graphicsQuality });
  sound.setMode('title');
}

function resumeFlight() {
  phase = 'play';
  ui.showPlay();
  input.allowPointerLock(true);
  sound.setMode('play', aircraft.state.timeLeft < 30 ? 0.9 : 0.25);
  lastFrameAt = performance.now();
}

function goBriefing() {
  phase = 'briefing';
  releasePointer();
  ui.showBriefing(missionIndex, bestScore);
  sound.setMode('title');
  ui.announce('Flight briefing. Choose a mission.');
}

function goTitle() {
  phase = 'title';
  releasePointer();
  ui.showTitle(bestScore);
  sound.setMode('dawn');
  ui.announce('Skyline Rush title screen.');
}

function openHelp() {
  helpOrigin = phase === 'help' ? helpOrigin : phase;
  phase = 'help';
  releasePointer();
  ui.showHelp(helpOrigin, { quality: graphicsQuality });
}

function closeHelp() {
  if (helpOrigin === 'pause') showPause();
  else if (helpOrigin === 'title') goTitle();
  else if (helpOrigin === 'briefing') goBriefing();
  else resumeFlight();
}

function finish(success, reason) {
  if (phase !== 'play') return;
  const state = aircraft.state;
  const bonus = success ? scoreCompletedMission(state, mission) : null;
  if (state.score > bestScore) {
    bestScore = state.score;
    writeSetting(BEST_KEY, bestScore);
  }
  resultData = buildResultData(success, reason, state, world, mission, bestScore, bonus);
  phase = success ? 'success' : 'fail';
  releasePointer();
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
    } else if (event.type === 'flameout') {
      sound.crash();
      ui.flash('FUEL EXHAUSTED · ENGINE OUT', 'bad');
    } else if (event.type === 'touchdown') {
      sound.touchdown();
      if (event.complete) finish(true, 'CLEAN LANDING ON RUNWAY 09');
      else ui.flash('TOUCHDOWN · GATES STILL OPEN', 'warn');
    } else if (event.type === 'damage') {
      sound.touchdown();
      aircraft.burst();
      ui.flash('HARD LANDING · AIRFRAME DAMAGED', 'bad');
    } else if (event.type === 'crash') {
      sound.crash();
      aircraft.burst();
      finish(false, 'AIRFRAME LOST');
      return;
    } else if (event.type === 'timeout') {
      finish(false, 'TIME EXPIRED');
      return;
    }
  }
}

function advanceFixedStep(dt) {
  const controls = input.controls(true, dt);
  if (controls.throttleDelta) aircraft.adjustThrottle(controls.throttleDelta);
  const events = [];
  aircraft.update(dt, controls, world, events);
  handleEvents(events);
}

function selectMission(action, value) {
  let next = missionIndex;
  if (action === 'prev') next = (missionIndex + MISSIONS.length - 1) % MISSIONS.length;
  else if (action === 'next') next = (missionIndex + 1) % MISSIONS.length;
  else if (action === 'select') next = value;
  else if (action.startsWith('select')) next = Number(action.replace('select', '')) || 0;
  if (next === missionIndex) return;
  missionIndex = clamp(next, 0, MISSIONS.length - 1);
  sound.click();
  ui.showBriefing(missionIndex, bestScore);
}

function handleAction(action, value = 0) {
  if (phase === 'help' && action !== 'resume' && action !== 'quality' && action !== 'mute') {
    if (action === 'confirm' || action === 'escape') {
      closeHelp();
      return;
    }
  }

  if (action === 'confirm') {
    if (phase === 'title') goBriefing();
    else if (phase === 'briefing') launchMission(missionIndex);
    else if (phase === 'success' || phase === 'fail') launchMission(missionIndex);
    else if (phase === 'pause') resumeFlight();
    else if (phase === 'help') closeHelp();
    return;
  }
  if (action === 'escape') {
    if (phase === 'play') showPause();
    else if (phase === 'pause') resumeFlight();
    else if (phase === 'help') closeHelp();
    else if (phase === 'briefing') goTitle();
    else if (phase === 'success' || phase === 'fail') goBriefing();
    return;
  }
  if (action === 'pause') {
    if (phase === 'play') showPause();
    else if (phase === 'pause') resumeFlight();
    return;
  }
  if (action === 'briefing' || action === 'missions') {
    goBriefing();
    return;
  }
  if (action === 'title') {
    goTitle();
    return;
  }
  if (action === 'launch') {
    launchMission(clamp(value, 0, MISSIONS.length - 1));
    return;
  }
  if (action === 'select' || action.startsWith('select') || action === 'prev' || action === 'next') {
    if (phase === 'briefing') selectMission(action, value);
    return;
  }
  if (action === 'restart') {
    if (['play', 'pause', 'help', 'success', 'fail'].includes(phase)) launchMission(missionIndex);
    return;
  }
  if (action === 'resume') {
    if (phase === 'help') closeHelp();
    else if (phase === 'pause') resumeFlight();
    return;
  }
  if (action === 'help') {
    if (phase === 'help') closeHelp();
    else if (phase !== 'success' && phase !== 'fail') openHelp();
    return;
  }
  if (action === 'quality') {
    graphicsQuality = graphicsQuality === 'high' ? 'low' : 'high';
    writeSetting(QUALITY_KEY, graphicsQuality);
    applyGraphicsQuality();
    ui.flash(`GRAPHICS · ${graphicsQuality.toUpperCase()}`);
    if (phase === 'pause') showPause();
    else if (phase === 'help') ui.showHelp(helpOrigin, { quality: graphicsQuality });
    return;
  }
  if (action === 'mute') {
    const muted = sound.toggleMute();
    ui.flash(`SOUND · ${muted ? 'MUTED' : 'ON'}`);
    return;
  }
  if (action === 'canvasClick') {
    if (phase === 'play') ui.flash('MOUSE FLIGHT ACTIVE · ESC TO RELEASE', 'warn');
    return;
  }
  if (phase !== 'play') return;
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

function placeTitleCamera(angle) {
  const p = aircraft.state.pos;
  camera.position.set(p.x + Math.sin(angle) * 36, p.y + 12 + Math.sin(clockTime * 0.3) * 1.5, p.z + Math.cos(angle) * 36);
  camera.up.set(0, 1, 0);
  camera.lookAt(p.x, p.y + 1.5, p.z - 7);
  camera.fov = 63;
  camera.updateProjectionMatrix();
}

function updateTitleCamera(dt, fixed = false) {
  const angle = fixed ? 0.72 : clockTime * 0.075 + 0.4;
  placeTitleCamera(angle);
  aircraft.updateCamera(dt || 0.016, 'chase');
  placeTitleCamera(angle);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(Math.max((now - lastFrameAt) / 1000, 0), 0.25);
  lastFrameAt = now;
  clockTime += dt;
  const queued = input.takeActions();
  if (queued.length) sound.unlock();
  for (const action of queued) handleAction(action);

  if (phase === 'play') {
    simAccumulator += dt;
    let safety = 0;
    while (simAccumulator >= STEP && safety < 8 && phase === 'play') {
      advanceFixedStep(STEP);
      simAccumulator -= STEP;
      safety += 1;
    }
    aircraft.updateCamera(dt, cameraMode);
  } else {
    simAccumulator = 0;
    if (phase === 'title' || phase === 'briefing') updateTitleCamera(dt);
    else aircraft.updateCamera(dt, cameraMode);
  }

  world.update(dt, clockTime, camera.position);
  const data = flightTelemetry();
  if (phase !== 'title' && phase !== 'briefing') ui.updateHUD(data);
  const intensity = phase === 'play'
    ? clamp(0.2 + (1 - aircraft.state.timeLeft / mission.time) * 0.7 + (100 - aircraft.state.integrity) / 180, 0, 1)
    : 0;
  sound.update(dt, { throttle: aircraft.state.throttle, speed: aircraft.state.vel.length(), stall: aircraft.state.stalled });
  if (phase === 'play') sound.setMode(mission.sky === 'storm' ? 'storm' : 'play', intensity);
  renderer.render(scene, camera);
}

buildMission(0);
goTitle();

if (shotName) {
  const shotMission = shotName === 'cover' || shotName === 'chase' ? 1 : shotName === 'cockpit' ? 2 : 0;
  buildMission(shotMission);
  const staged = stageShot(shotName, { aircraft, world, mission, selectedMission: shotMission });
  phase = staged.screen;
  cameraMode = staged.camera;
  clockTime = staged.time;
  aircraft.updateAxes();
  if (staged.framing) aircraft.setFraming(staged.framing);
  aircraft.syncShot(world, cameraMode);
  if (phase === 'title') {
    updateTitleCamera(0, true);
    ui.showTitle(0);
  } else {
    ui.showPlay();
    ui.updateHUD(flightTelemetry());
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
  if (document.hidden && phase === 'play') showPause();
});
