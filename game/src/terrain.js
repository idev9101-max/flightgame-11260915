import*as THREE from'../vendor/engine.js';
import{RUNWAY_Y}from'./config.js';
import{clamp,fbm,lerp,smoothstep}from'../vendor/random.js';
import{makeSurfaceTexture}from'../vendor/worldAssets.js';
export function shorelineAt(z){
return 272+42*Math.sin(z*0.0062+0.5)+18*Math.sin(z*0.017+1.2);
}
export function createTerrainField(mission,seed,guideX){
function heightAt(x,z){
const large=fbm(x*0.0031,z*0.0031,seed,4);
const detail=fbm(x*0.013,z*0.013,seed+31,3);
const ridge=fbm(x*0.0022+8,z*0.0022-3,seed+73,3);
const fine=fbm(x*0.037,z*0.037,seed+509,3);
const ridged=1-Math.abs(fbm(x*0.008,z*0.008,seed+613,3)*2-1);
let h=-2.5+large*22+detail*7+(fine-0.5)*3.8+Math.pow(ridged,3)*8;
const dist=Math.hypot(x*0.92,(z+330)*0.78);
h+=smoothstep(250,700,dist)*ridge*54;
h-=smoothstep(540,880,dist)*20;
if(mission.id==='canyon'){
const offset=Math.abs(x-guideX(z));
const valley=7+fbm(x*0.011,z*0.011,seed+211,3)*6;
const wallStart=74+fbm(x*0.005,z*0.005,seed+277,2)*20;
const wall=smoothstep(wallStart,wallStart+86,offset);
const mesa=44+ridge*48+fbm(x*0.004,z*0.004,seed+301,3)*18;
h=lerp(h,valley,(1-smoothstep(48,112,offset))*0.96);
h=lerp(h,mesa,wall*0.9);
const band=Math.floor(h/11)*11;
const lip=smoothstep(0.58,0.94,(h-band)/11)*1.6;
h=lerp(h,band+lip,wall*0.38);
h+=(1-smoothstep(290,430,offset))*smoothstep(150,260,offset)*(1-ridged)*6;
}else{
const shoreline=shorelineAt(z);
const sea=smoothstep(shoreline-34,shoreline+24,x);
const bay=(1-smoothstep(40,165,Math.hypot((x-178)*1.12,(z+435)*0.62)))*smoothstep(38,92,x);
h=lerp(h,-8-fbm(x*0.02,z*0.02,seed+401,2)*3,Math.max(sea,bay));
if(x<shoreline-12)h+=(1-smoothstep(10,52,shoreline-x))*1.9;
}
const riverX=105+38*Math.sin(z*0.0085)+13*Math.sin(z*0.021);
const river=1-smoothstep(7,26,Math.abs(x-riverX));
h-=river*10;
const flatX=1-smoothstep(25,62,Math.abs(x));
const flatZ=1-smoothstep(122,176,Math.abs(z+34));
h=lerp(h,RUNWAY_Y,flatX*flatZ);
return h;
}
function terrainColor(height,x,z,missionForColor,random){
const color=new THREE.Color();
const warm=missionForColor.id==='canyon';
const harbor=missionForColor.id==='harbor';
const storm=missionForColor.sky==='storm';
const moisture=fbm(x*0.011,z*0.011,1207,3);
if(height<1.2)color.setHex(warm?0xd6ab7d:harbor?0xc8b894:storm?0x8d9a92:0xe3d4aa);
else if(height<5)color.setHex(warm?0xc8905e:harbor?0xa49d7d:0xbab28a);
else if(height<20){
const t=clamp((height-5)/15,0,1);
color.setHex(warm?0x8f432d:harbor?0x4d6259:storm?0x39564c:0x487653)
.lerp(new THREE.Color(warm?0xc87a45:harbor?0x7e8a6b:storm?0x597263:0x7ca960),t);
}else if(height<58){
const t=clamp((height-20)/38,0,1);
color.setHex(warm?0xa04c31:harbor?0x586660:storm?0x4f6062:0x647767)
.lerp(new THREE.Color(warm?0xe3a56b:harbor?0x9aa093:storm?0x82908c:0xa3a78d),t);
}else{
color.setHex(warm?0xdbb68f:harbor?0x98a3a0:0xaab6b4).lerp(new THREE.Color(0xf1f5f2),clamp((height-62)/52,0,1));
}
if(warm&&height>6){
const band=Math.floor(height/11)%3;
const strata=band===0?0.86:band===1?1.06:0.96;
const ripple=Math.sin(height*0.31+x*0.0022+z*0.0008+moisture*1.5)*0.045;
color.multiplyScalar(strata+ripple);
if(height<28)color.lerp(new THREE.Color(0x5b3527),0.14);
const depth=clamp((-z-160)/820,0,1);
color.lerp(new THREE.Color(0xd9c3aa),depth*0.2);
}
if(harbor&&height>2&&height<24){
color.lerp(new THREE.Color(0x6c7866),moisture*0.16);
color.multiplyScalar(0.95+Math.abs(Math.sin(z*0.05+x*0.02))*0.09);
}
color.multiplyScalar(0.97+random()*0.05);
return color;
}
return{heightAt,terrainColor};
}
export function createTerrain(root,mission,heightAt,terrainColor,random){
const size=1500;
const segments=176;
const vertexCount=(segments+1)*(segments+1);
const positions=new Float32Array(vertexCount*3);
const colors=new Float32Array(positions.length);
const uvs=new Float32Array(vertexCount*2);
const indices=[];
let vi=0;
for(let j=0;j<=segments;j+=1){
const z=-350-size/2+(j/segments)*size;
for(let i=0;i<=segments;i+=1){
const x=-size/2+(i/segments)*size;
const h=heightAt(x,z);
positions[vi]=x;
positions[vi+1]=h;
positions[vi+2]=z;
const c=terrainColor(h,x,z,mission,random);
colors[vi]=c.r;
colors[vi+1]=c.g;
colors[vi+2]=c.b;
uvs[(vi/3)*2]=i/segments;
uvs[(vi/3)*2+1]=j/segments;
vi+=3;
}
}
for(let j=0;j<segments;j+=1){
for(let i=0;i<segments;i+=1){
const a=j*(segments+1)+i;
const b=a+1;
const c=a+segments+1;
const d=c+1;
indices.push(a,c,b,b,c,d);
}
}
const geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
geometry.setIndex(indices);
geometry.computeVertexNormals();
const mesh=new THREE.Mesh(
geometry,
new THREE.MeshStandardMaterial({
vertexColors:true,map:makeSurfaceTexture(),detail:0.3,groundShade:1,
flatShading:true,roughness:0.96,metalness:0,
}),
);
root.add(mesh);
return mesh;
}
