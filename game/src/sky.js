import * as THREE from './engine.js';
import { makeGlowTexture } from './worldAssets.js';

export function createSkyLighting(root, scene, preset, mission) {
  scene.fog = new THREE.FogExp2(preset.fog, mission.sky === 'storm' ? 0.00092 : mission.sky === 'dawn' ? 0.00042 : 0.00058);
  scene.background = new THREE.Color(preset.fog);

  const sunDirection = new THREE.Vector3(...preset.sunDir).normalize();
  const uniforms = {
    topColor: { value: new THREE.Color(preset.top) },
    bottomColor: { value: new THREE.Color(preset.bottom) },
    sunColor: { value: new THREE.Color(preset.sun) },
    sunDirection: { value: sunDirection.clone() },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1500, 24, 16),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * uModelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 topColor; uniform vec3 bottomColor; uniform vec3 sunColor; uniform vec3 sunDirection;
        varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec3 dir = normalize(vDir);
          float h = smoothstep(-0.22, 0.72, dir.y);
          vec3 col = mix(bottomColor, topColor, h);
          float horizon = 1.0 - smoothstep(0.0, 0.26, abs(dir.y));
          col = mix(col, bottomColor * 1.06, horizon * 0.24);
          float alignment = max(0.0, dot(dir, normalize(sunDirection)));
          float disc = pow(alignment, 480.0);
          float halo = pow(alignment, 7.0) * 0.3 + pow(alignment, 34.0) * 0.34;
          float flare = pow(alignment, 18.0) * (0.62 + 0.38 * sin(atan(dir.y, dir.x) * 9.0)) * 0.13;
          col += sunColor * (disc * 2.1 + halo + flare);
          col += (hash(dir.xy * 730.0) - 0.5) * 0.008;
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  sky.position.set(0, 0, -350);
  sky.frustumCulled = false;
  root.add(sky);

  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeGlowTexture(`#${preset.sun.toString(16).padStart(6, '0')}`, 256),
    transparent: true, opacity: mission.sky === 'storm' ? 0.16 : 0.38, depthWrite: false, fog: false,
  }));
  sunGlow.scale.set(150, 150, 1);
  root.add(sunGlow);

  const hemi = new THREE.HemisphereLight(preset.hemiSky, preset.hemiGround, 1.35);
  root.add(hemi);
  const sun = new THREE.DirectionalLight(preset.sun, preset.sunPower);
  sun.position.set(preset.sunDir[0] * 400, preset.sunDir[1] * 400 + 100, preset.sunDir[2] * 400 - 250);
  root.add(sun);
  root.add(new THREE.AmbientLight(0x8fa9b5, 0.35));

  return { sky, sunGlow, sunDirection, hemi, sun, baseSunPower: preset.sunPower };
}

export function updateSkyLighting(skyParts, mission, time, cameraPos) {
  if (mission.sky === 'storm') {
    const flash = Math.max(0, Math.sin(time * 0.83 + 1.7)) ** 24;
    skyParts.hemi.intensity = 1.35 + flash * 1.7;
    skyParts.sun.intensity = skyParts.baseSunPower + flash * 0.9;
  }
  skyParts.sky.position.set(cameraPos.x, cameraPos.y, cameraPos.z - 350);
  skyParts.sunGlow.position.copy(cameraPos).addScaledVector(skyParts.sunDirection, 820);
}
