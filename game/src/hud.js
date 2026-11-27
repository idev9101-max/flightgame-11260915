import{ensureHUDLayout}from'./hudLayout.js';
function fmtTime(seconds){
const total=Math.max(0,Math.ceil(seconds));
return`${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function padScore(value){
return String(Math.max(0,Math.round(value))).padStart(6,'0');
}
function el(id){
return document.getElementById(id);
}
export function createHUD(){
ensureHUDLayout();
const hud=el('hud');
const minimap=el('minimap');
const mapCtx=minimap.getContext('2d');
function drawMinimap(data){
const w=minimap.width;
const h=minimap.height;
mapCtx.clearRect(0,0,w,h);
mapCtx.fillStyle='rgba(4,18,27,0.88)';
mapCtx.fillRect(0,0,w,h);
const project=(x,z)=>[w/2+(x/330)*(w/2-12),12+((100-z)/920)*(h-24)];
mapCtx.strokeStyle='rgba(120,180,205,0.16)';
mapCtx.lineWidth=1;
for(let g=-300;g<=300;g+=100){
const[gx]=project(g,0);
mapCtx.beginPath();
mapCtx.moveTo(gx,0);
mapCtx.lineTo(gx,h);
mapCtx.stroke();
}
for(let z=-800;z<=100;z+=150){
const[,gy]=project(0,z);
mapCtx.beginPath();
mapCtx.moveTo(0,gy);
mapCtx.lineTo(w,gy);
mapCtx.stroke();
}
const[rx1,ry1]=project(0,86);
const[rx2,ry2]=project(0,-154);
mapCtx.strokeStyle='rgba(235,246,249,0.8)';
mapCtx.lineWidth=4;
mapCtx.beginPath();
mapCtx.moveTo(rx1,ry1);
mapCtx.lineTo(rx2,ry2);
mapCtx.stroke();
for(let i=0;i<data.rings.length;i+=1){
const c=data.rings[i].center;
const[px,py]=project(c.x,c.z);
const passed=i<data.ringIndex;
const next=i===data.ringIndex;
mapCtx.beginPath();
mapCtx.arc(px,py,next?6:4,0,Math.PI*2);
mapCtx.strokeStyle=passed?'rgba(130,160,175,0.45)':next?'#ffcf70':'rgba(109,227,255,0.8)';
mapCtx.lineWidth=next?2.5:1.5;
mapCtx.stroke();
if(next){
mapCtx.beginPath();
mapCtx.arc(px,py,10,0,Math.PI*2);
mapCtx.strokeStyle='rgba(255,207,112,0.35)';
mapCtx.stroke();
}
}
const[ax,ay]=project(data.pos.x,data.pos.z);
mapCtx.save();
mapCtx.translate(ax,ay);
mapCtx.rotate(data.heading);
mapCtx.beginPath();
mapCtx.moveTo(0,-8);
mapCtx.lineTo(5.5,6);
mapCtx.lineTo(0,3);
mapCtx.lineTo(-5.5,6);
mapCtx.closePath();
mapCtx.fillStyle='#ffffff';
mapCtx.shadowColor='#6de3ff';
mapCtx.shadowBlur=8;
mapCtx.fill();
mapCtx.restore();
mapCtx.fillStyle='rgba(180,220,235,0.8)';
mapCtx.font='bold 11px ui-monospace, monospace';
mapCtx.fillText('N',w/2-3,10);
}
function setBar(id,fraction,lowClass){
const bar=el(id);
bar.style.width=`${Math.max(0, Math.min(1, fraction)) * 100}%`;
bar.classList.toggle('low',lowClass==='low');
bar.classList.toggle('critical',lowClass==='critical');
}
function update(data){
hud.classList.toggle('cockpit-view',data.cameraMode==='cockpit');
el('hudMission').textContent=data.mission.name;
el('hudObjective').textContent=data.ringIndex>=data.rings.length
?'ALL GATES · LAND ON 09'
:`GATE ${data.ringIndex + 1} / ${data.rings.length} · CLEARED ${data.ringIndex}`;
el('hudTime').textContent=fmtTime(data.timeLeft);
setBar('hudTimeBar',data.timeLeft/data.timeTotal,data.timeLeft<30?'low':'');
el('hudScore').textContent=padScore(data.score);
el('hudHullText').textContent=`AIRFRAME ${Math.round(data.integrity)}%`;
setBar('hudHullBar',data.integrity/100,data.integrity<25?'critical':data.integrity<55?'low':'');
el('hudFuelText').textContent=`FUEL ${Math.round(data.fuel.liters)} / ${Math.round(data.fuel.capacity)} L`;
el('hudFuelPlan').textContent=`RES ${Math.round(data.fuel.reserve)} L · BURN ${data.fuel.burnRate.toFixed(2)} L/S`;
el('hudFuelGauge').textContent=`${Math.round(data.fuel.liters)} L`;
el('hudFuelBurn').textContent=`${data.fuel.burnRate.toFixed(2)} L/S`;
el('hudEndurance').textContent=fmtTime(data.fuel.endurance);
el('hudDamage').textContent=`${Math.round(data.integrity)}%`;
setBar('hudFuelBar',data.fuel.fraction,data.engineOut||data.fuel.reserveWarning?'critical':data.fuel.fraction<0.3?'low':'');
el('hudSpeed').textContent=`${String(Math.round(data.speedKts)).padStart(3, '0')} KT`;
el('hudAlt').textContent=`${String(Math.round(data.altFt)).padStart(4, '0')} FT`;
el('hudHeading').textContent=`${String(Math.round(data.headingDeg)).padStart(3, '0')}°`;
el('hudVsi').textContent=`${data.vsiFpm >= 0 ? '+' : '−'}${String(Math.abs(Math.round(data.vsiFpm))).padStart(4, '0')} FPM`;
el('hudThrottle').textContent=`${Math.round(data.throttle * 100)}%`;
setBar('hudThrottleBar',data.throttle,'');
el('hudGear').textContent=data.gear?'GEAR DOWN':'GEAR UP';
el('hudGear').classList.toggle('on',data.gear);
el('hudFlaps').textContent=data.flaps?'FLAPS DOWN':'FLAPS UP';
el('hudFlaps').classList.toggle('on',data.flaps);
el('hudCamera').textContent=data.cameraMode==='cockpit'?'COCKPIT VIEW':'CHASE VIEW';
el('hudWind').textContent=`WIND ${data.wind.toFixed(1)}`;
const warning=el('hudWarning');
const warnings=[];
if(data.engineOut)warnings.push('ENGINE OUT');
else if(data.fuel.reserveWarning)warnings.push(`FUEL RESERVE · ${fmtTime(data.fuel.endurance)} LEFT`);
if(data.integrity<75)warnings.push('AIRFRAME DAMAGED');
if(data.stall)warnings.push('STALL');
warning.textContent=warnings.join(' · ');
warning.classList.toggle('hidden',warnings.length===0);
warning.classList.toggle('warn',warnings.length>0&&!data.engineOut&&!data.stall);
el('hudMessage').textContent=data.messageTime>0?data.message:'';
const target=el('hudTarget');
if(data.ringIndex<data.rings.length&&data.targetDistance<650){
target.classList.remove('hidden');
el('hudTargetDist').textContent=`${Math.round(data.targetDistance)} m`;
}else{
target.classList.add('hidden');
}
drawMinimap(data);
}
return{
update,
setVisible(visible){
hud.classList.toggle('hidden',!visible);
},
};
}
