// Status perusahaan bersama: XP, level, perluasan kantor, hitungan sesi kerja, dan daftar panel
export const prog = { xp: 0, expanded: false, sessions: 0 };

const STEP = 100; // XP per level
export const level = () => 1 + Math.floor(prog.xp / STEP);
export const xpNext = () => level() * STEP;
export function addXp(n) {
  const before = level();
  prog.xp += n;
  return level() > before; // true bila naik level
}
export const maxEmployees = () => Math.min(8, 2 + level() * 2); // Lv1: 4, Lv2: 6, Lv3+: 8

const NEED = { server: 2, sofa: 2 };
export const itemLevel = (id) => NEED[id] || 1;

export const EXPANSION_COST = 2500;
export const EXPANSION_LEVEL = 2;

// hanya satu panel yang boleh terbuka dalam satu waktu
const panels = {};
export function registerPanel(name, close) { panels[name] = close; }
export function closeOthers(name) {
  for (const k of Object.keys(panels)) if (k !== name) panels[k]();
}
