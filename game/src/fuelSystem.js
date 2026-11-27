import { clamp } from './random.js';

export const FUEL_RESERVE_FRACTION = 0.16;

export function createFuelSystem(mission) {
  const capacity = mission.fuelCapacity ?? 110;
  return {
    liters: capacity,
    capacity,
    reserve: capacity * FUEL_RESERVE_FRACTION,
    engineOut: false,
    reserveAnnounced: false,
  };
}

export function refillFuel(fuel, mission) {
  const fresh = createFuelSystem(mission);
  fuel.liters = fresh.liters;
  fuel.capacity = fresh.capacity;
  fuel.reserve = fresh.reserve;
  fuel.engineOut = false;
  fuel.reserveAnnounced = false;
}

/**
 * Burn is throttle dependent: idle still ticks over, high power costs much more.
 * Returns the transitions the caller needs to announce or score.
 */
export function burnFuel(fuel, throttle, dt) {
  if (fuel.engineOut || fuel.liters <= 0) {
    fuel.engineOut = true;
    return { enteredReserve: false, flameout: false };
  }
  const rate = 0.18 + Math.pow(clamp(throttle, 0, 1), 2) * 0.72;
  fuel.liters = Math.max(0, fuel.liters - rate * dt);
  const enteredReserve = !fuel.reserveAnnounced && fuel.liters > 0 && fuel.liters <= fuel.reserve;
  if (enteredReserve) fuel.reserveAnnounced = true;
  const flameout = fuel.liters <= 0;
  if (flameout) fuel.engineOut = true;
  return { enteredReserve, flameout };
}

/** Falling feed pressure gives reduced thrust before a complete flameout. */
export function fuelPressure(fuel) {
  if (fuel.engineOut || fuel.liters <= 0) return 0;
  if (fuel.liters >= fuel.reserve) return 1;
  return Math.max(0.38, fuel.liters / Math.max(1, fuel.reserve));
}

export function fuelState(fuel) {
  return {
    liters: fuel.liters,
    capacity: fuel.capacity,
    reserve: fuel.reserve,
    fraction: clamp(fuel.liters / Math.max(1, fuel.capacity), 0, 1),
    reserveFraction: clamp(fuel.reserve / Math.max(1, fuel.capacity), 0, 1),
    reserveWarning: fuel.liters <= fuel.reserve,
    engineOut: fuel.engineOut,
  };
}

/** Only a landing with usable fuel beyond the reserve earns the economy bonus. */
export function reserveLandingBonus(fuel, mission) {
  if (fuel.engineOut || fuel.liters <= fuel.reserve) return 0;
  const spare = fuel.liters - fuel.reserve;
  return Math.round((spare * 14 * (mission.multiplier ?? 1)) / 10) * 10;
}
