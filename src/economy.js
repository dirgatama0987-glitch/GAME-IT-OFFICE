// Dunia 3D: lantai dasar, ruangan, furnitur, dan lantai tambahan (gedung bertingkat)
import * as THREE from 'three';
import { buildDesk, buildChair, buildServer, buildLift } from './furniture.js';
import { FLOOR_H } from './progress.js';

export const solids = [];

// [nama, x1, z1, x2, z2, warna lantai]
export const rooms = [
  ['Reception', -16, 4, 16, 12, 0xd7c9a8],
  ['Main Workspace', -6, -12, 8, 4, 0xb8c4d6],
  ['Server Room', 8, -12, 16, -4, 0x6b7686],
  ['Development Room', 8, -4, 16, 4, 0xa9d1b8],
  ['CEO Room', -16, -12, -6, -4, 0xd9b88a],
  ['Ruang Kerja 2', -16, -4, -6, 4, 0xc9b6d9]
];

const cache = new Map();
const mat = (c) => {
  let m = cache.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c }); cache.set(c, m); }
  return m;
};

export function addBox(scene, x1, z1, x2, z2, h, color, collide = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, h, z2 - z1), mat(color));
  m.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  if (collide) solids.push({ x1, z1, x2, z2, h });
  return m;
}

// kotak di lantai tertentu: y0 = tinggi dasar, h = tebal; solid.h = tinggi atas (absolut)
function addBoxF(scene, x1, z1, x2, z2, y0, h, color, collide, fl) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, h, z2 - z1), mat(color));
  m.position.set((x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  if (collide) solids.push({ x1, z1, x2, z2, y0, h: y0 + h, fl });
  return m;
}

function wall(scene, x1, z1, x2, z2) {
  const t = 0.15, e = 0.02;
  if (z1 === z2) {
    addBox(scene, x1, z1 - t, x2, z1 + t, 3, 0xe9e4da);
    addBox(scene, x1, z1 - t - e, x2, z1 + t + e, 0.15, 0x9c9486, false);
    addBox(scene, x1, z1 - t - e, x2, z1 + t + e, 0.08, 0xcfc8b8, false);
  } else {
    addBox(scene, x1 - t, z1, x1 + t, z2, 3, 0xe9e4da);
    addBox(scene, x1 - t - e, z1, x1 + t + e, z2, 0.15, 0x9c9486, false);
    addBox(scene, x1 - t - e, z1, x1 + t + e, z2, 0.08, 0xcfc8b8, false);
  }
}

function floor(scene, x1, z1, x2, z2, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), mat(color));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
  m.receiveShadow = true;
  scene.add(m);
}

function label(scene, text, x, z, y0 = 0) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,24,31,.82)'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  s.scale.set(4, 0.75, 1);
  s.position.set(x, y0 + 2.7, z);
  scene.add(s);
}

function tree(scene, x, z, s) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.24 * s, 1.6 * s, 10), mat(0x6b4a2f));
  trunk.position.y = 0.8 * s; trunk.castShadow = true; g.add(trunk);
  [[0, 2.2, 0, 1.1, 0x2f7d3f], [0.55, 1.8, 0.3, 0.8, 0x3a9150], [-0.5, 1.9, -0.3, 0.8, 0x2a6e37]].forEach(([px, py, pz, r, c]) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r * s, 16, 12), mat(c));
    f.position.set(px * s, py * s, pz * s); f.castShadow = true; g.add(f);
  });
  g.position.set(x, 0, z);
  scene.add(g);
}

// furnitur dunia: collider kotak (tak terlihat) + model detail
function prop(scene, x1, z1, x2, z2, h, model, rotY = 0) {
  const m = addBox(scene, x1, z1, x2, z2, h, 0x888888);
  m.visible = false;
  model.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
  model.rotation.y = rotY;
  scene.add(model);
}
function propF(scene, x1, z1, x2, z2, y0, h, model, fl) {
  const m = addBoxF(scene, x1, z1, x2, z2, y0, h, 0x888888, true, fl);
  m.visible = false;
  model.position.set((x1 + x2) / 2, y0, (z1 + z2) / 2);
  scene.add(model);
}
function decor(scene, model, x, z, rotY = 0) {
  model.position.set(x, 0, z);
  model.rotation.y = rotY;
  scene.add(model);
}

export function buildWorld(scene) {
  scene.background = new THREE.Color(0xbfd8ee);
  scene.fog = new THREE.Fog(0xbfd8ee, 60, 170);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55);
  sun.position.set(20, 90, 28); // tinggi agar gedung bertingkat tetap terkena cahaya
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 220 });
  const lowEnd = matchMedia('(pointer:coarse)').matches; // HP: bayangan lebih ringan
  sun.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), mat(0x7fae6b));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);

  [[-20, -14, 1.1], [-23, 0, 1.3], [-20, 14, 1], [20, -14, 1.2], [23, 3, 1], [20, 15, 1.3],
   [-8, -18, 1.2], [9, -19, 1.1], [-10, 18, 1], [11, 18, 1.2]].forEach(([x, z, s]) => tree(scene, x, z, s));

  rooms.forEach((r) => {
    floor(scene, r[1], r[2], r[3], r[4], r[5]);
    label(scene, r[0], (r[1] + r[3]) / 2, (r[2] + r[4]) / 2);
  });

  // dinding luar (pintu masuk di selatan; celah z 6..10 di barat = pintu perluasan)
  wall(scene, -16, 12, -2, 12); wall(scene, 2, 12, 16, 12);
  wall(scene, -16, -12, 16, -12);
  wall(scene, -16, -12, -16, 6); wall(scene, -16, 10, -16, 12); wall(scene, 16, -12, 16, 12);
  // dinding dalam (celah = jalur masuk, ditutup pintu geser)
  wall(scene, -16, 4, -1, 4); wall(scene, 3, 4, 16, 4);
  [-6, 8].forEach((x) => {
    wall(scene, x, -12, x, -9); wall(scene, x, -7, x, -1); wall(scene, x, 1, x, 4);
  });
  wall(scene, -16, -4, -6, -4); wall(scene, 8, -4, 16, -4);

  // ---- furnitur dunia ----
  prop(scene, -4, 6.5, 4, 8, 1, buildDesk(8, 1.5, 1.0, 0x7a5c3a));          // meja resepsionis
  [[-4, -9, -1, -7.5], [1, -9, 4, -7.5], [-4, -3, -1, -1.5], [1, -3, 4, -1.5]].forEach((r) =>
    prop(scene, r[0], r[1], r[2], r[3], 0.8, buildDesk(3, 1.5, 0.8, 0x9aa3b2)));
  prop(scene, 11, 1.8, 15.5, 3.2, 0.8, buildDesk(4.5, 1.4, 0.8, 0x9aa3b2));  // meja developer
  prop(scene, -15, -11, -12, -9.5, 0.9, buildDesk(3, 1.5, 0.9, 0x6b4a2f));   // meja CEO
  prop(scene, 14.4, 8.6, 15.8, 11.2, 3, buildLift());                        // lift

  // dua baris rak server saling berhadapan
  addBox(scene, 14, -11.5, 15.5, -5, 2.2, 0x888888).visible = false;
  addBox(scene, 11, -11.5, 12.5, -5, 2.2, 0x888888).visible = false;
  for (let i = 0; i < 6; i++) {
    const z = -11 + i * 1.05;
    decor(scene, buildServer(0.9, 2.2, 1.2), 14.75, z, -Math.PI / 2);
    decor(scene, buildServer(0.9, 2.2, 1.2), 11.75, z, Math.PI / 2);
  }

  // kursi di meja kerja
  [[-2.5, -6.9], [2.5, -6.9], [-2.5, -0.9], [2.5, -0.9], [13.25, 3.55], [-13.5, -8.9]].forEach(([x, z]) => decor(scene, buildChair(), x, z, Math.PI));
}

export function roomAt(x, z) {
  for (const r of rooms) if (x >= r[1] && x <= r[3] && z >= r[2] && z <= r[4]) return r[0];
  return 'Di luar gedung';
}

// perluasan kantor (dibeli di Dashboard): Training Room kosong di sisi barat Reception
export const EXPANSION_ROOM = ['Training Room', -28, 1, -16, 11, 0xbfd9c9];
export function buildExpansion(scene) {
  const r = EXPANSION_ROOM;
  rooms.push(r);
  floor(scene, r[1], r[2], r[3], r[4], r[5]);
  label(scene, r[0], (r[1] + r[3]) / 2, (r[2] + r[4]) / 2);
  wall(scene, -28, 1, -16, 1); wall(scene, -28, 11, -16, 11); wall(scene, -28, 1, -28, 11);
}

// ---------- Lantai tambahan (gedung bertingkat) ----------
function slab(scene, j) {
  const y = j * FLOOR_H;
  const m = new THREE.Mesh(new THREE.BoxGeometry(32.4, 0.3, 24.4), mat(0x8f939b));
  m.position.set(0, y - 0.15, 0);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  // hanya menahan kamera (tidak menghalangi karakter)
  solids.push({ x1: -16.2, x2: 16.2, z1: -12.2, z2: 12.2, y0: y - 0.3, h: y, fl: j, camOnly: true });
}

function glass(scene, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: 0x7fb3d9, transparent: true, opacity: 0.55 }));
  m.position.set(x, y, z);
  scene.add(m);
}

// membangun lantai ke-k (k = 1 adalah lantai 2): pelat, dinding, jendela, karpet, lift; atap dipindah ke atasnya
export function buildFloor(scene, k) {
  const y = k * FLOOR_H, t = 0.15, h = 3;
  if (k === 1) slab(scene, 1);
  slab(scene, k + 1);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(31.7, 23.7), mat(0xc9c4b8));
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, y + 0.01, 0);
  carpet.receiveShadow = true;
  scene.add(carpet);
  addBoxF(scene, -16, 12 - t, 16, 12 + t, y, h, 0xe9e4da, true, k);
  addBoxF(scene, -16, -12 - t, 16, -12 + t, y, h, 0xe9e4da, true, k);
  addBoxF(scene, -16 - t, -12, -16 + t, 12, y, h, 0xe9e4da, true, k);
  addBoxF(scene, 16 - t, -12, 16 + t, 12, y, h, 0xe9e4da, true, k);
  glass(scene, 30, 1.3, 0.06, 0, y + 1.7, 12 + t + 0.02);
  glass(scene, 30, 1.3, 0.06, 0, y + 1.7, -12 - t - 0.02);
  glass(scene, 0.06, 1.3, 22, 16 + t + 0.02, y + 1.7, 0);
  glass(scene, 0.06, 1.3, 22, -16 - t - 0.02, y + 1.7, 0);
  label(scene, 'Lantai ' + (k + 1), 0, 0, y);
  propF(scene, 14.4, 8.6, 15.8, 11.2, y, 3, buildLift(), k);
}
