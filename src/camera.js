// Kamera third person dan first person (tombol V)
import * as THREE from 'three';

export const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 200);
export const view = { fp: false };

const dir = new THREE.Vector3();
const tgt = new THREE.Vector3();

export function toggleView(playerGroup) {
  view.fp = !view.fp;
  playerGroup.visible = !view.fp; // karakter tidak terlihat di first person
  document.getElementById('cm').textContent = view.fp ? 'First person' : 'Third person';
}

export function updateCamera(playerGroup, yaw, pitch) {
  const { x, y, z } = playerGroup.position;
  dir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  if (view.fp) {
    camera.position.set(x, y + 1.7, z);
    camera.lookAt(x + dir.x, y + 1.7 + dir.y, z + dir.z);
  } else {
    tgt.set(x, y + 1.5, z);
    camera.position.copy(tgt).addScaledVector(dir, -4.2);
    camera.position.y = Math.max(0.3, camera.position.y);
    camera.lookAt(tgt);
  }
}
