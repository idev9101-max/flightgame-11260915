import*as THREE from'../vendor/engine.js';
import{RUNWAY_Y}from'./config.js';
import{clamp}from'../vendor/random.js';
import{fuelState}from'./fuelSystem.js';
const DEG=180/Math.PI;
export function createCameraControl(camera,state,axes,body,cockpit,mission,getShake=()=>0){
const desiredCamera=new THREE.Vector3();
const lookTarget=new THREE.Vector3();
const tmp=new THREE.Vector3();
const framing={distance:16.5,height:3.2,lookAhead:8.5,fov:62};
function update(dt,mode,force=false,world=null){
const cockpitMode=mode==='cockpit';
cockpit.group.visible=cockpitMode;
body.group.visible=!cockpitMode;
const shakeAmount=getShake()*0.16;
if(cockpitMode){
tmp.set(0,1.38,-2.15).applyQuaternion(axes.quaternion).add(state.pos);
camera.position.copy(tmp);
camera.quaternion.copy(axes.quaternion);
camera.up.copy(axes.up);
if(shakeAmount>0)camera.rotateZ(Math.sin(state.elapsed*37)*shakeAmount*0.3);
camera.fov=74+clamp(state.vel.length()*0.02,0,3);
}else{
desiredCamera.set(0,framing.height,framing.distance).applyQuaternion(axes.quaternion).add(state.pos);
if(force)camera.position.copy(desiredCamera);
else camera.position.lerp(desiredCamera,1-Math.exp(-5.5*dt));
if(shakeAmount>0)camera.position.x+=Math.sin(state.elapsed*41)*shakeAmount;
camera.up.set(0,1,0).lerp(axes.up,0.55).normalize();
lookTarget.copy(state.pos).addScaledVector(axes.forward,framing.lookAhead).addScaledVector(axes.up,1.1);
camera.lookAt(lookTarget);
camera.fov=framing.fov+clamp(state.vel.length()*0.045,0,5);
}
camera.updateProjectionMatrix();
const speedKts=state.vel.length()*1.94384;
const altFt=Math.max(-20,(state.pos.y-RUNWAY_Y)*3.28084);
const headingDeg=((state.heading*DEG)%360+360)%360;
const nextRing=world?.rings?.[state.ringIndex];
let bearing=0;
let range=0;
if(nextRing){
const dx=nextRing.center.x-state.pos.x;
const dz=nextRing.center.z-state.pos.z;
range=Math.hypot(dx,dz);
bearing=((Math.atan2(dx,-dz)*DEG-headingDeg)%360+540)%360;
if(bearing>180)bearing-=360;
}
cockpit.panel.draw({
speed:speedKts,
alt:altFt,
heading:headingDeg,
vsi:state.vel.y*196.85,
throttle:state.throttle,
pitch:state.pitch*DEG,
roll:state.roll,
stall:state.stalled,
gear:state.gear,
flaps:state.flaps,
integrity:state.integrity,
gateIndex:state.ringIndex+1,
bearing,
range,
timeLeft:state.timeLeft,
missionName:mission.name,
score:state.score,
elapsed:state.elapsed,
fuel:fuelState(state.fuel,state.throttle),
},force||dt===0);
cockpit.yoke.rotation.z=-state.roll*0.5;
cockpit.throttle.rotation.z=0.55-state.throttle*1.1;
const power=state.fuel.engineOut?0:(state.fuel.liters<=state.fuel.reserve?0.38:1)*state.throttle;
cockpit.propBlur.rotation.z=state.elapsed*(2.5+power*22);
cockpit.propBlur.material.opacity=state.fuel.engineOut?0.06:0.22+power*0.26;
}
return{
update,
setFraming(options){
if(options.distance!==undefined)framing.distance=options.distance;
if(options.height!==undefined)framing.height=options.height;
if(options.lookAhead!==undefined)framing.lookAhead=options.lookAhead;
if(options.fov!==undefined)framing.fov=options.fov;
},
resetFraming(){
framing.distance=16.5;
framing.height=3.2;
framing.lookAhead=8.5;
framing.fov=62;
},
};
}
