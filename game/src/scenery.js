import*as THREE from'../vendor/engine.js';
import{clamp}from'../vendor/random.js';
import{makeBroadleafGeometry,makeConiferGeometry,makeMountainGeometry,makeRockGeometry}from'../vendor/worldAssets.js';
import{shorelineAt}from'./terrain.js';
export function ribbon(root,points,width,offset,material,heightAt){
const verts=[];
const idx=[];
for(let i=0;i<points.length;i+=1){
const p=points[i];
const prev=points[Math.max(0,i-1)];
const next=points[Math.min(points.length-1,i+1)];
const dx=next[0]-prev[0];
const dz=next[1]-prev[1];
const len=Math.hypot(dx,dz)||1;
const nx=(-dz/len)*width*0.5;
const nz=(dx/len)*width*0.5;
const y=heightAt(p[0],p[1])+offset;
verts.push(p[0]-nx,y,p[1]-nz,p[0]+nx,y,p[1]+nz);
if(i>0){
const a=(i-1)*2;
idx.push(a,a+1,a+2,a+1,a+3,a+2);
}
}
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
geometry.setIndex(idx);
geometry.computeVertexNormals();
const mesh=new THREE.Mesh(geometry,material);
root.add(mesh);
return mesh;
}
export function flatRibbon(root,points,width,y,material){
const verts=[];
const idx=[];
for(let i=0;i<points.length;i+=1){
const p=points[i];
const prev=points[Math.max(0,i-1)];
const next=points[Math.min(points.length-1,i+1)];
const dx=next[0]-prev[0];
const dz=next[1]-prev[1];
const len=Math.hypot(dx,dz)||1;
const nx=(-dz/len)*width*0.5;
const nz=(dx/len)*width*0.5;
verts.push(p[0]-nx,y,p[1]-nz,p[0]+nx,y,p[1]+nz);
if(i>0){
const a=(i-1)*2;
idx.push(a,a+1,a+2,a+1,a+3,a+2);
}
}
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
geometry.setIndex(idx);
geometry.computeVertexNormals();
const mesh=new THREE.Mesh(geometry,material);
root.add(mesh);
return mesh;
}
export function createGroundDetails(root,mission,random,heightAt,guideX){
const riverPoints=[];
for(let z=-940;z<=250;z+=12){
riverPoints.push([105+38*Math.sin(z*0.0085)+13*Math.sin(z*0.021),z]);
}
flatRibbon(root,riverPoints,13,0.42,new THREE.MeshBasicMaterial({color:0x3c9fbd,transparent:true,opacity:0.68,side:THREE.DoubleSide,depthWrite:false}));
if(mission.id!=='canyon'){
const shorePoints=[];
for(let z=-940;z<=250;z+=14)shorePoints.push([shorelineAt(z),z]);
flatRibbon(root,shorePoints,6,0.48,new THREE.MeshBasicMaterial({color:0xf2e6c8,transparent:true,opacity:0.55,side:THREE.DoubleSide,depthWrite:false}));
}
const roadPoints=[];
for(let z=-940;z<=250;z+=14){
roadPoints.push([-205+34*Math.sin(z*0.0105)+12*Math.sin(z*0.031),z]);
}
const roadMaterial=new THREE.MeshStandardMaterial({color:0x3b4144,roughness:1,side:THREE.DoubleSide});
ribbon(root,roadPoints,8,0.35,roadMaterial,heightAt);
const spur=[];
for(let t=0;t<=1;t+=0.04){
const z=-325+t*120;
spur.push([-205+34*Math.sin(z*0.0105)+t*120,z]);
}
ribbon(root,spur,5.5,0.32,roadMaterial,heightAt);
const roadDashes=new THREE.InstancedMesh(
new THREE.BoxGeometry(0.5,0.12,4.5),
new THREE.MeshBasicMaterial({color:0xe8c57a}),
100,
);
const dummy=new THREE.Object3D();
let dashCount=0;
for(let z=-920;z<=240&&dashCount<100;z+=12){
const x=-205+34*Math.sin(z*0.0105)+12*Math.sin(z*0.031);
dummy.position.set(x,heightAt(x,z)+0.42,z);
dummy.scale.setScalar(1);
dummy.quaternion.setFromEuler(new THREE.Euler(0,0,0));
dummy.updateMatrix();
roadDashes.setMatrixAt(dashCount,dummy.matrix);
dashCount+=1;
}
roadDashes.count=dashCount;
roadDashes.instanceMatrix.needsUpdate=true;
root.add(roadDashes);
void guideX;
}
export function createCanyonScenery(root,mission,random,heightAt,guideX){
const shadowMaterial=new THREE.MeshBasicMaterial({color:0x3a2119,transparent:true,opacity:0.2,side:THREE.DoubleSide,depthWrite:false});
const rimMaterial=new THREE.MeshBasicMaterial({color:0xf3c393,transparent:true,opacity:0.08,side:THREE.DoubleSide,depthWrite:false});
for(const side of[-1,1]){
const shadowPoints=[];
const rimPoints=[];
for(let z=-160;z>=-910;z-=16){
shadowPoints.push([guideX(z)+side*78,z]);
rimPoints.push([guideX(z)+side*166,z]);
}
ribbon(root,shadowPoints,24,0.22,shadowMaterial,heightAt);
ribbon(root,rimPoints,12,0.24,rimMaterial,heightAt);
}
const dummy=new THREE.Object3D();
const slabGeometry=new THREE.BoxGeometry(1,1,1);
const slabCount=168;
const slabs=new THREE.InstancedMesh(
slabGeometry,
new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,flatShading:true}),
slabCount,
);
const strataColors=[0x8b4a31,0xb87246,0xd59a66,0x71412e,0xc48754];
let slabIndex=0;
for(let i=0;i<56;i+=1){
const z=-190-(i/56)*750+random.range(-14,14);
const side=i%2===0?-1:1;
const x=guideX(z)+side*random.range(118,250);
const base=heightAt(x,z);
const width=random.range(30,64);
const depth=random.range(32,72);
const layers=3;
for(let layer=0;layer<layers&&slabIndex<slabCount;layer+=1){
const shrink=1-layer*0.13;
const layerHeight=random.range(7,13);
dummy.position.set(x,base+layerHeight*0.5+layer*random.range(8,14),z);
dummy.scale.set(width*shrink,layerHeight,depth*shrink);
dummy.quaternion.setFromEuler(new THREE.Euler(0,random.range(-0.16,0.16),0));
dummy.updateMatrix();
slabs.setMatrixAt(slabIndex,dummy.matrix);
slabs.setColorAt(slabIndex,new THREE.Color(strataColors[(i+layer)%strataColors.length]).multiplyScalar(0.86+random()*0.16));
slabIndex+=1;
}
}
slabs.count=slabIndex;
slabs.instanceMatrix.needsUpdate=true;
if(slabs.instanceColor)slabs.instanceColor.needsUpdate=true;
root.add(slabs);
const boulders=new THREE.InstancedMesh(
makeRockGeometry(),
new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,flatShading:true}),
34,
);
for(let i=0;i<34;i+=1){
const z=-210-(i/34)*700+random.range(-16,16);
const side=i%2===0?-1:1;
const x=guideX(z)+side*random.range(82,190);
const h=heightAt(x,z);
dummy.position.set(x,h+1.6,z);
dummy.scale.set(random.range(9,22),random.range(3,8),random.range(9,24));
dummy.quaternion.setFromEuler(new THREE.Euler(0,random.range(0,Math.PI),0));
dummy.updateMatrix();
boulders.setMatrixAt(i,dummy.matrix);
boulders.setColorAt(i,new THREE.Color(i%3===0?0x8a5237:0xc08055).multiplyScalar(0.84+random()*0.2));
}
boulders.instanceMatrix.needsUpdate=true;
if(boulders.instanceColor)boulders.instanceColor.needsUpdate=true;
root.add(boulders);
const shrubs=new THREE.InstancedMesh(
makeRockGeometry(),
new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,flatShading:true}),
80,
);
for(let i=0;i<80;i+=1){
const z=-180-(i/80)*740+random.range(-20,20);
const side=i%2===0?-1:1;
const x=guideX(z)+side*random.range(30,76);
const h=heightAt(x,z);
dummy.position.set(x,h+0.4,z);
dummy.scale.set(random.range(1.4,3.4),random.range(0.6,1.6),random.range(1.4,3.4));
dummy.quaternion.setFromEuler(new THREE.Euler(0,random.range(0,Math.PI),0));
dummy.updateMatrix();
shrubs.setMatrixAt(i,dummy.matrix);
shrubs.setColorAt(i,new THREE.Color(i%4===0?0xc9985a:0x8e8b56).multiplyScalar(0.8+random()*0.24));
}
shrubs.instanceMatrix.needsUpdate=true;
if(shrubs.instanceColor)shrubs.instanceColor.needsUpdate=true;
root.add(shrubs);
const markerCount=mission.rings.length*2;
const markerPoles=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34,0.48,11,6),new THREE.MeshStandardMaterial({color:0xe7e2cb,roughness:0.75,flatShading:true}),markerCount);
const markerCaps=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,5),new THREE.MeshBasicMaterial({color:0xffc95f,fog:false}),markerCount);
for(let i=0;i<markerCount;i+=1){
const ring=mission.rings[Math.floor(i/2)];
const z=ring[2]+14;
const x=ring[0]+(i%2===0?-27:27);
const ground=heightAt(x,z);
dummy.position.set(x,ground+5.5,z);
dummy.scale.setScalar(1);
dummy.quaternion.setFromEuler(new THREE.Euler(0,0,0));
dummy.updateMatrix();
markerPoles.setMatrixAt(i,dummy.matrix);
dummy.position.y=ground+11.4;
dummy.updateMatrix();
markerCaps.setMatrixAt(i,dummy.matrix);
}
markerPoles.instanceMatrix.needsUpdate=true;
markerCaps.instanceMatrix.needsUpdate=true;
root.add(markerPoles,markerCaps);
}
export function createVegetation(root,mission,random,heightAt,guideX){
const treeCount=900;
const treeGeometry=mission.id==='harbor'?makeBroadleafGeometry():makeConiferGeometry();
const foliage=new THREE.InstancedMesh(
treeGeometry,
new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,flatShading:true,detail:0.16}),
treeCount,
);
const trunks=new THREE.InstancedMesh(
new THREE.CylinderGeometry(0.3,0.42,2.4,5),
new THREE.MeshStandardMaterial({color:0x6b4b32,roughness:1,flatShading:true}),
treeCount,
);
const treeShadows=new THREE.InstancedMesh(
new THREE.CircleGeometry(2.6,6),
new THREE.MeshBasicMaterial({color:0x0a1718,transparent:true,opacity:0.24,depthWrite:false,side:THREE.DoubleSide,fog:false}),
treeCount,
);
const dummy=new THREE.Object3D();
let treeIndex=0;
for(let attempt=0;attempt<treeCount*4&&treeIndex<treeCount;attempt+=1){
const x=random.range(-610,610);
const z=random.range(-1010,260);
const h=heightAt(x,z);
if(h<2.2||h>39)continue;
if(mission.id==='canyon'&&Math.abs(x-guideX(z))<215)continue;
if(Math.abs(x)<72&&z>-190&&z<120)continue;
if(Math.abs(x)<34&&z<-180)continue;
const scale=random.range(0.72,1.45);
dummy.position.set(x,h+0.1,z);
dummy.scale.setScalar(scale);
dummy.quaternion.setFromEuler(new THREE.Euler(-Math.PI/2,0,0));
dummy.updateMatrix();
treeShadows.setMatrixAt(treeIndex,dummy.matrix);
dummy.position.set(x,h+0.1*scale,z);
dummy.scale.setScalar(scale*1.18);
dummy.quaternion.setFromEuler(new THREE.Euler(0,random.range(0,Math.PI*2),0));
dummy.updateMatrix();
foliage.setMatrixAt(treeIndex,dummy.matrix);
const foliageColor=mission.id==='harbor'?0x7c9b5c:mission.sky==='day'?0x4d8353:0x3e6a55;
foliage.setColorAt(treeIndex,new THREE.Color(foliageColor).multiplyScalar(0.82+random()*0.36));
dummy.position.y=h+1.15*scale;
dummy.updateMatrix();
trunks.setMatrixAt(treeIndex,dummy.matrix);
treeIndex+=1;
}
foliage.count=treeIndex;
trunks.count=treeIndex;
treeShadows.count=treeIndex;
foliage.instanceMatrix.needsUpdate=true;
trunks.instanceMatrix.needsUpdate=true;
treeShadows.instanceMatrix.needsUpdate=true;
if(foliage.instanceColor)foliage.instanceColor.needsUpdate=true;
root.add(foliage,trunks,treeShadows);
const peakCount=mission.id==='canyon'?24:34;
const peaks=new THREE.InstancedMesh(
makeMountainGeometry(),
new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,flatShading:true,detail:0.12}),
peakCount,
);
for(let i=0;i<peakCount;i+=1){
const angle=(i/peakCount)*Math.PI*2+random.range(-0.08,0.08);
const radius=random.range(720,880);
const x=Math.cos(angle)*radius;
const z=-340+Math.sin(angle)*radius*0.92;
const h=mission.id==='canyon'?random.range(58,118):random.range(70,155);
dummy.position.set(x,h/2-8,z);
dummy.scale.set(random.range(52,94),h,random.range(52,94));
dummy.quaternion.setFromEuler(new THREE.Euler(0,random.range(0,6),0));
dummy.updateMatrix();
peaks.setMatrixAt(i,dummy.matrix);
peaks.setColorAt(i,new THREE.Color(mission.id==='canyon'?0xb89478:0x8b9aa6).multiplyScalar(0.84+random()*0.22));
}
peaks.instanceMatrix.needsUpdate=true;
if(peaks.instanceColor)peaks.instanceColor.needsUpdate=true;
root.add(peaks);
}
export function createHaze(root,preset,guideX){
const hazeMaterial=new THREE.MeshBasicMaterial({
color:preset.fog,transparent:true,opacity:0.026,
depthWrite:false,side:THREE.DoubleSide,fog:false,
});
for(const[y,spread,shift]of[[18,200,0],[36,280,70]]){
for(const side of[-1,1]){
const points=[];
for(let z=-940;z<=180;z+=40)points.push([guideX(z)+side*(spread*0.42+shift),z]);
const haze=flatRibbon(root,points,spread,y,hazeMaterial);
haze.renderOrder=1;
}
}
void clamp;
}
