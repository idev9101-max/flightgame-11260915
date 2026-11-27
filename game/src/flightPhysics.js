import*as THREE from'../vendor/engine.js';
import{RUNWAY_FAR,RUNWAY_HALF_WIDTH,RUNWAY_NEAR,RUNWAY_Y}from'./config.js';
import{clamp,damp,smoothstep}from'../vendor/random.js';
import{burnFuel,createFuelSystem,fuelPressure,refillFuel}from'./fuelSystem.js';
const DEG=180/Math.PI;
export function createFlightModel(mission){
const state={
pos:new THREE.Vector3(0,RUNWAY_Y+1.45,RUNWAY_NEAR-28),
vel:new THREE.Vector3(0,0,0),
heading:0,
pitch:0,
roll:0,
throttle:0.55,
throttleTarget:0.55,
gear:true,
flaps:false,
flying:false,
stalled:false,
integrity:100,
score:0,
ringIndex:0,
elapsed:0,
timeLeft:mission.time,
message:'THROTTLE UP · ROTATE AT 80 KT',
messageTime:4,
crashed:false,
landed:false,
fuel:createFuelSystem(mission),
};
const axes={
quaternion:new THREE.Quaternion(),
forward:new THREE.Vector3(0,0,-1),
up:new THREE.Vector3(0,1,0),
right:new THREE.Vector3(1,0,0),
euler:new THREE.Euler(0,0,0,'YXZ'),
};
const tmpA=new THREE.Vector3();
const tmpB=new THREE.Vector3();
const tmpC=new THREE.Vector3();
const prevPos=new THREE.Vector3();
let shake=0;
const sparkVelocities=[];
function setMessage(text,duration=2.4){
state.message=text;
state.messageTime=duration;
}
function updateAxes(){
axes.euler.set(state.pitch,-state.heading,state.roll);
axes.quaternion.setFromEuler(axes.euler);
axes.forward.set(0,0,-1).applyQuaternion(axes.quaternion);
axes.up.set(0,1,0).applyQuaternion(axes.quaternion);
axes.right.set(1,0,0).applyQuaternion(axes.quaternion);
}
function update(dt,controls,world,events){
if(state.crashed)return;
state.elapsed+=dt;
state.timeLeft=Math.max(0,state.timeLeft-dt);
state.messageTime=Math.max(0,state.messageTime-dt);
const burn=burnFuel(state.fuel,state.throttle,dt);
if(burn.enteredReserve)setMessage(`FUEL RESERVE · ${Math.round(state.fuel.reserve)} L PROTECTED · LAND NOW`,5);
if(burn.flameout){
setMessage('FUEL EXHAUSTED · ENGINE OUT',6);
events.push({type:'flameout'});
}
state.throttle=damp(state.throttle,state.throttleTarget,2.4,dt);
const damage=clamp((100-state.integrity)/100,0,0.75);
const controlGain=1-damage*0.46;
const pitchTarget=clamp(controls.pitch,-1,1)*0.38*controlGain;
const rollTarget=clamp(controls.roll,-1,1)*0.66*controlGain;
state.pitch=damp(state.pitch,state.flying?pitchTarget:pitchTarget*0.28,state.flying?3.1:5,dt);
state.roll=damp(state.roll,state.flying?rollTarget:0,3.6-damage*0.6,dt);
const yawRate=controls.yaw*0.42*controlGain+Math.sin(state.roll)*0.28+Math.sin(state.elapsed*1.7)*damage*0.012;
state.heading+=yawRate*dt;
if(!state.flying){
state.heading=damp(state.heading,0,1.8,dt);
state.pitch=damp(state.pitch,0,4,dt);
}
updateAxes();
prevPos.copy(state.pos);
const speed=state.vel.length();
const thrust=state.throttle*fuelPressure(state.fuel)*32*(1-damage*0.24);
const drag=0.55+0.0038*speed*speed+(state.gear?1.8:0)+(state.flaps?1.6:0)+(controls.brake?11:0)+damage*1.7;
state.vel.addScaledVector(axes.forward,thrust*dt);
tmpB.copy(state.vel).normalize();
state.vel.addScaledVector(tmpB,-drag*dt);
const stallFactor=smoothstep(17,34,speed)*(1-0.45*smoothstep(0.2,0.48,state.pitch));
state.stalled=stallFactor<0.72&&state.flying;
const lift=0.003*speed*speed*(1+(state.flaps?0.34:0))*stallFactor*Math.cos(state.roll*0.55);
state.vel.addScaledVector(axes.up,lift*dt);
state.vel.y-=9.81*dt;
const wind=mission.wind*Math.sin(state.elapsed*0.37)+mission.gust*Math.sin(state.elapsed*1.9+1.2);
state.vel.x+=wind*dt;
const forwardSpeed=state.vel.dot(axes.forward);
tmpC.copy(state.vel).addScaledVector(axes.forward,-forwardSpeed);
tmpC.multiplyScalar(Math.exp(-3.4*dt));
state.vel.copy(axes.forward).multiplyScalar(forwardSpeed).add(tmpC);
state.vel.clampLength(0,145);
state.pos.addScaledVector(state.vel,dt);
const ground=world.heightAt(state.pos.x,state.pos.z)+1.45;
if(state.pos.y<=ground){
if(!state.flying){
state.pos.y=ground;
state.vel.y=0;
const speedNow=state.vel.length();
if(speedNow>42&&controls.pitch>0.42){
state.flying=true;
setMessage('AIRBORNE · CLIMB TO THE FIRST GATE',3.2);
events.push({type:'liftoff'});
}
}else{
const bank=Math.abs(state.roll)*DEG;
const pitchDeg=Math.abs(state.pitch)*DEG;
const speedNow=state.vel.length();
const onRunway=Math.abs(state.pos.x)<RUNWAY_HALF_WIDTH-1&&state.pos.z<RUNWAY_NEAR&&state.pos.z>RUNWAY_FAR;
const aligned=Math.abs(Math.sin(state.heading))<0.42;
const safe=state.gear&&onRunway&&aligned&&speedNow<76&&bank<20&&pitchDeg<17&&state.vel.y>-6.5;
if(safe){
state.flying=false;
state.pos.y=ground;
state.vel.y=0;
state.vel.multiplyScalar(0.72);
state.throttleTarget=0.1;
state.landed=true;
setMessage('TOUCHDOWN · WELCOME HOME',3.5);
events.push({type:'touchdown',complete:state.ringIndex>=world.rings.length});
}else if(speedNow<34&&state.gear&&state.vel.y>-5&&!state.stalled){
state.integrity=Math.max(0,state.integrity-22);
state.flying=false;
state.pos.y=ground;
state.vel.y=0;
state.vel.multiplyScalar(0.35);
setMessage('HARD LANDING · AIRFRAME DAMAGED',3.4);
events.push({type:'damage'});
}else{
state.integrity=0;
state.crashed=true;
events.push({type:'crash'});
}
}
}
if(state.pos.y<0.6&&state.flying){
state.integrity=0;
state.crashed=true;
events.push({type:'crash'});
}
if(!state.crashed&&state.ringIndex<world.rings.length){
const ring=world.rings[state.ringIndex];
const d0=tmpA.copy(prevPos).sub(ring.center).dot(ring.normal);
const d1=tmpB.copy(state.pos).sub(ring.center).dot(ring.normal);
if(d0>0&&d1<=0){
const t=d0/Math.max(0.0001,d0-d1);
tmpC.copy(prevPos).lerp(state.pos,t).sub(ring.center);
if(tmpC.length()<ring.radius*1.12){
const points=Math.round((900+Math.max(0,10-state.timeLeft*0.02)*40)*mission.multiplier);
state.score+=points;
state.ringIndex+=1;
world.setPassed(state.ringIndex-1,true);
setMessage(state.ringIndex>=world.rings.length?'ALL GATES CLEAR · RETURN AND LAND':`GATE ${state.ringIndex} CLEAR · +${points}`,2.8);
events.push({type:'ring',index:state.ringIndex-1,points});
}
}
}
if(state.timeLeft<=0&&!state.crashed){
state.crashed=true;
events.push({type:'timeout'});
}
if(state.integrity<=0&&!state.crashed){
state.crashed=true;
events.push({type:'crash'});
}
if(state.stalled&&Math.random()<dt*1.4)shake=Math.max(shake,0.25);
shake=Math.max(0,shake-dt*0.9);
}
function reset(){
state.pos.set(0,RUNWAY_Y+1.45,RUNWAY_NEAR-28);
state.vel.set(0,0,0);
state.heading=0;
state.pitch=0;
state.roll=0;
state.throttle=0.55;
state.throttleTarget=0.55;
state.gear=true;
state.flaps=false;
state.flying=false;
state.stalled=false;
state.integrity=100;
state.score=0;
state.ringIndex=0;
state.elapsed=0;
state.timeLeft=mission.time;
state.message='THROTTLE UP · ROTATE AT 80 KT';
state.messageTime=4;
state.crashed=false;
state.landed=false;
refillFuel(state.fuel,mission);
shake=0;
updateAxes();
}
updateAxes();
return{
state,
axes,
update,
reset,
updateAxes,
adjustThrottle(delta){
state.throttleTarget=clamp(state.throttleTarget+delta,0,1);
},
toggleGear(){
state.gear=!state.gear;
return state.gear;
},
toggleFlaps(){
state.flaps=!state.flaps;
return state.flaps;
},
get shake(){
return shake;
},
sparkVelocities,
};
}
