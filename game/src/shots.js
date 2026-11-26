import { RUNWAY_Y } from './config.js';

function setFlight(state, options) {
  state.pos.set(options.x, options.y, options.z);
  state.heading = options.heading ?? 0;
  state.pitch = options.pitch ?? 0;
  state.roll = options.roll ?? 0;
  const speed = options.speed ?? 60;
  state.vel.set(Math.sin(state.heading) * speed, options.climb ?? 0, -Math.cos(state.heading) * speed);
  state.throttle = options.throttle ?? 0.75;
  state.throttleTarget = state.throttle;
  state.flying = options.flying !== false;
  state.gear = options.gear ?? false;
  state.flaps = options.flaps ?? false;
  state.ringIndex = options.ringIndex ?? 0;
  state.score = options.score ?? 0;
  state.timeLeft = options.timeLeft ?? 120;
  state.message = options.message ?? '';
  state.messageTime = options.messageTime ?? 0;
  state.stalled = false;
  state.crashed = false;
  state.integrity = options.integrity ?? 100;
}

export function stageShot(name, context) {
  const { aircraft, world, mission, selectedMission } = context;
  const state = aircraft.state;
  aircraft.reset();
  world.resetRings();

  if (name === 'takeoff') {
    setFlight(state, {
      x: 0,
      y: RUNWAY_Y + 9.5,
      z: -34,
      speed: 61,
      climb: 3.4,
      pitch: 0.15,
      roll: 0.02,
      throttle: 0.82,
      gear: true,
      flying: true,
      timeLeft: mission.time - 9,
      score: 0,
      message: 'AIRBORNE · CLIMB TO THE FIRST GATE',
      messageTime: 3,
    });
    return { screen: 'play', camera: 'chase', time: 6.5, missionIndex: selectedMission };
  }

  if (name === 'chase') {
    setFlight(state, {
      x: 22,
      y: 49,
      z: -278,
      heading: 0.34,
      pitch: 0.075,
      roll: -0.34,
      speed: 72,
      climb: 2.2,
      throttle: 0.88,
      ringIndex: 2,
      score: 2450,
      timeLeft: mission.time - 31,
      message: 'GATE 2 CLEAR · +1500',
      messageTime: 2.5,
    });
    world.setPassed(0, true);
    world.setPassed(1, true);
    return { screen: 'play', camera: 'chase', time: 19.2, missionIndex: selectedMission };
  }

  if (name === 'harbor') {
    setFlight(state, {
      x: 355,
      y: 38,
      z: -480,
      heading: -1.45,
      pitch: 0.02,
      roll: -0.12,
      speed: 67,
      climb: 1.6,
      throttle: 0.81,
      ringIndex: 2,
      score: 2600,
      timeLeft: mission.time - 24,
      message: 'HARBOR CIRCUIT · GATE 03 AHEAD',
      messageTime: 3,
    });
    world.setPassed(0, true);
    world.setPassed(1, true);
    return { screen: 'play', camera: 'chase', time: 14.5, missionIndex: selectedMission };
  }

  if (name === 'cockpit') {
    setFlight(state, {
      x: -3,
      y: 32,
      z: -146,
      heading: 0.03,
      pitch: 0.055,
      roll: 0.04,
      speed: 63,
      climb: 1.4,
      throttle: 0.74,
      ringIndex: 0,
      score: 900,
      timeLeft: mission.time - 17,
      message: 'GATE 1 AHEAD · 120 m',
      messageTime: 3,
    });
    return { screen: 'play', camera: 'cockpit', time: 11.4, missionIndex: selectedMission };
  }

  return { screen: 'title', camera: 'chase', time: 3.6, missionIndex: 0 };
}
