import*as THREE from'../vendor/engine.js';
import{makeGlowTexture,makePropTexture}from'../vendor/worldAssets.js';
import{createPanel}from'./cockpitPanel.js';
import{createFuelSystem,fuelState}from'./fuelSystem.js';
export function buildCockpit(mission){
const group=new THREE.Group();
const panel=createPanel(mission);
const shell=new THREE.MeshStandardMaterial({color:0x223944,roughness:0.68,metalness:0.32,flatShading:true,emissive:0x0d202b,emissiveIntensity:0.75,fog:false});
const trim=new THREE.MeshStandardMaterial({color:0x58727d,roughness:0.52,metalness:0.5,flatShading:true,emissive:0x1a3039,emissiveIntensity:0.55,fog:false});
const edge=new THREE.MeshBasicMaterial({color:0xa9d4e2,fog:false});
const backing=new THREE.Mesh(new THREE.BoxGeometry(1.38,0.7,0.16),shell);
backing.position.set(0,-0.9,-1.62);
backing.rotation.x=-0.13;
group.add(backing);
const instrumentMaterial=new THREE.MeshBasicMaterial({map:panel.texture,fog:false,side:THREE.DoubleSide});
instrumentMaterial.color.multiplyScalar(2.45);
const instruments=new THREE.Mesh(new THREE.PlaneGeometry(1.26,0.63),instrumentMaterial);
instruments.position.set(0,-0.87,-1.51);
instruments.rotation.x=-0.13;
group.add(instruments);
const glass=new THREE.Mesh(
new THREE.PlaneGeometry(1.24,0.61),
new THREE.MeshBasicMaterial({color:0xd2f4ff,transparent:true,opacity:0.035,fog:false,depthWrite:false,side:THREE.DoubleSide}),
);
glass.position.set(0,-0.864,-1.495);
glass.rotation.x=-0.13;
group.add(glass);
const hood=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.08,0.16),shell);
hood.position.set(0,-0.54,-1.44);
hood.rotation.x=-0.13;
group.add(hood);
const hoodLip=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.022,0.028),edge);
hoodLip.position.set(0,-0.49,-1.33);
group.add(hoodLip);
const indicatorColors=[0x6de3ff,0xffcf70,0x8ce6a8,0xff7d6b];
for(let i=0;i<4;i+=1){
const lamp=new THREE.Sprite(new THREE.SpriteMaterial({
map:makeGlowTexture(`#${indicatorColors[i].toString(16).padStart(6, '0')}`),
transparent:true,opacity:0.62,depthWrite:false,fog:false,
}));
lamp.position.set(-0.36+i*0.24,-0.49,-1.31);
lamp.scale.set(0.15,0.15,1);
group.add(lamp);
}
for(const side of[-1,1]){
const pillar=new THREE.Mesh(new THREE.BoxGeometry(0.028,0.62,0.045),shell);
pillar.position.set(side*1.02,0.02,-1.5);
pillar.rotation.z=side*0.07;
group.add(pillar);
const sill=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.04,1.1),shell);
sill.position.set(side*1.08,-0.5,-0.7);
group.add(sill);
const glint=new THREE.Mesh(
new THREE.PlaneGeometry(0.014,0.32),
new THREE.MeshBasicMaterial({color:0xd6f5ff,transparent:true,opacity:0.09,fog:false,depthWrite:false,side:THREE.DoubleSide}),
);
glint.position.set(side*0.75,0.28,-1.48);
glint.rotation.z=side*0.38;
group.add(glint);
}
const bow=new THREE.Mesh(new THREE.BoxGeometry(1.78,0.026,0.05),shell);
bow.position.set(0,0.82,-1.5);
group.add(bow);
const bowTrim=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.01,0.018),edge);
bowTrim.position.set(0,0.795,-1.46);
group.add(bowTrim);
const nosePaint=new THREE.MeshStandardMaterial({color:0xfff4e2,roughness:0.38,metalness:0.22,shininess:68,flatShading:true,emissive:0x3c2b1f,emissiveIntensity:0.22,fog:false});
const noseAccent=new THREE.MeshStandardMaterial({color:0xe97246,roughness:0.42,metalness:0.24,shininess:62,flatShading:true,emissive:0x502012,emissiveIntensity:0.3,fog:false});
const cowling=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.4,1.5,10),nosePaint);
cowling.rotation.x=Math.PI/2;
cowling.position.set(0,-1.34,-2.85);
group.add(cowling);
const cowlBand=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.32,0.22,10),noseAccent);
cowlBand.rotation.x=Math.PI/2;
cowlBand.position.set(0,-1.34,-3.5);
group.add(cowlBand);
const cowlSeam=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.02,5,12),trim);
cowlSeam.position.set(0,-1.34,-3.34);
group.add(cowlSeam);
for(const side of[-1,1]){
const support=new THREE.Mesh(new THREE.BoxGeometry(0.038,0.038,1.2),trim);
support.position.set(side*0.4,-1.02,-2.08);
support.rotation.x=0.08;
group.add(support);
const noseStripe=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.025,1.45),noseAccent);
noseStripe.position.set(side*0.24,-1.16,-2.95);
group.add(noseStripe);
}
const spinnerCone=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.56,10),trim);
spinnerCone.rotation.x=-Math.PI/2;
spinnerCone.position.set(0,-1.34,-3.82);
group.add(spinnerCone);
const propBlur=new THREE.Mesh(
new THREE.PlaneGeometry(1.8,1.8),
new THREE.MeshBasicMaterial({map:makePropTexture(),transparent:true,opacity:0.42,depthWrite:false,side:THREE.DoubleSide,fog:false}),
);
propBlur.position.set(0,-1.34,-4.02);
group.add(propBlur);
const yoke=new THREE.Group();
const grip=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.045,0.045),trim);
const stem=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.18,0.04),shell);
stem.position.y=-0.1;
const hub=new THREE.Mesh(new THREE.BoxGeometry(0.09,0.07,0.08),shell);
yoke.add(grip,stem,hub);
yoke.position.set(0,-0.42,-0.6);
yoke.rotation.x=-0.28;
group.add(yoke);
const quadrant=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.12,0.14),shell);
quadrant.position.set(0.78,-0.35,-0.8);
group.add(quadrant);
const throttle=new THREE.Group();
throttle.position.set(0.78,-0.29,-0.78);
const lever=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.16,0.045),trim);
lever.position.y=0.07;
const knob=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.055,0.07),shell);
knob.position.y=0.15;
throttle.add(lever,knob);
group.add(throttle);
panel.draw({
speed:0,alt:0,heading:0,vsi:0,throttle:0.55,pitch:0,roll:0,
stall:false,gear:true,flaps:false,integrity:100,score:0,elapsed:0,
gateIndex:1,bearing:0,range:0,timeLeft:mission?.time??0,
missionName:mission?.name??'FLIGHT PLAN',fuel:fuelState(createFuelSystem(mission??{fuelCapacity:110}),0.55),
},true);
return{group,panel,yoke,throttle,propBlur};
}
