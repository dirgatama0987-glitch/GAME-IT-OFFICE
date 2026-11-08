// Dunia 3D: lantai, dinding, ruangan, perabot, dan daftar objek padat (collider)
import * as THREE from 'three';

export const solids = [];

// [nama, x1, z1, x2, z2, warna lantai]
export const rooms = [
  ['Reception', -16, 4, 16, 12, 0xd7c9a8],
  ['Main Workspace', -6, -12, 8, 4, 0xb8c4d6],
  ['Server Room', 8, -12, 16, -4, 0x6b7686],
  ['Development Room', 8, -4, 16, 4, 0xa9d1b8],
  ['CEO Room', -16, -12, -6, -4, 0xd9b88a],
  ['Meeting Room', -16, -4, -6, 4, 0xc9b6d9]
];

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

export function addBox(scene, x1, z1, x2, z2, h, color, collide = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, h, z2 - z1), mat(color));
  m.position.set((x1 + x2) / 2, h / 2, (z1 + z2) / 2);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  if (collide) solids.push({ x1, z1, x2, z2, h });
  return m;
}

function wall(scene, x1, z1, x2, z2) {
  const t = 0.15;
  if (z1 === z2) addBox(scene, x1, z1 - t, x2, z1 + t, 3, 0xe9e4da);
  else addBox(scene, x1 - t, z1, x1 + t, z2, 3, 0xe9e4da);
}

function floor(scene, x1, z1, x2, z2, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x2 - x1, z2 - z1), mat(color));
  m.rotation.x = -Math.PI / 2;
  m.position.set((x1 + x2) / 2, 0.01, (z1 + z2) / 2);
  m.receiveShadow = true;
  scene.add(m);
}

function label(scene, text, x, z) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,24,31,.82)'; g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  s.scale.set(4, 0.75, 1);
  s.position.set(x, 2.7, z);
  scene.add(s);
}

export function buildWorld(scene) {
  scene.background = new THREE.Color(0xbfd8ee);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55);
  sun.position.set(12, 26, 14);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 70 });
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat(0x7fae6b));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);

  rooms.forEach((r) => {
    floor(scene, r[1], r[2], r[3], r[4], r[5]);
    label(scene, r[0], (r[1] + r[3]) / 2, (r[2] + r[4]) / 2);
  });

  // dinding luar (pintu masuk di sisi selatan)
  wall(scene, -16, 12, -2, 12); wall(scene, 2, 12, 16, 12);
  wall(scene, -16, -12, 16, -12);
  wall(scene, -16, -12, -16, 12); wall(scene, 16, -12, 16, 12);
  // dinding dalam (celah = jalur masuk; pintu menyusul di tahap 3)
  wall(scene, -16, 4, -1, 4); wall(scene, 3, 4, 16, 4);
  [-6, 8].forEach((x) => {
    wall(scene, x, -12, x, -9); wall(scene, x, -7, x, -1); wall(scene, x, 1, x, 4);
  });
  wall(scene, -16, -4, -6, -4); wall(scene, 8, -4, 16, -4);

  // perabot uji (tahap 4 akan diganti sistem Build Mode)
  addBox(scene, -4, 6.5, 4, 8, 1, 0x7a5c3a);        // meja reception
  addBox(scene, -13, -1.5, -9, 1.5, 0.9, 0x8a6a4a);  // meja meeting
  addBox(scene, -4, -9, -1, -7.5, 0.8, 0x9aa3b2);
  addBox(scene, 1, -9, 4, -7.5, 0.8, 0x9aa3b2);
  addBox(scene, -4, -3, -1, -1.5, 0.8, 0x9aa3b2);
  addBox(scene, 1, -3, 4, -1.5, 0.8, 0x9aa3b2);
  addBox(scene, 14, -11.5, 15.5, -5, 2.2, 0x2b303a); // rak server
  addBox(scene, 11, -11.5, 12.5, -5, 2.2, 0x2b303a);
  addBox(scene, 11, 1.8, 15.5, 3.2, 0.8, 0x9aa3b2);  // meja dev
  addBox(scene, -15, -11, -12, -9.5, 0.9, 0x6b4a2f); // meja CEO
}

export function roomAt(x, z) {
  for (const r of rooms) if (x >= r[1] && x <= r[3] && z >= r[2] && z <= r[4]) return r[0];
  return 'Di luar gedung';
}
