// Procedural FK animations. Each returns joint rotation offsets applied on top of rest pose.
// Convention: offsets are {jointName: {x,y,z}} added to the joint's rest euler.
export function computePose(name, t) {
  const P = {};
  const set = (j, x = 0, y = 0, z = 0) => { P[j] = { x, y, z }; };
  const TAU = Math.PI * 2;

  if (name === 'idle') {
    const b = Math.sin(t * 2.0);
    set('chest', 0.02 + b * 0.015);
    set('head', Math.sin(t * 0.9) * 0.03, Math.sin(t * 0.55) * 0.06);
    set('shL', 0, 0, Math.sin(t * 2.0) * 0.02 - 0.12);
    set('shR', 0, 0, -Math.sin(t * 2.0) * 0.02 + 0.12);
    set('elbL', 0, 0, -0.08);
    set('elbR', 0, 0, 0.08);
    set('hips', 0, Math.sin(t * 0.4) * 0.02);
  }

  if (name === 'walk' || name === 'run') {
    const run = name === 'run';
    const f = run ? 9.5 : 5.2;
    const A = run ? 0.85 : 0.5;        // thigh swing
    const K = run ? 1.15 : 0.65;       // knee bend
    const lean = run ? 0.28 : 0.06;
    const w = t * f;
    const sL = Math.sin(w), sR = Math.sin(w + Math.PI);
    set('thL', -sL * A - lean * 0.3);
    set('thR', -sR * A - lean * 0.3);
    set('knL', Math.max(0, Math.sin(w - 1.2)) * K + 0.08);
    set('knR', Math.max(0, Math.sin(w + Math.PI - 1.2)) * K + 0.08);
    set('anL', sL * A * 0.4);
    set('anR', sR * A * 0.4);
    set('shL', sL * A * 0.75, 0, -0.10);
    set('shR', sR * A * 0.75, 0, 0.10);
    set('elbL', 0, 0, -(run ? 0.9 : 0.25));
    set('elbR', 0, 0, (run ? 0.9 : 0.25));
    set('chest', lean, Math.sin(w) * (run ? 0.10 : 0.06));
    set('head', -lean * 0.6, Math.sin(w) * 0.04);
    set('hips', 0, Math.sin(w) * 0.09, Math.sin(w * 2) * 0.03);
    P.rootY = Math.abs(Math.sin(w)) * (run ? 0.055 : 0.028);
  }

  if (name === 'jump') {
    const T = 1.4, ph = (t % T) / T;   // 0..1
    // crouch 0-0.25, air 0.25-0.6, land 0.6-0.8, recover 0.8-1
    let crouch = 0, air = 0;
    if (ph < 0.25) crouch = Math.sin(ph / 0.25 * Math.PI / 2);
    else if (ph < 0.6) { const a = (ph - 0.25) / 0.35; air = Math.sin(a * Math.PI); }
    else if (ph < 0.8) crouch = Math.sin((1 - (ph - 0.6) / 0.2) * Math.PI / 2) * 0.7;
    set('thL', -crouch * 1.1 - air * 0.7);
    set('thR', -crouch * 1.1 - air * 0.7);
    set('knL', crouch * 1.6 + air * 1.3);
    set('knR', crouch * 1.6 + air * 1.3);
    set('anL', crouch * 0.5 - air * 0.45);
    set('anR', crouch * 0.5 - air * 0.45);
    set('chest', crouch * 0.35 - air * 0.12);
    set('shL', crouch * 0.4, 0, -crouch * 0.2 + air * 1.35);
    set('shR', crouch * 0.4, 0, crouch * 0.2 - air * 1.35);
    set('head', -crouch * 0.15 + air * 0.08);
    P.rootY = -crouch * 0.16 + air * 0.30;
  }

  if (name === 'wave') {
    const w = t * 6;
    set('shR', 0, 0, -1.35);                       // arm up
    set('elbR', 0, 0, 0.35 + 0.3 * Math.sin(w));
    set('wrR', 0, 0, 0);
    set('head', 0.06, -0.12, 0.10);
    set('shL', 0, 0, -0.15);
    set('elbL', 0, 0, -0.2);
    set('chest', 0, -0.06);
    set('hips', 0, 0, Math.sin(w * 0.5) * 0.02);
    P.rootY = Math.abs(Math.sin(w * 0.5)) * 0.012;
  }

  if (name === 'dance') {
    const w = t * 7.0;
    const s = Math.sin(w), c = Math.sin(w * 0.5);
    set('hips', 0, Math.sin(w * 0.5) * 0.35, s * 0.12);
    set('chest', 0.05, Math.sin(w * 0.5 + 0.6) * 0.25, -s * 0.10);
    set('head', 0, 0, s * 0.14);
    set('shL', 0, 0, 1.30 + s * 0.35);
    set('shR', 0, 0, -1.30 + s * 0.35);
    set('elbL', 0, 0, -0.5 - Math.max(0, s) * 0.4);
    set('elbR', 0, 0, 0.5 + Math.max(0, -s) * 0.4);
    set('thL', -Math.max(0, c) * 0.35);
    set('thR', -Math.max(0, -c) * 0.35);
    set('knL', Math.max(0, c) * 0.5);
    set('knR', Math.max(0, -c) * 0.5);
    P.rootY = Math.abs(s) * 0.045;
    P.rootRotY = Math.sin(w * 0.25) * 0.8;
  }

  return P;
}

// hair sway, always on; returns per-segment z/x offsets
export function hairSway(t, amp, tailCount) {
  const out = [];
  for (let i = 0; i < tailCount; i++) {
    const lag = i * 0.55;
    out.push({
      z: Math.sin(t * 2.2 - lag) * 0.045 * amp * (1 + i * 0.35),
      x: Math.cos(t * 1.7 - lag) * 0.03 * amp,
    });
  }
  return out;
}
