import*as THREE from'../vendor/engine.js';
import{clamp}from'../vendor/random.js';
import{makeGlowTexture}from'../vendor/worldAssets.js';
const SPARK_COUNT=72;
const SMOKE_COUNT=30;
const DAMAGE_THRESHOLD=80;
export function createDamageEffects(scene,state,axes){
const sparkGeometry=new THREE.BufferGeometry();
const sparkPositions=new Float32Array(SPARK_COUNT*3);
sparkGeometry.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));
const sparks=new THREE.Points(
sparkGeometry,
new THREE.PointsMaterial({color:0xffb363,size:0.7,transparent:true,opacity:0.9,depthWrite:false}),
);
sparks.frustumCulled=false;
sparks.visible=false;
scene.add(sparks);
const smokeGeometry=new THREE.BufferGeometry();
const smokePositions=new Float32Array(SMOKE_COUNT*3);
smokeGeometry.setAttribute('position',new THREE.BufferAttribute(smokePositions,3));
const smoke=new THREE.Points(
smokeGeometry,
new THREE.PointsMaterial({
map:makeGlowTexture('#aab6ba',128),
color:0x9aa8ae,
size:3.4,
transparent:true,
opacity:0.34,
depthWrite:false,
fog:false,
}),
);
smoke.frustumCulled=false;
smoke.visible=false;
scene.add(smoke);
const sparkVelocities=[];
const smokeParticles=[];
let sparkLife=0;
let emitTimer=0;
const tmp=new THREE.Vector3();
function damaged(){
return state.integrity<DAMAGE_THRESHOLD&&state.flying&&!state.crashed;
}
function emitSmoke(){
const particle={
life:2.8,
pos:tmp.copy(state.pos).addScaledVector(axes.forward,-5.2).addScaledVector(axes.up,0.9).clone(),
velocity:new THREE.Vector3(
(Math.random()-0.5)*0.7,
0.7+Math.random()*0.8,
(Math.random()-0.5)*0.7,
),
};
smokeParticles.push(particle);
if(smokeParticles.length>SMOKE_COUNT)smokeParticles.shift();
}
function writeSmoke(){
for(let i=0;i<SMOKE_COUNT;i+=1){
const particle=smokeParticles[i];
if(!particle){
smokePositions[i*3+1]=-10000;
continue;
}
smokePositions[i*3]=particle.pos.x;
smokePositions[i*3+1]=particle.pos.y;
smokePositions[i*3+2]=particle.pos.z;
}
smokeGeometry.attributes.position.needsUpdate=true;
const oldest=smokeParticles[0]?.life??0;
smoke.material.opacity=clamp(0.06+oldest*0.1,0.06,0.34);
}
function update(dt){
if(sparks.visible){
sparkLife-=dt;
if(sparkLife<=0)sparks.visible=false;
else{
for(let i=0;i<SPARK_COUNT;i+=1){
const velocity=sparkVelocities[i];
const age=1.6-sparkLife;
sparkPositions[i*3]=state.pos.x+velocity.x*age*0.5;
sparkPositions[i*3+1]=state.pos.y+velocity.y*age*0.5-age*age*5;
sparkPositions[i*3+2]=state.pos.z+velocity.z*age*0.5;
velocity.multiplyScalar(1-dt*0.8);
}
sparkGeometry.attributes.position.needsUpdate=true;
sparks.material.opacity=clamp(sparkLife/1.6,0,1);
}
}
for(let i=smokeParticles.length-1;i>=0;i-=1){
const particle=smokeParticles[i];
particle.life-=dt;
particle.pos.addScaledVector(particle.velocity,dt);
particle.velocity.multiplyScalar(1-dt*0.16);
if(particle.life<=0)smokeParticles.splice(i,1);
}
if(damaged()){
emitTimer-=dt;
if(emitTimer<=0){
emitTimer=0.11;
emitSmoke();
}
}
smoke.visible=smokeParticles.length>0;
if(smoke.visible)writeSmoke();
}
function seed(){
smokeParticles.length=0;
if(!damaged()){
smoke.visible=false;
return;
}
for(let i=0;i<18;i+=1){
const age=i*0.14;
tmp.copy(state.pos).addScaledVector(axes.forward,-5.2-age*7).addScaledVector(axes.up,0.9+age*0.7);
smokeParticles.push({
life:2.8-age*0.4,
pos:tmp.clone(),
velocity:new THREE.Vector3((Math.random()-0.5)*0.6,0.7,(Math.random()-0.5)*0.6),
});
}
smoke.visible=true;
writeSmoke();
}
function reset(){
sparks.visible=false;
smoke.visible=false;
sparkLife=0;
emitTimer=0;
sparkVelocities.length=0;
smokeParticles.length=0;
}
function burst(){
sparks.visible=true;
sparkLife=1.6;
for(let i=0;i<SPARK_COUNT;i+=1){
sparkVelocities[i]=new THREE.Vector3(Math.random()-0.5,Math.random()*0.9,Math.random()-0.5).multiplyScalar(22);
}
}
function dispose(){
scene.remove(sparks,smoke);
sparkGeometry.dispose();
sparks.material.dispose();
smokeGeometry.dispose();
smoke.material.dispose();
if(smoke.material.map)smoke.material.map.dispose();
}
return{update,seed,reset,burst,dispose,sparkVelocities};
}
