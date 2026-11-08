// Karakter pemain: model, gerak, lompat, animasi jalan
import * as THREE from 'three';
import { input } from './input.js';
import { collide } from './collision.js';

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

export function createPlayer(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const part = (geo, color, y, x = 0) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y, 0);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  part(new THREE.BoxGeometry(0.55, 0.75, 0.3), 0x2f6fd0, 1.15);               // badan
  part(new THREE.BoxGeometry(0.36, 0.36, 0.36), 0xf1c9a5, 1.75);              // kepala
  part(new THREE.BoxGeometry(0.3, 0.08, 0.05), 0x1a1f27, 1.78).position.z = -0.19; // visor (depan)
  const legGeo = new THREE.BoxGeometry(0.22, 0.75, 0.24); legGeo.translate(0, -0.375, 0);
  const armGeo = new THREE.BoxGeometry(0.16, 0.7, 0.2); armGeo.translate(0, -0.3, 0);
  const legL = part(legGeo, 0x28303d, 0.77, -0.15), legR = part(legGeo, 0x28303d, 0.77, 0.15);
  const armL = part(armGeo, 0x2f6fd0, 1.48, -0.37), armR = part(armGeo, 0x2f6fd0, 1.48, 0.37);

  group.position.set(0, 0, 9.5);

  let vy = 0, grounded = true, walkT = 0, faceA = 0;

  function update(dt, fp) {
    const k = input.keys, yaw = input.yaw;
    let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + input.joyX;
    let iz = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + input.joyZ;
    const il = Math.hypot(ix, iz);
    if (il > 1) { ix /= il; iz /= il; }
    const run = k.ShiftLeft || k.ShiftRight || input.joyRun;
    const speed = run ? 7 : 4;

    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
    const moving = il > 0.05;

    group.position.x += mx * speed * dt;
    group.position.z += mz * speed * dt;

    if ((k.Space || k.JumpBtn) && grounded) { vy = 7.5; grounded = false; }
    vy -= 22 * dt;
    group.position.y += vy * dt;
    if (group.position.y <= 0) { group.position.y = 0; vy = 0; grounded = true; }

    collide(group.position);

    // arah badan
    const target = fp ? yaw : moving ? Math.atan2(-mx, -mz) : faceA;
    let da = target - faceA;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    faceA += da * Math.min(1, dt * 12);
    group.rotation.y = faceA;

    // animasi jalan
    if (moving && grounded) walkT += dt * (run ? 13 : 9); else walkT *= 0.9;
    const sw = moving ? Math.sin(walkT) * 0.7 : 0;
    legL.rotation.x = sw; legR.rotation.x = -sw;
    armL.rotation.x = -sw; armR.rotation.x = sw;
    return { moving, run: !!run, grounded };
  }

  return { group, update };
}
