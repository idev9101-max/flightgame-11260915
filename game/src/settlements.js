import*as THREE from'../vendor/engine.js';
import{makeGlowTexture}from'../vendor/worldAssets.js';
import{flatRibbon}from'./scenery.js';
import{shorelineAt}from'./terrain.js';
export function createSettlements(root,mission,random,heightAt){
const buildingGeometry=new THREE.BoxGeometry(1,1,1);
const buildingMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.8,flatShading:true});
const buildings=new THREE.InstancedMesh(buildingGeometry,buildingMaterial,120);
const dummy=new THREE.Object3D();
const harborWindows=[];
let buildingCount=0;
const towns=mission.id==='harbor'
?[[-255,-325,18],[185,-635,22],[166,-305,20],[238,-205,9]]
:[[-255,-325,18],[242,-540,14],[-170,-780,11],[300,-215,9]];
for(const[cx,cz,count]of towns){
for(let i=0;i<count&&buildingCount<120;i+=1){
const x=cx+random.range(-52,52);
const z=cz+random.range(-48,48);
const h=heightAt(x,z);
if(h<2||h>45)continue;
const w=random.range(5,13);
const d=random.range(5,13);
const bh=random.range(5,20);
const yaw=random.range(-0.2,0.2);
dummy.position.set(x,h+bh/2,z);
dummy.scale.set(w,bh,d);
dummy.quaternion.setFromEuler(new THREE.Euler(0,yaw,0));
dummy.updateMatrix();
buildings.setMatrixAt(buildingCount,dummy.matrix);
const shade=mission.sky==='day'?0.72+random()*0.28:0.6+random()*0.3;
buildings.setColorAt(buildingCount,new THREE.Color(mission.id==='harbor'&&cx>150?0xb8ab95:0x9fb0b8).multiplyScalar(shade));
buildingCount+=1;
if(mission.id==='harbor'&&cx>150){
for(let j=0;j<3;j+=1){
harborWindows.push({
x:x-Math.sin(yaw)*(d*0.5+0.18)+Math.cos(yaw)*random.range(-w*0.3,w*0.3),
y:h+bh*(0.32+j*0.2),
z:z+Math.cos(yaw)*(d*0.5+0.18)+Math.sin(yaw)*random.range(-w*0.3,w*0.3),
yaw,
w,
});
}
}
}
}
buildings.count=buildingCount;
buildings.instanceMatrix.needsUpdate=true;
if(buildings.instanceColor)buildings.instanceColor.needsUpdate=true;
root.add(buildings);
if(harborWindows.length>0){
const windows=new THREE.InstancedMesh(
buildingGeometry,
new THREE.MeshBasicMaterial({color:0xffd889}),
harborWindows.length,
);
for(let i=0;i<harborWindows.length;i+=1){
const win=harborWindows[i];
dummy.position.set(win.x,win.y,win.z);
dummy.scale.set(win.w*0.22,0.75,0.12);
dummy.quaternion.setFromEuler(new THREE.Euler(0,win.yaw,0));
dummy.updateMatrix();
windows.setMatrixAt(i,dummy.matrix);
}
windows.instanceMatrix.needsUpdate=true;
root.add(windows);
}
if(mission.id!=='canyon'){
const pierMaterial=new THREE.MeshStandardMaterial({color:mission.id==='harbor'?0x715339:0x6b4d36,roughness:0.92,flatShading:true});
const pierLight=new THREE.MeshBasicMaterial({color:0xffd17c,fog:false});
for(const z of[-620,-490,-360,-230]){
const start=shorelineAt(z)-12;
const length=mission.id==='harbor'?86:62;
const width=mission.id==='harbor'?12:9;
const pier=new THREE.Mesh(new THREE.BoxGeometry(length,1.4,width),pierMaterial);
pier.position.set(start+length/2,1.1,z);
root.add(pier);
const deck=new THREE.Mesh(new THREE.BoxGeometry(length-5,0.18,width-3),new THREE.MeshStandardMaterial({color:0x8a6847,roughness:0.95,flatShading:true}));
deck.position.set(pier.position.x,1.9,z);
root.add(deck);
for(let i=0;i<5;i+=1){
const post=new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.95,6,6),pierMaterial);
post.position.set(start+8+i*(length-12)/4,-1.2,z+width/2-1);
root.add(post);
if(mission.id==='harbor'&&i%2===0){
const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.7,6,5),pierLight);
lamp.position.set(post.position.x,4.2,z-width/2+1);
root.add(lamp);
}
}
if(mission.id==='harbor'){
for(let i=0;i<4;i+=1){
const crate=new THREE.Mesh(new THREE.BoxGeometry(3.4,2.2,2.8),new THREE.MeshStandardMaterial({color:i%2?0xc0a068:0x6f8c83,roughness:0.9,flatShading:true}));
crate.position.set(start+12+i*5.2,3.1,z+1.5);
root.add(crate);
}
}
}
const lighthouse=new THREE.Mesh(new THREE.CylinderGeometry(2.6,3.8,22,8),new THREE.MeshStandardMaterial({color:0xe8ece6,roughness:0.8,flatShading:true}));
lighthouse.position.set(shorelineAt(-410)-14,14,-410);
root.add(lighthouse);
const beacon=new THREE.Mesh(new THREE.CylinderGeometry(3,3,3,8),new THREE.MeshBasicMaterial({color:0xffe9a8}));
beacon.position.set(lighthouse.position.x,27,-410);
root.add(beacon);
}
if(mission.id!=='harbor')return;
const quayPoints=[];
for(let z=-900;z<=220;z+=14)quayPoints.push([shorelineAt(z)-15,z]);
flatRibbon(root,quayPoints,17,0.62,new THREE.MeshStandardMaterial({color:0x59605a,roughness:0.95,flatShading:true,side:THREE.DoubleSide}));
const surfPoints=[];
for(let z=-860;z<=120;z+=28)surfPoints.push([shorelineAt(z)-25,z]);
flatRibbon(root,surfPoints,4.5,0.72,new THREE.MeshBasicMaterial({color:0xe7f4e8,transparent:true,opacity:0.42,side:THREE.DoubleSide,depthWrite:false}));
const warehouses=new THREE.InstancedMesh(
buildingGeometry,
new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.82,flatShading:true}),
60,
);
const warehouseRoofs=new THREE.InstancedMesh(
buildingGeometry,
new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.8,flatShading:true}),
60,
);
const warehouseColors=[0x93836b,0x62757c,0xa68868,0x5f6e71];
const roofColors=[0xa75b4c,0x3b6672,0xc9a15d,0x4b6869];
const roofTransforms=[];
let warehouseCount=0;
for(let i=0;i<60&&warehouseCount<60;i+=1){
const z=-790+i*15+random.range(-6,6);
const x=shorelineAt(z)-random.range(18,82);
const h=heightAt(x,z);
if(h<1||h>26)continue;
const w=random.range(10,25);
const d=random.range(8,18);
const bh=random.range(6,17);
const yaw=random.range(-0.16,0.16);
dummy.position.set(x,h+bh/2,z);
dummy.scale.set(w,bh,d);
dummy.quaternion.setFromEuler(new THREE.Euler(0,yaw,0));
dummy.updateMatrix();
warehouses.setMatrixAt(warehouseCount,dummy.matrix);
warehouses.setColorAt(warehouseCount,new THREE.Color(warehouseColors[i%warehouseColors.length]).multiplyScalar(0.88+random()*0.2));
dummy.position.y=h+bh+0.35;
dummy.scale.set(w+0.8,0.7,d+0.8);
dummy.updateMatrix();
warehouseRoofs.setMatrixAt(warehouseCount,dummy.matrix);
warehouseRoofs.setColorAt(warehouseCount,new THREE.Color(roofColors[i%roofColors.length]));
if(i%3===0)roofTransforms.push([x,h+bh+0.9,z+d*0.5+0.3,w]);
warehouseCount+=1;
}
warehouses.count=warehouseCount;
warehouseRoofs.count=warehouseCount;
warehouses.instanceMatrix.needsUpdate=true;
warehouseRoofs.instanceMatrix.needsUpdate=true;
if(warehouses.instanceColor)warehouses.instanceColor.needsUpdate=true;
if(warehouseRoofs.instanceColor)warehouseRoofs.instanceColor.needsUpdate=true;
root.add(warehouses,warehouseRoofs);
const windowStrip=new THREE.MeshBasicMaterial({color:0xffd389,fog:false});
for(const[x,y,z,w]of roofTransforms){
const strip=new THREE.Mesh(new THREE.BoxGeometry(w*0.7,0.7,0.2),windowStrip);
strip.position.set(x,y,z);
root.add(strip);
}
const steel=new THREE.MeshStandardMaterial({color:0x3d4a50,roughness:0.68,metalness:0.32,flatShading:true});
const warning=new THREE.MeshStandardMaterial({color:0xd66843,roughness:0.7,flatShading:true});
const lamp=new THREE.MeshBasicMaterial({color:0xffc36d,fog:false});
for(const cz of[-660,-480,-300,-150]){
const cx=shorelineAt(cz)+10;
const pieces=[
[new THREE.BoxGeometry(14,1.4,12),cx,1.4,cz,steel],
[new THREE.BoxGeometry(1.6,31,1.6),cx-5,16,cz,steel],
[new THREE.BoxGeometry(1.6,31,1.6),cx+5,16,cz,steel],
[new THREE.BoxGeometry(12,1.4,2),cx,30.5,cz,steel],
[new THREE.BoxGeometry(70,1.6,2.4),cx+17,32.5,cz,warning],
[new THREE.BoxGeometry(0.35,15,0.35),cx+45,24.5,cz,steel],
[new THREE.BoxGeometry(2.4,2.4,2.4),cx+45,17,cz,steel],
[new THREE.BoxGeometry(5,3.8,5),cx-12,30.5,cz,steel],
[new THREE.BoxGeometry(4.8,3.6,4.8),cx,27,cz,steel],
];
for(const[geometry,x,y,z,material]of pieces){
const piece=new THREE.Mesh(geometry,material);
piece.position.set(x,y,z);
root.add(piece);
}
for(const dx of[-7,7]){
const brace=new THREE.Mesh(new THREE.BoxGeometry(0.5,26,0.5),steel);
brace.position.set(cx+dx,18,cz);
brace.rotation.z=dx>0?-0.38:0.38;
root.add(brace);
}
const cabinLight=new THREE.Mesh(new THREE.BoxGeometry(3.6,0.7,0.24),lamp);
cabinLight.position.set(cx,27.4,cz+2.6);
root.add(cabinLight);
const tipLight=new THREE.Mesh(new THREE.SphereGeometry(0.8,6,5),lamp);
tipLight.position.set(cx+51,33.5,cz);
root.add(tipLight);
}
const hulls=new THREE.InstancedMesh(
buildingGeometry,
new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.72,flatShading:true}),
14,
);
const cabins=new THREE.InstancedMesh(
buildingGeometry,
new THREE.MeshStandardMaterial({color:0xe3dfd1,roughness:0.78,flatShading:true}),
14,
);
const masts=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13,0.13,5,5),steel,14);
const shipColors=[0xd8d6c8,0x7b4b42,0x355d6c,0xb8a77d];
let boatCount=0;
for(let i=0;i<20&&boatCount<14;i+=1){
const z=-810+i*36+random.range(-12,12);
const x=shorelineAt(z)+random.range(18,115);
const len=random.range(11,23);
const wid=random.range(3.6,7);
const yaw=random.range(-0.4,0.4);
dummy.quaternion.setFromEuler(new THREE.Euler(0,yaw,0));
dummy.position.set(x,0.75,z);
dummy.scale.set(wid,2.2,len);
dummy.updateMatrix();
hulls.setMatrixAt(boatCount,dummy.matrix);
hulls.setColorAt(boatCount,new THREE.Color(shipColors[i%shipColors.length]).multiplyScalar(0.9+random()*0.15));
dummy.position.set(x,2.5,z+len*0.08);
dummy.scale.set(wid*0.58,2.1,len*0.28);
dummy.updateMatrix();
cabins.setMatrixAt(boatCount,dummy.matrix);
dummy.position.set(x,4.1,z-len*0.23);
dummy.scale.setScalar(1);
dummy.updateMatrix();
masts.setMatrixAt(boatCount,dummy.matrix);
boatCount+=1;
}
hulls.count=boatCount;
cabins.count=boatCount;
masts.count=boatCount;
hulls.instanceMatrix.needsUpdate=true;
cabins.instanceMatrix.needsUpdate=true;
masts.instanceMatrix.needsUpdate=true;
if(hulls.instanceColor)hulls.instanceColor.needsUpdate=true;
root.add(hulls,cabins,masts);
const freighterHull=new THREE.MeshStandardMaterial({color:0x354c58,roughness:0.72,flatShading:true});
const freighterDeck=new THREE.MeshStandardMaterial({color:0x79898c,roughness:0.8,flatShading:true});
const containerColors=[0xb46a4c,0x476c7a,0xc4a96f,0x5b7868];
for(const[cz,offset,length]of[[-430,58,68],[-580,74,82],[-300,46,58]]){
const cx=shorelineAt(cz)+offset;
const yaw=cz===-430?0.2:-0.15;
const group=new THREE.Group();
group.position.set(cx,0,cz);
group.rotation.y=yaw;
const hull=new THREE.Mesh(new THREE.BoxGeometry(15,5.4,length),freighterHull);
hull.position.y=1.5;
group.add(hull);
const deck=new THREE.Mesh(new THREE.BoxGeometry(15.5,0.5,length*0.92),freighterDeck);
deck.position.y=4.3;
group.add(deck);
const bridge=new THREE.Mesh(new THREE.BoxGeometry(9,8,12),freighterDeck);
bridge.position.set(0,8.4,length*0.31);
group.add(bridge);
const funnel=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.5,5,6),freighterHull);
funnel.position.set(0,13.8,length*0.3);
group.add(funnel);
for(let row=0;row<3;row+=1){
for(let col=0;col<3;col+=1){
const container=new THREE.Mesh(
new THREE.BoxGeometry(3.8,3.2,7),
new THREE.MeshStandardMaterial({color:containerColors[(row+col+(cz===-430?0:1))%4],roughness:0.84,flatShading:true}),
);
container.position.set(-4.8+col*4.8,6.2+(row%2)*3.3,-length*0.24+row*8);
group.add(container);
}
}
for(const dx of[-7.8,7.8]){
const navLight=new THREE.Mesh(new THREE.SphereGeometry(0.65,6,5),new THREE.MeshBasicMaterial({color:dx<0?0xff5963:0x76ffae,fog:false}));
navLight.position.set(dx,5.5,0);
group.add(navLight);
}
root.add(group);
const wake=flatRibbon(root,[[cx-2,cz-length*0.5],[cx-5,cz-length*0.8],[cx-9,cz-length*1.12]],9,0.4,new THREE.MeshBasicMaterial({color:0xe7fbff,transparent:true,opacity:0.3,side:THREE.DoubleSide,depthWrite:false}));
wake.renderOrder=2;
}
const buoys=new THREE.InstancedMesh(
new THREE.SphereGeometry(0.8,6,5),
new THREE.MeshBasicMaterial({color:0xffc660}),
18,
);
for(let i=0;i<18;i+=1){
const z=-840+i*48;
dummy.position.set(shorelineAt(z)+34,1,z);
dummy.scale.setScalar(1);
dummy.quaternion.setFromEuler(new THREE.Euler(0,0,0));
dummy.updateMatrix();
buoys.setMatrixAt(i,dummy.matrix);
}
buoys.instanceMatrix.needsUpdate=true;
root.add(buoys);
const breakwaterMaterial=new THREE.MeshStandardMaterial({color:0x49545a,roughness:0.98,flatShading:true});
const breakwaterLight=new THREE.MeshBasicMaterial({color:0xff6d5b,fog:false});
for(let z=-740;z<=-220;z+=28){
const x=shorelineAt(z)+118;
const rock=new THREE.Mesh(new THREE.BoxGeometry(16,2.4,30),breakwaterMaterial);
rock.position.set(x,0.9,z);
rock.rotation.y=Math.sin(z*0.01)*0.14;
root.add(rock);
if((z+740)%84===0){
const lampPost=new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.4,7,6),breakwaterMaterial);
lampPost.position.set(x,4.4,z);
const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.8,6,5),breakwaterLight);
lamp.position.set(x,8.1,z);
root.add(lampPost,lamp);
}
}
const glitterMaterial=new THREE.MeshBasicMaterial({color:0xbfe9f2,transparent:true,opacity:0.16,side:THREE.DoubleSide,depthWrite:false});
for(let z=-840;z<=-180;z+=34){
const x=shorelineAt(z)+random.range(70,175);
const glint=new THREE.Mesh(new THREE.PlaneGeometry(random.range(7,20),random.range(2,5)),glitterMaterial);
glint.rotation.x=-Math.PI/2;
glint.position.set(x,0.62,z);
root.add(glint);
}
const reflectionMaterial=new THREE.MeshBasicMaterial({
map:makeGlowTexture('#ffd99c',256),transparent:true,opacity:0.24,
depthWrite:false,side:THREE.DoubleSide,fog:false,
});
for(const[z,width,length]of[[-430,34,210],[-640,24,150]]){
const reflection=new THREE.Mesh(new THREE.PlaneGeometry(width,length),reflectionMaterial);
reflection.rotation.x=-Math.PI/2;
reflection.position.set(shorelineAt(z)+92,0.66,z);
root.add(reflection);
}
const channelLight=new THREE.MeshBasicMaterial({color:0xffd383});
for(let z=-172;z>-310;z-=16){
for(const side of[-1,1]){
const marker=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.22,4.5),channelLight);
marker.position.set(side*11,heightAt(side*11,z)+0.6,z);
root.add(marker);
}
}
}
