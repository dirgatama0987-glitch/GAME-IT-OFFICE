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
