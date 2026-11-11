// Save system (tahap 8): simpan otomatis ke browser, muat saat dibuka, simpan manual, dan reset
import { eco } from './economy.js';
import { prog, floorOf } from './progress.js';
import { restoreFloors } from './floors.js';
import { serializePlaced, restorePlaced } from './build.js';
import { serializeNpcs, restoreNpcs } from './npc.js';
import { serializeMissions, restoreCompany } from './company.js';
import { toast } from './interact.js';
import { input } from './input.js';

const KEY = 'virtual-it-office-save-v1';
const AUTO_SECONDS = 15;
let acc = 0, player = null, enabled = true;

const num = (v, d) => (Number.isFinite(v) ? v : d);

export function collect() {
  return {
    v: 2,
    money: Math.floor(eco.money),
    prog: { xp: prog.xp, expanded: prog.expanded, sessions: prog.sessions, floors: prog.floors },
    missions: serializeMissions(),
    placed: serializePlaced(),
    npcs: serializeNpcs(),
    player: player ? { x: player.position.x, z: player.position.z, yaw: input.yaw, fl: floorOf(player.position.y) } : null,
    t: Date.now()
  };
}

export function saveGame(silent) {
  if (!enabled) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(collect()));
    if (!silent) toast('Progres disimpan');
    return true;
  } catch (e) {
    if (!silent) toast('Gagal menyimpan (penyimpanan browser tidak tersedia)');
    return false;
  }
}

// memuat progres; mengembalikan data (untuk posisi pemain) atau null bila tidak ada/rusak
export function loadGame() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
  if (!raw) return null;
  let d;
  try { d = JSON.parse(raw); } catch (e) { return null; }
  if (!d || (d.v !== 1 && d.v !== 2)) return null;
  try {
    if (Number.isFinite(d.money)) eco.money = Math.max(0, d.money);
    const p = d.prog || {};
    prog.xp = Math.max(0, num(p.xp, 0));
    prog.sessions = Math.max(0, num(p.sessions, 0));
    restoreFloors(p.floors);
    restoreCompany(d.missions, !!p.expanded);
    const refund = restorePlaced(d.placed);
    if (refund > 0) eco.money += refund; // perabot lama sudah tidak ada: dikembalikan jadi uang
    restoreNpcs(d.npcs);
    toast(refund > 0 ? 'Progres dimuat. Perabot lama diganti uang $' + refund : 'Progres dimuat');
  } catch (e) {
    return null;
  }
  return d;
}

export function resetGame() {
  if (typeof confirm === 'function' && !confirm('Hapus semua progres dan mulai dari awal?')) return;
  enabled = false; // cegah simpan otomatis menulis ulang
  try { localStorage.removeItem(KEY); } catch (e) { /* abaikan */ }
  location.reload();
}

// dipanggil tiap frame
export function updateSave(dt) {
  acc += dt;
  if (acc >= AUTO_SECONDS) { acc = 0; saveGame(true); }
}

// tombol 2 = simpan, 3 = reset (saat Dashboard terbuka)
export function saveKey(code, dashOpen) {
  if (!dashOpen) return;
  if (code === 'Digit2') saveGame(false);
  else if (code === 'Digit3') resetGame();
}

export function initSave(group) {
  player = group;
  const dash = document.getElementById('dash');
  const row = document.createElement('div');
  row.className = 'drow';
  const mk = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
    row.appendChild(b);
  };
  mk('Simpan', () => saveGame(false));
  mk('Reset game', resetGame);
  dash.appendChild(row);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(true); });
  addEventListener('pagehide', () => saveGame(true));
}
