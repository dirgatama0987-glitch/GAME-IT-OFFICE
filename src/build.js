// Build Mode (tombol B): beli, taruh, pindahkan, dan jual furniture langsung di dunia 3D
import * as THREE from 'three';
import { solids } from './world.js';
import { RADIUS } from './collision.js';
import { spend, earn, canAfford, fmt, addProducer, removeProducer, INCOME } from './economy.js';
import { toast, setInteractEnabled, attachComputer, createPcLogic, removePcLogic } from './interact.js';

export const CATALOG = [
  { id: 'desk', name: 'Meja', price: 250, w: 1.6, d: 0.8, h: 0.75 },
  { id: 'chair', name: 'Kursi', price: 80, w: 0.5, d: 0.5, h: 0.9 },
  { id: 'pc', name: 'Komputer', price: 900, w: 1.6, d: 0.8, h: 0.75 },   // meja + monitor
  { id: 'server', name: 'Server', price: 1500, w: 0.8, d: 0.9, h: 2.0 }
];

export const FREE_BUILD = true; // tahap 4: gratis. Tahap 5: ubah jadi false agar memakai uang

const BOUNDS = { x1: -15.7, x2: 15.7, z1: -11.7, z2: 11.7 }; // hanya boleh di dalam gedung
const placed = [];          // furniture yang sudah ditaruh pemain
const aim = { x: 0, z: 0 }; // titik bidik di depan pemain
let scene = null, bar = null, active = false, ghost = null;

// ---------- Model 3D ----------
function part(g, w, h, d, color, x, y, z, basic) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  return m;
}

function deskParts(g, w, d, color) {
  part(g, w, 0.06, d, color, 0, 0.72, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, 0.06, 0.72, 0.06, color, sx * (w / 2 - 0.06), 0.36, sz * (d / 2 - 0.06));
}

function buildModel(def) {
  const g = new THREE.Group();
  const model = { group: g, screen: null };
  if (def.id === 'desk') deskParts(g, def.w, def.d, 0x8a6a4a);
  else if (def.id === 'chair') {
    part(g, 0.45, 0.06, 0.45, 0x2f3a4a, 0, 0.45, 0);
    part(g, 0.45, 0.5, 0.05, 0x2f3a4a, 0, 0.72, -0.2);
    part(g, 0.06, 0.45, 0.06, 0x1b1e24, 0, 0.22, 0);
  } else if (def.id === 'pc') {
    deskParts(g, def.w, def.d, 0x9aa3b2);
    const sub = new THREE.Group();
    sub.position.set(0, 0.75, -0.15);
    model.screen = attachComputer(sub);
    g.add(sub);
  } else if (def.id === 'server') {
    part(g, def.w, def.h, def.d, 0x2b303a, 0, def.h / 2, 0);
    [1.6, 1.3, 1.0].forEach((y) => part(g, 0.5, 0.06, 0.02, 0x39d98a, 0, y, def.d / 2 + 0.005, true));
  }
  return model;
}

// ---------- Tempat dan validasi ----------
function rect(def, x, z, rot) {
  const odd = rot % 2 === 1;
  const hw = (odd ? def.d : def.w) / 2, hd = (odd ? def.w : def.d) / 2;
  return { x1: x - hw, x2: x + hw, z1: z - hd, z2: z + hd };
}

function isValid(def, x, z, rot, pos) {
  const r = rect(def, x, z, rot);
  if (r.x1 < BOUNDS.x1 || r.x2 > BOUNDS.x2 || r.z1 < BOUNDS.z1 || r.z2 > BOUNDS.z2) return false;
  const e = 0.02;
  for (const s of solids) {
    if (s.off) continue;
    if (r.x1 + e < s.x2 && r.x2 - e > s.x1 && r.z1 + e < s.z2 && r.z2 - e > s.z1) return false;
  }
  const cx = Math.max(r.x1, Math.min(pos.x, r.x2)), cz = Math.max(r.z1, Math.min(pos.z, r.z2));
  if (Math.hypot(pos.x - cx, pos.z - cz) < RADIUS + 0.05) return false; // jangan menimpa pemain
  return true;
}

// ---------- Menaruh dan melepas furniture ----------
function spawn(def, x, z, rot, model) {
  const m = model || buildModel(def);
  const item = { def, model: m, x, z, rot, solid: null, pc: null, producer: null };
  m.group.position.set(x, 0, z);
  m.group.rotation.y = (rot * Math.PI) / 2;
  m.group.visible = true;
  if (!model) scene.add(m.group);
  const r = rect(def, x, z, rot);
  item.solid = { x1: r.x1, z1: r.z1, x2: r.x2, z2: r.z2, h: def.h, off: false };
  solids.push(item.solid);
  if (def.id === 'pc') item.pc = createPcLogic(m.screen, x, z);
  if (def.id === 'server') { item.producer = { income: () => INCOME.server }; addProducer(item.producer); }
  placed.push(item);
  return item;
}

function detach(item) {
  const i = solids.indexOf(item.solid);
  if (i >= 0) solids.splice(i, 1);
  if (item.pc) removePcLogic(item.pc);
  if (item.producer) removeProducer(item.producer);
  const j = placed.indexOf(item);
  if (j >= 0) placed.splice(j, 1);
  item.pc = null;
  item.producer = null;
}

function nearestPlaced(maxD) {
  let best = null, bd = maxD;
  for (const it of placed) {
    const d = Math.hypot(it.x - aim.x, it.z - aim.z);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

// ---------- Ghost (pratinjau) ----------
function makeGhost(def, moving) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, def.d), new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.5 }));
  scene.add(mesh);
  return { def, mesh, rot: moving ? moving.rot : 0, x: 0, z: 0, valid: false, moving };
}

function clearGhost() {
  if (ghost) { scene.remove(ghost.mesh); ghost = null; }
}

function cancelGhost() {
  if (!ghost) return;
  if (ghost.moving) { // batal memindahkan: kembalikan ke tempat semula
    const it = ghost.moving;
    spawn(it.def, it.x, it.z, it.rot, it.model);
  }
  clearGhost();
}

// ---------- Aksi pemain ----------
export function isBuilding() { return active; }

function toggleBuild() {
  active = !active;
  if (!active) cancelGhost();
  setInteractEnabled(!active);
  bar.style.display = active ? 'flex' : 'none';
  if (active) toast('Build Mode: pilih item (tombol 1-4)');
}

function select(i) {
  const def = CATALOG[i];
  if (!def) return;
  cancelGhost();
  if (!FREE_BUILD && !canAfford(def.price)) { toast('Uang tidak cukup untuk ' + def.name); return; }
  ghost = makeGhost(def, null);
}

function rotate() {
  if (ghost) ghost.rot = (ghost.rot + 1) % 4;
}

export function buildConfirm() {
  if (!active) return;
  if (!ghost) { toast('Pilih item dulu (tombol 1-4)'); return; }
  if (!ghost.valid) { toast('Tempat tidak valid'); return; }
  const g = ghost;
  if (g.moving) {
    spawn(g.def, g.x, g.z, g.rot, g.moving.model);
    clearGhost();
    toast(g.def.name + ' dipindahkan');
    return;
  }
  if (!FREE_BUILD && !spend(g.def.price)) { toast('Uang tidak cukup'); return; }
  spawn(g.def, g.x, g.z, g.rot, null);
  toast(g.def.name + ' ditaruh' + (FREE_BUILD ? '' : ' (-' + fmt(g.def.price) + ')'));
  if (!FREE_BUILD && !canAfford(g.def.price)) clearGhost();
}

function pickup() {
  if (ghost && ghost.moving) return;
  cancelGhost();
  const it = nearestPlaced(1.6);
  if (!it) { toast('Tidak ada furniture buatanmu di depan'); return; }
  detach(it);
  it.model.group.visible = false;
  ghost = makeGhost(it.def, it);
  toast('Pindahkan ' + it.def.name + ', lalu taruh');
}

function sell() {
  cancelGhost();
  const it = nearestPlaced(1.6);
  if (!it) { toast('Tidak ada furniture buatanmu di depan'); return; }
  const refund = Math.floor(it.def.price * 0.6);
  detach(it);
  scene.remove(it.model.group);
  if (!FREE_BUILD) earn(refund);
  toast(FREE_BUILD ? it.def.name + ' dihapus' : it.def.name + ' dijual (+' + fmt(refund) + ')');
}

export function buildKey(code) {
  if (code === 'KeyB') { toggleBuild(); return; }
  if (!active) return;
  if (code.startsWith('Digit')) select(parseInt(code.slice(5), 10) - 1);
  else if (code === 'KeyR') rotate();
  else if (code === 'KeyF') pickup();
  else if (code === 'KeyX') sell();
}

// ---------- Panel Build Mode ----------
function btn(label, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  bar.appendChild(b);
}

export function initBuild(s) {
  scene = s;
  bar = document.getElementById('buildbar');
  const title = document.createElement('b');
  title.textContent = 'Build Mode';
  bar.appendChild(title);
  CATALOG.forEach((def, i) => btn((i + 1) + ' ' + def.name + (FREE_BUILD ? '' : ' ' + fmt(def.price)), () => select(i)));
  btn('Putar', rotate);
  btn('Taruh', buildConfirm);
  btn('Pindah', pickup);
  btn(FREE_BUILD ? 'Hapus' : 'Jual', sell);
  btn('Keluar', toggleBuild);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = '1-4 pilih · R putar · E atau klik taruh · F pindah · X ' + (FREE_BUILD ? 'hapus' : 'jual (60%)') + ' · B keluar';
  bar.appendChild(hint);
}

// dipanggil tiap frame
export function updateBuild(dt, pos, yaw) {
  if (!active) return;
  aim.x = Math.round((pos.x - Math.sin(yaw) * 2.2) * 2) / 2;
  aim.z = Math.round((pos.z - Math.cos(yaw) * 2.2) * 2) / 2;
  if (!ghost) return;
  ghost.x = aim.x;
  ghost.z = aim.z;
  ghost.valid = isValid(ghost.def, ghost.x, ghost.z, ghost.rot, pos);
  ghost.mesh.position.set(ghost.x, ghost.def.h / 2, ghost.z);
  ghost.mesh.rotation.y = (ghost.rot * Math.PI) / 2;
  ghost.mesh.material.color.set(ghost.valid ? 0x3ddc84 : 0xff5555);
}
