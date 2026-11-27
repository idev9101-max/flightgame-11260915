import*as THREE from'../vendor/engine.js';
import{createRandom,fbm,smoothstep}from'./random.js';
function canvasTexture(width,height,paint){
const canvas=document.createElement('canvas');
canvas.width=width;
canvas.height=height;
const ctx=canvas.getContext('2d');
paint(ctx,width,height);
const texture=new THREE.CanvasTexture(canvas);
if(THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
texture.anisotropy=4;
return texture;
}
export function makeSurfaceTexture(size=512){
return canvasTexture(size,size,(ctx,w,h)=>{
const image=ctx.createImageData(w,h);
for(let y=0;y<h;y+=1){
for(let x=0;x<w;x+=1){
const coarse=fbm(x*0.012,y*0.012,913,4);
const fine=fbm(x*0.071,y*0.071,421,3);
const strata=Math.sin(y*0.16+Math.sin(x*0.018)*2.6+coarse*5)*0.5+0.5;
const speck=((x*17+y*31)%11===0?0.06:0);
const value=0.88+coarse*0.1+(fine-0.5)*0.13+strata*0.07+speck;
const at=(y*w+x)*4;
image.data[at]=Math.min(255,255*value);
image.data[at+1]=Math.min(255,252*value);
image.data[at+2]=Math.min(255,246*value);
image.data[at+3]=255;
}
}
ctx.putImageData(image,0,0);
});
}
export function makeWaterTexture(){
return canvasTexture(512,512,(ctx,w,h)=>{
const image=ctx.createImageData(w,h);
for(let y=0;y<h;y+=1){
const band=Math.sin(y*0.19+Math.sin(y*0.021)*3)*0.5+0.5;
for(let x=0;x<w;x+=1){
const ripple=Math.sin(x*0.046+Math.sin(y*0.033)*4)*0.5+0.5;
const streak=Math.pow(Math.max(0,Math.sin(x*0.11+y*0.013)),14);
const shimmer=band*0.1+ripple*0.09+streak*0.28;
const value=0.77+shimmer;
const at=(y*w+x)*4;
image.data[at]=Math.min(255,255*(value+streak*0.18));
image.data[at+1]=Math.min(255,252*(value+streak*0.05));
image.data[at+2]=Math.min(255,242*value);
image.data[at+3]=255;
}
}
ctx.putImageData(image,0,0);
});
}
function rgba(hex,alpha){
const value=Number.parseInt(hex.replace('#',''),16);
return`rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
}
export function makeGlowTexture(color='#ffffff',size=128){
return canvasTexture(size,size,(ctx,w,h)=>{
const glow=ctx.createRadialGradient(w/2,h/2,1,w/2,h/2,w/2);
glow.addColorStop(0,rgba(color,0.98));
glow.addColorStop(0.16,rgba(color,0.62));
glow.addColorStop(0.42,rgba(color,0.18));
glow.addColorStop(0.72,rgba(color,0.035));
glow.addColorStop(1,rgba(color,0));
ctx.fillStyle=glow;
ctx.fillRect(0,0,w,h);
});
}
export function makeCloudTexture(color='#ffffff',size=256){
return canvasTexture(size,size,(ctx,w,h)=>{
const lobes=[
[0.5,0.54,0.34,0.3],
[0.31,0.58,0.25,0.22],
[0.69,0.59,0.26,0.23],
[0.43,0.43,0.24,0.25],
[0.59,0.42,0.22,0.22],
];
for(const[cx,cy,rx,ry]of lobes){
ctx.save();
ctx.translate(cx*w,cy*h);
ctx.scale(rx*w,ry*h);
const grad=ctx.createRadialGradient(0,0,0.08,0,0,1);
grad.addColorStop(0,rgba(color,0.62));
grad.addColorStop(0.48,rgba(color,0.42));
grad.addColorStop(0.8,rgba(color,0.12));
grad.addColorStop(1,rgba(color,0));
ctx.fillStyle=grad;
ctx.beginPath();
ctx.arc(0,0,1,0,Math.PI*2);
ctx.fill();
ctx.restore();
}
const shade=ctx.createLinearGradient(0,h*0.34,0,h);
shade.addColorStop(0,'rgba(0,0,0,0)');
shade.addColorStop(1,'rgba(5,12,18,0.18)');
ctx.fillStyle=shade;
ctx.globalCompositeOperation='source-atop';
ctx.fillRect(0,0,w,h);
ctx.globalCompositeOperation='source-over';
});
}
export function makeRingGlowTexture(color,size=256){
return canvasTexture(size,size,(ctx,w,h)=>{
const glow=ctx.createRadialGradient(w/2,h/2,w*0.12,w/2,h/2,w/2);
glow.addColorStop(0,rgba(color,0));
glow.addColorStop(0.36,rgba(color,0));
glow.addColorStop(0.46,rgba(color,0.04));
glow.addColorStop(0.54,rgba(color,0.35));
glow.addColorStop(0.62,rgba(color,0.09));
glow.addColorStop(0.74,rgba(color,0.015));
glow.addColorStop(1,rgba(color,0));
ctx.fillStyle=glow;
ctx.fillRect(0,0,w,h);
});
}
export function makeRunwayTexture(size=512){
return canvasTexture(size,size,(ctx,w,h)=>{
const image=ctx.createImageData(w,h);
for(let y=0;y<h;y+=1){
const seam=y%128<2||y%128===127?0.1:0;
const longStreak=Math.sin(y*0.052+Math.sin(xSeed(y))*2.4)*0.5+0.5;
for(let x=0;x<w;x+=1){
const grain=(((x*29+y*17)%23)/23)*0.12;
const patch=fbm(x*0.021,y*0.021,2201,2)*0.12;
const value=0.82+grain+patch+longStreak*0.05-seam;
const at=(y*w+x)*4;
image.data[at]=Math.min(255,178*value);
image.data[at+1]=Math.min(255,190*value);
image.data[at+2]=Math.min(255,196*value);
image.data[at+3]=255;
}
}
ctx.putImageData(image,0,0);
});
}
function xSeed(value){
return Math.sin(value*0.017)*1.7;
}
export function makePropTexture(){
return canvasTexture(256,256,(ctx,w,h)=>{
ctx.clearRect(0,0,w,h);
ctx.translate(w/2,h/2);
for(let i=0;i<3;i+=1){
const grad=ctx.createLinearGradient(0,0,0,-h*0.46);
grad.addColorStop(0,'rgba(220,245,255,0.02)');
grad.addColorStop(0.45,'rgba(220,245,255,0.22)');
grad.addColorStop(0.82,'rgba(220,245,255,0.45)');
grad.addColorStop(1,'rgba(220,245,255,0)');
ctx.fillStyle=grad;
ctx.beginPath();
ctx.moveTo(-w*0.035,0);
ctx.quadraticCurveTo(-w*0.11,-h*0.22,-w*0.018,-h*0.46);
ctx.quadraticCurveTo(w*0.1,-h*0.24,w*0.035,0);
ctx.closePath();
ctx.fill();
ctx.rotate((Math.PI*2)/3);
}
});
}
function mergeParts(parts){
const positions=[];
const normals=[];
const colors=[];
const uvs=[];
const indices=[];
for(const part of parts){
const{geometry,x=0,y=0,z=0,scale=[1,1,1],tint=[1,1,1],shadeTop=1,shadeBottom=0.7}=part;
const sourcePosition=geometry.attributes.position.array;
const sourceNormal=geometry.attributes.normal?.array;
const sourceUv=geometry.attributes.uv?.array;
const base=positions.length/3;
for(let i=0;i<sourcePosition.length;i+=3){
const py=sourcePosition[i+1]*scale[1]+y;
positions.push(sourcePosition[i]*scale[0]+x,py,sourcePosition[i+2]*scale[2]+z);
normals.push(sourceNormal?sourceNormal[i]:0,sourceNormal?sourceNormal[i+1]:1,sourceNormal?sourceNormal[i+2]:0);
const shade=shadeBottom+(shadeTop-shadeBottom)*smoothstep(-1.2,4.5,py);
colors.push(tint[0]*shade,tint[1]*shade,tint[2]*shade);
if(sourceUv)uvs.push(sourceUv[(i/3)*2],sourceUv[(i/3)*2+1]);
}
if(geometry.index){
for(const index of geometry.index.array)indices.push(base+index);
}else{
for(let i=0;i<sourcePosition.length/3;i+=1)indices.push(base+i);
}
}
const result=new THREE.BufferGeometry();
result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
if(uvs.length>0)result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
result.setIndex(indices);
return result;
}
export function makeConiferGeometry(){
return mergeParts([
{geometry:new THREE.CylinderGeometry(0.13,0.22,1.5,5),y:0.75,tint:[0.58,0.42,0.29],shadeTop:0.8,shadeBottom:0.5},
{geometry:new THREE.ConeGeometry(1.85,3.5,7),y:2.8,tint:[0.42,0.66,0.44],shadeTop:1,shadeBottom:0.58},
{geometry:new THREE.ConeGeometry(1.42,3.0,7),y:4.15,tint:[0.5,0.76,0.5],shadeTop:1.06,shadeBottom:0.64},
{geometry:new THREE.ConeGeometry(0.92,2.5,7),y:5.4,tint:[0.58,0.82,0.55],shadeTop:1.12,shadeBottom:0.72},
]);
}
export function makeBroadleafGeometry(){
const random=createRandom(5191);
const canopy=new THREE.IcosahedronGeometry(1.35,0);
const positions=canopy.attributes.position.array;
for(let i=0;i<positions.length;i+=3){
const jitter=0.82+random()*0.38;
positions[i]*=jitter;
positions[i+1]=positions[i+1]*jitter*0.86+2.5;
positions[i+2]*=jitter*0.92;
}
canopy.computeVertexNormals();
return mergeParts([
{geometry:new THREE.CylinderGeometry(0.18,0.3,2.5,5),y:1.25,tint:[0.55,0.4,0.28],shadeTop:0.8,shadeBottom:0.48},
{geometry:canopy,y:0,tint:[0.48,0.72,0.42],shadeTop:1.12,shadeBottom:0.6},
]);
}
export function makeRockGeometry(){
const random=createRandom(7717);
const rock=new THREE.IcosahedronGeometry(1,0);
const positions=rock.attributes.position.array;
for(let i=0;i<positions.length;i+=3){
const jitter=0.7+random()*0.55;
positions[i]*=jitter;
positions[i+1]*=jitter*(positions[i+1]>0?1.65:0.7);
positions[i+2]*=jitter*0.9;
}
rock.computeVertexNormals();
return mergeParts([{geometry:rock,scale:[1,1,1],tint:[0.86,0.6,0.43],shadeTop:1.18,shadeBottom:0.58}]);
}
export function makeMountainGeometry(){
const random=createRandom(3313);
const mountain=new THREE.CylinderGeometry(0.16,1,1,7);
const positions=mountain.attributes.position.array;
for(let i=0;i<positions.length;i+=3){
const jitter=0.78+random()*0.42;
positions[i]*=jitter;
positions[i+2]*=jitter;
if(positions[i+1]>0)positions[i+1]+=random()*0.22;
}
mountain.computeVertexNormals();
return mergeParts([{geometry:mountain,tint:[0.72,0.79,0.86],shadeTop:1.16,shadeBottom:0.56}]);
}
export function makeCloudGeometry(){
const random=createRandom(8831);
const offsets=[
[-1.65,-0.08,0.05],
[-0.82,0.22,-0.16],
[0,0.02,0],
[0.86,0.28,0.15],
[1.65,-0.02,-0.05],
[0.38,0.55,-0.08],
];
const parts=[];
for(let i=0;i<offsets.length;i+=1){
const puff=new THREE.IcosahedronGeometry(1,1);
const[x,y,z]=offsets[i];
parts.push({
geometry:puff,
x:x+random.range(-0.08,0.08),
y:y+random.range(-0.04,0.08),
z:z+random.range(-0.06,0.06),
scale:[random.range(0.72,1.08),random.range(0.34,0.55),random.range(0.55,0.9)],
tint:[random.range(0.9,1),random.range(0.94,1),random.range(0.96,1)],
shadeTop:1.16,
shadeBottom:0.5,
});
}
return mergeParts(parts);
}
