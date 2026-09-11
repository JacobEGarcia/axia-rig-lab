import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { buildAxia } from './character.js';
import { computePose, hairSway } from './anims.js';

const Q = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setScissorTest(true);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0d18);
scene.fog = new THREE.Fog(0x0a0d18, 6, 16);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 60);
camera.position.set(0.9, 1.45, 2.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.95, 0);
controls.enableDamping = true;
controls.autoRotateSpeed = 1.6;
controls.minDistance = 1.0;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI * 0.55;
if (Q.get('cam') === 'face') { camera.position.set(0.12, 1.5, 0.8); controls.target.set(0, 1.45, 0); }
if (Q.get('cam') === 'side') camera.position.set(2.4, 1.2, 0.3);
if (Q.get('cam') === 'back') camera.position.set(-0.5, 1.5, -2.6);

// ---------- lights ----------
scene.add(new THREE.AmbientLight(0x9aa4c4, 0.8));
const key = new THREE.DirectionalLight(0xfff2e2, 1.5);
key.position.set(2.2, 3.4, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = key.shadow.camera.bottom = -2;
key.shadow.camera.right = key.shadow.camera.top = 2;
scene.add(key);
const rim = new THREE.DirectionalLight(0x2ee6d6, 1.1);
rim.position.set(-2.4, 2.2, -2.4);
scene.add(rim);
const fill = new THREE.DirectionalLight(0x7080ff, 0.35);
fill.position.set(-1.8, 1.0, 2.2);
scene.add(fill);

// ---------- stage ----------
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 48),
  new THREE.MeshStandardMaterial({ color: 0x0d1226, roughness: 0.85, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.PolarGridHelper(3.2, 12, 6, 48, 0x2ee6d6, 0x1d2542);
grid.material.transparent = true;
grid.material.opacity = 0.28;
grid.position.y = 0.002;
scene.add(grid);
const podium = new THREE.Mesh(
  new THREE.CylinderGeometry(0.85, 0.95, 0.045, 48),
  new THREE.MeshStandardMaterial({ color: 0x111831, roughness: 0.4, metalness: 0.4 })
);
podium.position.y = 0.022;
podium.receiveShadow = true;
scene.add(podium);
const ringGlow = new THREE.Mesh(
  new THREE.TorusGeometry(0.9, 0.012, 8, 64),
  new THREE.MeshBasicMaterial({ color: 0x2ee6d6 })
);
ringGlow.rotation.x = Math.PI / 2;
ringGlow.position.y = 0.045;
scene.add(ringGlow);

// ---------- character ----------
const { root, J } = buildAxia();
root.position.y = 0.045;
scene.add(root);

// rest pose snapshot
const rest = {};
for (const k in J) {
  if (Array.isArray(J[k])) rest[k] = J[k].map(j => j.rotation.clone());
  else rest[k] = J[k].rotation.clone();
}

// ---------- state / UI ----------
const S = {
  anim: Q.get('anim') || 'idle',
  speed: 1, sway: 1,
  sliders: { headtilt: 0, headturn: 0, arml: 0, armr: 0, elbl: 0, elbr: 0, spine: 0, legs: 0 },
  quad: false,
};

const D2R = Math.PI / 180;
document.querySelectorAll('#actions button').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('#actions button').forEach(o => o.classList.remove('on'));
    b.classList.add('on');
    S.anim = b.dataset.anim;
  };
});
function bindSlider(id, key, fmt) {
  const el = document.getElementById(id);
  const out = el.parentElement.querySelector('b');
  el.oninput = () => {
    S.sliders[key] = +el.value;
    out.textContent = fmt(+el.value);
  };
}
bindSlider('p-headtilt', 'headtilt', v => v);
bindSlider('p-headturn', 'headturn', v => v);
bindSlider('p-arml', 'arml', v => v);
bindSlider('p-armr', 'armr', v => v);
bindSlider('p-elbl', 'elbl', v => v);
bindSlider('p-elbr', 'elbr', v => v);
bindSlider('p-spine', 'spine', v => v);
bindSlider('p-legs', 'legs', v => v);
document.getElementById('p-speed').oninput = e => {
  S.speed = e.target.value / 100;
  e.target.parentElement.querySelector('b').textContent = S.speed.toFixed(1) + 'x';
};
document.getElementById('p-sway').oninput = e => {
  S.sway = e.target.value / 100;
  e.target.parentElement.querySelector('b').textContent = S.sway.toFixed(1) + 'x';
};
document.getElementById('b-orbit').onclick = e => {
  controls.autoRotate = !controls.autoRotate;
  e.target.classList.toggle('on', controls.autoRotate);
};
document.getElementById('b-quad').onclick = e => {
  S.quad = !S.quad;
  e.target.classList.toggle('on', S.quad);
};
if (Q.get('quad')) { S.quad = true; document.getElementById('b-quad').classList.add('on'); }
if (Q.get('sheet')) document.getElementById('sheet-modal').classList.remove('hidden');
document.getElementById('b-sheet').onclick = () => document.getElementById('sheet-modal').classList.remove('hidden');
document.getElementById('sheet-close').onclick = () => document.getElementById('sheet-modal').classList.add('hidden');
document.getElementById('panel-toggle').onclick = () => document.getElementById('panel').classList.toggle('hidden');

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- pose application ----------
function applyPose(t) {
  const P = computePose(S.anim, t);
  const sl = S.sliders;
  const add = (j, x = 0, y = 0, z = 0) => {
    const r = rest[j];
    const o = P[j] || {};
    J[j].rotation.set(r.x + (o.x || 0) + x, r.y + (o.y || 0) + y, r.z + (o.z || 0) + z);
  };
  add('hips', 0, 0, 0);
  add('spine', sl.spine * D2R * 0.5);
  add('chest', sl.spine * D2R * 0.5);
  add('neck');
  add('head', sl.headtilt * D2R, sl.headturn * D2R);
  add('shL', 0, 0, sl.arml * D2R);
  add('shR', 0, 0, -sl.armr * D2R);
  add('elbL', 0, 0, -sl.elbl * D2R);
  add('elbR', 0, 0, sl.elbr * D2R);
  add('wrL'); add('wrR');
  add('thL', 0, 0, sl.legs * D2R);
  add('thR', 0, 0, -sl.legs * D2R);
  add('knL'); add('knR'); add('anL'); add('anR');

  // hair
  const sway = hairSway(t, S.sway, 4);
  for (const side of ['tailL', 'tailR']) {
    const sign = side === 'tailL' ? 1 : -1;
    J[side].forEach((j, i) => {
      const r = rest[side][i];
      const extra = (P[side] || 0);
      j.rotation.set(r.x + sway[i].x + (S.anim === 'run' ? 0.18 : 0) + (S.anim === 'jump' ? (P.rootY || 0) * -0.9 : 0),
                     r.y,
                     r.z + sign * sway[i].z);
    });
  }

  root.position.y = 0.045 + (P.rootY || 0);
  root.rotation.y = P.rootRotY || 0;
}

// ---------- quad view ----------
const quadCams = [
  { pos: [0, 1.0, 2.6], label: 'FRONT' },
  { pos: [0, 1.0, -2.6], label: 'BACK' },
  { pos: [2.6, 1.0, 0], label: 'LEFT' },
  { pos: [-2.6, 1.0, 0], label: 'RIGHT' },
].map(c => {
  const cam = new THREE.PerspectiveCamera(38, innerWidth / 2 / (innerHeight / 2), 0.1, 60);
  cam.position.set(...c.pos);
  cam.lookAt(0, 0.95, 0);
  return cam;
});

const clock = new THREE.Clock();
let simT = parseFloat(Q.get('t') || '0');
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  simT += dt * S.speed;
  applyPose(simT);
  controls.update();
  const w = innerWidth, h = innerHeight;
  if (S.quad) {
    for (let i = 0; i < 4; i++) {
      const vx = (i % 2) * w / 2, vy = Math.floor(i / 2) * h / 2;
      renderer.setViewport(vx, h - vy - h / 2, w / 2, h / 2);
      renderer.setScissor(vx, h - vy - h / 2, w / 2, h / 2);
      renderer.render(scene, quadCams[i]);
    }
  } else {
    renderer.setViewport(0, 0, w, h);
    renderer.setScissor(0, 0, w, h);
    renderer.render(scene, camera);
  }
}
tick();
