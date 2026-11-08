// Tabrakan lingkaran (karakter) vs kotak (dinding dan perabot) pada bidang XZ
import { solids } from './world.js';

export const RADIUS = 0.4;

export function collide(p) {
  for (let it = 0; it < 3; it++) {
    for (const s of solids) {
      const cx = Math.max(s.x1, Math.min(p.x, s.x2));
      const cz = Math.max(s.z1, Math.min(p.z, s.z2));
      const dx = p.x - cx, dz = p.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < RADIUS) {
        if (d > 1e-6) {
          p.x += (dx / d) * (RADIUS - d);
          p.z += (dz / d) * (RADIUS - d);
        } else {
          const l = p.x - s.x1, r = s.x2 - p.x, t = p.z - s.z1, b = s.z2 - p.z;
          const m = Math.min(l, r, t, b);
          if (m === l) p.x = s.x1 - RADIUS;
          else if (m === r) p.x = s.x2 + RADIUS;
          else if (m === t) p.z = s.z1 - RADIUS;
          else p.z = s.z2 + RADIUS;
        }
      }
    }
  }
}

// Sinar dari titik 'from' ke 'to' vs kotak 3D (dinding dan perabot).
// Mengembalikan 0..1 = posisi tabrakan pertama di sepanjang sinar, atau 1 jika bebas.
export function rayClip(from, to) {
  let tmin = 1;
  const d = [to.x - from.x, to.y - from.y, to.z - from.z];
  const o = [from.x, from.y, from.z];
  for (const s of solids) {
    const lo = [s.x1, 0, s.z1], hi = [s.x2, s.h, s.z2];
    let t0 = 0, t1 = 1, hit = true;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-8) {
        if (o[i] < lo[i] || o[i] > hi[i]) { hit = false; break; }
      } else {
        let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i];
        if (a > b) { const t = a; a = b; b = t; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) { hit = false; break; }
      }
    }
    if (hit && t0 < tmin) tmin = t0;
  }
  return tmin;
}
