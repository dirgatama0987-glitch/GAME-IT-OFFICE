// Model 3D furnitur dengan detail: bentuk bulat, laci, gagang, lampu LED, dan lain-lain
import * as THREE from 'three';

const L = (c) => new THREE.MeshLambertMaterial({ color: c });
const BM = (c) => new THREE.MeshBasicMaterial({ color: c });
const dk = (c, f = 0.7) => (((c >> 16) & 255) * f << 16) | (((c >> 8) & 255) * f << 8) | ((c & 255) * f);

function add(g, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}
const box = (g, w, h, d, c, x, y, z) => add(g, new THREE.BoxGeometry(w, h, d), L(c), x, y, z);
const glow = (g, w, h, d, c, x, y, z) => add(g, new THREE.BoxGeometry(w, h, d), BM(c), x, y, z);
const cyl = (g, rt, rb, h, c, x, y, z, seg = 20) => add(g, new THREE.CylinderGeometry(rt, rb, h, seg), L(c), x, y, z);
function sph(g, r, c, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = add(g, new THREE.SphereGeometry(r, 16, 12), L(c), x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

// meja: permukaan setinggi h, panel samping, panel belakang, laci dengan gagang
export function buildDesk(w, d, h, color = 0x8a6a4a) {
  const g = new THREE.Group();
  const side = dk(color, 0.8);
  box(g, w + 0.04, 0.05, d + 0.04, color, 0, h - 0.025, 0);                       // papan atas
  box(g, 0.05, h - 0.05, d - 0.1, side, -(w / 2 - 0.05), (h - 0.05) / 2, 0);      // panel kiri
  box(g, 0.05, h - 0.05, d - 0.1, side, w / 2 - 0.05, (h - 0.05) / 2, 0);         // panel kanan
  box(g, w - 0.1, (h - 0.05) * 0.6, 0.03, side, 0, h * 0.62, -(d / 2 - 0.06));    // panel belakang
  if (w > 1.2) {                                                                  // unit laci
    const cx = w / 2 - 0.32, fz = d / 2 - 0.06;
    box(g, 0.5, h * 0.62, d - 0.12, dk(color, 0.9), cx, h * 0.34, 0);
    [0.2, 0.42].forEach((y) => {
      box(g, 0.44, h * 0.26, 0.02, color, cx, y * h / 0.75 * 0.9 + 0.04, fz + 0.012);
      glow(g, 0.14, 0.018, 0.02, 0xc9ccd2, cx, y * h / 0.75 * 0.9 + 0.1, fz + 0.03);
    });
  }
  return g;
}

// kursi kantor: dudukan bulat, sandaran miring, tiang, kaki bintang, roda
export function buildChair() {
  const g = new THREE.Group();
  const c = 0x2f3a4a;
  cyl(g, 0.24, 0.22, 0.08, c, 0, 0.48, 0, 24);
  const back = box(g, 0.42, 0.5, 0.06, c, 0, 0.78, -0.2);
  back.rotation.x = -0.12;
  cyl(g, 0.03, 0.03, 0.3, 0x6b7280, 0, 0.3, 0, 10);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    const spoke = box(g, 0.3, 0.03, 0.05, 0x20242b, Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15);
    spoke.rotation.y = -a;
    sph(g, 0.035, 0x0d0f12, Math.cos(a) * 0.3, 0.035, Math.sin(a) * 0.3);
  }
  box(g, 0.05, 0.03, 0.28, 0x20242b, -0.24, 0.62, 0);
  box(g, 0.05, 0.03, 0.28, 0x20242b, 0.24, 0.62, 0);
  return g;
}

// monitor + keyboard + mouse + gelas; mengembalikan mesh layar (untuk menyala/mati)
export function attachComputer(g) {
  cyl(g, 0.12, 0.14, 0.02, 0x2b2f36, 0, 0.01, 0);                          // dudukan
  box(g, 0.05, 0.2, 0.04, 0x2b2f36, 0, 0.12, 0);                           // leher
  box(g, 0.66, 0.42, 0.035, 0x14171c, 0, 0.36, 0);                         // bingkai
  const screen = add(g, new THREE.PlaneGeometry(0.6, 0.35), BM(0x15181d), 0, 0.36, 0.019);
  box(g, 0.42, 0.02, 0.14, 0x2b2f36, 0, 0.01, 0.28);                       // keyboard
  [0.24, 0.28, 0.32].forEach((z) => box(g, 0.38, 0.004, 0.025, 0x4a505b, 0, 0.022, z));
  sph(g, 0.035, 0x2b2f36, 0.32, 0.015, 0.28, 1, 0.5, 1.5);                 // mouse
  cyl(g, 0.04, 0.035, 0.08, 0xf2f2f2, -0.38, 0.04, 0.15, 16);              // gelas
  return screen;
}

// rak server: unit-unit dengan lampu LED, ventilasi, kipas
export function buildServer(w, h, d) {
  const g = new THREE.Group();
  box(g, w, h, d, 0x20242b, 0, h / 2, 0);
  box(g, w + 0.02, 0.08, d + 0.02, 0x0d0f12, 0, 0.04, 0);
  const n = Math.floor((h - 0.3) / 0.2);
  for (let i = 0; i < n; i++) {
    const y = 0.22 + i * 0.2;
    box(g, w - 0.1, 0.14, 0.02, 0x2f343d, 0, y, d / 2 + 0.005);
    box(g, w - 0.34, 0.02, 0.01, 0x0d0f12, 0.06, y, d / 2 + 0.018);
    glow(g, 0.03, 0.03, 0.01, i % 3 === 1 ? 0xffb020 : 0x39d98a, -w / 2 + 0.11, y, d / 2 + 0.02);
  }
  cyl(g, 0.12, 0.12, 0.02, 0x0d0f12, 0, h + 0.01, 0);
  return g;
}

// tanaman pot
export function buildPlant() {
  const g = new THREE.Group();
  cyl(g, 0.2, 0.15, 0.3, 0xb5651d, 0, 0.15, 0);
  cyl(g, 0.19, 0.19, 0.02, 0x3b2a1a, 0, 0.31, 0);
  const greens = [0x2e8b4e, 0x3fa35f, 0x237a45];
  for (let i = 0; i < 7; i++) {
    const a = (i * Math.PI * 2) / 7;
    sph(g, 0.16, greens[i % 3], Math.cos(a) * 0.12, 0.55 + (i % 3) * 0.13, Math.sin(a) * 0.12, 1, 1.6, 1);
  }
  sph(g, 0.2, 0x2e8b4e, 0, 0.9, 0, 1, 1.3, 1);
  return g;
}

// lemari dengan dua pintu dan gagang
export function buildCabinet(w = 1.0, h = 1.8, d = 0.5) {
  const g = new THREE.Group();
  box(g, w, h, d, 0x6e7480, 0, h / 2, 0);
  box(g, w + 0.02, 0.08, d + 0.02, 0x4a505b, 0, 0.04, 0);
  [-1, 1].forEach((s) => {
    box(g, w / 2 - 0.03, h - 0.2, 0.02, 0x7b8290, s * (w / 4), h / 2 + 0.02, d / 2 + 0.011);
    glow(g, 0.02, 0.22, 0.03, 0xc9ccd2, s * 0.05, h / 2, d / 2 + 0.035);
  });
  return g;
}

// sofa dengan bantalan dan lengan bulat
export function buildSofa(w = 1.8, d = 0.8, h = 0.85) {
  const g = new THREE.Group();
  const c = 0x3d4f6b, cu = 0x4a5f80;
  box(g, w - 0.2, 0.25, d, c, 0, 0.2, 0);
  box(g, (w - 0.4) / 2, 0.14, d - 0.25, cu, -(w - 0.4) / 4, 0.4, 0.07);
  box(g, (w - 0.4) / 2, 0.14, d - 0.25, cu, (w - 0.4) / 4, 0.4, 0.07);
  box(g, w - 0.2, h - 0.4, 0.2, c, 0, 0.2 + (h - 0.4) / 2 + 0.05, -d / 2 + 0.1);
  [-1, 1].forEach((s) => {
    const arm = cyl(g, 0.12, 0.12, d, c, s * (w / 2 - 0.1), 0.42, 0, 20);
    arm.rotation.x = Math.PI / 2;
    box(g, 0.2, 0.3, d - 0.05, c, s * (w / 2 - 0.1), 0.15, 0);
  });
  return g;
}
