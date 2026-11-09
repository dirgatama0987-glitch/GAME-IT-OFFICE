// Status perusahaan bersama: XP, level, lantai, perluasan kantor, dan daftar panel
export const prog = { xp: 0, expanded: false, sessions: 0, floors: 0 };

export const FLOOR_H = 3.3;                         // tinggi satu lantai (dinding 3,0 + pelat 0,3)
export const floorOf = (y) => Math.floor((y + 0.5) / FLOOR_H);

const STEP = 100; // XP per level
export const level = () => 1 + Math.floor(prog.xp / STEP);
export const xpNext = () => level() * STEP;
export function addXp(n) {
  const before = level();
  prog.xp += n;
  return level() > before; // true bila naik level
}
// Lv1: 4, Lv2: 6, Lv3+: 8 karyawan, ditambah 3 untuk setiap lantai tambahan
export const maxEmployees = () => Math.min(8, 2 + level() * 2) + 3 * prog.floors;

const NEED = { server: 2, ac: 2, generator: 3 };
export const itemLevel = (id) => NEED[id] || 1;

export const EXPANSION_COST = 2500;
export const EXPANSION_LEVEL = 2;

export const MAX_FLOORS = 8;                        // gedung maksimal 9 lantai
export const floorCost = (k) => 4000 * k;           // biaya lantai tambahan ke-k
export const floorLevel = (k) => 2 + k;             // level yang dibutuhkan

// hanya satu panel yang boleh terbuka dalam satu waktu
const panels = {};
export function registerPanel(name, close) { panels[name] = close; }
export function closeOthers(name) {
  for (const k of Object.keys(panels)) if (k !== name) panels[k]();
}
