// Karyawan NPC: setiap jabatan punya tempat kerja sendiri dan tetap fokus di sana (tidak keliling)
import { roomAt } from './world.js';
import { spend, addProducer, removeProducer, fmt } from './economy.js';
import { toast, assistDoors, findPcNear } from './interact.js';
import { getPlaced, workMultiplier } from './build.js';
import { prog, level, addXp, maxEmployees, registerPanel, closeOthers, FLOOR_H } from './progress.js';
import { createPerson, walkPose, sitPose, standPose, pick, SKINS, HAIRS } from './person.js';
import * as THREE from 'three';

const MAX_NPC = 40, SALARY = 1, SPEED = 1.7, SIT_DROP = 0.41, XP_EVERY = 30;

const ROLES = {
  Programmer: { cost: 600, shirt: 0x7b3fe4, seat: 'pc', gross: 5, need: 'Butuh Komputer kosong (Build Mode, tekan B)' },
  Designer: { cost: 500, shirt: 0xe46a3f, seat: 'design', gross: 6, need: 'Butuh Design Station kosong (Build Mode, tekan B)' },
  Admin: { cost: 400, shirt: 0x2fa36a, seat: 'reception', gross: 4, need: 'Meja resepsionis penuh (maksimal 2 Admin)' },
  Sysadmin: { cost: 700, shirt: 0x3f86e4, seat: 'server', gross: 0, need: 'Butuh Server kosong (Level 2, Build Mode)' }
};
const NAMES = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi', 'Indra', 'Joko', 'Kiki', 'Lina', 'Maya', 'Nanda', 'Oki', 'Putri'];
const PANTS = [0x28303d, 0x3a3f4a, 0x4a4036, 0x20242b];
const STYLES = ['short', 'short', 'long', 'bun'];

// ---------- Waypoint: pintu, lift, dan titik tengah ruangan ----------
const NODE = {
  OUT: [0, 14], DEN: [0, 12], RS: [0, 10], RE: [5.5, 9.5], RN1: [5.5, 5.2], RN2: [1, 5.2], DWS: [1, 4],
  LIFT: [13.2, 10], RW: [-12, 9], DEXP: [-16, 8], TRH: [-20, 8],
  WSC: [0, 1], WSN: [0, -5],
  A: [-5, -5], B: [-5, -8], DCEO: [-6, -8], CEOH: [-8, -8],
  C: [-5, 0], DMEET: [-6, 0], MEETH: [-7.5, 0],
  D: [5, -5], E: [5, -8], DSRV: [8, -8], SRVH: [10, -8],
  F: [6, 0], DDEV: [8, 0], DEVH: [10, 0]
};
const EDGES = [
  ['OUT', 'DEN'], ['DEN', 'RS'], ['RS', 'RE'], ['RE', 'RN1'], ['RN1', 'RN2'], ['RN2', 'DWS'], ['DWS', 'WSC'],
  ['RS', 'LIFT'], ['RS', 'RW'], ['RW', 'DEXP'], ['DEXP', 'TRH'],
  ['WSC', 'WSN'], ['WSN', 'A'], ['A', 'B'], ['B', 'DCEO'], ['DCEO', 'CEOH'],
  ['WSC', 'C'], ['C', 'DMEET'], ['DMEET', 'MEETH'],
  ['WSN', 'D'], ['D', 'E'], ['E', 'DSRV'], ['DSRV', 'SRVH'],
  ['WSC', 'F'], ['F', 'DDEV'], ['DDEV', 'DEVH']
];
const adj = {};
Object.keys(NODE).forEach((k) => { adj[k] = []; });
EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
const gap = (a, b) => Math.hypot(NODE[a][0] - NODE[b][0], NODE[a][1] - NODE[b][1]);
const pt = (id) => ({ x: NODE[id][0], z: NODE[id][1] });

// rute terpendek antar waypoint (tanpa titik awal)
function route(from, to) {
  const d = {}, prev = {}, todo = new Set(Object.keys(NODE));
  Object.keys(NODE).forEach((k) => { d[k] = Infinity; });
  d[from] = 0;
  while (todo.size) {
    let u = null;
    for (const k of todo) if (u === null || d[k] < d[u]) u = k;
    if (d[u] === Infinity) break;
    todo.delete(u);
    if (u === to) break;
    for (const v of adj[u]) {
      const nd = d[u] + gap(u, v);
      if (nd < d[v]) { d[v] = nd; prev[v] = u; }
    }
  }
  if (d[to] === Infinity) return null;
  const out = [];
  for (let c = to; c !== from; c = prev[c]) out.unshift(c);
  return out;
}

// ---------- Tempat kerja ----------
const HUBS = { Reception: 'RS', 'Main Workspace': 'WSC', 'Server Room': 'SRVH', 'Development Room': 'DEVH', 'CEO Room': 'CEOH', 'Ruang Kerja 2': 'MEETH', 'Training Room': 'TRH' };
const spot = (kind, x, z, rot, hub, via, sit, pcAt) => ({ kind, x, z, rot, hub, via, sit, pcAt, busy: false, fl: 0 });
const STATIC = {
  pc: [
    spot('pc', -2.5, -6.9, 0, 'WSC', [[0, -5], [-2.5, -5]], true, [-2.5, -8.55]),
    spot('pc', 2.5, -6.9, 0, 'WSC', [[0, -5], [2.5, -5]], true, [2.5, -8.55]),
    spot('pc', -2.5, -0.9, 0, 'WSC', [[-2.5, 0.6]], true, [-2.5, -2.55]),
    spot('pc', 2.5, -0.9, 0, 'WSC', [[2.5, 0.6]], true, [2.5, -2.55]),
    spot('pc', 13.25, 3.55, 0, 'DEVH', [[10, 3.55]], true, [13.25, 2.2]),
    spot('pc', -13.5, -8.9, 0, 'CEOH', [[-13.5, -7.5]], true, [-13.5, -10.6])
  ],
  reception: [
    spot('reception', -1.6, 5.4, Math.PI, 'RN2', [], false),
    spot('reception', 1.6, 5.4, Math.PI, 'RN2', [], false)
  ]
};
const WAIT = { kind: 'wait', x: 0, z: 10, rot: Math.PI, hub: 'RS', via: [], sit: false, fl: 0 };

// furnitur buatan pemain (komputer, design station, server) menjadi tempat kerja
function toSpot(it) {
  const th = (it.rot * Math.PI) / 2;
  const hub = it.fl === 0 ? HUBS[roomAt(it.x, it.z)] : 'LIFT';
  if (!hub) return null;
  const kind = it.def.id;
  return { kind, x: it.x + Math.sin(th) * 0.95, z: it.z + Math.cos(th) * 0.95, rot: th, hub, via: [], sit: kind !== 'server', item: it, fl: it.fl };
}
const dyn = (id) => getPlaced(id).map(toSpot).filter(Boolean);
const busy = (s) => (s.item ? !!s.item.npcBusy : s.busy);
const claim = (s) => { if (s.item) s.item.npcBusy = true; else s.busy = true; };
const free = (s) => { if (s.item) { s.item.npcBusy = false; s.item.staffed = false; } else s.busy = false; };

function findSpot(role) {
  const seat = ROLES[role].seat;
  const all = seat === 'pc' ? STATIC.pc.concat(dyn('pc')) : seat === 'design' ? dyn('design') : seat === 'reception' ? STATIC.reception : dyn('server');
  const list = all.filter((s) => !busy(s));
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

// ---------- NPC ----------
const npcs = [];
let scene = null, bar = null, info = null, open = false, hired = 0;

export function getNpcs() { return npcs; }
export const DEBUG = { NODE, EDGES, STATIC, WAIT, route };

// rencana jalan ke tempat s: lewat lift bila lantainya berbeda
function planPath(n, s) {
  const pts = n.back ? n.back.slice() : [];
  n.back = null;
  let at = n.at, fl = n.fl;
  if (fl !== s.fl) {
    if (fl === 0) route(at, 'LIFT').forEach((id) => pts.push(pt(id)));
    pts.push({ x: NODE.LIFT[0], z: NODE.LIFT[1], tp: s.fl });
    fl = s.fl;
    at = 'LIFT';
  }
  if (s.fl === 0) {
    route(at, s.hub).forEach((id) => pts.push(pt(id)));
    s.via.forEach(([x, z]) => pts.push({ x, z }));
  }
  pts.push({ x: s.x, z: s.z });
  n.at = s.fl === 0 ? s.hub : 'LIFT';
  return pts;
}

function makeNpc(role, forcedName) {
  const def = ROLES[role];
  const rig = createPerson({ shirt: def.shirt, pants: pick(PANTS), hair: pick(HAIRS), skin: pick(SKINS), style: pick(STYLES), tie: role === 'Programmer' ? null : 0x1f3a6b });
  const name = forcedName || NAMES[hired++ % NAMES.length];
  rig.group.add(makeLabel(name + ' · ' + role));
  rig.group.position.set(0, 0, 14); // masuk dari luar lewat pintu utama
  scene.add(rig.group);
  const n = { name, role, rig, group: rig.group, state: 'walk', fl: 0, at: 'OUT', spot: null, path: [], back: null, waiting: false,
    walkT: 0, amt: 0, face: 0, t: Math.random() * 10, xpT: 0, retry: 0, pcOnByMe: null };
  const gross = () => (n.state === 'work' && n.spot ? def.gross * workMultiplier() : 0);
  n.producer = { kind: 'npc', salary: SALARY, gross, income: () => gross() - SALARY };
  return n;
}

function makeLabel(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,24,31,.8)'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  s.scale.set(1.5, 0.375, 1);
  s.position.set(0, 2.1, 0);
  return s;
}

// lepas dari tempat kerja (misalnya furnitur dijual); jalan kembali lewat titik asalnya
function unassign(n) {
  const s = n.spot;
  if (s) {
    free(s);
    if (n.state === 'work' && s.fl === 0 && s.hub) n.back = s.via.slice().reverse().map(([x, z]) => ({ x, z })).concat([pt(s.hub)]);
  }
  if (n.pcOnByMe) { n.pcOnByMe.setOn(false); n.pcOnByMe = null; }
  n.spot = null;
  n.waiting = false;
}

function tryAssign(n) {
  const s = findSpot(n.role);
  if (s) { claim(s); n.spot = s; n.waiting = false; n.path = planPath(n, s); n.state = 'walk'; return true; }
  if (!n.waiting) { n.waiting = true; n.spot = null; n.path = planPath(n, WAIT); n.state = 'walk'; }
  return false;
}

function arrive(n) {
  const s = n.spot;
  if (!s) { n.state = 'wait'; n.retry = 2; return; }
  n.state = 'work';
  n.face = s.rot;
  n.group.rotation.y = n.face;
  n.xpT = 0;
  if (s.kind === 'pc' || s.kind === 'design') {
    const pc = s.item ? s.item.pc : findPcNear(s.pcAt[0], s.pcAt[1], 0.3);
    if (pc && pc.setOn && !pc.on) { pc.setOn(true); n.pcOnByMe = pc; }
  } else if (s.kind === 'server' && s.item) s.item.staffed = true;
}

function walkStep(n, dt) {
  const t = n.path[0], g = n.group.position;
  const dx = t.x - g.x, dz = t.z - g.z, d = Math.hypot(dx, dz), step = SPEED * dt;
  if (d <= step) {
    g.x = t.x; g.z = t.z;
    n.path.shift();
    if (t.tp !== undefined) n.fl = t.tp; // naik atau turun lift
    return n.path.length === 0;
  }
  g.x += (dx / d) * step;
  g.z += (dz / d) * step;
  let da = Math.atan2(-dx, -dz) - n.face;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  n.face += da * Math.min(1, dt * 10);
  n.group.rotation.y = n.face;
  return false;
}

function stepNpc(n, dt) {
  n.t += dt;
  if (n.spot && n.spot.item && n.spot.item.removed) { unassign(n); tryAssign(n); }
  if (n.state === 'walk') {
    const done = n.path.length === 0 ? true : walkStep(n, dt);
    n.walkT += dt * 9;
    n.amt += (1 - n.amt) * Math.min(1, dt * 10);
    walkPose(n.rig, n.walkT, n.amt);
    n.group.position.y = n.fl * FLOOR_H;
    if (done) arrive(n);
  } else if (n.state === 'work') {
    const s = n.spot, base = n.fl * FLOOR_H;
    n.amt = 0;
    if (s.sit) { sitPose(n.rig, s.kind === 'server' ? null : n.t); n.group.position.y = base - SIT_DROP; }
    else { standPose(n.rig); n.group.position.y = base; }
    n.xpT += dt;
    if (n.xpT >= XP_EVERY) { // bekerja menambah XP perusahaan
      n.xpT -= XP_EVERY;
      prog.sessions += 1;
      if (addXp(1)) toast('Naik Level ' + level() + '!');
    }
  } else { // menunggu tempat kerja kosong
    standPose(n.rig);
    n.amt = 0;
    n.group.position.y = n.fl * FLOOR_H;
    n.retry -= dt;
    if (n.retry <= 0) { n.retry = 2; tryAssign(n); }
  }
}

export function updateNpcs(dt) {
  const pts = [];
  for (const n of npcs) { stepNpc(n, dt); pts.push(n.group.position); }
  assistDoors(pts); // pintu terbuka otomatis saat karyawan lewat
}

const KIND_TEXT = { pc: 'Bekerja (coding)', design: 'Bekerja (desain)', reception: 'Menjaga resepsionis', server: 'Menjaga server' };
export function statusOf(n) {
  if (n.state === 'work' && n.spot) return KIND_TEXT[n.spot.kind] || 'Bekerja';
  return n.state === 'walk' && n.spot ? 'Menuju tempat kerja' : 'Menunggu tempat kerja';
}

// ---------- Rekrut dan pecat ----------
function updateInfo() {
  if (info) info.textContent = 'Karyawan: ' + npcs.length + '/' + maxEmployees() + ' · gaji $' + SALARY + '/dtk per orang · tiap jabatan butuh tempat kerjanya';
}

function release(n) {
  if (n.spot) free(n.spot);
  if (n.pcOnByMe) { n.pcOnByMe.setOn(false); n.pcOnByMe = null; }
}

function hire(role) {
  if (npcs.length >= maxEmployees() || npcs.length >= MAX_NPC) { toast('Kapasitas penuh (' + maxEmployees() + '). Naik level atau bangun lantai baru'); return; }
  const s = findSpot(role);
  if (!s) { toast(ROLES[role].need); return; }
  const cost = ROLES[role].cost;
  if (!spend(cost)) { toast('Uang tidak cukup untuk merekrut ' + role); return; }
  const n = makeNpc(role);
  claim(s);
  n.spot = s;
  n.path = planPath(n, s);
  npcs.push(n);
  addProducer(n.producer);
  toast(n.name + ' (' + role + ') bergabung (-' + fmt(cost) + ')');
  updateInfo();
}

function fireLast() {
  const n = npcs.pop();
  if (!n) { toast('Belum ada karyawan'); return; }
  release(n);
  scene.remove(n.group);
  removeProducer(n.producer);
  toast(n.name + ' diberhentikan');
  updateInfo();
}

// ---------- Panel rekrut (tombol H) ----------
export function isHireOpen() { return open; }
export function closeHire() { open = false; if (bar) bar.style.display = 'none'; }
function openHire() { closeOthers('hire'); open = true; bar.style.display = 'flex'; updateInfo(); }

export function npcKey(code, building) {
  if (code === 'KeyH') {
    if (open) closeHire();
    else if (building) toast('Keluar Build Mode dulu (tekan B)');
    else openHire();
    return;
  }
  if (!open || building) return;
  const roles = Object.keys(ROLES);
  if (code.startsWith('Digit')) {
    const i = parseInt(code.slice(5), 10) - 1;
    if (i >= 0 && i < roles.length) hire(roles[i]);
    else if (i === roles.length) fireLast();
  }
}

function btn(label, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
  bar.appendChild(b);
}

export function initNpc(s) {
  scene = s;
  registerPanel('hire', closeHire);
  bar = document.getElementById('hirebar');
  const title = document.createElement('b');
  title.textContent = 'Rekrut Karyawan';
  bar.appendChild(title);
  const roles = Object.keys(ROLES);
  roles.forEach((r, i) => btn((i + 1) + ' ' + r + ' ' + fmt(ROLES[r].cost), () => hire(r)));
  btn((roles.length + 1) + ' Pecat terakhir', fireLast);
  btn('Tutup', closeHire);
  info = document.createElement('div');
  info.className = 'hint';
  bar.appendChild(info);
  const need = document.createElement('div');
  need.className = 'hint';
  need.textContent = 'Programmer: Komputer · Designer: Design Station · Admin: meja resepsionis · Sysadmin: Server';
  bar.appendChild(need);
  updateInfo();
}

// ---------- Simpan dan muat ----------
export function serializeNpcs() {
  return { hired, list: npcs.map((n) => ({ name: n.name, role: n.role })) };
}

export function restoreNpcs(data) {
  if (!data || !Array.isArray(data.list)) return;
  if (Number.isFinite(data.hired)) hired = data.hired;
  for (const e of data.list) {
    if (!e || !ROLES[e.role] || npcs.length >= MAX_NPC) continue;
    const name = typeof e.name === 'string' ? e.name.slice(0, 12) : undefined;
    const n = makeNpc(e.role, name || undefined);
    npcs.push(n);
    addProducer(n.producer);
    tryAssign(n);
  }
  updateInfo();
}
