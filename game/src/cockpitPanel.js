import*as THREE from'../vendor/engine.js';
import{clamp}from'../vendor/random.js';
const PANEL_W=1024;
const PANEL_H=512;
function padNumber(value,digits){
const safe=Number.isFinite(value)?Math.round(value):0;
return String(Math.max(0,safe)).padStart(digits,'0');
}
function clock(seconds){
const total=Math.max(0,Math.round(Number.isFinite(seconds)?seconds:0));
return`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
export function createPanel(mission){
const canvas=document.createElement('canvas');
canvas.width=PANEL_W;
canvas.height=PANEL_H;
const ctx=canvas.getContext('2d');
const texture=new THREE.CanvasTexture(canvas);
if(THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
texture.anisotropy=4;
let lastPaint=-1;
function box(x,y,w,h,r,fill,stroke){
ctx.beginPath();
if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
else ctx.rect(x,y,w,h);
if(fill){
ctx.fillStyle=fill;
ctx.fill();
}
if(stroke){
ctx.strokeStyle=stroke;
ctx.lineWidth=3;
ctx.stroke();
}
}
function bezel(cx,cy,r){
const rim=ctx.createLinearGradient(cx-r,cy-r,cx+r,cy+r);
rim.addColorStop(0,'#98b3bf');
rim.addColorStop(0.45,'#3a5664');
rim.addColorStop(1,'#142831');
ctx.beginPath();
ctx.arc(cx,cy,r+9,0,Math.PI*2);
ctx.fillStyle=rim;
ctx.fill();
ctx.beginPath();
ctx.arc(cx,cy,r+4,0,Math.PI*2);
ctx.fillStyle='#0a1b24';
ctx.fill();
}
function face(cx,cy,r){
bezel(cx,cy,r);
const glass=ctx.createRadialGradient(cx-r*0.3,cy-r*0.4,r*0.1,cx,cy,r);
glass.addColorStop(0,'#376e84');
glass.addColorStop(1,'#153444');
ctx.beginPath();
ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.fillStyle=glass;
ctx.fill();
ctx.strokeStyle='rgba(178, 230, 248, 0.5)';
ctx.lineWidth=2;
ctx.stroke();
}
function label(text,x,y,size=18,color='#b9dce8',align='center'){
ctx.fillStyle=color;
ctx.font=`bold ${size}px ui-monospace, "SFMono-Regular", Consolas, monospace`;
ctx.textAlign=align;
ctx.textBaseline='middle';
ctx.shadowColor=color;
ctx.shadowBlur=size>=19?12:6;
ctx.fillText(text,x,y);
ctx.shadowBlur=0;
}
function base(){
const grad=ctx.createLinearGradient(0,0,0,PANEL_H);
grad.addColorStop(0,'#55798a');
grad.addColorStop(0.38,'#2d4d5d');
grad.addColorStop(1,'#183440');
ctx.fillStyle=grad;
ctx.fillRect(0,0,PANEL_W,PANEL_H);
const wash=ctx.createLinearGradient(0,0,PANEL_W,PANEL_H);
wash.addColorStop(0,'rgba(255,204,139,0.12)');
wash.addColorStop(0.5,'rgba(130,232,255,0.06)');
wash.addColorStop(1,'rgba(255,165,108,0.1)');
ctx.fillStyle=wash;
ctx.fillRect(0,0,PANEL_W,PANEL_H);
ctx.strokeStyle='rgba(186, 225, 240, 0.11)';
ctx.lineWidth=2;
for(let x=18;x<PANEL_W;x+=58){
ctx.beginPath();
ctx.moveTo(x,0);
ctx.lineTo(x,PANEL_H);
ctx.stroke();
}
const sheen=ctx.createLinearGradient(0,0,PANEL_W,280);
sheen.addColorStop(0,'rgba(205, 241, 255, 0.14)');
sheen.addColorStop(0.5,'rgba(205, 241, 255, 0.03)');
sheen.addColorStop(1,'rgba(205, 241, 255, 0)');
ctx.fillStyle=sheen;
ctx.fillRect(0,0,PANEL_W,300);
}
function roundGauge(cx,cy,r,title,readout,needleFraction){
face(cx,cy,r);
const start=Math.PI*0.75;
const sweep=Math.PI*1.5;
for(let i=0;i<=40;i+=1){
const a=start+(i/40)*sweep;
const major=i%5===0;
ctx.strokeStyle=major?'#e8f6f9':'#a0c2ce';
ctx.lineWidth=major?4:2;
ctx.beginPath();
ctx.moveTo(cx+Math.cos(a)*(r-(major?20:14)),cy+Math.sin(a)*(r-(major?20:14)));
ctx.lineTo(cx+Math.cos(a)*(r-7),cy+Math.sin(a)*(r-7));
ctx.stroke();
}
label(title,cx,cy-40,19,'#c7e6f0');
box(cx-52,cy+22,104,36,8,'#06131a','rgba(150, 208, 228, 0.5)');
label(readout,cx,cy+41,24,'#fff4cf');
const a=start+clamp(needleFraction,0,1)*sweep;
ctx.strokeStyle='#ffc07e';
ctx.lineWidth=5;
ctx.lineCap='round';
ctx.beginPath();
ctx.moveTo(cx-Math.cos(a)*10,cy-Math.sin(a)*10);
ctx.lineTo(cx+Math.cos(a)*(r-12),cy+Math.sin(a)*(r-12));
ctx.stroke();
ctx.beginPath();
ctx.arc(cx,cy,7,0,Math.PI*2);
ctx.fillStyle='#e6f4f7';
ctx.fill();
}
function attitude(cx,cy,r,pitchDeg,rollRad){
bezel(cx,cy,r);
ctx.save();
ctx.beginPath();
ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.clip();
ctx.translate(cx,cy);
ctx.rotate(-rollRad);
const horizon=clamp(pitchDeg,-40,40)*2.35;
const sky=ctx.createLinearGradient(0,-r,0,horizon);
sky.addColorStop(0,'#245f96');
sky.addColorStop(1,'#a9d8ea');
ctx.fillStyle=sky;
ctx.fillRect(-r,-r,r*2,r+horizon);
const ground=ctx.createLinearGradient(0,horizon,0,r);
ground.addColorStop(0,'#c38a51');
ground.addColorStop(1,'#68412a');
ctx.fillStyle=ground;
ctx.fillRect(-r,horizon,r*2,r*2);
ctx.strokeStyle='#fff1c9';
ctx.lineWidth=4;
ctx.beginPath();
ctx.moveTo(-r,horizon);
ctx.lineTo(r,horizon);
ctx.stroke();
for(let deg=-30;deg<=30;deg+=10){
if(deg===0)continue;
const y=horizon-deg*2.35;
if(Math.abs(y)>r-8)continue;
ctx.strokeStyle='rgba(255, 245, 220, 0.9)';
ctx.lineWidth=2;
ctx.beginPath();
ctx.moveTo(-24,y);
ctx.lineTo(24,y);
ctx.stroke();
label(String(Math.abs(deg)),35,y,14,'#fff3d4');
}
ctx.restore();
ctx.save();
ctx.beginPath();
ctx.arc(cx,cy,r,0,Math.PI*2);
ctx.strokeStyle='#b7dce8';
ctx.lineWidth=3;
ctx.stroke();
ctx.translate(cx,cy);
ctx.strokeStyle='#ffdc93';
ctx.lineWidth=7;
ctx.beginPath();
ctx.moveTo(-r*0.52,0);
ctx.lineTo(-12,0);
ctx.moveTo(12,0);
ctx.lineTo(r*0.52,0);
ctx.stroke();
ctx.beginPath();
ctx.arc(0,0,4,0,Math.PI*2);
ctx.fillStyle='#ffdc93';
ctx.fill();
for(let deg=-60;deg<=60;deg+=15){
const a=-Math.PI/2+(deg*Math.PI)/180;
ctx.strokeStyle=deg===0?'#ffe5b2':'rgba(210, 234, 242, 0.86)';
ctx.lineWidth=deg===0?5:2;
ctx.beginPath();
ctx.moveTo(Math.cos(a)*(r-14),Math.sin(a)*(r-14));
ctx.lineTo(Math.cos(a)*(r-5),Math.sin(a)*(r-5));
ctx.stroke();
}
ctx.rotate(-rollRad);
ctx.fillStyle='#ffd57a';
ctx.beginPath();
ctx.moveTo(0,-r+12);
ctx.lineTo(-8,-r+27);
ctx.lineTo(8,-r+27);
ctx.closePath();
ctx.fill();
ctx.restore();
label('ATTITUDE',cx,cy+r-14,16,'#d7edf4');
}
function verticalSpeed(cx,cy,r,fpm){
face(cx,cy,r);
for(let i=-4;i<=4;i+=1){
const a=-Math.PI/2+(i/4)*Math.PI*0.72;
ctx.strokeStyle=i===0?'#e6f3f6':'#9bbcc8';
ctx.lineWidth=i===0?3:2;
ctx.beginPath();
ctx.moveTo(cx+Math.cos(a)*(r-17),cy+Math.sin(a)*(r-17));
ctx.lineTo(cx+Math.cos(a)*(r-7),cy+Math.sin(a)*(r-7));
ctx.stroke();
}
const fraction=clamp(fpm/2000,-1,1);
const a=-Math.PI/2+fraction*Math.PI*0.72;
ctx.strokeStyle='#ffc982';
ctx.lineWidth=5;
ctx.lineCap='round';
ctx.beginPath();
ctx.moveTo(cx,cy);
ctx.lineTo(cx+Math.cos(a)*(r-15),cy+Math.sin(a)*(r-15));
ctx.stroke();
label('V/S',cx,cy-28,17,'#c1e1eb');
box(cx-41,cy+16,82,28,6,'#06131a','rgba(150, 208, 228, 0.5)');
label(`${fpm >= 0 ? '+' : '-'}${padNumber(Math.abs(fpm), 3)}`,cx,cy+31,18,fpm<-800?'#ff9e83':'#ffe8b6');
}
function headingTape(x,y,w,h,heading){
box(x,y,w,h,12,'#071822','rgba(164, 216, 235, 0.52)');
label('HDG',x+38,y+h/2,19,'#c1e1eb');
ctx.save();
ctx.beginPath();
ctx.rect(x+82,y+6,w-116,h-12);
ctx.clip();
const center=x+82+(w-116)/2;
for(let d=-70;d<=70;d+=5){
const deg=((heading+d)%360+360)%360;
const px=center+d*3.4;
const major=deg%10===0;
ctx.strokeStyle=major?'#e2f1f5':'#8badba';
ctx.lineWidth=major?3:2;
ctx.beginPath();
ctx.moveTo(px,y+h-15);
ctx.lineTo(px,y+h-(major?28:21));
ctx.stroke();
if(deg%30===0){
const cardinal={0:'N',90:'E',180:'S',270:'W'}[deg];
label(cardinal??String(deg),px,y+21,cardinal?21:17,cardinal?'#ffd57a':'#d7edf4');
}
}
ctx.restore();
ctx.fillStyle='#ffd57a';
ctx.beginPath();
ctx.moveTo(center,y+h-6);
ctx.lineTo(center-9,y+h-20);
ctx.lineTo(center+9,y+h-20);
ctx.closePath();
ctx.fill();
box(x+w-92,y+5,84,h-10,10,'#102934','rgba(164, 216, 235, 0.52)');
label(`${padNumber(heading, 3)}°`,x+w-50,y+h/2,25,'#ffe8b6');
}
function warnLight(x,y,w,h,text,active,color){
box(x,y,w,h,7,active?color:'#10242d',active?color:'rgba(150, 195, 214, 0.42)');
label(text,x+w/2,y+h/2,17,active?'#0a171c':'#9fbecb');
}
function draw(data,force){
const elapsed=data.elapsed??0;
if(!force&&elapsed-lastPaint<0.06)return;
lastPaint=elapsed;
const speed=Number.isFinite(data.speed)?data.speed:0;
const alt=Number.isFinite(data.alt)?data.alt:0;
const heading=Number.isFinite(data.heading)?data.heading:0;
const vsi=Number.isFinite(data.vsi)?data.vsi:0;
const throttle=Number.isFinite(data.throttle)?data.throttle:0;
const pitchDeg=Number.isFinite(data.pitch)?data.pitch:0;
const rollRad=Number.isFinite(data.roll)?data.roll:0;
const fuel=data.fuel??{liters:0,capacity:1,fraction:0,reserveWarning:false,engineOut:false,burnRate:0,endurance:0};
base();
box(24,16,332,68,10,'#081b25','rgba(120, 220, 246, 0.54)');
label('NAV / NEXT GATE',44,36,17,'#b9dce8','left');
label(`GATE ${padNumber(data.gateIndex ?? 0, 2)}`,44,63,24,'#ffe0a6','left');
label(`BRG ${padNumber(data.bearing ?? 0, 3)}°`,205,36,19,'#a8f0ff','left');
label(`RNG ${Math.round(data.range ?? 0)} m`,205,63,19,'#a8f0ff','left');
box(668,16,332,68,10,'#081b25','rgba(164, 216, 235, 0.5)');
label(String(data.missionName??'FLIGHT PLAN').slice(0,18),686,36,19,'#ffcf70','left');
label(`T+ ${clock(data.timeLeft ?? 0)}`,686,63,19,'#e0f2f7','left');
label(`BURN ${(fuel.burnRate ?? 0).toFixed(2)} L/S`,986,36,16,'#a8f0ff','right');
label(`END ${clock(fuel.endurance ?? 0)}`,986,63,18,fuel.reserveWarning?'#ff9e83':'#ffe0a6','right');
roundGauge(150,190,78,'AIRSPEED',`${padNumber(speed, 3)} KT`,clamp(speed/180,0,1));
attitude(370,190,92,pitchDeg,rollRad);
verticalSpeed(585,190,59,vsi);
roundGauge(825,190,78,'ALTITUDE',`${padNumber(alt, 4)} FT`,(alt/1000)%1);
headingTape(24,302,640,76,heading);
box(694,302,306,76,10,'#0d202b','rgba(164, 216, 235, 0.42)');
warnLight(706,314,92,24,'STALL',Boolean(data.stall)&&Math.floor(elapsed*4)%2===0,'#ff6e62');
warnLight(806,314,92,24,'GEAR',!data.gear&&alt<600,'#ffc264');
warnLight(906,314,82,24,'FUEL',fuel.reserveWarning||fuel.engineOut,'#ff6e62');
warnLight(706,346,92,24,'SINK',vsi<-800,'#ff9978');
warnLight(806,346,192,24,data.integrity<75?'AIRFRAME':data.gear?'GEAR DOWN':'GEAR UP',true,data.integrity<75?'#ff9978':'#59dba0');
box(24,378,976,16,5,'#071822','rgba(164, 216, 235, 0.36)');
label('FUEL',42,386,13,'#b9dce8','left');
ctx.fillStyle='#050e14';
ctx.fillRect(96,383,780,7);
ctx.fillStyle=fuel.engineOut?'#ff6e62':fuel.reserveWarning?'#ffc264':'#7ae8c0';
ctx.fillRect(97,384,778*clamp(fuel.fraction,0,1),5);
ctx.fillStyle='rgba(255,255,255,0.8)';
ctx.fillRect(97+778*clamp(fuel.reserveFraction??0.16,0,1),381,3,10);
label(`${Math.round(fuel.liters)} / ${Math.round(fuel.capacity)} L · RES ${Math.round(fuel.reserve ?? 0)} L`,978,386,14,fuel.reserveWarning?'#ffc264':'#d7edf4','right');
box(24,400,470,92,12,'#0b1e28','rgba(164, 216, 235, 0.4)');
label('THROTTLE',46,424,18,'#b9dce8','left');
box(46,444,286,20,8,'#050e14','rgba(150, 208, 228, 0.45)');
ctx.fillStyle=throttle>0.82?'#ffbc6e':'#61d9c2';
ctx.fillRect(49,447,280*clamp(throttle,0,1),14);
label(`${Math.round(throttle * 100)}%`,352,454,24,'#ffe0a6','left');
label(`RPM ${padNumber(700 + throttle * 1900, 4)}`,46,476,16,'#b9dce8','left');
label(`FLAPS ${data.flaps ? 'DOWN' : 'UP'}`,246,476,16,data.flaps?'#ffcf70':'#b9dce8','left');
label(`AIRFRAME ${padNumber(data.integrity ?? 100, 3)}%`,388,476,16,(data.integrity??100)<75?'#ff9e83':'#b9dce8','left');
box(510,400,490,92,12,'#0b1e28','rgba(164, 216, 235, 0.4)');
label('LANDING GEAR',532,424,18,'#b9dce8','left');
for(let i=0;i<3;i+=1){
const x=696+i*36;
ctx.beginPath();
ctx.arc(x,452,11,0,Math.PI*2);
ctx.fillStyle=data.gear?'#59dba0':'#263b45';
ctx.fill();
ctx.strokeStyle=data.gear?'#c6ffea':'#597681';
ctx.lineWidth=3;
ctx.stroke();
}
label(data.gear?'DOWN & LOCKED':'UP',810,452,20,data.gear?'#a8f5cf':'#ffc264','left');
label(`ENDURANCE ${clock(fuel.endurance ?? 0)}`,532,476,17,fuel.reserveWarning?'#ff9e83':'#b9dce8','left');
label(`SCORE ${padNumber(data.score ?? 0, 6)}`,978,476,16,'#b9dce8','right');
ctx.save();
ctx.globalCompositeOperation='lighter';
const strip=ctx.createLinearGradient(0,0,PANEL_W,0);
strip.addColorStop(0,'rgba(100,220,255,0.3)');
strip.addColorStop(0.5,'rgba(255,210,130,0.2)');
strip.addColorStop(1,'rgba(100,220,255,0.3)');
ctx.fillStyle=strip;
ctx.fillRect(30,10,PANEL_W-60,4);
ctx.fillRect(30,PANEL_H-16,PANEL_W-60,3);
ctx.restore();
void mission;
texture.version+=1;
}
return{texture,draw};
}
