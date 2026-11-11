// Kamera first person dan third person (tombol V, scroll untuk zoom)
import * as THREE from 'three';
import { rayClip } from './collision.js';
import { FLOOR_H, floorOf } from './progress.js';

export const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);

export const view = {
  fp: false,     // mode tujuan
  zoom: 4.2,     // jarak kamera di third person
  dist: 4.2,     // jarak kamera saat ini (animasi halus saat ganti mode)
  clip: 1,       // 1 = bebas, <1 = ditarik mendekat karena terhalang dinding
  fov: 70,
  bobT: 0,
  bobAmp: 0
};

const dir = new THREE.Vector3();
const head = new THREE.Vector3();
const want = new THREE.Vector3();

export function toggleView() {
  view.fp = !view.fp;
  document.getElementById('cm').textContent = view.fp ? 'First person' : 'Third person';
  document.getElementById('cross').style.display = view.fp ? 'block' : 'none';
}

export function zoomView(delta) {
  view.zoom = Math.max(2, Math.min(8, view.zoom + delta));
}

// st = { moving, run, grounded } dari player.update
export function updateCamera(dt, playerGroup, yaw, pitch, st) {
  const k = 1 - Math.exp(-dt * 10);

  // jarak kamera bergerak halus ke tujuan (0 = mata karakter)
  const goal = view.fp ? 0 : view.zoom;
  view.dist += (goal - view.dist) * k;
  if (Math.abs(goal - view.dist) < 0.02) view.dist = goal;

  // head bob: hanya terasa di first person
  const walking = st.moving && st.grounded;
  if (walking) view.bobT += dt * (st.run ? 13 : 9);
  view.bobAmp += ((walking ? 1 : 0) - view.bobAmp) * k;
  const fpWeight = Math.max(0, 1 - view.dist / 1.2);
  const bob = Math.abs(Math.sin(view.bobT)) * (st.run ? 0.07 : 0.045) * view.bobAmp * fpWeight;

  const { x, y, z } = playerGroup.position;
  head.set(x, y + 1.65 + bob, z);
  dir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));

  // posisi kamera yang diinginkan, lalu cek apakah ada dinding/perabot di jalur
  want.copy(head).addScaledVector(dir, -view.dist);
  want.y = Math.max(floorOf(y) * FLOOR_H + 0.3, want.y);
  let targetClip = 1;
  if (view.dist > 0.05) {
    const c = rayClip(head, want);
    if (c < 1) targetClip = Math.max(0, c - 0.25 / view.dist);
  }
  // tertahan: langsung maju; bebas: kembali pelan agar tidak kedip
  if (targetClip < view.clip) view.clip = targetClip;
  else view.clip += (targetClip - view.clip) * (1 - Math.exp(-dt * 6));

  camera.position.lerpVectors(head, want, view.clip);
  camera.lookAt(camera.position.x + dir.x, camera.position.y + dir.y, camera.position.z + dir.z);

  // karakter tidak terlihat bila kamera terlalu dekat (first person atau terjepit dinding)
  playerGroup.visible = view.dist * view.clip > 0.9;

  // FOV melebar sedikit saat berlari
  const fovGoal = 70 + (st.run && st.moving ? 8 : 0);
  if (Math.abs(fovGoal - view.fov) > 0.01) {
    view.fov += (fovGoal - view.fov) * k;
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }
}
