// Lantai dan lift: gedung bertingkat, beli lantai baru, naik lift ke lantai lain
import { prog, level, floorCost, floorLevel, MAX_FLOORS, floorOf, registerPanel, closeOthers } from './progress.js';
import { spend, fmt } from './economy.js';
import { toast, registerItem } from './interact.js';
import { buildFloor } from './world.js';

export const LIFT = { x: 13.2, z: 10 }; // titik di depan pintu lift (sama di semua lantai)

let scene = null, player = null, panel = null, list = null, open = false;

export function buyFloor() {
  const k = prog.floors + 1;
  if (k > MAX_FLOORS) { toast('Gedung sudah mencapai tinggi maksimal'); return false; }
  if (level() < floorLevel(k)) { toast('Lantai ' + (k + 1) + ' butuh Level ' + floorLevel(k)); return false; }
  if (!spend(floorCost(k))) { toast('Uang tidak cukup (' + fmt(floorCost(k)) + ')'); return false; }
  prog.floors = k;
  buildFloor(scene, k);
  toast('Lantai ' + (k + 1) + ' selesai dibangun! Naik lewat lift di Reception');
  return true;
}

// memulihkan lantai dari data simpanan
export function restoreFloors(n) {
  const m = Math.min(MAX_FLOORS, Math.max(0, Math.floor(Number(n)) || 0));
  for (let k = prog.floors + 1; k <= m; k++) { prog.floors = k; buildFloor(scene, k); }
}

function closeLift() { open = false; if (panel) panel.style.display = 'none'; }

function goTo(f) {
  if (f < 0 || f > prog.floors) return;
  if (f === floorOf(player.group.position.y)) { toast('Kamu sudah di lantai ini'); return; }
  player.setFloor(f);
  player.group.position.x = LIFT.x;
  player.group.position.z = LIFT.z;
  closeLift();
  toast(f === 0 ? 'Lantai dasar' : 'Lantai ' + (f + 1));
}

function renderLift() {
  list.textContent = '';
  const cur = floorOf(player.group.position.y);
  for (let f = 0; f <= prog.floors; f++) {
    const b = document.createElement('button');
    b.textContent = (f + 1) + '. Lantai ' + (f + 1) + (f === 0 ? ' (dasar)' : '') + (f === cur ? ' · di sini' : '');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); goTo(f); });
    list.appendChild(b);
  }
}

function openLift() {
  if (prog.floors === 0) { toast('Belum ada lantai tambahan. Bangun di Dashboard (K), tekan 4'); return; }
  closeOthers('lift');
  open = true;
  panel.style.display = 'block';
  renderLift();
}

export function floorsKey(code) {
  if (open && code.startsWith('Digit')) goTo(parseInt(code.slice(5), 10) - 1);
}

export function updateFloors(dt, pos) {
  if (open && Math.hypot(pos.x - LIFT.x, pos.z - LIFT.z) > 4) closeLift();
}

export function initFloors(s, p) {
  scene = s;
  player = p;
  panel = document.getElementById('lift');
  const title = document.createElement('b');
  title.textContent = 'Lift: pilih lantai (tombol angka)';
  panel.appendChild(title);
  list = document.createElement('div');
  list.className = 'dbody';
  panel.appendChild(list);
  const bc = document.createElement('button');
  bc.textContent = 'Tutup';
  bc.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); closeLift(); });
  panel.appendChild(bc);
  registerPanel('lift', closeLift);
  registerItem({
    name: 'lift', center: { x: LIFT.x, z: LIFT.z }, radius: 2.2, fl: 'all',
    label: () => (prog.floors === 0 ? 'Lift (belum ada lantai tambahan)' : 'Buka lift (pilih lantai)'),
    use: openLift
  });
}
