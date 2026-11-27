import { fuelState, reserveLandingBonus } from './fuelSystem.js';

const DEG = 180 / Math.PI;

/** Everything the HUD and cockpit need for one frame, derived from live simulation state. */
export function missionTelemetry(mission, state, world, cameraMode, elapsed) {
  const next = world.rings[state.ringIndex];
  const fuel = fuelState(state.fuel);
  return {
    mission,
    timeLeft: state.timeLeft,
    timeTotal: mission.time,
    score: state.score,
    integrity: state.integrity,
    ringIndex: state.ringIndex,
    rings: world.rings,
    ringCount: world.rings.length,
    speedKts: state.vel.length() * 1.94384,
    altFt: Math.max(-20, (state.pos.y - 6) * 3.28084),
    headingDeg: ((state.heading * DEG) % 360 + 360) % 360,
    vsiFpm: state.vel.y * 196.85,
    throttle: state.throttle,
    gear: state.gear,
    flaps: state.flaps,
    cameraMode,
    stall: state.stalled,
    fuel,
    engineOut: state.fuel.engineOut,
    message: state.message,
    messageTime: state.messageTime,
    wind: mission.wind + Math.sin(elapsed * 1.7) * mission.gust,
    targetDistance: next ? state.pos.distanceTo(next.center) : Infinity,
    pos: state.pos,
  };
}

/** A clean landing pays time/airframe points plus a real fuel-reserve economy bonus. */
export function scoreCompletedMission(state, mission) {
  const timeBonus = Math.round((state.timeLeft * 45 * mission.multiplier + state.integrity * 14) / 10) * 10;
  const economyBonus = reserveLandingBonus(state.fuel, mission);
  state.score += timeBonus + economyBonus;
  return { timeBonus, economyBonus, fuelLeft: state.fuel.liters, fuelCapacity: state.fuel.capacity };
}

export function buildResultData(success, reason, state, world, mission, best, bonus) {
  return {
    success,
    reason,
    score: state.score,
    best,
    ringIndex: state.ringIndex,
    rings: world.rings,
    ringCount: world.rings.length,
    elapsed: state.elapsed,
    integrity: state.integrity,
    fuel: fuelState(state.fuel),
    bonus: bonus ?? { timeBonus: 0, economyBonus: 0, fuelLeft: state.fuel.liters, fuelCapacity: state.fuel.capacity },
    mission,
  };
}
