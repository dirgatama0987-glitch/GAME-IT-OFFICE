// Model orang yang lebih realistis: sendi (pinggul, lutut, bahu, siku), leher, wajah, rambut, pakaian
import * as THREE from 'three';

const cache = new Map();
const L = (c) => {
  let m = cache.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); cache.set(c, m); }
  return m;
};

export const SKINS = [0xf1c9a5, 0xe0b48a, 0xc68f63, 0x9a6a47, 0x6f4a32];
export const HAIRS = [0x1a1410, 0x2a1d14, 0x4a2f1a, 0x6b4a2a, 0x8a8a8a];
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function mesh(parent, geo, color, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, L(color));
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
const ball = (r) => new THREE.SphereGeometry(r, 14, 10);

// tinggi sekitar 1,75 m, menghadap -z
export function createPerson(o = {}) {
  const { shirt = 0x2f6fd0, pants = 0x28303d, hair = 0x2a1d14, skin = 0xf1c9a5, style = 'short', tie = null, shoe = 0x1b1e24 } = o;
  const g = new THREE.Group();
  const HIP = 0.93;

  // badan
  mesh(g, cap(0.17, 0.2), shirt, 0, 1.2, 0, 1.18, 1, 0.74);                              // dada
  mesh(g, cap(0.16, 0.08), pants, 0, 0.97, 0, 1.15, 1, 0.78);                            // panggul
  mesh(g, new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skin, 0, 1.5, 0);            // leher
  if (tie) {
    mesh(g, new THREE.BoxGeometry(0.05, 0.22, 0.02), tie, 0, 1.26, -0.125);
    mesh(g, ball(0.03), tie, 0, 1.37, -0.12);
  }

  // kepala dan wajah
  const head = new THREE.Group();
  head.position.set(0, 1.63, 0);
  g.add(head);
  mesh(head, new THREE.SphereGeometry(0.115, 20, 14), skin, 0, 0, 0, 0.95, 1.12, 1);
  [-1, 1].forEach((s) => {
    mesh(head, ball(0.014), 0x14171c, s * 0.042, 0.015, -0.104);                         // mata
    mesh(head, new THREE.BoxGeometry(0.04, 0.008, 0.01), hair, s * 0.042, 0.045, -0.108); // alis
    mesh(head, ball(0.02), skin, s * 0.112, 0, 0);                                       // telinga
  });
  mesh(head, ball(0.018), skin, 0, -0.012, -0.118, 1, 1, 1.1);                           // hidung
  mesh(head, new THREE.BoxGeometry(0.04, 0.007, 0.01), 0x7a3b3b, 0, -0.05, -0.108);      // mulut
  if (style !== 'bald') {
    mesh(head, new THREE.SphereGeometry(0.122, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 0.012, 0.008, 0.97, 1.1, 1.02);
  }
  if (style === 'long') mesh(head, cap(0.11, 0.16), hair, 0, -0.1, 0.07, 1, 1, 0.7);
  if (style === 'bun') mesh(head, ball(0.05), hair, 0, 0.1, 0.07);

  // lengan: bahu -> siku -> tangan
  const arm = (side) => {
    const sh = new THREE.Group();
    sh.position.set(side * 0.235, 1.42, 0);
    g.add(sh);
    mesh(sh, ball(0.07), shirt, 0, 0, 0);
    const up = cap(0.052, 0.22); up.translate(0, -0.18, 0);
    mesh(sh, up, shirt, 0, 0, 0);
    const el = new THREE.Group();
    el.position.set(0, -0.31, 0);
    sh.add(el);
    const fore = cap(0.042, 0.2); fore.translate(0, -0.15, 0);
    mesh(el, fore, skin, 0, 0, 0);
    mesh(el, ball(0.05), skin, 0, -0.33, 0);                                             // tangan
    return { sh, el };
  };
  // kaki: pinggul -> lutut -> sepatu
  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.09, HIP, 0);
    g.add(hip);
    const th = cap(0.085, 0.3); th.translate(0, -0.235, 0);
    mesh(hip, th, pants, 0, 0, 0);
    const knee = new THREE.Group();
    knee.position.set(0, -0.45, 0);
    hip.add(knee);
    const sn = cap(0.068, 0.3); sn.translate(0, -0.22, 0);
    mesh(knee, sn, pants, 0, 0, 0);
    mesh(knee, new THREE.BoxGeometry(0.1, 0.07, 0.26), shoe, 0, -0.44, -0.05);
    return { hip, knee };
  };
  const aL = arm(-1), aR = arm(1), lL = leg(-1), lR = leg(1);
  return { group: g, head, hipL: lL.hip, hipR: lR.hip, kneeL: lL.knee, kneeR: lR.knee, shL: aL.sh, shR: aR.sh, elL: aL.el, elR: aR.el };
}

// berjalan: a = 0 (diam) sampai 1+ (berlari)
export function walkPose(r, t, a) {
  const s = Math.sin(t);
  r.hipL.rotation.x = s * 0.55 * a;
  r.hipR.rotation.x = -s * 0.55 * a;
  r.kneeL.rotation.x = -Math.max(0, Math.sin(t + 1.2)) * 0.7 * a;
  r.kneeR.rotation.x = -Math.max(0, Math.sin(t + 1.2 + Math.PI)) * 0.7 * a;
  r.shL.rotation.x = -s * 0.45 * a;
  r.shR.rotation.x = s * 0.45 * a;
  r.elL.rotation.x = 0.12 + 0.3 * a * (1 - s) / 2;
  r.elR.rotation.x = 0.12 + 0.3 * a * (1 + s) / 2;
}

export function standPose(r) {
  r.hipL.rotation.x = r.hipR.rotation.x = 0;
  r.kneeL.rotation.x = r.kneeR.rotation.x = 0;
  r.shL.rotation.x = r.shR.rotation.x = 0;
  r.elL.rotation.x = r.elR.rotation.x = 0.12;
}

// duduk: paha ke depan, betis ke bawah; tangan mengetik bila t diberikan
export function sitPose(r, t) {
  r.hipL.rotation.x = r.hipR.rotation.x = 1.45;
  r.kneeL.rotation.x = r.kneeR.rotation.x = -1.45;
  const sway = t == null ? 0 : Math.sin(t * 9) * 0.07;
  r.shL.rotation.x = 0.7 + sway;
  r.shR.rotation.x = 0.7 - sway;
  r.elL.rotation.x = r.elR.rotation.x = t == null ? 0.5 : 1.0;
}
