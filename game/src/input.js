export function createInput(canvas){
const keys=new Set();
const actions=[];
let pointerLocked=false;
let allowPointerLock=false;
let mousePitch=0;
let mouseRoll=0;
let wheelThrottle=0;
const blockKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ControlLeft','ControlRight']);
window.addEventListener('keydown',(event)=>{
const code=event.code;
if(blockKeys.has(code))event.preventDefault();
if(!event.repeat){
if(code==='Enter'||code==='NumpadEnter')actions.push('confirm');
else if(code==='Escape')actions.push('escape');
else if(code==='KeyP')actions.push('pause');
else if(code==='KeyC')actions.push('camera');
else if(code==='KeyG')actions.push('gear');
else if(code==='KeyF')actions.push('flaps');
else if(code==='KeyR')actions.push('restart');
else if(code==='KeyH')actions.push('help');
else if(code==='KeyM')actions.push('missions');
else if(code==='KeyN')actions.push('mute');
else if(code==='KeyL')actions.push('quality');
else if(code==='Digit1')actions.push('select0');
else if(code==='Digit2')actions.push('select1');
else if(code==='Digit3')actions.push('select2');
else if(code==='ArrowLeft'&&!keys.has('KeyD'))actions.push('prev');
else if(code==='ArrowRight'&&!keys.has('KeyA'))actions.push('next');
}
keys.add(code);
});
window.addEventListener('keyup',(event)=>keys.delete(event.code));
window.addEventListener('blur',()=>keys.clear());
document.addEventListener('pointerlockchange',()=>{
pointerLocked=document.pointerLockElement===canvas;
if(!pointerLocked){
mousePitch=0;
mouseRoll=0;
}
});
document.addEventListener('mousemove',(event)=>{
if(!pointerLocked)return;
mousePitch=clamp(mousePitch-event.movementY*0.0032,-1,1);
mouseRoll=clamp(mouseRoll+event.movementX*0.0032,-1,1);
});
canvas.addEventListener('click',()=>{
actions.push('canvasClick');
if(allowPointerLock&&!pointerLocked&&canvas.requestPointerLock){
try{
canvas.requestPointerLock();
}catch{
pointerLocked=false;
}
}
});
canvas.addEventListener('wheel',(event)=>{
event.preventDefault();
wheelThrottle+=-event.deltaY*0.00075;
},{passive:false});
function clamp(value,min,max){
return Math.max(min,Math.min(max,value));
}
function controls(active,dt){
if(!active){
mousePitch*=0.85;
mouseRoll*=0.85;
wheelThrottle=0;
return{pitch:0,roll:0,yaw:0,brake:false,throttleDelta:0};
}
const held=(...codes)=>codes.some((code)=>keys.has(code));
let pitch=(held('KeyW','ArrowUp')?1:0)-(held('KeyS','ArrowDown')?1:0);
let roll=(held('KeyD','ArrowRight')?1:0)-(held('KeyA','ArrowLeft')?1:0);
let yaw=(held('KeyE')?1:0)-(held('KeyQ')?1:0);
const decay=Math.exp(-1.6*dt);
if(pointerLocked){
pitch=clamp(pitch+mousePitch,-1,1);
roll=clamp(roll+mouseRoll,-1,1);
mousePitch*=decay;
mouseRoll*=decay;
}else{
mousePitch=0;
mouseRoll=0;
}
const throttleDelta=((held('ShiftLeft','ShiftRight')?0.52:0)-(held('ControlLeft','ControlRight','AltLeft','AltRight')?0.52:0))*dt+wheelThrottle;
wheelThrottle=0;
return{
pitch,
roll,
yaw,
brake:held('Space'),
throttleDelta,
};
}
return{
controls,
takeActions(){
return actions.splice(0,actions.length);
},
allowPointerLock(value){
allowPointerLock=value;
},
unlock(){
if(document.pointerLockElement===canvas&&document.exitPointerLock)document.exitPointerLock();
},
get pointerLocked(){
return pointerLocked;
},
};
}
