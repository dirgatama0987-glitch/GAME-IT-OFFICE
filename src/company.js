// Perusahaan (tahap 7): Mission Center, Company Dashboard, keuangan, level, dan perluasan kantor
import { eco, spend, earn, fmt, breakdown } from './economy.js';
import { prog, level, xpNext, addXp, maxEmployees, registerPanel, closeOthers, EXPANSION_COST, EXPANSION_LEVEL } from './progress.js';
import { toast, nearOnPc, countPcsOn, unlockDoor } from './interact.js';
import { getPlacedCounts } from './build.js';
import { getNpcs, statusOf } from './npc.js';
import { buildExpansion, rooms } from './world.js';

// metric = angka dari keadaan game yang harus mencapai target
const MISSIONS = [
  { id: 'm1', title: 'Taruh 2 meja', metric: 'desk', target: 2, money: 300, xp: 30 },
  { id: 'm2', title: 'Rekrut karyawan pertama', metric: 'employees', target: 1, money: 400, xp: 30 },
  { id: 'm3', title: 'Nyalakan 3 komputer', metric: 'pcsOn', target: 3, money: 300, xp: 40 },
  { id: 'm4', title: 'Taruh 2 tanaman', metric: 'plant', target: 2, money: 200, xp: 30 },
  { id: 'm5', title: 'Karyawan selesai 3 sesi kerja', metric: 'sessions', target: 3, money: 600, xp: 60 },
  { id: 'm6', title: 'Beli 1 komputer baru', metric: 'pc', target: 1, money: 500, xp: 50 },
  { id: 'm7', title: 'Kumpulkan uang $6.000', metric: 'money', target: 6000, money: 1000, xp: 80 },
  { id: 'm8', title: 'Punya 4 karyawan', metric: 'employees', target: 4, money: 1200, xp: 80 },
  { id: 'm9', title: 'Beli Perluasan Kantor', metric: 'expanded', target: 1, money: 1500, xp: 100 }
];
const MAX_ACTIVE = 3;
const stateOf = {};   // id -> 'active' | 'done'
const notified = {};

let scene = null, dash = null, dashBody = null, mis = null, misList = null, lvEl = null;
let dashOpen = false, misOpen = false, acc = 0, lvShown = '';
const playerPos = { x: 0, z: 0 };

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function metrics() {
  const c = getPlacedCounts();
  return {
    desk: c.desk || 0, pc: c.pc || 0, plant: c.plant || 0,
    employees: getNpcs().length, pcsOn: countPcsOn(), sessions: prog.sessions,
    money: Math.floor(eco.money), expanded: prog.expanded ? 1 : 0
  };
}

// ---------- Mission Center ----------
function actOn(i) {
  const m = MISSIONS[i];
  if (!m) return;
  const st = stateOf[m.id];
  const cur = metrics()[m.metric];
  if (st === 'done') { toast('Misi sudah selesai'); return; }
  if (!st) {
    const n = MISSIONS.filter((x) => stateOf[x.id] === 'active').length;
    if (n >= MAX_ACTIVE) { toast('Maksimal ' + MAX_ACTIVE + ' misi aktif. Klaim yang selesai dulu'); return; }
    stateOf[m.id] = 'active';
    toast('Misi diterima: ' + m.title);
  } else if (cur >= m.target) {
    stateOf[m.id] = 'done';
    earn(m.money);
    const up = addXp(m.xp);
    toast('Misi selesai: +' + fmt(m.money) + ' dan +' + m.xp + ' XP' + (up ? ' · NAIK LEVEL ' + level() + '!' : ''));
  } else {
    toast('Belum selesai: ' + Math.min(cur, m.target) + '/' + m.target);
  }
  renderMissions();
}

function renderMissions() {
  misList.textContent = '';
  const m0 = metrics();
  MISSIONS.forEach((m, i) => {
    const st = stateOf[m.id], cur = Math.min(m0[m.metric], m.target);
    const row = el('div', null, 'mrow');
    row.appendChild(el('span', (i + 1) + '. ' + m.title + ' (' + cur + '/' + m.target + ') · ' + fmt(m.money) + ' + ' + m.xp + ' XP'));
    let label = 'Terima';
    if (st === 'done') label = 'Selesai';
    else if (st === 'active') label = cur >= m.target ? 'Klaim' : 'Aktif';
    const b = el('button', label);
    if (st !== 'done') b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); actOn(i); });
    row.appendChild(b);
    misList.appendChild(row);
  });
}

export function closeMissions() { misOpen = false; if (mis) mis.style.display = 'none'; }
function openMissions() { closeOthers('missions'); misOpen = true; mis.style.display = 'block'; renderMissions(); }

// ---------- Company Dashboard ----------
function buyExpansion() {
  if (prog.expanded) { toast('Perluasan sudah dibeli'); return; }
  if (level() < EXPANSION_LEVEL) { toast('Perluasan butuh Level ' + EXPANSION_LEVEL); return; }
  if (!spend(EXPANSION_COST)) { toast('Uang tidak cukup untuk perluasan'); return; }
  prog.expanded = true;
  buildExpansion(scene);
  unlockDoor('pintu perluasan');
  toast('Training Room dibuka: pintu di sisi barat Reception');
  renderDash();
}

function renderDash() {
  dashBody.textContent = '';
  const add = (t, c) => dashBody.appendChild(el('div', t, c));
  const b = breakdown(), net = Math.floor(eco.income), emps = getNpcs();
  const total = Object.values(getPlacedCounts()).reduce((a, v) => a + v, 0);
  add('Level ' + level() + ' · XP ' + prog.xp + '/' + xpNext(), 'dh');
  add('Uang: ' + fmt(eco.money) + ' · bersih ' + (net >= 0 ? '+' : '-') + '$' + Math.abs(net) + '/dtk');
  add('Keuangan (per detik)', 'dh');
  add('Komputer menyala: +$' + Math.round(b.pc));
  add('Server: +$' + Math.round(b.server));
  add('Karyawan bekerja: +$' + Math.round(b.work));
  add('Gaji karyawan: -$' + Math.round(b.salary));
  add('Karyawan ' + emps.length + '/' + maxEmployees(), 'dh');
  if (!emps.length) add('Belum ada karyawan (tekan H untuk merekrut)');
  emps.forEach((n) => add(n.name + ' · ' + n.role + ' · ' + statusOf(n)));
  add('Kantor', 'dh');
  add('Furnitur buatanmu: ' + total + ' · Ruangan: ' + rooms.length);
  add(prog.expanded ? 'Perluasan: Training Room sudah dibuka' : 'Perluasan Training Room: Level ' + EXPANSION_LEVEL + ', ' + fmt(EXPANSION_COST) + ' (tekan 1)');
}

export function closeDash() { dashOpen = false; if (dash) dash.style.display = 'none'; }
function openDash() { closeOthers('dash'); dashOpen = true; dash.style.display = 'block'; renderDash(); }

// ---------- Tombol ----------
export function companyKey(code, building) {
  if (code === 'KeyK') {
    if (dashOpen) closeDash();
    else if (building) toast('Keluar Build Mode dulu (tekan B)');
    else openDash();
    return;
  }
  if (code === 'KeyM') {
    if (misOpen) closeMissions();
    else if (building) toast('Keluar Build Mode dulu (tekan B)');
    else if (!nearOnPc(playerPos)) toast('Nyalakan komputer (E), berdiri di dekatnya, lalu tekan M');
    else openMissions();
    return;
  }
  if (misOpen && code.startsWith('Digit')) actOn(parseInt(code.slice(5), 10) - 1);
  else if (dashOpen && code === 'Digit1') buyExpansion();
}

export function initCompany(s) {
  scene = s;
  lvEl = document.getElementById('lv');
  dash = document.getElementById('dash');
  mis = document.getElementById('missions');

  dash.appendChild(el('b', 'Company Dashboard'));
  dashBody = el('div', null, 'dbody');
  dash.appendChild(dashBody);
  const db = el('div', null, 'drow');
  const bx = el('button', 'Beli Perluasan');
  bx.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); buyExpansion(); });
  const bc = el('button', 'Tutup');
  bc.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); closeDash(); });
  db.appendChild(bx); db.appendChild(bc);
  dash.appendChild(db);

  mis.appendChild(el('b', 'Mission Center'));
  mis.appendChild(el('div', '1-9 untuk menerima atau mengklaim misi · M tutup', 'hint'));
  misList = el('div', null, 'dbody');
  mis.appendChild(misList);
  const mc = el('button', 'Tutup');
  mc.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); closeMissions(); });
  mis.appendChild(mc);

  registerPanel('dash', closeDash);
  registerPanel('missions', closeMissions);
}

// dipanggil tiap frame
export function updateCompany(dt, pos) {
  playerPos.x = pos.x; playerPos.z = pos.z;
  const t = 'Level ' + level() + ' · XP ' + prog.xp + '/' + xpNext();
  if (t !== lvShown) { lvShown = t; lvEl.textContent = t; }

  acc += dt;
  if (acc < 0.5) return;
  acc = 0;
  const m0 = metrics();
  for (const m of MISSIONS) {
    if (stateOf[m.id] === 'active' && !notified[m.id] && m0[m.metric] >= m.target) {
      notified[m.id] = true;
      toast('Misi selesai: ' + m.title + '. Klaim di komputer (M)');
    }
  }
  if (dashOpen) renderDash();
  if (misOpen) {
    if (!nearOnPc(pos)) { closeMissions(); toast('Mission Center ditutup (jauh dari komputer)'); }
    else renderMissions();
  }
}
