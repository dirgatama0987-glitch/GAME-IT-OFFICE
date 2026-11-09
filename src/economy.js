// Ekonomi tycoon: uang virtual, penghasilan per detik, dan tampilan uang di layar
export const INCOME = { pc: 3, server: 4 }; // uang per detik

export const eco = { money: 3000, income: 0 };

const producers = []; // objek yang menghasilkan uang (komputer menyala, server)
let shown = '';

export function addProducer(p) { producers.push(p); }
export function removeProducer(p) {
  const i = producers.indexOf(p);
  if (i >= 0) producers.splice(i, 1);
}

export function fmt(n) { return '$' + Math.floor(n).toLocaleString('id-ID'); }
export function canAfford(n) { return eco.money >= n; }

function render() {
  const el = document.getElementById('money');
  if (!el) return;
  const t = 'Uang: ' + fmt(eco.money) + ' (+' + fmt(eco.income) + '/dtk)';
  if (t !== shown) { shown = t; el.textContent = t; }
}

export function spend(n) {
  if (eco.money < n) return false;
  eco.money -= n;
  render();
  return true;
}

export function earn(n) {
  eco.money += n;
  render();
}

export function updateEconomy(dt) {
  let inc = 0;
  for (const p of producers) inc += p.income();
  eco.income = inc;
  eco.money += inc * dt;
  if (eco.money < 0) eco.money = 0;
  render();
}

// rincian penghasilan per detik untuk Dashboard keuangan
export function breakdown() {
  const b = { pc: 0, server: 0, work: 0, salary: 0 };
  for (const p of producers) {
    if (p.kind === 'pc') b.pc += p.income();
    else if (p.kind === 'server') b.server += p.income();
    else if (p.kind === 'npc') { b.work += p.gross(); b.salary += p.salary; }
  }
  return b;
}
