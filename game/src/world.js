import*as THREE from'../vendor/engine.js';
import{RUNWAY_NEAR,RUNWAY_Y,SEED}from'./config.js';
import{createRandom,lerp}from'../vendor/random.js';
import{createTerrain,createTerrainField}from'./terrain.js';
import{createHaze,createGroundDetails,createCanyonScenery,createVegetation}from'./scenery.js';
import{createSettlements}from'./settlements.js';
import{SKY_PRESETS,createSkyLighting,updateSkyLighting}from'./sky.js';
import{createWater,updateWater}from'./water.js';
import{createClouds,updateClouds}from'./clouds.js';
import{createRunway}from'./runway.js';
import{createGates,updateGates}from'./gates.js';
export function createWorld(scene,mission,missionIndex,seedValue=SEED){
const root=new THREE.Group();
scene.add(root);
const seed=seedValue+missionIndex*137;
const preset=mission.id==='canyon'?SKY_PRESETS.canyon:SKY_PRESETS[mission.sky]??SKY_PRESETS.day;
const random=createRandom(seed*7919);
const skyParts=createSkyLighting(root,scene,preset,mission);
const gatePath=[[0,RUNWAY_NEAR],...mission.rings.map(([x,,z])=>[x,z]),[0,-920]];
function guideX(z){
if(z>=gatePath[0][1])return gatePath[0][0];
for(let i=0;i<gatePath.length-1;i+=1){
const[x0,z0]=gatePath[i];
const[x1,z1]=gatePath[i+1];
if(z<=z0&&z>=z1)return lerp(x0,x1,(z0-z)/(z0-z1));
}
return gatePath[gatePath.length-1][0];
}
const field=createTerrainField(mission,seed,guideX);
const{heightAt,terrainColor}=field;
createTerrain(root,mission,heightAt,terrainColor,random);
const waterParts=createWater(root,mission);
createGroundDetails(root,mission,random,heightAt,guideX);
if(mission.id==='canyon')createCanyonScenery(root,mission,random,heightAt,guideX);
createSettlements(root,mission,random,heightAt);
createVegetation(root,mission,random,heightAt,guideX);
createRunway(root);
const clouds=createClouds(root,mission,random);
createHaze(root,preset,guideX);
const ringGroups=createGates(root,mission);
const startPad=new THREE.Mesh(
new THREE.CircleGeometry(3.5,12),
new THREE.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:0.5,side:THREE.DoubleSide}),
);
startPad.rotation.x=-Math.PI/2;
startPad.position.set(0,RUNWAY_Y+0.55,RUNWAY_NEAR-28);
root.add(startPad);
return{
root,
rings:ringGroups,
heightAt,
preset,
update(dt,time,cameraPos){
updateWater(waterParts,dt);
updateClouds(clouds,dt,time);
updateGates(ringGroups,time);
updateSkyLighting(skyParts,mission,time,cameraPos);
},
setPassed(index,value){
const ring=ringGroups[index];
if(ring)ring.passed=value;
},
resetRings(){
for(const ring of ringGroups)ring.passed=false;
},
destroy(){
scene.remove(root);
root.traverse((object)=>{
if(object.geometry)object.geometry.dispose();
if(object.material){
const materials=Array.isArray(object.material)?object.material:[object.material];
for(const material of materials){
if(material.map)material.map.dispose();
material.dispose();
}
}
});
},
};
}
