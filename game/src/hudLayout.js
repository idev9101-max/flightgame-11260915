const GAUGE_ROWS=[
['AIRSPEED','hudSpeed','000 KT'],
['ALTITUDE','hudAlt','0000 FT'],
['HEADING','hudHeading','000°'],
['VERTICAL','hudVsi','+0000 FPM'],
['FUEL','hudFuelGauge','118 L'],
['BURN','hudFuelBurn','0.00 L/S'],
['ENDURANCE','hudEndurance','03:00'],
['AIRFRAME','hudDamage','100%'],
];
function gaugeRows(){
return GAUGE_ROWS.map(([label,id,value])=>`
    <div class="gauge-row"><span class="label">${label}</span><span id="${id}" class="value mono">${value}</span></div>`).join('');
}
export function hudLayout(){
return`
<div id="hud" class="hud hidden">
  <div class="hud-top">
    <div class="hud-card mission-card">
      <div class="label">MISSION</div>
      <div id="hudMission" class="value strong">HARBOR HOP</div>
      <div id="hudObjective" class="sub">GATE 1 / 5</div>
      <div id="hudTarget" class="target-chip hidden"><span>NEXT GATE</span><b id="hudTargetDist">0 m</b></div>
    </div>
    <div class="hud-card timer-card">
      <div class="label">TIME REMAINING</div>
      <div id="hudTime" class="value big mono">02:45</div>
      <div class="timer-track"><div id="hudTimeBar" class="timer-fill"></div></div>
    </div>
    <div class="hud-card score-card">
      <div class="label">SCORE</div>
      <div id="hudScore" class="value big mono">000000</div>
      <div class="timer-track"><div id="hudHullBar" class="hull-fill"></div></div>
      <div id="hudHullText" class="sub strong-readout">AIRFRAME 100%</div>
      <div id="hudFuelText" class="sub strong-readout">FUEL 118 / 118 L</div>
      <div id="hudFuelPlan" class="sub">RES 19 L · BURN 0.00 L/S</div>
      <div class="timer-track"><div id="hudFuelBar" class="fuel-fill"></div></div>
    </div>
  </div>
  <div class="hud-center">
    <div class="reticle"><div class="reticle-ring"></div><div class="reticle-dot"></div><div class="reticle-line left"></div><div class="reticle-line right"></div></div>
    <div id="hudWarning" class="warning hidden"></div>
    <div id="hudMessage" class="flight-message"></div>
  </div>
  <div class="hud-bottom">
    <div class="hud-card instrument-card">${gaugeRows()}</div>
    <div class="minimap-wrap">
      <canvas id="minimap" width="180" height="180" aria-label="Tactical minimap"></canvas>
      <div class="minimap-label">TACTICAL MAP</div>
    </div>
    <div class="hud-card systems-card">
      <div class="throttle-row"><span class="label">THROTTLE</span><div class="throttle-track"><div id="hudThrottleBar" class="throttle-fill"></div></div><span id="hudThrottle" class="value mono">55%</span></div>
      <div class="status-row"><span id="hudGear" class="chip on">GEAR DOWN</span><span id="hudFlaps" class="chip">FLAPS UP</span><span id="hudCamera" class="chip cyan">CHASE VIEW</span></div>
      <div class="status-row"><span id="hudWind" class="chip">WIND 0.0</span><span class="chip dim">H HELP · P PAUSE</span></div>
    </div>
  </div>
</div>`;
}
export function ensureHUDLayout(){
if(!document.getElementById('hud'))document.body.insertAdjacentHTML('afterbegin',hudLayout());
}
