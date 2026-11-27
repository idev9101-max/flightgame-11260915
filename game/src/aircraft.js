import*as THREE from'../vendor/engine.js';
import{clamp}from'../vendor/random.js';
import{fuelPressure}from'./fuelSystem.js';
import{createFlightModel}from'./flightPhysics.js';
import{buildBody}from'./aircraftModel.js';
import{buildCockpit}from'./cockpitModel.js';
import{createCameraControl}from'./camera.js';
import{createDamageEffects}from'./damageEffects.js';
const TRAIL_POINTS=70;
export function createAircraft(scene,camera,mission){
const body=buildBody();
scene.add(body.group);
const cockpit=buildCockpit(mission);
cockpit.group.visible=false;
camera.add(cockpit.group);
const shadow=new THREE.Mesh(
new THREE.CircleGeometry(5,18),
new THREE.MeshBasicMaterial({color:0x071218,transparent:true,opacity:0.24,depthWrite:false,fog:false}),
);
shadow.rotation.x=-Math.PI/2;
shadow.frustumCulled=false;
scene.add(shadow);
const trailMaterial=new THREE.LineBasicMaterial({color:0xa7f4ff,transparent:true,opacity:0.7,depthWrite:false,fog:false});
const trails=[];
for(let i=0;i<2;i+=1){
const geometry=new THREE.BufferGeometry();
const array=new Float32Array(TRAIL_POINTS*3);
geometry.setAttribute('position',new THREE.BufferAttribute(array,3));
geometry.setDrawRange(0,0);
const line=new THREE.Line(geometry,trailMaterial.clone());
line.frustumCulled=false;
scene.add(line);
trails.push({line,array,count:0});
}
const flight=createFlightModel(mission);
const state=flight.state;
const{quaternion,forward,up,right}=flight.axes;
const cameraControl=createCameraControl(camera,state,flight.axes,body,cockpit,mission,()=>flight.shake);
const damage=createDamageEffects(scene,state,flight.axes);
const tmp=new THREE.Vector3();
let propAngle=0;
let activeWorld=null;
function updateAxes(){
flight.updateAxes();
}
function updateTrails(dt){
const visible=state.flying&&state.vel.length()>28&&!state.crashed;
for(let i=0;i<trails.length;i+=1){
const trail=trails[i];
trail.line.visible=visible;
if(!visible)continue;
trail.array.copyWithin(3,0,(TRAIL_POINTS-1)*3);
const side=i===0?-1:1;
tmp.copy(state.pos).addScaledVector(right,side*7.55).addScaledVector(forward,0.5).addScaledVector(up,-0.2);
trail.array[0]=tmp.x;
trail.array[1]=tmp.y;
trail.array[2]=tmp.z;
trail.count=Math.min(TRAIL_POINTS,trail.count+1);
trail.line.geometry.setDrawRange(0,trail.count);
trail.line.geometry.attributes.position.needsUpdate=true;
trail.line.material.opacity=clamp(0.32+state.vel.length()*0.005,0.32,0.82);
}
}
function resetTrails(){
for(const trail of trails){
trail.count=0;
trail.array.fill(0);
trail.line.geometry.setDrawRange(0,0);
trail.line.visible=false;
}
}
function updateShadow(world){
const ground=world.heightAt(state.pos.x,state.pos.z);
const altitude=Math.max(0,state.pos.y-ground);
shadow.position.set(state.pos.x,ground+0.12,state.pos.z);
const scale=1+clamp(altitude*0.035,0,1.6);
shadow.scale.set(scale,scale,scale);
shadow.material.opacity=clamp(0.3-altitude*0.004,0.04,0.3);
shadow.visible=altitude<90&&!state.crashed;
}
function seedMotion(){
propAngle=0.72;
body.propeller.rotation.z=propAngle;
const speed=state.vel.length();
for(let i=0;i<trails.length;i+=1){
const trail=trails[i];
const side=i===0?-1:1;
for(let point=0;point<TRAIL_POINTS;point+=1){
tmp.copy(state.pos).addScaledVector(right,side*7.55).addScaledVector(forward,0.5-point*0.6);
tmp.addScaledVector(up,-0.2+Math.sin(point*0.42+side)*0.28);
trail.array[point*3]=tmp.x;
trail.array[point*3+1]=tmp.y;
trail.array[point*3+2]=tmp.z;
}
trail.count=TRAIL_POINTS;
trail.line.geometry.setDrawRange(0,TRAIL_POINTS);
trail.line.geometry.attributes.position.needsUpdate=true;
trail.line.visible=state.flying&&speed>28&&!state.crashed;
trail.line.material.opacity=clamp(0.32+speed*0.005,0.32,0.82);
}
}
function update(dt,controls,world,events){
activeWorld=world;
flight.update(dt,controls,world,events);
const power=fuelPressure(state.fuel)*state.throttle;
propAngle+=dt*(state.fuel.engineOut?0.4:2+power*34);
body.propeller.rotation.z=propAngle;
body.propDisc.rotation.z=0.4+propAngle*0.34;
body.gearGroup.visible=state.gear;
const flapAngle=state.flaps?0.46:0;
body.flaps[0].rotation.x=flapAngle;
body.flaps[1].rotation.x=flapAngle;
const rollInput=clamp(controls?.roll??0,-1,1);
body.ailerons[0].rotation.x=rollInput*0.24;
body.ailerons[1].rotation.x=-rollInput*0.24;
body.propDisc.material.opacity=state.fuel.engineOut?0.04:0.07+power*0.11+clamp(state.vel.length()*0.0006,0,0.07);
const strobe=Math.sin(state.elapsed*6.5)>0.82?1:0;
body.halos[0].material.opacity=0.18+strobe*0.48;
body.halos[1].material.opacity=0.18+strobe*0.48;
body.exhaust.scale.setScalar(0.5+power*0.95+Math.sin(state.elapsed*22)*0.07);
body.exhaust.material.opacity=0.2+power*0.45;
body.group.position.copy(state.pos);
body.group.quaternion.copy(quaternion);
updateShadow(world);
updateTrails(dt);
damage.update(dt);
}
function updateCamera(dt,mode,force=false){
cameraControl.update(dt,mode,force,activeWorld);
}
return{
state,
update,
updateCamera,
updateAxes,
setFraming(options){
cameraControl.setFraming(options);
},
syncShot(world,mode){
activeWorld=world;
body.group.position.copy(state.pos);
body.group.quaternion.copy(quaternion);
body.gearGroup.visible=state.gear;
body.flaps[0].rotation.x=state.flaps?0.46:0;
body.flaps[1].rotation.x=state.flaps?0.46:0;
const power=fuelPressure(state.fuel)*state.throttle;
body.propDisc.material.opacity=0.35+power*0.25;
body.propDisc.rotation.z=0.4+state.elapsed*8;
body.halos[0].material.opacity=0.42;
body.halos[1].material.opacity=0.42;
updateShadow(world);
seedMotion();
damage.seed();
cameraControl.update(0,mode,true,world);
},
reset(){
flight.reset();
damage.reset();
shadow.visible=false;
resetTrails();
cameraControl.resetFraming();
body.group.position.copy(state.pos);
body.group.quaternion.copy(quaternion);
},
setCameraMode(mode,dt=0){
cameraControl.update(dt,mode,true,activeWorld);
},
adjustThrottle(delta){
flight.adjustThrottle(delta);
},
toggleGear(){
return flight.toggleGear();
},
toggleFlaps(){
return flight.toggleFlaps();
},
burst(){
damage.burst();
},
dispose(){
scene.remove(body.group);
for(const trail of trails){
scene.remove(trail.line);
trail.line.geometry.dispose();
trail.line.material.dispose();
}
damage.dispose();
scene.remove(shadow);
shadow.geometry.dispose();
shadow.material.dispose();
camera.remove(cockpit.group);
cockpit.panel.texture.dispose();
},
};
}
