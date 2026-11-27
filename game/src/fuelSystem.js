import{clamp}from'../vendor/random.js';
export const FUEL_RESERVE_FRACTION=0.16;
export function createFuelSystem(mission){
const capacity=mission.fuelCapacity??110;
return{
liters:capacity,
capacity,
reserve:capacity*FUEL_RESERVE_FRACTION,
engineOut:false,
reserveAnnounced:false,
};
}
export function refillFuel(fuel,mission){
const fresh=createFuelSystem(mission);
fuel.liters=fresh.liters;
fuel.capacity=fresh.capacity;
fuel.reserve=fresh.reserve;
fuel.engineOut=false;
fuel.reserveAnnounced=false;
}
export function fuelBurnRate(throttle){
return 0.15+Math.pow(clamp(throttle,0,1),2)*0.62;
}
export function burnFuel(fuel,throttle,dt){
if(fuel.engineOut||fuel.liters<=0){
fuel.engineOut=true;
return{enteredReserve:false,flameout:false};
}
fuel.liters=Math.max(0,fuel.liters-fuelBurnRate(throttle)*dt);
const enteredReserve=!fuel.reserveAnnounced&&fuel.liters>0&&fuel.liters<=fuel.reserve;
if(enteredReserve)fuel.reserveAnnounced=true;
const flameout=fuel.liters<=0;
if(flameout)fuel.engineOut=true;
return{enteredReserve,flameout};
}
export function fuelPressure(fuel){
if(fuel.engineOut||fuel.liters<=0)return 0;
if(fuel.liters>=fuel.reserve)return 1;
return Math.max(0.38,fuel.liters/Math.max(1,fuel.reserve));
}
export function fuelState(fuel,throttle=0.55){
const burnRate=fuelBurnRate(throttle);
return{
liters:fuel.liters,
capacity:fuel.capacity,
reserve:fuel.reserve,
fraction:clamp(fuel.liters/Math.max(1,fuel.capacity),0,1),
reserveFraction:clamp(fuel.reserve/Math.max(1,fuel.capacity),0,1),
reserveWarning:fuel.liters<=fuel.reserve,
engineOut:fuel.engineOut,
burnRate,
endurance:fuel.engineOut?0:fuel.liters/Math.max(0.01,burnRate),
reserveEndurance:fuel.engineOut?0:Math.max(0,fuel.liters-fuel.reserve)/Math.max(0.01,burnRate),
};
}
export function reserveLandingBonus(fuel,mission){
if(fuel.engineOut||fuel.liters<=fuel.reserve)return 0;
const spare=fuel.liters-fuel.reserve;
return Math.round((spare*14*(mission.multiplier??1))/10)*10;
}
