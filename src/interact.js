// Objek interaktif (tombol E): pintu geser dan komputer
import * as THREE from 'three';
import { solids } from './world.js';
import { coarse } from './input.js';
import { addProducer, removeProducer, INCOME } from './economy.js';
import { attachComputer } from './furniture.js';
import { floorOf } from './progress.js';

const items = [];            // semua objek yang bisa diajak interaksi
const doors = [];
const playerPos = new THREE.Vector3();
let current = null;          // objek terdekat dari pemain
let toastT = 0;
let enabled = true;

export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.opacity = 1;
  toastT = 2.2;
}

export function setInteractEnabled(v) { enabled = v; }
export function registerItem(it) { items.push(it); }
export function unregisterItem(it) {
  const i = items.indexOf(it);
  if (i >= 0) items.splice(i, 1);
  if (current === it) current = null;
}

// ---------- Pintu geser ----------
// [nama, sumbu celah, garis tetap, awal, akhir, arah geser, warna]
const DOOR_DEFS = [
  ['pintu utama', 'x', 12, -2, 2, 1, 0x3c5f8f],
  ['pintu Main Workspace', 'x', 4, -1, 3, 1, 0x4a7c59],
  ['pintu CEO Room', 'z', -6, -9, -7, -1, 0x8a5a3c],
  ['pintu Meeting Room', 'z', -6, -1, 1, 1, 0x7a5a8a],
  ['pintu Server Room', 'z', 8, -9, -7, -1, 0x555c6b],
  ['pintu Development Room', 'z', 8, -1, 1, 1, 0x3f7f7a],
  ['pintu perluasan', 'z', -16, 6, 10, -1, 0x8a7a3c, true] // terkunci sampai perluasan dibeli
];

function placeDoor(d) {
  const p = d.mid + d.dir * d.w * d.amt;
  if (d.axis === 'x') d.mesh.position.set(p, 1.5, d.c);
  else d.mesh.position.set(d.c, 1.5, p);
  d.solid.off = d.amt > 0.5; // pintu terbuka = tidak menghalangi
}

function makeDoor(scene, def) {
  const [name, axis, c, a, b, dir, color, locked] = def;
  const w = b - a, h = 3, th = 0.12, t = 0.15;
  const geo = axis === 'x' ? new THREE.BoxGeometry(w, h, th) : new THREE.BoxGeometry(th, h, w);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);

  const solid = axis === 'x'
    ? { x1: a, z1: c - t, x2: b, z2: c + t, h, off: false }
    : { x1: c - t, z1: a, x2: c + t, z2: b, h, off: false };
  solids.push(solid);

  const mid = (a + b) / 2;
  const center = axis === 'x' ? new THREE.Vector3(mid, 0, c) : new THREE.Vector3(c, 0, mid);
  const d = { name, axis, c, mid, w, dir, mesh, solid, center, amt: 0, open: false, radius: 2.6, locked: !!locked };
  d.label = () => (d.locked ? 'Terkunci: beli Perluasan di Dashboard (K)' : (d.open ? 'Tutup ' : 'Buka ') + name);
  d.use = () => {
    if (d.locked) { toast('Pintu terkunci. Beli Perluasan Kantor di Dashboard (K)'); return; }
    if (d.open) {
      // jangan menutup pintu kalau pemain sedang berdiri di ambangnya
      const along = d.axis === 'x' ? playerPos.x - d.mid : playerPos.z - d.mid;
      const across = d.axis === 'x' ? playerPos.z - d.c : playerPos.x - d.c;
      if (Math.abs(along) < d.w / 2 + 0.4 && Math.abs(across) < 0.9) {
        toast('Ada yang menghalangi pintu');
        return;
      }
    }
    d.auto = false;
    d.open = !d.open;
  };
  placeDoor(d);
  doors.push(d);
  items.push(d);
}

// ---------- Komputer ----------
// [x, z, tinggi meja]  (layar menghadap ke selatan / +z)
const PC_DEFS = [
  [-2.5, -8.55, 0.8], [2.5, -8.55, 0.8], [-2.5, -2.55, 0.8], [2.5, -2.55, 0.8],
  [13.25, 2.2, 0.8], [-13.5, -10.6, 0.9], [0, 7.0, 1.0]
];

// logika komputer: bisa dinyalakan (E) dan menghasilkan uang saat menyala
export function createPcLogic(screen, x, z, fl = 0) {
  const pc = { name: 'komputer', center: new THREE.Vector3(x, 0, z), radius: 2.4, on: false, fl };
  pc.label = () => (pc.on ? 'Matikan komputer · M untuk Mission Center' : 'Nyalakan komputer');
  pc.setOn = (v) => {
    pc.on = v;
    screen.material.color.set(v ? 0x4fb3ff : 0x15181d);
  };
  pc.use = () => {
    pc.setOn(!pc.on);
    toast(pc.on ? 'Komputer menyala (+$' + INCOME.pc + '/dtk)' : 'Komputer dimatikan');
  };
  pc.income = () => (pc.on ? INCOME.pc : 0);
  pc.kind = 'pc';
  screen.material.color.set(0x15181d);
  items.push(pc);
  addProducer(pc);
  return pc;
}

export function removePcLogic(pc) {
  unregisterItem(pc);
  removeProducer(pc);
}

function makeComputer(scene, [x, z, deskH]) {
  const g = new THREE.Group();
  g.position.set(x, deskH, z);
  const screen = attachComputer(g);
  scene.add(g);
  createPcLogic(screen, x, z);
}

export function buildInteractives(scene) {
  DOOR_DEFS.forEach((def) => makeDoor(scene, def));
  PC_DEFS.forEach((def) => makeComputer(scene, def));
}

// dipanggil tiap frame
export function updateInteractives(dt, pos) {
  playerPos.copy(pos);

  for (const d of doors) {
    const target = d.open ? 1 : 0;
    if (d.amt !== target) {
      const step = Math.min(dt * 2.2, Math.abs(target - d.amt));
      d.amt += Math.sign(target - d.amt) * step;
      placeDoor(d);
    }
  }

  let best = null, bd = Infinity;
  if (enabled) {
    const fl = floorOf(pos.y || 0);
    for (const it of items) {
      if (it.fl !== 'all' && (it.fl || 0) !== fl) continue;
      const dist = Math.hypot(pos.x - it.center.x, pos.z - it.center.z);
      if (dist < it.radius && dist < bd) { best = it; bd = dist; }
    }
  }
  current = best;
  const el = document.getElementById('prompt');
  if (best) {
    el.textContent = (coarse ? 'Ketuk tombol E: ' : 'Tekan E: ') + best.label();
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }

  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) document.getElementById('toast').style.opacity = 0;
  }
}

function playerInDoorway(d) {
  const along = d.axis === 'x' ? playerPos.x - d.mid : playerPos.z - d.mid;
  const across = d.axis === 'x' ? playerPos.z - d.c : playerPos.x - d.c;
  return Math.abs(along) < d.w / 2 + 0.4 && Math.abs(across) < 0.9;
}

// pintu terbuka sendiri saat ada karyawan mendekat, menutup lagi setelah mereka lewat
export function assistDoors(points) {
  for (const d of doors) {
    if (d.locked) continue;
    const near = points.some((p) => (p.y || 0) < 1.5 && Math.hypot(p.x - d.center.x, p.z - d.center.z) < 2.6);
    if (near && !d.open) { d.open = true; d.auto = true; }
    else if (!near && d.auto && !playerInDoorway(d)) { d.open = false; d.auto = false; }
  }
}

// komputer terdekat dari sebuah titik (untuk karyawan yang bekerja)
export function findPcNear(x, z, maxD) {
  let best = null, bd = maxD;
  for (const it of items) {
    if (it.name !== 'komputer' || !it.setOn || (it.fl || 0) !== 0) continue;
    const d = Math.hypot(it.center.x - x, it.center.z - z);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

export function unlockDoor(name) {
  const d = doors.find((x) => x.name === name);
  if (d) d.locked = false;
}

export function countPcsOn() {
  return items.filter((it) => it.name === 'komputer' && it.on).length;
}

// apakah pemain berdiri dekat komputer yang menyala (syarat membuka Mission Center)
export function nearOnPc(pos) {
  const fl = floorOf(pos.y || 0);
  return items.some((it) => it.name === 'komputer' && it.on && (it.fl || 0) === fl && Math.hypot(pos.x - it.center.x, pos.z - it.center.z) < it.radius);
}

export function useNearest() {
  if (current) current.use();
}
