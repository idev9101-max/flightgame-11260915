import { fuelState, reserveLandingBonus } from './fuelSystem.js';

const RADIANS_TO_DEGREES = 180 / Math.PI;
const METERS_PER_SECOND_TO_KNOTS = 1.94384;
const METERS_TO_FEET = 3.28084;
const METERS_PER_SECOND_TO_FPM = 196.85;

function headingInDegrees(radians) {
  return ((radians * RADIANS_TO_DEGREES) % 360 + 360) % 360;
}

function bonusSummary(state, timeBonus, economyBonus, airframeBonus) {
  return {
    timeBonus,
    economyBonus,
    airframeBonus,
    fuelLeft: state.fuel.liters,
    fuelCapacity: state.fuel.capacity,
    fuelReserve: state.fuel.reserve,
  };
}

export function missionTelemetry(mission, state, world, cameraMode, elapsed) {
  const nextGate = world.rings[state.ringIndex];
  return {
    mission,
    timeLeft: state.timeLeft,
    timeTotal: mission.time,
    score: state.score,
    integrity: state.integrity,
    ringIndex: state.ringIndex,
    rings: world.rings,
    ringCount: world.rings.length,
    speedKts: state.vel.length() * METERS_PER_SECOND_TO_KNOTS,
    altFt: Math.max(-20, (state.pos.y - 6) * METERS_TO_FEET),
    headingDeg: headingInDegrees(state.heading),
    vsiFpm: state.vel.y * METERS_PER_SECOND_TO_FPM,
    throttle: state.throttle,
    gear: state.gear,
    flaps: state.flaps,
    cameraMode,
    stall: state.stalled,
    fuel: fuelState(state.fuel, state.throttle),
    engineOut: state.fuel.engineOut,
    message: state.message,
    messageTime: state.messageTime,
    wind: mission.wind + Math.sin(elapsed * 1.7) * mission.gust,
    targetDistance: nextGate ? state.pos.distanceTo(nextGate.center) : Infinity,
    pos: state.pos,
  };
}

export function scoreCompletedMission(state, mission) {
  const timeBonus = Math.round((state.timeLeft * 45 * mission.multiplier) / 10) * 10;
  const economyBonus = reserveLandingBonus(state.fuel, mission);
  const airframeBonus = Math.round((Math.max(0, state.integrity - 40) * 9 * mission.multiplier) / 10) * 10;
  state.score += timeBonus + economyBonus + airframeBonus;
  return bonusSummary(state, timeBonus, economyBonus, airframeBonus);
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
    bonus: bonus ?? bonusSummary(state, 0, 0, 0),
    mission,
  };
}
