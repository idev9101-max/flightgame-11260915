import*as THREE from'../vendor/engine.js';
import{clamp}from'../vendor/random.js';
import{makeGlowTexture,makePropTexture}from'../vendor/worldAssets.js';
export function buildBody(){
const group=new THREE.Group();
const paint=new THREE.MeshStandardMaterial({color:0xfff7e6,roughness:0.36,metalness:0.2,shininess:48,detail:0.12,flatShading:true,emissive:0x3d2b1e,emissiveIntensity:0.3});
const accent=new THREE.MeshStandardMaterial({color:0xf06a45,roughness:0.38,metalness:0.26,shininess:56,detail:0.1,flatShading:true,emissive:0x5c1f10,emissiveIntensity:0.42});
const dark=new THREE.MeshStandardMaterial({color:0x1b2932,roughness:0.62,metalness:0.4,shininess:36,flatShading:true});
const trim=new THREE.MeshStandardMaterial({color:0xd8e8ea,roughness:0.4,metalness:0.58,shininess:70,flatShading:true});
const glass=new THREE.MeshStandardMaterial({color:0x8fd9ee,transparent:true,opacity:0.72,roughness:0.14,metalness:0.32,emissive:0x174255,emissiveIntensity:0.75,side:THREE.DoubleSide});
const sections=[
[-8.1,0.16,0.14],[-7.5,0.48,0.42],[-6.3,0.78,0.7],[-4.6,0.9,0.8],
[-1.2,0.94,0.84],[1.8,0.9,0.8],[4.5,0.74,0.66],[6.2,0.5,0.46],[7.4,0.2,0.19],
];
const radial=12;
const fuselagePositions=[];
const fuselageIndices=[];
for(const[z,rx,ry]of sections){
for(let k=0;k<radial;k+=1){
const angle=(k/radial)*Math.PI*2;
fuselagePositions.push(Math.cos(angle)*rx,Math.sin(angle)*ry+0.04,z);
}
}
for(let s=0;s<sections.length-1;s+=1){
for(let k=0;k<radial;k+=1){
const a=s*radial+k;
const b=s*radial+(k+1)%radial;
const c=(s+1)*radial+k;
const d=(s+1)*radial+(k+1)%radial;
fuselageIndices.push(a,c,b,b,c,d);
}
}
const fuselageGeometry=new THREE.BufferGeometry();
fuselageGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fuselagePositions,3));
fuselageGeometry.setIndex(fuselageIndices);
fuselageGeometry.computeVertexNormals();
group.add(new THREE.Mesh(fuselageGeometry,paint));
const cowl=new THREE.Mesh(new THREE.CylinderGeometry(0.84,0.76,1.5,10),accent);
cowl.rotation.x=Math.PI/2;
cowl.position.z=-6.35;
group.add(cowl);
for(const z of[-7.02,-6.05,-5.62]){
const lip=new THREE.Mesh(new THREE.TorusGeometry(z===-6.05?0.79:0.81,0.045,5,12),trim);
lip.position.z=z;
group.add(lip);
}
for(let i=0;i<6;i+=1){
const angle=(i/6)*Math.PI*2;
const seam=new THREE.Mesh(new THREE.BoxGeometry(0.035,1.18,0.025),dark);
seam.position.set(Math.cos(angle)*0.78,Math.sin(angle)*0.78,-6.35);
seam.rotation.z=angle;
group.add(seam);
}
const spinner=new THREE.Mesh(new THREE.ConeGeometry(0.44,1.2,10),trim);
spinner.rotation.x=-Math.PI/2;
spinner.position.z=-8.45;
group.add(spinner);
const tailBand=new THREE.Mesh(new THREE.CylinderGeometry(0.53,0.4,0.7,10),accent);
tailBand.rotation.x=Math.PI/2;
tailBand.position.z=6.55;
group.add(tailBand);
function plate(points,thickness,material,offsetY=0,dihedral=0){
const positions=[];
const indices=[];
let cx=0;
let cz=0;
for(const[x,z]of points){
cx+=x;
cz+=z;
}
cx/=points.length;
cz/=points.length;
const cy=offsetY+Math.abs(cx)*dihedral;
for(const[x,z]of points){
const y=offsetY+Math.abs(x)*dihedral;
positions.push(x,y+thickness/2,z);
}
for(const[x,z]of points){
const y=offsetY+Math.abs(x)*dihedral;
positions.push(x,y-thickness/2,z);
}
positions.push(cx,cy+thickness/2,cz,cx,cy-thickness/2,cz);
const centerTop=points.length*2;
const centerBottom=centerTop+1;
for(let i=0;i<points.length;i+=1){
const next=(i+1)%points.length;
indices.push(centerTop,i,next);
indices.push(centerBottom,points.length+next,points.length+i);
indices.push(i,points.length+i,next,next,points.length+i,points.length+next);
}
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
geometry.setIndex(indices);
geometry.computeVertexNormals();
const mesh=new THREE.Mesh(geometry,material);
group.add(mesh);
return mesh;
}
const wingOutline=[
[-8.2,-1.7],[-5.4,-1.35],[-2,-0.95],[0,-0.82],[2,-0.95],[5.4,-1.35],[8.2,-1.7],
[8.2,0.2],[4.8,0.95],[0,1.12],[-4.8,0.95],[-8.2,0.2],
];
plate(wingOutline,0.28,paint,-0.34,0.028);
plate([[-7.7,-1.45],[7.7,-1.45],[7.7,-1.08],[-7.7,-1.08]],0.1,accent,-0.34,0.028);
plate([[-7.9,0.1],[7.9,0.1],[7.9,0.26],[-7.9,0.26]],0.08,dark,-0.34,0.028);
for(const side of[-1,1]){
const tip=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.56,2.1),accent);
tip.position.set(side*8.15,-0.06,-0.72);
group.add(tip);
}
const bellyStripe=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.1,9.4),accent);
bellyStripe.position.set(0,-0.8,0.1);
group.add(bellyStripe);
for(const side of[-1,1]){
const seam=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.035,7.6),trim);
seam.position.set(side*0.9,0.16,0.6);
group.add(seam);
const flash=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.36,3.2),accent);
flash.position.set(side*0.92,0.02,2.2);
group.add(flash);
const wingBar=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.055,0.26),trim);
wingBar.position.set(side*4.7,-0.16,-0.72);
group.add(wingBar);
}
plate([[-2.9,4.6],[2.9,4.6],[2.3,6.2],[-2.3,6.2]],0.18,paint,0.4);
for(const side of[-1,1]){
const elevator=new THREE.Mesh(new THREE.BoxGeometry(2.2,0.12,0.95),trim);
elevator.position.set(side*1.45,0.48,6.15);
group.add(elevator);
const tip=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.4,1.2),accent);
tip.position.set(side*2.78,0.48,5.4);
group.add(tip);
}
const finVertices=[
[-0.17,0.55,4.8],[0.17,0.55,4.8],
[-0.17,3.45,6.55],[0.17,3.45,6.55],
[-0.17,0.7,7.35],[0.17,0.7,7.35],
];
const finPositions=[];
for(const vertex of finVertices)finPositions.push(...vertex);
const finGeometry=new THREE.BufferGeometry();
finGeometry.setAttribute('position',new THREE.Float32BufferAttribute(finPositions,3));
finGeometry.setIndex([0,2,4,1,5,3,0,1,2,1,3,2,2,3,4,3,5,4,4,5,0,5,1,0]);
finGeometry.computeVertexNormals();
group.add(new THREE.Mesh(finGeometry,accent));
const finCap=new THREE.Mesh(new THREE.BoxGeometry(0.38,0.26,1.9),trim);
finCap.position.set(0,3.42,6.4);
group.add(finCap);
const rudder=new THREE.Mesh(new THREE.BoxGeometry(0.32,1.35,1.05),paint);
rudder.position.set(0,1.7,6.6);
group.add(rudder);
for(const y of[1.35,1.72]){
const rudderBand=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.11,1.08),accent);
rudderBand.position.set(0,y,6.6);
group.add(rudderBand);
}
const canopy=new THREE.Mesh(new THREE.SphereGeometry(0.95,12,7,0,Math.PI*2,0,Math.PI/2),glass);
canopy.scale.set(0.96,1.15,2.1);
canopy.position.set(0,0.68,-1.35);
group.add(canopy);
for(const side of[-1,1]){
const frame=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.08,3.3),trim);
frame.position.set(side*0.86,0.66,-1.35);
frame.rotation.x=0.06;
group.add(frame);
}
const canopyBow=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.09,0.1),trim);
canopyBow.position.set(0,0.75,-3.1);
group.add(canopyBow);
function strut(from,to,radius,material){
const start=new THREE.Vector3(...from);
const end=new THREE.Vector3(...to);
const delta=end.clone().sub(start);
const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),6),material);
mesh.position.copy(start).add(end).multiplyScalar(0.5);
const direction=delta.normalize();
const upAxis=new THREE.Vector3(0,1,0);
const axis=upAxis.clone().cross(direction);
if(axis.lengthSq()>0.000001){
mesh.quaternion.setFromAxisAngle(axis.normalize(),Math.acos(clamp(upAxis.dot(direction),-1,1)));
}
group.add(mesh);
return mesh;
}
for(const side of[-1,1]){
strut([side*0.72,-0.52,-1.9],[side*4.9,-0.22,-1.05],0.07,trim);
strut([side*0.72,-0.52,-0.2],[side*4.9,-0.22,-1.05],0.07,trim);
}
const propeller=new THREE.Group();
const bladeMaterial=new THREE.MeshStandardMaterial({color:0x29343a,roughness:0.48,metalness:0.42,flatShading:true,emissive:0x132c37,emissiveIntensity:0.55,side:THREE.DoubleSide});
const bladeShape=[[-0.14,0],[-0.34,1.3],[-0.26,2.25],[0.08,2.42],[0.24,1.6],[0.14,0]];
const bladePositions=[];
const bladeIndices=[];
for(const[x,y]of bladeShape)bladePositions.push(x,y,0);
for(let i=1;i<bladeShape.length-1;i+=1)bladeIndices.push(0,i,i+1);
const bladeGeometry=new THREE.BufferGeometry();
bladeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bladePositions,3));
bladeGeometry.setIndex(bladeIndices);
bladeGeometry.computeVertexNormals();
for(let i=0;i<3;i+=1){
const blade=new THREE.Mesh(bladeGeometry,bladeMaterial);
blade.rotation.z=(i/3)*Math.PI*2;
propeller.add(blade);
}
const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.34,0.4,0.5,8),accent);
hub.rotation.x=Math.PI/2;
propeller.add(hub);
propeller.position.z=-8.62;
group.add(propeller);
const propDisc=new THREE.Mesh(
new THREE.PlaneGeometry(4.7,4.7),
new THREE.MeshBasicMaterial({map:makePropTexture(),transparent:true,opacity:0.55,depthWrite:false,side:THREE.DoubleSide,fog:false}),
);
propDisc.position.z=-8.86;
propDisc.rotation.z=0.4;
group.add(propDisc);
const propGlow=new THREE.Mesh(
new THREE.CircleGeometry(2.42,24),
new THREE.MeshBasicMaterial({color:0xc5eaff,transparent:true,opacity:0.09,depthWrite:false,side:THREE.DoubleSide,fog:false}),
);
propGlow.position.z=-8.92;
group.add(propGlow);
const haloMaterialA=new THREE.SpriteMaterial({map:makeGlowTexture('#ff4d5e'),transparent:true,opacity:0.42,depthWrite:false,fog:false});
const haloMaterialB=new THREE.SpriteMaterial({map:makeGlowTexture('#65ffa8'),transparent:true,opacity:0.42,depthWrite:false,fog:false});
const leftLight=new THREE.Mesh(new THREE.SphereGeometry(0.32,8,6),new THREE.MeshBasicMaterial({color:0xff4d5e,fog:false}));
leftLight.position.set(-8.18,-0.06,-0.72);
const rightLight=new THREE.Mesh(new THREE.SphereGeometry(0.32,8,6),new THREE.MeshBasicMaterial({color:0x65ffa8,fog:false}));
rightLight.position.set(8.18,-0.06,-0.72);
const leftHalo=new THREE.Sprite(haloMaterialA);
leftHalo.position.copy(leftLight.position);
leftHalo.scale.set(2.4,2.4,1);
const rightHalo=new THREE.Sprite(haloMaterialB);
rightHalo.position.copy(rightLight.position);
rightHalo.scale.set(2.4,2.4,1);
const tailLight=new THREE.Mesh(new THREE.SphereGeometry(0.3,6,5),new THREE.MeshBasicMaterial({color:0xffe4a3,fog:false}));
tailLight.position.set(0,1.2,7.2);
group.add(leftLight,rightLight,leftHalo,rightHalo,tailLight);
const gearGroup=new THREE.Group();
const wheelGeometry=new THREE.CylinderGeometry(0.6,0.6,0.28,12);
const hubGeometry=new THREE.CylinderGeometry(0.24,0.24,0.32,8);
for(const[x,z]of[[-2.5,-2.1],[2.5,-2.1],[0,5.6]]){
const wheel=new THREE.Mesh(wheelGeometry,dark);
wheel.rotation.z=Math.PI/2;
wheel.position.set(x,-1.62,z);
const hubWheel=new THREE.Mesh(hubGeometry,trim);
hubWheel.rotation.z=Math.PI/2;
hubWheel.position.copy(wheel.position);
const strut=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.12,1.75,6),trim);
strut.position.set(x,-0.85,z);
const brace=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,1.5,6),trim);
brace.position.set(x*0.72,-0.9,z+0.45);
brace.rotation.z=x===0?0:-Math.sign(x)*0.5;
const door=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.06,1.9),paint);
door.position.set(x*1.08,-0.47,z+0.2);
door.rotation.z=x===0?0:-Math.sign(x)*0.24;
const oleo=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.75,6),dark);
oleo.position.set(x,-1.32,z);
gearGroup.add(wheel,hubWheel,strut,brace,door,oleo);
}
group.add(gearGroup);
const flaps=[];
const ailerons=[];
for(const side of[-1,1]){
const flap=new THREE.Mesh(new THREE.BoxGeometry(4.5,0.1,0.9),accent);
flap.position.set(side*3.6,-0.3,1.12);
group.add(flap);
flaps.push(flap);
const aileron=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.1,0.85),trim);
aileron.position.set(side*6.6,-0.17,0.65);
group.add(aileron);
ailerons.push(aileron);
}
for(const side of[-1,1]){
const port=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.16,0.5,8),dark);
port.rotation.x=Math.PI/2;
port.position.set(side*0.62,-0.16,-5.6);
group.add(port);
}
const exhaust=new THREE.Mesh(
new THREE.ConeGeometry(0.5,1.7,8),
new THREE.MeshBasicMaterial({color:0x7be7ff,transparent:true,opacity:0.5,depthWrite:false,fog:false}),
);
exhaust.rotation.x=Math.PI/2;
exhaust.position.z=7.65;
group.add(exhaust);
return{group,propeller,propDisc,gearGroup,flaps,ailerons,exhaust,halos:[leftHalo,rightHalo]};
}
