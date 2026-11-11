// Build Mode (tombol B): beli, taruh, pindah, dan jual furnitur fungsional di setiap lantai
import * as THREE from 'three';
import { solids } from './world.js';
import { RADIUS } from './collision.js';
import { spend, earn, canAfford, fmt, addProducer, removeProducer, INCOME, PASSIVE } from './economy.js';
import { prog, level, itemLevel, registerPanel, closeOthers, FLOOR_H, floorOf } from './progress.js';
import { toast, setInteractEnabled, createPcLogic, removePcLogic } from './interact.js';
import { buildWorkstation, buildDesignStation, buildServer, buildPrinter, buildCoffee, buildAC, buildArchive, buildWhiteboard, buildGenerator } from './furniture.js';

// semua furnitur punya fungsi nyata
export const CATALOG = [
  { id: 'pc', name: 'Komputer', price: 900, w: 1.6, d: 0.8, h: 1.2, note: 'tempat kerja Programmer; menyala +$3/dtk' },
  { id: 'design', name: 'Design Station', price: 1100, w: 1.8, d: 0.8, h: 1.2, note: 'tempat kerja Designer' },
  { id: 'server', name: 'Server', price: 1500, w: 0.8, d: 0.9, h: 2.0, note: '+$4/dtk, x2 bila dijaga Sysadmin' },
  { id: 'printer', name: 'Printer', price: 400, w: 0.7, d: 0.55, h: 0.9, note: '+$2/dtk' },
  { id: 'coffee', name: 'Mesin Kopi', price: 350, w: 0.5, d: 0.5, h: 1.45, note: '+5% penghasilan kerja (maks 3)' },
  { id: 'ac', name: 'AC', price: 600, w: 0.6, d: 0.4, h: 1.8, note: '+10% penghasilan kerja (maks 2)' },
  { id: 'archive', name: 'Rak Arsip', price: 300, w: 0.9, d: 0.45, h: 1.5, note: '+$1/dtk' },
  { id: 'whiteboard', name: 'Whiteboard', price: 250, w: 1.4, d: 0.3, h: 1.8, note: '+$1/dtk' },
  { id: 'generator', name: 'Generator', price: 2000, w: 1.0, d: 0.6, h: 1.15, note: '+$8/dtk' }
];
export const FREE_BUILD = false;

const LEGACY_PRICES = { desk: 250, chair: 80, plant: 60, cabinet: 350, sofa: 600 }; // perabot lama dikembalikan jadi uang

const BOUNDS = { x1: -15.7, x2: 15.7, z1: -11.7, z2: 11.7 }; // hanya boleh di dalam gedung
const placed = [];
const aim = { x: 0, z: 0 };
let scene = null, bar = null, active = false, ghost = null, curFl = 0;

// ---------- Model 3D ----------
function buildModel(def) {
  switch (def.id) {
    case 'pc': return buildWorkstation(def.w, def.d, 0.75);
    case 'design': return buildDesignStation(def.w, def.d, 0.75);
    case 'server': return { group: buildServer(def.w, def.h, def.d), screen: null };
    case 'printer': return { group: buildPrinter(), screen: null };
    case 'coffee': return { group: buildCoffee(), screen: null };
    case 'ac': return { group: buildAC(), screen: null };
    case 'archive': return { group: buildArchive(), screen: null };
    case 'whiteboard': return { group: buildWhiteboard(), screen: null };
    default: return { group: buildGenerator(), screen: null };
  }
}

// ---------- Tempat dan validasi ----------
function rect(def, x, z, rot) {
  const odd = rot % 2 === 1;
  const hw = (odd ? def.d : def.w) / 2, hd = (odd ? def.w : def.d) / 2;
  return { x1: x - hw, x2: x + hw, z1: z - hd, z2: z + hd };
}

function insideBuilding(r, fl) {
  if (r.x1 >= BOUNDS.x1 && r.x2 <= BOUNDS.x2 && r.z1 >= BOUNDS.z1 && r.z2 <= BOUNDS.z2) return true;
  return fl === 0 && prog.expanded && r.x1 >= -27.7 && r.x2 <= -16.3 && r.z1 >= 1.3 && r.z2 <= 10.7; // Training Room
}

function isValid(def, x, z, rot, pos, fl) {
  const r = rect(def, x, z, rot);
  if (!insideBuilding(r, fl)) return false;
  const e = 0.02;
  for (const s of solids) {
    if (s.off || s.camOnly || (s.fl || 0) !== fl) continue;
    if (r.x1 + e < s.x2 && r.x2 - e > s.x1 && r.z1 + e < s.z2 && r.z2 - e > s.z1) return false;
  }
  const cx = Math.max(r.x1, Math.min(pos.x, r.x2)), cz = Math.max(r.z1, Math.min(pos.z, r.z2));
  if (Math.hypot(pos.x - cx, pos.z - cz) < RADIUS + 0.05) return false; // jangan menimpa pemain
  return true;
}

// ---------- Menaruh dan melepas furnitur ----------
function spawn(def, x, z, rot, model, fl) {
  const m = model || buildModel(def);
  const item = { def, model: m, x, z, rot, fl, solid: null, pc: null, producer: null, staffed: false, removed: false, npcBusy: false };
  m.group.position.set(x, fl * FLOOR_H, z);
  m.group.rotation.y = (rot * Math.PI) / 2;
  m.group.visible = true;
  if (!model) scene.add(m.group);
  const r = rect(def, x, z, rot);
  item.solid = { x1: r.x1, z1: r.z1, x2: r.x2, z2: r.z2, y0: fl * FLOOR_H, h: fl * FLOOR_H + def.h, off: false, fl };
  solids.push(item.solid);
  if (def.id === 'pc' || def.id === 'design') item.pc = createPcLogic(m.screen, x, z, fl);
  if (def.id === 'server') item.producer = { kind: 'server', income: () => INCOME.server * (item.staffed ? 2 : 1) };
  else if (PASSIVE[def.id]) item.producer = { kind: 'office', income: () => PASSIVE[def.id] };
  if (item.producer) addProducer(item.producer);
  placed.push(item);
  return item;
}

function detach(item) {
  item.removed = true;
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
    if (it.fl !== curFl) continue;
    const d = Math.hypot(it.x - aim.x, it.z - aim.z);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

export function getPlaced(...ids) { return placed.filter((i) => ids.includes(i.def.id)); }
export function getPlacedCounts() {
  const c = {};
  for (const it of placed) c[it.def.id] = (c[it.def.id] || 0) + 1;
  return c;
}
// bonus penghasilan kerja dari mesin kopi (+5% tiap unit, maks 3) dan AC (+10% tiap unit, maks 2)
export function workMultiplier() {
  const c = getPlacedCounts();
  return 1 + 0.05 * Math.min(c.coffee || 0, 3) + 0.1 * Math.min(c.ac || 0, 2);
}

// ---------- Ghost (pratinjau) ----------
function makeGhost(def, moving) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, def.d), new THREE.MeshBasicMaterial({ color: 0x3ddc84, transparent: true, opacity: 0.5 }));
  scene.add(mesh);
  return { def, mesh, rot: moving ? moving.rot : 0, x: 0, z: 0, fl: curFl, valid: false, moving };
}

function clearGhost() {
  if (ghost) { scene.remove(ghost.mesh); ghost = null; }
}

function cancelGhost() {
  if (!ghost) return;
  if (ghost.moving) { // batal memindahkan: kembalikan ke tempat semula
    const it = ghost.moving;
    spawn(it.def, it.x, it.z, it.rot, it.model, it.fl);
  }
  clearGhost();
}

// ---------- Aksi pemain ----------
export function isBuilding() { return active; }

function toggleBuild() {
  active = !active;
  if (active) closeOthers('build');
  if (!active) cancelGhost();
  setInteractEnabled(!active);
  bar.style.display = active ? 'flex' : 'none';
  if (active) toast('Build Mode: pilih item (tombol 1-9)');
}

function select(i) {
  const def = CATALOG[i];
  if (!def) return;
  cancelGhost();
  if (level() < itemLevel(def.id)) { toast(def.name + ' butuh Level ' + itemLevel(def.id)); return; }
  if (!FREE_BUILD && !canAfford(def.price)) { toast('Uang tidak cukup untuk ' + def.name); return; }
  ghost = makeGhost(def, null);
  toast(def.name + ': ' + def.note);
}

function rotate() {
  if (ghost) ghost.rot = (ghost.rot + 1) % 4;
}

export function buildConfirm() {
  if (!active) return;
  if (!ghost) { toast('Pilih item dulu (tombol 1-9)'); return; }
  if (!ghost.valid) { toast('Tempat tidak valid'); return; }
  const g = ghost;
  if (g.moving) {
    spawn(g.def, g.x, g.z, g.rot, g.moving.model, g.fl);
    clearGhost();
    toast(g.def.name + ' dipindahkan');
    return;
  }
  if (!FREE_BUILD && !spend(g.def.price)) { toast('Uang tidak cukup'); return; }
  spawn(g.def, g.x, g.z, g.rot, null, g.fl);
  toast(g.def.name + ' ditaruh' + (FREE_BUILD ? '' : ' (-' + fmt(g.def.price) + ')'));
  if (!FREE_BUILD && !canAfford(g.def.price)) clearGhost();
}

function pickup() {
  if (ghost && ghost.moving) return;
  cancelGhost();
  const it = nearestPlaced(1.6);
  if (!it) { toast('Tidak ada furnitur buatanmu di depan'); return; }
  detach(it);
  it.model.group.visible = false;
  ghost = makeGhost(it.def, it);
  toast('Pindahkan ' + it.def.name + ', lalu taruh');
}

function sell() {
  cancelGhost();
  const it = nearestPlaced(1.6);
  if (!it) { toast('Tidak ada furnitur buatanmu di depan'); return; }
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
  registerPanel('build', () => { if (active) toggleBuild(); });
  bar = document.getElementById('buildbar');
  const title = document.createElement('b');
  title.textContent = 'Build Mode';
  bar.appendChild(title);
  CATALOG.forEach((def, i) => btn((i + 1) + ' ' + def.name + (FREE_BUILD ? '' : ' ' + fmt(def.price)) + (itemLevel(def.id) > 1 ? ' (Lv' + itemLevel(def.id) + ')' : ''), () => select(i)));
  btn('Putar', rotate);
  btn('Taruh', buildConfirm);
  btn('Pindah', pickup);
  btn(FREE_BUILD ? 'Hapus' : 'Jual', sell);
  btn('Keluar', toggleBuild);
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = '1-9 pilih · R putar · E atau klik taruh · F pindah · X ' + (FREE_BUILD ? 'hapus' : 'jual (60%)') + ' · B keluar';
  bar.appendChild(hint);
}

// dipanggil tiap frame
export function updateBuild(dt, pos, yaw) {
  curFl = floorOf(pos.y || 0);
  if (!active) return;
  aim.x = Math.round((pos.x - Math.sin(yaw) * 2.2) * 2) / 2;
  aim.z = Math.round((pos.z - Math.cos(yaw) * 2.2) * 2) / 2;
  if (!ghost) return;
  ghost.fl = curFl;
  ghost.x = aim.x;
  ghost.z = aim.z;
  ghost.valid = isValid(ghost.def, ghost.x, ghost.z, ghost.rot, pos, curFl);
  ghost.mesh.position.set(ghost.x, curFl * FLOOR_H + ghost.def.h / 2, ghost.z);
  ghost.mesh.rotation.y = (ghost.rot * Math.PI) / 2;
  ghost.mesh.material.color.set(ghost.valid ? 0x3ddc84 : 0xff5555);
}

// ---------- Simpan dan muat ----------
export function serializePlaced() {
  const list = placed.map((it) => ({ id: it.def.id, x: it.x, z: it.z, rot: it.rot, fl: it.fl }));
  if (ghost && ghost.moving) { // furnitur yang sedang dipindah tetap tersimpan di tempat semula
    const m = ghost.moving;
    list.push({ id: m.def.id, x: m.x, z: m.z, rot: m.rot, fl: m.fl });
  }
  return list;
}

// mengembalikan jumlah uang pengganti untuk perabot lama yang sudah dihapus dari game
export function restorePlaced(list) {
  let refund = 0;
  if (!Array.isArray(list)) return refund;
  for (const e of list.slice(0, 300)) {
    if (!e) continue;
    if (LEGACY_PRICES[e.id]) { refund += LEGACY_PRICES[e.id]; continue; }
    const def = CATALOG.find((d) => d.id === e.id);
    if (!def || !Number.isFinite(e.x) || !Number.isFinite(e.z)) continue;
    const fl = Number.isFinite(e.fl) ? Math.max(0, Math.floor(e.fl)) : 0;
    if (fl > prog.floors) { refund += def.price; continue; }
    const rot = (((Math.round(e.rot) || 0) % 4) + 4) % 4;
    spawn(def, e.x, e.z, rot, null, fl);
  }
  return refund;
}
