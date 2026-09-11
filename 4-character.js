// AXIA - procedural anime character, FK joint rig, toon-shaded.
// No external model: every part is built from primitives and rigid-bound to a joint.
import * as THREE from 'three';
import { makeFaceTexture } from './face.js';

const COL = {
  skin:   0xffe0d1,
  jacket: 0xf4f6fa,
  navy:   0x1d2440,
  black:  0x16171d,
  teal:   0x2ee6d6,
  hairTop: 0xe9eef5,
  hairTip: 0x35e0d8,
  bootW:  0xe8ecf4,
};

let GRAD = null;
function gradMap() {
  if (GRAD) return GRAD;
  const d = new Uint8Array([130, 175, 220, 255]);
  GRAD = new THREE.DataTexture(d, 4, 1, THREE.RedFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
  GRAD.needsUpdate = true;
  return GRAD;
}
function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradMap(), ...opts });
}
function glow(color) {
  return new THREE.MeshBasicMaterial({ color });
}

const OUT_MAT = new THREE.MeshBasicMaterial({ color: 0x0b0d16, side: THREE.BackSide });
function addOutline(mesh, fat = 0.0045) {
  const g = mesh.geometry.clone();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) + n.getX(i) * fat, p.getY(i) + n.getY(i) * fat, p.getZ(i) + n.getZ(i) * fat);
  }
  const o = new THREE.Mesh(g, OUT_MAT);
  mesh.add(o);
  return o;
}

function capsule(r, len, mat, seg = 12) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat);
  return m;
}

// limb mesh that extends from joint (0,0,0) down to (0,-len,0)
function limbMesh(r, len, mat, taper = 1) {
  const pts = [];
  const N = 8;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = -len + t * len;              // bottom -> top: outward normals
    const k = 1 - t;                        // k=1 at bottom, 0 at top
    const rr = r * (1 + (taper - 1) * k) * (1 - 0.12 * Math.sin(k * Math.PI));
    pts.push(new THREE.Vector2(rr, y));
  }
  const g = new THREE.LatheGeometry(pts, 14);
  const m = new THREE.Mesh(g, mat);
  addOutline(m, 0.004);
  return m;
}

function gradColorize(geo, topHex, tipHex, minY, maxY) {
  const top = new THREE.Color(topHex), tip = new THREE.Color(tipHex);
  const p = geo.attributes.position, colors = [];
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((maxY - p.getY(i)) / (maxY - minY), 0, 1);
    const c = top.clone().lerp(tip, t);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

export function buildAxia() {
  const J = {};                       // joints
  const root = new THREE.Group();

  const skinM = toon(COL.skin);
  const jacketM = toon(COL.jacket);
  const navyM = toon(COL.navy);
  const blackM = toon(COL.black);
  const hairM = toon(0xffffff, { vertexColors: true });
  const hairSolidM = toon(COL.hairTop);
  const tealGlowM = glow(COL.teal);
  const bootWM = toon(COL.bootW);

  // ---------- hips ----------
  const hips = J.hips = new THREE.Group();
  hips.position.set(0, 0.92, 0);
  root.add(hips);

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14), navyM);
  pelvis.scale.set(1.15, 0.8, 0.95);
  pelvis.position.y = -0.03;
  addOutline(pelvis, 0.004);
  hips.add(pelvis);

  // pleated skirt
  const skirtPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    skirtPts.push(new THREE.Vector2(0.145 + 0.115 * Math.pow(t, 1.5), 0.06 - t * 0.22));
  }
  const skirtG = new THREE.LatheGeometry(skirtPts, 48);
  { // pleats
    const p = skirtG.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const th = Math.atan2(z, x);
      const f = 1 + 0.055 * Math.abs(Math.sin(th * 9));
      p.setX(i, x * f); p.setZ(i, z * f);
    }
    skirtG.computeVertexNormals();
  }
  const skirt = new THREE.Mesh(skirtG, new THREE.MeshToonMaterial({ color: COL.navy, gradientMap: gradMap(), side: THREE.DoubleSide }));
  addOutline(skirt, 0.004);
  hips.add(skirt);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.252, 0.008, 6, 48), tealGlowM);
  hem.rotation.x = Math.PI / 2; hem.position.y = -0.16;
  hips.add(hem);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.016, 6, 24), blackM);
  belt.rotation.x = Math.PI / 2; belt.position.y = 0.055;
  hips.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.02), bootWM);
  buckle.position.set(0, 0.055, 0.15);
  hips.add(buckle);

  // ---------- spine / chest ----------
  const spine = J.spine = new THREE.Group();
  spine.position.set(0, 0.10, 0);
  hips.add(spine);
  const chest = J.chest = new THREE.Group();
  chest.position.set(0, 0.15, 0);
  spine.add(chest);

  // torso: open jacket over a black crop top, bare midriff
  const torsoPts = [
    new THREE.Vector2(0.126, -0.12),
    new THREE.Vector2(0.124, -0.08),
    new THREE.Vector2(0.132, -0.01),
    new THREE.Vector2(0.126, 0.05),
    new THREE.Vector2(0.097, 0.10),
    new THREE.Vector2(0.056, 0.125),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoPts, 20), jacketM);
  addOutline(torso, 0.004);
  chest.add(torso);
  // crop top
  const crop = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.112, -0.21), new THREE.Vector2(0.117, -0.115),
  ], 18), blackM);
  chest.add(crop);
  // midriff skin
  const mid = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0.104, -0.245), new THREE.Vector2(0.111, -0.205),
  ], 16), skinM);
  chest.add(mid);
  // jacket zipper + chest gem
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.17, 0.010), tealGlowM);
  zip.position.set(0, -0.03, 0.128);
  zip.rotation.x = 0.06;
  chest.add(zip);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.016), tealGlowM);
  gem.position.set(0, 0.065, 0.115);
  chest.add(gem);
  // collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.02, 8, 20), navyM);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.125;
  chest.add(collar);

  // ---------- arms ----------
  function buildArm(side) { // side: +1 left(+X), -1 right(-X)
    const sh = new THREE.Group();
    sh.position.set(side * 0.133, 0.07, 0);
    chest.add(sh);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 12), jacketM);
    puff.scale.set(1, 0.9, 1);
    addOutline(puff, 0.004);
    sh.add(puff);
    sh.add(limbMesh(0.052, 0.20, jacketM, 0.85));
    const elb = new THREE.Group();
    elb.position.set(0, -0.235, 0);
    sh.add(elb);
    elb.add(limbMesh(0.046, 0.17, jacketM, 0.8));
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 6, 16), navyM);
    cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.185;
    elb.add(cuff);
    const wrist = new THREE.Group();
    wrist.position.set(0, -0.21, 0);
    elb.add(wrist);
    const hand = capsule(0.032, 0.045, blackM); // fingerless glove
    hand.position.y = -0.045;
    addOutline(hand, 0.003);
    wrist.add(hand);
    const fingers = capsule(0.026, 0.03, skinM);
    fingers.position.y = -0.095;
    wrist.add(fingers);
    return { sh, elb, wrist };
  }
  const armL = buildArm(1), armR = buildArm(-1);
  J.shL = armL.sh; J.elbL = armL.elb; J.wrL = armL.wrist;
  J.shR = armR.sh; J.elbR = armR.elb; J.wrR = armR.wrist;
  // rest: near-T pose
  J.shL.rotation.z = 1.32;
  J.shR.rotation.z = -1.32;

  // ---------- neck / head ----------
  const neck = J.neck = new THREE.Group();
  neck.position.set(0, 0.15, 0);
  chest.add(neck);
  const neckM = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.09, 12), skinM);
  neckM.position.y = 0.02;
  neck.add(neckM);

  const head = J.head = new THREE.Group();
  head.position.set(0, 0.075, 0);
  neck.add(head);

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 40, 32),
    new THREE.MeshToonMaterial({ map: makeFaceTexture(), gradientMap: gradMap() })
  );
  headMesh.position.set(0, 0.10, 0.005);
  headMesh.scale.set(0.94, 1.02, 0.97);
  addOutline(headMesh, 0.004);
  head.add(headMesh);

  // hair cap: back+top shell, open at the face
  const capG = new THREE.SphereGeometry(0.178, 36, 28, Math.PI * 0.62, Math.PI * 1.76, 0, Math.PI * 0.72);
  const cap = new THREE.Mesh(capG, hairSolidM);
  cap.position.set(0, 0.108, -0.008);
  cap.scale.set(0.98, 1.06, 1.02);
  cap.material.side = THREE.DoubleSide;
  addOutline(cap, 0.004);
  head.add(cap);

  // bangs: tapered cones across the forehead
  const bangGeo = new THREE.ConeGeometry(0.035, 0.16, 8);
  const bangPos = [-0.10, -0.05, 0, 0.05, 0.10];
  bangPos.forEach((bx, i) => {
    const b = new THREE.Mesh(bangGeo, hairSolidM);
    b.position.set(bx, 0.155, 0.128 - Math.abs(bx) * 0.35);
    b.rotation.x = Math.PI + 0.35;           // point down along face
    b.rotation.z = (i - 2) * 0.12;
    b.scale.set(1, 1, 0.5);
    head.add(b);
  });
  // side locks framing the face
  for (const s of [-1, 1]) {
    const lock = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.34, 8), hairSolidM);
    lock.position.set(s * 0.148, 0.02, 0.075);
    lock.rotation.x = Math.PI;
    lock.scale.set(1, 1, 0.55);
    head.add(lock);
  }
  // ahoge
  const ahoge = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 14, Math.PI * 1.2), hairSolidM);
  ahoge.position.set(0.01, 0.272, 0.01);
  ahoge.rotation.set(0.5, 0.2, 0.9);
  head.add(ahoge);

  // twintails: 4-segment chains with silver->teal gradient
  function buildTail(side) {
    const joints = [];
    let parent = head;
    let px = side * 0.150, py = 0.21, pz = -0.05;
    const lens = [0.17, 0.16, 0.15, 0.13];
    const rads = [0.060, 0.048, 0.036, 0.024];
    const bows = [0.34, 0.14, 0.08, 0.05];
    for (let i = 0; i < 4; i++) {
      const j = new THREE.Group();
      j.position.set(px, py, pz);
      parent.add(j);
      const pts = [
        new THREE.Vector2(rads[i], 0),
        new THREE.Vector2(rads[i] * 0.95, -lens[i] * 0.5),
        new THREE.Vector2(rads[i] * 0.55, -lens[i] * 0.9),
        new THREE.Vector2(0.004, -lens[i]),
      ];
      const g = new THREE.LatheGeometry(pts, 12);
      gradColorize(g, COL.hairTop, COL.hairTip, 0, -lens[i]);
      const seg = new THREE.Mesh(g, hairM);
      seg.material.side = THREE.DoubleSide;
      j.add(seg);
      j.rotation.z = side * bows[i];
      j.rotation.x = 0.12;
      joints.push(j);
      parent = j; px = 0; py = -lens[i]; pz = 0;
    }
    // hair clip at the root
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.03), blackM);
    clip.position.set(side * 0.150, 0.235, -0.04);
    clip.rotation.z = side * 0.3;
    head.add(clip);
    const gem = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.032), tealGlowM);
    gem.position.set(side * 0.152, 0.235, -0.038);
    gem.rotation.z = side * 0.3;
    head.add(gem);
    return joints;
  }
  J.tailL = buildTail(1);
  J.tailR = buildTail(-1);

  // ---------- legs ----------
  function buildLeg(side) {
    const thigh = new THREE.Group();
    thigh.position.set(side * 0.092, -0.03, 0);
    hips.add(thigh);
    // skin top, then black thigh-high stocking
    const skinTop = limbMesh(0.072, 0.13, skinM, 0.95);
    thigh.add(skinTop);
    const stocking = limbMesh(0.066, 0.26, blackM, 0.85);
    stocking.position.y = -0.12;
    thigh.add(stocking);
    const sockRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 6, 16), tealGlowM);
    sockRing.rotation.x = Math.PI / 2;
    sockRing.position.y = -0.125;
    thigh.add(sockRing);
    const knee = new THREE.Group();
    knee.position.set(0, -0.40, 0);
    thigh.add(knee);
    knee.add(limbMesh(0.056, 0.30, blackM, 0.78));      // boot shaft
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.26, 0.008), tealGlowM);
    stripe.position.set(0, -0.15, 0.052);
    knee.add(stripe);
    const ank = new THREE.Group();
    ank.position.set(0, -0.37, 0);
    knee.add(ank);
    // armored shoe
    const shoe = new THREE.Group();
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.03, 0.17), blackM);
    sole.position.set(0, -0.095, 0.03);
    shoe.add(sole);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.14), bootWM);
    upper.position.set(0, -0.05, 0.025);
    addOutline(upper, 0.003);
    shoe.add(upper);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), bootWM);
    toe.scale.set(0.95, 0.7, 1.1);
    toe.position.set(0, -0.065, 0.10);
    shoe.add(toe);
    const shinPlate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.02), bootWM);
    shinPlate.position.set(0, 0.01, 0.045);
    shoe.add(shinPlate);
    const heelGlow = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.008, 0.10), tealGlowM);
    heelGlow.position.set(0, -0.083, 0.02);
    shoe.add(heelGlow);
    ank.add(shoe);
    return { thigh, knee, ank };
  }
  const legL = buildLeg(1), legR = buildLeg(-1);
  J.thL = legL.thigh; J.knL = legL.knee; J.anL = legL.ank;
  J.thR = legR.thigh; J.knR = legR.knee; J.anR = legR.ank;

  // garter strap on right thigh (from the sheet)
  const garter = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.010, 6, 16), blackM);
  garter.rotation.x = Math.PI / 2;
  garter.position.y = -0.08;
  J.thR.add(garter);

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });

  return { root, J };
}
