import { RUNWAY_Y } from './config.js';
import { refillFuel } from './fuelSystem.js';

function setFlight(state, missionForShot, options) {
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
  refillFuel(state.fuel, missionForShot);
  state.fuel.liters = options.fuel ?? state.fuel.capacity;
  state.fuel.engineOut = false;
  state.fuel.reserveAnnounced = state.fuel.liters <= state.fuel.reserve;
}

export function stageShot(name, context) {
  const { aircraft, world, mission, selectedMission } = context;
  const state = aircraft.state;
  aircraft.reset();
  world.resetRings();

  if (name === 'takeoff') {
    setFlight(state, mission, {
      x: 0,
      y: RUNWAY_Y + 6.5,
      z: -22,
      speed: 57,
      climb: 2.4,
      pitch: 0.13,
      roll: 0.02,
      throttle: 0.86,
      gear: true,
      flying: true,
      fuel: 109,
      integrity: 100,
      timeLeft: mission.time - 9,
      score: 0,
      message: 'AIRBORNE · CLIMB TO THE FIRST GATE',
      messageTime: 3,
    });
    return { screen: 'play', camera: 'chase', time: 6.5, missionIndex: selectedMission };
  }

  if (name === 'chase') {
    setFlight(state, mission, {
      x: 34,
      y: 66,
      z: -362,
      heading: 0.5,
      pitch: 0.045,
      roll: -0.24,
      speed: 70,
      climb: 1.6,
      throttle: 0.8,
      ringIndex: 2,
      fuel: 84,
      integrity: 87,
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
    setFlight(state, mission, {
      x: 8,
      y: 25,
      z: -252,
      heading: Math.PI - 0.03,
      pitch: -0.035,
      roll: 0.05,
      speed: 54,
      climb: -2.1,
      throttle: 0.62,
      gear: true,
      flaps: true,
      ringIndex: 5,
      fuel: 34,
      integrity: 91,
      score: 5200,
      timeLeft: mission.time - 24,
      message: 'ALL GATES CLEAR · FINAL APPROACH 09',
      messageTime: 4,
    });
    for (let i = 0; i < 5; i += 1) world.setPassed(i, true);
    return { screen: 'play', camera: 'chase', time: 14.5, missionIndex: selectedMission };
  }

  if (name === 'cockpit') {
    setFlight(state, mission, {
      x: -55,
      y: 53,
      z: -158,
      heading: 0.01,
      pitch: 0.025,
      roll: 0.03,
      speed: 61,
      climb: 1.2,
      throttle: 0.74,
      ringIndex: 0,
      fuel: 118,
      integrity: 93,
      score: 900,
      timeLeft: mission.time - 17,
      message: 'STORM PATROL · GATE 1 AHEAD',
      messageTime: 4,
    });
    return { screen: 'play', camera: 'cockpit', time: 11.4, missionIndex: selectedMission };
  }

  return { screen: 'title', camera: 'chase', time: 3.6, missionIndex: 0 };
}
