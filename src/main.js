import './style.css';
import * as THREE from 'three';
import { buildWorld, roomAt } from './world.js';
import { createPlayer } from './player.js';
import { camera, view, toggleView, zoomView, updateCamera } from './camera.js';
import { input, initInput, coarse } from './input.js';
import { buildInteractives, updateInteractives, useNearest } from './interact.js';
import { updateEconomy } from './economy.js';
import { initBuild, updateBuild, buildKey, buildConfirm, isBuilding } from './build.js';
import { initNpc, updateNpcs, npcKey, isHireOpen, closeHire } from './npc.js';
import { initCompany, updateCompany, companyKey, isDashOpen } from './company.js';
import { initSave, loadGame, updateSave, saveKey } from './save.js';
import { initFloors, floorsKey, updateFloors } from './floors.js';
import { prog, floorOf } from './progress.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
let pr = Math.min(devicePixelRatio, coarse ? 1.5 : 2); // HP lebih rendah agar ringan
renderer.setPixelRatio(pr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
buildWorld(scene);
buildInteractives(scene);
initBuild(scene);
initNpc(scene);
initCompany(scene);
const player = createPlayer(scene);
initFloors(scene, player);

// muat progres tersimpan (jika ada), lalu aktifkan simpan otomatis
const loaded = loadGame();
initSave(player.group);
if (loaded && loaded.player) {
  const sp = loaded.player;
  if (Math.abs(sp.x) < 40 && Math.abs(sp.z) < 40 && Number.isFinite(sp.yaw)) {
    player.setFloor(Number.isFinite(sp.fl) && sp.fl >= 0 && sp.fl <= prog.floors ? sp.fl : 0);
    player.group.position.x = sp.x;
    player.group.position.z = sp.z;
    input.yaw = sp.yaw;
  }
}

input.onToggleCam = toggleView;
input.onZoom = zoomView;
input.onInteract = () => (isBuilding() ? buildConfirm() : useNearest());
input.onKey = (code) => {
  if (code === 'KeyB' && isHireOpen()) closeHire();
  buildKey(code);
  npcKey(code, isBuilding());
  companyKey(code, isBuilding());
  saveKey(code, isDashOpen());
  floorsKey(code);
};
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
const fpsEl = document.getElementById('fps');
let fpsAcc = 0, fpsN = 0, lowCount = 0;
let last = performance.now(), locT = 0;

function tick(now) {
  const raw = (now - last) / 1000;
  const dt = Math.min(0.05, raw);
  last = now;

  // penghitung FPS; bila terus di bawah 28 FPS, resolusi diturunkan bertahap
  fpsAcc += raw; fpsN++;
  if (fpsAcc >= 0.5) {
    const fps = fpsN / fpsAcc;
    fpsEl.textContent = Math.round(fps);
    lowCount = fps < 28 && input.started ? lowCount + 1 : 0;
    if (lowCount >= 4 && pr > 0.75) { pr = Math.max(0.75, pr - 0.25); renderer.setPixelRatio(pr); resize(); lowCount = 0; }
    fpsAcc = 0; fpsN = 0;
  }

  if (input.started) {
    const st = player.update(dt, view.fp);
    updateCamera(dt, player.group, input.yaw, input.pitch, st);
    updateInteractives(dt, player.group.position);
    updateEconomy(dt);
    updateBuild(dt, player.group.position, input.yaw);
    updateNpcs(dt);
    updateCompany(dt, player.group.position);
    updateSave(dt);
    updateFloors(dt, player.group.position);
    locT += dt;
    if (locT > 0.2) {
      locT = 0;
      const fl = floorOf(player.group.position.y);
      locEl.textContent = fl > 0 ? 'Lantai ' + (fl + 1) : roomAt(player.group.position.x, player.group.position.z);
    }
  } else {
    camera.position.set(0, 14, 24);
    camera.lookAt(0, 0, 0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
