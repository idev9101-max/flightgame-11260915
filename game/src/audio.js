export function createSound(){
let ctx=null;
let master=null;
let musicBus=null;
let engineGain=null;
let engineOscA=null;
let engineOscB=null;
let engineFilter=null;
let windGain=null;
let warnGain=null;
let warnOsc=null;
let noiseBuffer=null;
let nextBeat=0;
let beat=0;
let mode='title';
let intensity=0;
let muted=false;
const scale=[0,3,5,7,10,12,15,17];
function makeNoise(){
const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
const data=buffer.getChannelData(0);
let last=0;
for(let i=0;i<data.length;i+=1){
const white=Math.random()*2-1;
last=(last+0.02*white)/1.02;
data[i]=white*0.7+last*2.5;
}
return buffer;
}
function unlock(){
if(ctx){
if(ctx.state==='suspended')ctx.resume();
return;
}
const AudioCtx=window.AudioContext||window.webkitAudioContext;
if(!AudioCtx)return;
try{
ctx=new AudioCtx();
}catch{
ctx=null;
return;
}
noiseBuffer=makeNoise();
const compressor=ctx.createDynamicsCompressor();
compressor.threshold.value=-18;
compressor.ratio.value=7;
master=ctx.createGain();
master.gain.value=muted?0:0.72;
master.connect(compressor);
compressor.connect(ctx.destination);
musicBus=ctx.createGain();
musicBus.gain.value=0.18;
musicBus.connect(master);
engineFilter=ctx.createBiquadFilter();
engineFilter.type='lowpass';
engineFilter.frequency.value=700;
engineFilter.Q.value=3;
engineGain=ctx.createGain();
engineGain.gain.value=0;
engineOscA=ctx.createOscillator();
engineOscA.type='sawtooth';
engineOscB=ctx.createOscillator();
engineOscB.type='square';
engineOscA.frequency.value=60;
engineOscB.frequency.value=90;
engineOscA.connect(engineFilter);
engineOscB.connect(engineFilter);
engineFilter.connect(engineGain);
engineGain.connect(master);
engineOscA.start();
engineOscB.start();
const wind=ctx.createBufferSource();
wind.buffer=noiseBuffer;
wind.loop=true;
const windFilter=ctx.createBiquadFilter();
windFilter.type='bandpass';
windFilter.frequency.value=1100;
windFilter.Q.value=0.6;
windGain=ctx.createGain();
windGain.gain.value=0;
wind.connect(windFilter);
windFilter.connect(windGain);
windGain.connect(master);
wind.start();
warnOsc=ctx.createOscillator();
warnOsc.type='square';
warnOsc.frequency.value=740;
warnGain=ctx.createGain();
warnGain.gain.value=0;
warnOsc.connect(warnGain);
warnGain.connect(master);
warnOsc.start();
nextBeat=ctx.currentTime+0.2;
}
function tone(freq,duration,type,volume,options={}){
if(!ctx)return;
const when=options.when??ctx.currentTime;
const osc=ctx.createOscillator();
const gain=ctx.createGain();
osc.type=type;
osc.frequency.setValueAtTime(freq,when);
if(options.slide)osc.frequency.exponentialRampToValueAtTime(Math.max(30,options.slide),when+duration);
gain.gain.setValueAtTime(0.0001,when);
gain.gain.exponentialRampToValueAtTime(Math.max(0.0002,volume),when+Math.min(0.025,duration*0.3));
gain.gain.exponentialRampToValueAtTime(0.0001,when+duration);
osc.connect(gain);
gain.connect(options.bus??master);
osc.start(when);
osc.stop(when+duration+0.02);
}
function noiseBurst(duration,volume,filterFreq,type='lowpass'){
if(!ctx)return;
const source=ctx.createBufferSource();
source.buffer=noiseBuffer;
const filter=ctx.createBiquadFilter();
filter.type=type;
filter.frequency.value=filterFreq;
const gain=ctx.createGain();
const now=ctx.currentTime;
gain.gain.setValueAtTime(volume,now);
gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
source.connect(filter);
filter.connect(gain);
gain.connect(master);
source.start(now);
source.stop(now+duration+0.02);
}
function scheduleMusic(){
if(!ctx||mode==='off')return;
const tempo=mode==='play'?0.34-intensity*0.055:0.52;
while(nextBeat<ctx.currentTime+0.15){
const step=beat%16;
const root=mode==='storm'?174.61:mode==='dawn'?196:220;
const semitone=scale[(beat*3+(step>11?2:0))%scale.length];
const freq=root*Math.pow(2,semitone/12);
tone(freq,tempo*1.6,'triangle',0.045,{when:nextBeat,bus:musicBus});
if(step%4===0)tone(root/2,tempo*2.4,'sine',0.075,{when:nextBeat,bus:musicBus});
if(mode==='play'&&intensity>0.55&&step%2===1){
tone(freq*2,tempo*0.5,'square',0.012,{when:nextBeat,bus:musicBus});
}
nextBeat+=tempo;
beat+=1;
}
}
function update(dt,data){
if(!ctx)return;
const t=ctx.currentTime;
const throttle=data.throttle??0;
const speed=data.speed??0;
const rf=48+throttle*118+speed*0.45;
engineOscA.frequency.setTargetAtTime(rf,t,0.08);
engineOscB.frequency.setTargetAtTime(rf*1.503,t,0.08);
engineFilter.frequency.setTargetAtTime(420+throttle*1450+speed*9,t,0.12);
engineGain.gain.setTargetAtTime(mode==='play'?0.055+throttle*0.075:0.025,t,0.1);
windGain.gain.setTargetAtTime(mode==='play'?Math.min(0.16,speed*0.0016):0,t,0.2);
const warning=data.stall&&mode==='play'&&Math.floor(t*4)%2===0;
warnGain.gain.setTargetAtTime(warning?0.035:0,t,0.01);
scheduleMusic(dt);
}
return{
unlock,
update,
setMode(nextMode,nextIntensity=0){
mode=nextMode;
intensity=nextIntensity;
if(ctx)nextBeat=Math.max(nextBeat,ctx.currentTime+0.05);
},
click(){
tone(880,0.06,'triangle',0.055);
},
ring(index=0){
const base=660*Math.pow(2,(index%4)/12);
tone(base,0.22,'sine',0.12);
tone(base*1.5,0.34,'triangle',0.08,{when:ctx?ctx.currentTime+0.07:0});
},
touchdown(){
tone(110,0.28,'sine',0.18,{slide:55});
noiseBurst(0.22,0.16,600);
},
crash(){
tone(80,0.8,'sawtooth',0.2,{slide:28});
noiseBurst(0.9,0.3,1400,'bandpass');
},
success(){
[523,659,784,1046].forEach((f,i)=>tone(f,0.45,'triangle',0.09,{when:ctx?ctx.currentTime+i*0.13:0}));
},
toggleMute(){
muted=!muted;
if(master&&ctx)master.gain.setTargetAtTime(muted?0:0.72,ctx.currentTime,0.05);
return muted;
},
get muted(){
return muted;
},
};
}
