import './style.css';
import * as THREE from 'three';
import { buildWorld, roomAt } from './world.js';
import { createPlayer } from './player.js';
import { camera, view, toggleView, zoomView, updateCamera } from './camera.js';
import { input, initInput } from './input.js';
import { buildInteractives, updateInteractives, useNearest } from './interact.js';
import { updateEconomy } from './economy.js';
import { initBuild, updateBuild, buildKey, buildConfirm, isBuilding } from './build.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
buildWorld(scene);
buildInteractives(scene);
initBuild(scene);
const player = createPlayer(scene);

input.onToggleCam = toggleView;
input.onZoom = zoomView;
input.onInteract = () => (isBuilding() ? buildConfirm() : useNearest());
input.onKey = buildKey;
input.onPrimary = buildConfirm;
initInput(renderer.domElement);
updateEconomy(0);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const locEl = document.getElementById('loc');
let last = performance.now(), locT = 0;

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.started) {
    const st = player.update(dt, view.fp);
    updateCamera(dt, player.group, input.yaw, input.pitch, st);
    updateInteractives(dt, player.group.position);
    updateEconomy(dt);
    updateBuild(dt, player.group.position, input.yaw);
    locT += dt;
    if (locT > 0.2) {
      locT = 0;
      locEl.textContent = roomAt(player.group.position.x, player.group.position.z);
    }
  } else {
    camera.position.set(0, 14, 24);
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
