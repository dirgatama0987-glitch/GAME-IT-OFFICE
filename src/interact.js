// Objek interaktif (tombol E): pintu geser dan komputer
import * as THREE from 'three';
import { solids } from './world.js';
import { coarse } from './input.js';

const items = [];            // semua objek yang bisa diajak interaksi
const doors = [];
const playerPos = new THREE.Vector3();
let current = null;          // objek terdekat dari pemain
let toastT = 0;

export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.opacity = 1;
  toastT = 2.2;
}

// ---------- Pintu geser ----------
// [nama, sumbu celah, garis tetap, awal, akhir, arah geser, warna]
// sumbu 'x' = dinding membentang searah x di z tetap; 'z' = dinding searah z di x tetap
const DOOR_DEFS = [
  ['pintu utama', 'x', 12, -2, 2, 1, 0x3c5f8f],
  ['pintu Main Workspace', 'x', 4, -1, 3, 1, 0x4a7c59],
  ['pintu CEO Room', 'z', -6, -9, -7, -1, 0x8a5a3c],
  ['pintu Meeting Room', 'z', -6, -1, 1, 1, 0x7a5a8a],
  ['pintu Server Room', 'z', 8, -9, -7, -1, 0x555c6b],
  ['pintu Development Room', 'z', 8, -1, 1, 1, 0x3f7f7a]
];

function placeDoor(d) {
  const p = d.mid + d.dir * d.w * d.amt;
  if (d.axis === 'x') d.mesh.position.set(p, 1.5, d.c);
  else d.mesh.position.set(d.c, 1.5, p);
  d.solid.off = d.amt > 0.5; // pintu terbuka = tidak menghalangi
}

function makeDoor(scene, def) {
  const [name, axis, c, a, b, dir, color] = def;
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
  const d = { name, axis, c, mid, w, dir, mesh, solid, center, amt: 0, open: false, radius: 2.6 };
  d.label = () => (d.open ? 'Tutup ' : 'Buka ') + name;
  d.use = () => {
    if (d.open) {
      // jangan menutup pintu kalau pemain sedang berdiri di ambangnya
      const along = d.axis === 'x' ? playerPos.x - d.mid : playerPos.z - d.mid;
      const across = d.axis === 'x' ? playerPos.z - d.c : playerPos.x - d.c;
      if (Math.abs(along) < d.w / 2 + 0.4 && Math.abs(across) < 0.9) {
        toast('Ada yang menghalangi pintu');
        return;
      }
    }
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

function makeComputer(scene, [x, z, deskH]) {
  const g = new THREE.Group();
  g.position.set(x, deskH, z);
  const add = (geo, color, px, py, pz, basic) => {
    const m = new THREE.Mesh(geo, basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color }));
    m.position.set(px, py, pz);
    g.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(0.12, 0.15, 0.1), 0x2b2f36, 0, 0.075, 0);          // tiang
  add(new THREE.BoxGeometry(0.64, 0.42, 0.04), 0x1b1e24, 0, 0.36, 0);          // bingkai monitor
  const screen = add(new THREE.PlaneGeometry(0.56, 0.34), 0x15181d, 0, 0.36, 0.025, true); // layar
  add(new THREE.BoxGeometry(0.4, 0.02, 0.14), 0x2b2f36, 0, 0.01, 0.28);        // keyboard
  scene.add(g);

  const pc = { name: 'komputer', center: new THREE.Vector3(x, 0, z), radius: 2.4, on: false };
  pc.label = () => (pc.on ? 'Matikan' : 'Nyalakan') + ' komputer';
  pc.use = () => {
    pc.on = !pc.on;
    screen.material.color.set(pc.on ? 0x4fb3ff : 0x15181d);
    toast(pc.on ? 'Komputer menyala (Mission Center menyusul di tahap 7)' : 'Komputer dimatikan');
  };
  items.push(pc);
}

export function buildInteractives(scene) {
  DOOR_DEFS.forEach((def) => makeDoor(scene, def));
  PC_DEFS.forEach((def) => makeComputer(scene, def));
}

// dipanggil tiap frame
export function updateInteractives(dt, pos) {
  playerPos.copy(pos);

  // animasi pintu
  for (const d of doors) {
    const target = d.open ? 1 : 0;
    if (d.amt !== target) {
      const step = Math.min(dt * 2.2, Math.abs(target - d.amt));
      d.amt += Math.sign(target - d.amt) * step;
      placeDoor(d);
    }
  }

  // objek terdekat dalam jangkauan
  let best = null, bd = Infinity;
  for (const it of items) {
    const dist = Math.hypot(pos.x - it.center.x, pos.z - it.center.z);
    if (dist < it.radius && dist < bd) { best = it; bd = dist; }
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

export function useNearest() {
  if (current) current.use();
}
