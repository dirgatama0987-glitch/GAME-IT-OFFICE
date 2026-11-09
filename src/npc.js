// Sistem NPC karyawan (tahap 6): rekrut, berjalan lewat waypoint, duduk, bekerja, rapat, istirahat
import * as THREE from 'three';
import { roomAt } from './world.js';
import { spend, addProducer, removeProducer, fmt } from './economy.js';
import { toast, assistDoors, findPcNear } from './interact.js';
import { getPlacedPcs } from './build.js';
import { prog, maxEmployees, registerPanel, closeOthers } from './progress.js';

const MAX_NPC = 8, SALARY = 1, WORK_INCOME = 5, SPEED = 1.7;

const ROLES = {
  Programmer: { cost: 600, color: 0x7b3fe4, hair: 0x2a1d14, weights: { work: 0.6, server: 0.2, meet: 0.1, rest: 0.1 } },
  Designer: { cost: 500, color: 0xe46a3f, hair: 0x5a2d14, weights: { work: 0.6, meet: 0.25, rest: 0.15 } },
  Admin: { cost: 400, color: 0x2fa36a, hair: 0x1a1a1a, weights: { reception: 0.55, work: 0.25, meet: 0.1, rest: 0.1 } }
};
const NAMES = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hadi'];
const DUR = { work: () => 25 + Math.random() * 20, meet: () => 12 + Math.random() * 6, server: () => 8, rest: () => 10, reception: () => 20 };

// ---------- Waypoint: pintu dan titik tengah ruangan ----------
const NODE = {
  OUT: [0, 14], DEN: [0, 12], RS: [0, 10], RE: [5.5, 9.5], RN1: [5.5, 5.2], RN2: [1, 5.2], DWS: [1, 4],
  WSC: [0, 1], WSN: [0, -5],
  A: [-5, -5], B: [-5, -8], DCEO: [-6, -8], CEOH: [-8, -8],
  C: [-5, 0], DMEET: [-6, 0], MEETH: [-7.5, 0],
  D: [5, -5], E: [5, -8], DSRV: [8, -8], SRVH: [10, -8],
  F: [6, 0], DDEV: [8, 0], DEVH: [10, 0]
};
const EDGES = [
  ['OUT', 'DEN'], ['DEN', 'RS'], ['RS', 'RE'], ['RE', 'RN1'], ['RN1', 'RN2'], ['RN2', 'DWS'], ['DWS', 'WSC'],
  ['WSC', 'WSN'], ['WSN', 'A'], ['A', 'B'], ['B', 'DCEO'], ['DCEO', 'CEOH'],
  ['WSC', 'C'], ['C', 'DMEET'], ['DMEET', 'MEETH'],
  ['WSN', 'D'], ['D', 'E'], ['E', 'DSRV'], ['DSRV', 'SRVH'],
  ['WSC', 'F'], ['F', 'DDEV'], ['DDEV', 'DEVH']
];
const adj = {};
Object.keys(NODE).forEach((k) => { adj[k] = []; });
EDGES.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
const gap = (a, b) => Math.hypot(NODE[a][0] - NODE[b][0], NODE[a][1] - NODE[b][1]);

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
const pt = (id) => ({ x: NODE[id][0], z: NODE[id][1] });

// ---------- Tempat kerja dan aktivitas ----------
const HUBS = { Reception: 'RS', 'Main Workspace': 'WSC', 'Server Room': 'SRVH', 'Development Room': 'DEVH', 'CEO Room': 'CEOH', 'Meeting Room': 'MEETH' };
const spot = (kind, x, z, rot, hub, via, sit, pcAt) => ({ kind, x, z, rot, hub, via, sit, pcAt, busy: false });
const STATIC = {
  work: [
    spot('work', -2.5, -6.9, 0, 'WSC', [[0, -5], [-2.5, -5]], true, [-2.5, -8.55]),
    spot('work', 2.5, -6.9, 0, 'WSC', [[0, -5], [2.5, -5]], true, [2.5, -8.55]),
    spot('work', -2.5, -0.9, 0, 'WSC', [[-2.5, 0.6]], true, [-2.5, -2.55]),
    spot('work', 2.5, -0.9, 0, 'WSC', [[2.5, 0.6]], true, [2.5, -2.55]),
    spot('work', 13.25, 3.55, 0, 'DEVH', [[10, 3.55]], true, [13.25, 2.2]),
    spot('work', -13.5, -8.9, 0, 'CEOH', [[-13.5, -7.5]], true, [-13.5, -10.6])
  ],
  meet: [
    spot('meet', -12, -2.1, Math.PI, 'MEETH', [[-7.5, -2.1]], true),
    spot('meet', -10, -2.1, Math.PI, 'MEETH', [[-7.5, -2.1]], true),
    spot('meet', -12, 2.1, 0, 'MEETH', [[-7.5, 2.1]], true),
    spot('meet', -10, 2.1, 0, 'MEETH', [[-7.5, 2.1]], true)
  ],
  server: [spot('server', 13.25, -8, Math.PI / 2, 'SRVH', [[10, -4.6], [13.25, -4.6]], false)],
  reception: [spot('reception', 0, 5.4, Math.PI, 'RN2', [], false)],
  rest: [spot('rest', -12, 11, 0, 'RS', [[-12, 10]], true)]
};

// komputer yang dibeli pemain juga menjadi tempat kerja
function dynamicWork() {
  const res = [];
  for (const it of getPlacedPcs()) {
    const hub = HUBS[roomAt(it.x, it.z)];
    if (!hub) continue;
    const th = (it.rot * Math.PI) / 2;
    res.push({ kind: 'work', x: it.x + Math.sin(th) * 0.95, z: it.z + Math.cos(th) * 0.95, rot: th, hub, via: [], sit: true, item: it });
  }
  return res;
}
const busy = (s) => (s.item ? !!s.item.npcBusy : s.busy);
const claim = (s) => { if (s.item) s.item.npcBusy = true; else s.busy = true; };
const free = (s) => { if (s.item) s.item.npcBusy = false; else s.busy = false; };

function pick(kind) {
  const all = kind === 'work' ? STATIC.work.concat(dynamicWork()) : STATIC[kind];
  const list = all.filter((s) => !busy(s));
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

function chooseTask(role) {
  const w = ROLES[role].weights;
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) return k; }
  return 'work';
}

// ---------- Model orang ----------
const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

function makePerson(shirt, hair) {
  const group = new THREE.Group();
  const part = (geo, color, y, x = 0, z = 0) => {
    const m = new THREE.Mesh(geo, lam(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  const SKIN = 0xf1c9a5, PANTS = 0x28303d, SHOE = 0x1b1e24;
  part(new THREE.CapsuleGeometry(0.26, 0.3, 6, 16), shirt, 1.18);
  part(new THREE.SphereGeometry(0.21, 24, 16), SKIN, 1.78);
  part(new THREE.SphereGeometry(0.225, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 1.8, 0, 0.025);
  part(new THREE.SphereGeometry(0.03, 8, 8), 0x14171c, 1.79, -0.08, -0.19);
  part(new THREE.SphereGeometry(0.03, 8, 8), 0x14171c, 1.79, 0.08, -0.19);
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.6, 4, 12); legGeo.translate(0, -0.4, 0);
  const armGeo = new THREE.CapsuleGeometry(0.07, 0.45, 4, 10); armGeo.translate(0, -0.3, 0);
  const legL = part(legGeo, PANTS, 0.8, -0.13), legR = part(legGeo, PANTS, 0.8, 0.13);
  const armL = part(armGeo, shirt, 1.46, -0.35), armR = part(armGeo, shirt, 1.46, 0.35);
  [legL, legR].forEach((l) => {
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), lam(SHOE));
    shoe.scale.set(1, 0.6, 1.5); shoe.position.set(0, -0.76, -0.05); shoe.castShadow = true; l.add(shoe);
  });
  [armL, armR].forEach((a) => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lam(SKIN));
    hand.position.set(0, -0.55, 0); a.add(hand);
  });
  return { group, legL, legR, armL, armR };
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
  s.position.set(0, 2.25, 0);
  return s;
}

// ---------- NPC ----------
const npcs = [];
let scene = null, bar = null, info = null, open = false, hired = 0;

export function getNpcs() { return npcs; }
export const DEBUG = { NODE, EDGES, STATIC };

function makeNpc(role) {
  const def = ROLES[role];
  const p = makePerson(def.color, def.hair);
  const name = NAMES[hired++ % NAMES.length];
  p.group.add(makeLabel(name + ' · ' + role));
  p.group.position.set(0, 0, 14); // masuk dari luar lewat pintu utama
  scene.add(p.group);
  const n = { name, role, group: p.group, legL: p.legL, legR: p.legR, armL: p.armL, armR: p.armR,
    state: 'walk', timer: 0, t: Math.random() * 10, walkT: 0, face: 0, path: [], spot: null, returning: false, pcOnByMe: null, at: 'RS' };
  n.path = route('OUT', 'RS').map(pt);
  const gross = () => (n.state === 'act' && n.spot && n.spot.kind === 'work' ? WORK_INCOME : 0);
  n.producer = { kind: 'npc', salary: SALARY, gross, income: () => gross() - SALARY };
  return n;
}

function think(n) {
  let task = chooseTask(n.role);
  let s = pick(task) || pick('work') || pick('rest');
  const ids = s ? route(n.at, s.hub) : null;
  if (!s || !ids) { n.state = 'idle'; n.timer = 3; return; }
  claim(s);
  n.spot = s;
  n.path = ids.map(pt).concat(s.via.map(([x, z]) => ({ x, z })), [{ x: s.x, z: s.z }]);
  n.at = s.hub;
  n.returning = false;
  n.state = 'walk';
}

function arrive(n) {
  if (n.returning) { n.returning = false; n.state = 'idle'; n.timer = 1 + Math.random() * 2; return; }
  const s = n.spot;
  if (!s) { n.state = 'idle'; n.timer = 1; return; }
  n.face = s.rot;
  n.group.rotation.y = n.face;
  n.state = 'act';
  n.timer = DUR[s.kind]();
  if (s.kind === 'work') {
    const pc = s.item ? s.item.pc : findPcNear(s.pcAt[0], s.pcAt[1], 0.3);
    if (pc && pc.setOn && !pc.on) { pc.setOn(true); n.pcOnByMe = pc; }
  }
}

function leave(n) {
  const s = n.spot;
  free(s);
  if (s.kind === 'work') prog.sessions += 1;
  if (n.pcOnByMe) { n.pcOnByMe.setOn(false); n.pcOnByMe = null; }
  n.path = s.via.slice().reverse().map(([x, z]) => ({ x, z })).concat([pt(s.hub)]);
  n.spot = null;
  n.returning = true;
  n.state = 'walk';
}

function swing(n, dt, walking) {
  n.group.position.y = 0;
  if (walking) n.walkT += dt * 9; else n.walkT *= 0.9;
  const sw = walking ? Math.sin(n.walkT) * 0.7 : 0;
  n.legL.rotation.x = sw; n.legR.rotation.x = -sw;
  n.armL.rotation.x = -sw; n.armR.rotation.x = sw;
}

function poseAct(n) {
  const s = n.spot;
  if (s.sit) {
    n.group.position.y = -0.28;
    n.legL.rotation.x = n.legR.rotation.x = 1.45;
    const type = s.kind === 'work' ? Math.sin(n.t * 9) * 0.08 : 0;
    n.armL.rotation.x = 1.0 + type; n.armR.rotation.x = 1.0 - type;
  } else {
    n.group.position.y = 0;
    n.legL.rotation.x = n.legR.rotation.x = 0;
    n.armL.rotation.x = n.armR.rotation.x = 0;
  }
}

function walkStep(n, dt) {
  const t = n.path[0], g = n.group.position;
  const dx = t.x - g.x, dz = t.z - g.z, d = Math.hypot(dx, dz), step = SPEED * dt;
  if (d <= step) { g.x = t.x; g.z = t.z; n.path.shift(); return n.path.length === 0; }
  g.x += (dx / d) * step; g.z += (dz / d) * step;
  let da = Math.atan2(-dx, -dz) - n.face;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  n.face += da * Math.min(1, dt * 10);
  n.group.rotation.y = n.face;
  return false;
}

function stepNpc(n, dt) {
  n.t += dt;
  if (n.state === 'walk') {
    const arrived = n.path.length === 0 ? true : walkStep(n, dt);
    swing(n, dt, true);
    if (arrived) arrive(n);
  } else if (n.state === 'act') {
    if (n.spot.item && n.spot.item.removed) { leave(n); return; }
    poseAct(n);
    n.timer -= dt;
    if (n.timer <= 0) leave(n);
  } else {
    swing(n, dt, false);
    n.timer -= dt;
    if (n.timer <= 0) think(n);
  }
}

export function updateNpcs(dt) {
  const pts = [];
  for (const n of npcs) { stepNpc(n, dt); pts.push(n.group.position); }
  assistDoors(pts); // pintu terbuka otomatis saat karyawan lewat
}

// ---------- Rekrut dan pecat ----------
function updateInfo() {
  if (info) info.textContent = 'Karyawan: ' + npcs.length + '/' + maxEmployees() + ' · gaji $' + SALARY + '/dtk per orang · bekerja +$' + WORK_INCOME + '/dtk';
}

function release(n) {
  if (n.spot) free(n.spot);
  if (n.pcOnByMe) { n.pcOnByMe.setOn(false); n.pcOnByMe = null; }
}

function hire(role) {
  if (npcs.length >= maxEmployees()) { toast('Kapasitas penuh (' + maxEmployees() + '). Naik level untuk menambah'); return; }
  const cost = ROLES[role].cost;
  if (!spend(cost)) { toast('Uang tidak cukup untuk merekrut ' + role); return; }
  const n = makeNpc(role);
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
  if (code === 'Digit1') hire('Programmer');
  else if (code === 'Digit2') hire('Designer');
  else if (code === 'Digit3') hire('Admin');
  else if (code === 'Digit4') fireLast();
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
  Object.keys(ROLES).forEach((r, i) => btn((i + 1) + ' ' + r + ' ' + fmt(ROLES[r].cost), () => hire(r)));
  btn('4 Pecat terakhir', fireLast);
  btn('Tutup', closeHire);
  info = document.createElement('div');
  info.className = 'hint';
  bar.appendChild(info);
  updateInfo();
}

const KIND_TEXT = { work: 'Bekerja', meet: 'Rapat', server: 'Cek server', reception: 'Jaga resepsionis', rest: 'Istirahat' };
export function statusOf(n) {
  if (n.state === 'act' && n.spot) return KIND_TEXT[n.spot.kind] || 'Bekerja';
  return n.state === 'walk' ? 'Berjalan' : 'Menunggu';
}
