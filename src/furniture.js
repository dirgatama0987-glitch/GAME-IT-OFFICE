// Model 3D furnitur fungsional yang detail (semua punya kegunaan di game)
import * as THREE from 'three';

const cache = new Map();
const L = (c) => {
  let m = cache.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); cache.set(c, m); }
  return m;
};
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
  box(g, w + 0.04, 0.05, d + 0.04, color, 0, h - 0.025, 0);
  box(g, 0.05, h - 0.05, d - 0.1, side, -(w / 2 - 0.05), (h - 0.05) / 2, 0);
  box(g, 0.05, h - 0.05, d - 0.1, side, w / 2 - 0.05, (h - 0.05) / 2, 0);
  box(g, w - 0.1, (h - 0.05) * 0.6, 0.03, side, 0, h * 0.62, -(d / 2 - 0.06));
  if (w > 1.2) {
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
  cyl(g, 0.12, 0.14, 0.02, 0x2b2f36, 0, 0.01, 0);
  box(g, 0.05, 0.2, 0.04, 0x2b2f36, 0, 0.12, 0);
  box(g, 0.66, 0.42, 0.035, 0x14171c, 0, 0.36, 0);
  const screen = add(g, new THREE.PlaneGeometry(0.6, 0.35), BM(0x15181d), 0, 0.36, 0.019);
  box(g, 0.42, 0.02, 0.14, 0x2b2f36, 0, 0.01, 0.28);
  [0.24, 0.28, 0.32].forEach((z) => box(g, 0.38, 0.004, 0.025, 0x4a505b, 0, 0.022, z));
  sph(g, 0.035, 0x2b2f36, 0.32, 0.015, 0.28, 1, 0.5, 1.5);
  cyl(g, 0.04, 0.035, 0.08, 0xf2f2f2, -0.38, 0.04, 0.15, 16);
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

// komputer kerja: meja, monitor, keyboard, CPU, dan kursi (tempat Programmer)
export function buildWorkstation(w, d, h, color = 0x9aa3b2) {
  const g = buildDesk(w, d, h, color);
  const sub = new THREE.Group();
  sub.position.set(0, h, -0.15);
  const screen = attachComputer(sub);
  g.add(sub);
  box(g, 0.2, 0.45, 0.45, 0x1b1e24, -(w / 2 - 0.3), 0.225, -0.05);
  glow(g, 0.02, 0.02, 0.01, 0x39d98a, -(w / 2 - 0.3), 0.4, 0.18);
  const chair = buildChair();
  chair.position.set(0, 0, 0.95);
  chair.rotation.y = Math.PI;
  g.add(chair);
  return { group: g, screen };
}

// Design Station: dua monitor, tablet gambar, lampu meja, dan kursi (tempat Designer)
export function buildDesignStation(w, d, h) {
  const g = buildDesk(w, d, h, 0x6a7380);
  const sub = new THREE.Group();
  sub.position.set(-0.3, h, -0.15);
  const screen = attachComputer(sub);
  g.add(sub);
  const m2 = new THREE.Group();
  m2.position.set(0.5, h, -0.15);
  g.add(m2);
  cyl(m2, 0.12, 0.14, 0.02, 0x2b2f36, 0, 0.01, 0);
  box(m2, 0.05, 0.2, 0.04, 0x2b2f36, 0, 0.12, 0);
  box(m2, 0.66, 0.42, 0.035, 0x14171c, 0, 0.36, 0);
  glow(m2, 0.6, 0.35, 0.002, 0x6a5acd, 0, 0.36, 0.019);
  box(g, 0.38, 0.012, 0.26, 0x20242b, 0.55, h + 0.006, 0.2);
  glow(g, 0.3, 0.002, 0.18, 0x3a3f4a, 0.55, h + 0.013, 0.2);
  const pen = cyl(g, 0.006, 0.006, 0.16, 0xc9ccd2, 0.3, h + 0.012, 0.3, 8);
  pen.rotation.z = Math.PI / 2;
  cyl(g, 0.06, 0.07, 0.02, 0x20242b, -0.8, h + 0.01, -0.2);
  box(g, 0.015, 0.3, 0.015, 0x20242b, -0.8, h + 0.16, -0.2);
  cyl(g, 0.01, 0.06, 0.07, 0xf1d27a, -0.8, h + 0.33, -0.12);
  box(g, 0.2, 0.45, 0.45, 0x1b1e24, -(w / 2 - 0.3), 0.225, -0.05);
  const chair = buildChair();
  chair.position.set(0, 0, 0.95);
  chair.rotation.y = Math.PI;
  g.add(chair);
  return { group: g, screen };
}

export function buildPrinter() {
  const g = new THREE.Group();
  box(g, 0.7, 0.04, 0.55, 0x8a6a4a, 0, 0.5, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(g, 0.05, 0.5, 0.05, 0x4a505b, sx * 0.3, 0.25, sz * 0.23));
  box(g, 0.55, 0.22, 0.4, 0xe6e8ec, 0, 0.63, 0);
  box(g, 0.55, 0.04, 0.4, 0xc9ccd2, 0, 0.76, 0);
  box(g, 0.4, 0.01, 0.2, 0xffffff, 0, 0.55, 0.26);
  glow(g, 0.06, 0.02, 0.01, 0x39d98a, 0.2, 0.68, 0.205);
  box(g, 0.3, 0.01, 0.16, 0xffffff, 0, 0.79, -0.05);
  return g;
}

export function buildCoffee() {
  const g = new THREE.Group();
  box(g, 0.5, 0.8, 0.5, 0xb08968, 0, 0.4, 0);
  box(g, 0.52, 0.04, 0.52, 0x6b4a2f, 0, 0.82, 0);
  box(g, 0.34, 0.42, 0.34, 0x20242b, 0, 1.04, -0.04);
  box(g, 0.34, 0.06, 0.12, 0x3a3f4a, 0, 1.2, 0.12);
  cyl(g, 0.012, 0.012, 0.06, 0xc9ccd2, 0, 1.15, 0.16, 8);
  cyl(g, 0.04, 0.035, 0.08, 0xf2f2f2, 0, 0.9, 0.15, 14);
  glow(g, 0.05, 0.03, 0.01, 0xff7a3d, 0.1, 1.1, 0.14);
  cyl(g, 0.1, 0.12, 0.18, 0xb0b6bd, 0, 1.35, -0.05, 16);
  return g;
}

export function buildAC() {
  const g = new THREE.Group();
  box(g, 0.55, 1.7, 0.35, 0xeceff3, 0, 0.9, 0);
  box(g, 0.6, 0.06, 0.4, 0xc9ccd2, 0, 0.03, 0);
  for (let i = 0; i < 8; i++) box(g, 0.44, 0.012, 0.01, 0x9aa3ab, 0, 1.15 + i * 0.05, 0.18);
  glow(g, 0.12, 0.05, 0.01, 0x4fb3ff, 0, 1.6, 0.18);
  box(g, 0.3, 0.2, 0.01, 0xd8dce1, 0, 0.5, 0.18);
  return g;
}

export function buildArchive() {
  const g = new THREE.Group();
  box(g, 0.9, 1.5, 0.45, 0x6e7480, 0, 0.75, 0);
  for (let i = 0; i < 4; i++) {
    const y = 0.25 + i * 0.35;
    box(g, 0.84, 0.3, 0.02, 0x7b8290, 0, y, 0.235);
    glow(g, 0.16, 0.02, 0.03, 0xc9ccd2, 0, y + 0.05, 0.26);
    box(g, 0.14, 0.06, 0.005, 0xf4f1e8, 0, y - 0.05, 0.248);
  }
  return g;
}

export function buildWhiteboard() {
  const g = new THREE.Group();
  box(g, 1.4, 0.95, 0.04, 0x4a505b, 0, 1.3, 0);
  box(g, 1.32, 0.87, 0.02, 0xf7f9fb, 0, 1.3, 0.015);
  [[-0.35, 1.45, 0.4, 0xd9534f], [-0.2, 1.3, 0.55, 0x3a7bd5], [0.2, 1.15, 0.5, 0x2e8b4e]].forEach(([x, y, w, c]) => glow(g, w, 0.015, 0.004, c, x, y, 0.028));
  box(g, 0.05, 1.7, 0.05, 0x4a505b, -0.65, 0.85, 0);
  box(g, 0.05, 1.7, 0.05, 0x4a505b, 0.65, 0.85, 0);
  box(g, 1.3, 0.04, 0.2, 0x4a505b, 0, 0.1, 0);
  box(g, 1.0, 0.03, 0.08, 0x9aa3ab, 0, 0.8, 0.06);
  return g;
}

export function buildGenerator() {
  const g = new THREE.Group();
  box(g, 1.0, 0.7, 0.55, 0x3f6f4f, 0, 0.45, 0);
  box(g, 1.04, 0.08, 0.59, 0x20242b, 0, 0.08, 0);
  for (let i = 0; i < 6; i++) box(g, 0.5, 0.02, 0.01, 0x20242b, -0.2, 0.3 + i * 0.07, 0.28);
  cyl(g, 0.12, 0.12, 0.3, 0x4a505b, 0.3, 0.95, 0.05, 16);
  cyl(g, 0.05, 0.05, 0.3, 0x20242b, 0.35, 1.0, -0.1, 10);
  glow(g, 0.05, 0.05, 0.01, 0xffb020, 0.38, 0.5, 0.28);
  return g;
}

// bilik lift: pintu menghadap barat (-x)
export function buildLift() {
  const g = new THREE.Group();
  box(g, 1.4, 3.0, 2.6, 0x9aa3ab, 0, 1.5, 0);
  box(g, 0.04, 2.4, 1.0, 0xc2c8ce, -0.71, 1.2, -0.5);
  box(g, 0.04, 2.4, 1.0, 0xc2c8ce, -0.71, 1.2, 0.5);
  box(g, 0.05, 0.3, 0.6, 0x20242b, -0.72, 2.7, 0);
  glow(g, 0.01, 0.1, 0.3, 0xff3d3d, -0.755, 2.7, 0);
  box(g, 0.05, 0.3, 0.1, 0x20242b, -0.72, 1.2, 1.15);
  glow(g, 0.01, 0.06, 0.04, 0x4fb3ff, -0.755, 1.25, 1.15);
  return g;
}
