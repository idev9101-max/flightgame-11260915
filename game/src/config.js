export const STEP=1/60;
export const RUNWAY_Y=6;
export const RUNWAY_HALF_WIDTH=19;
export const RUNWAY_NEAR=86;
export const RUNWAY_FAR=-154;
export const SEED=1;
export const MISSIONS=[
{
id:'harbor',
name:'HARBOR HOP',
subtitle:'Sunrise courier',
brief:'A gentle circuit over the bay. Climb off runway 09, collect five harbor beacons, then bring her home.',
time:165,
multiplier:1,
fuelCapacity:118,
wind:0.8,
gust:0.25,
visibility:1,
sky:'dawn',
ringScale:1.15,
rings:[
[0,38,-265],
[-95,52,-390],
[-40,62,-525],
[115,48,-460],
[150,34,-255],
],
},
{
id:'canyon',
name:'CANYON CUT',
subtitle:'Slalom time trial',
brief:'Thread seven narrow gates through the red canyon. Keep your bank gentle and save time for the return leg.',
time:145,
multiplier:1.6,
fuelCapacity:126,
wind:1.8,
gust:0.7,
visibility:0.85,
sky:'day',
ringScale:0.9,
rings:[
[25,40,-230],
[-70,44,-335],
[72,58,-430],
[-120,66,-540],
[110,52,-640],
[-45,40,-700],
[85,34,-760],
],
},
{
id:'storm',
name:'STORM WATCH',
subtitle:'Gale-force patrol',
brief:'Crosswind, low cloud and six rotating gates. Fly the patrol, then land in the gusting final approach.',
time:155,
multiplier:2.2,
fuelCapacity:142,
wind:3.6,
gust:1.4,
visibility:0.62,
sky:'storm',
ringScale:1,
rings:[
[-55,46,-245],
[130,60,-350],
[-165,70,-485],
[40,56,-610],
[180,44,-520],
[-105,36,-295],
],
},
];
export const PALETTE={
ink:'#eaf4ff',
cyan:'#6de3ff',
amber:'#ffcf66',
coral:'#ff7d6b',
green:'#8ce6a8',
dim:'#8aa6bd',
};
export const BEST_KEY='skyline-rush.best.v1';
export const QUALITY_KEY='skyline-rush.quality.v1';
