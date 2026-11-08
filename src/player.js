// Karakter pemain: model, gerak, lompat, animasi jalan
import * as THREE from 'three';
import { input } from './input.js';
import { collide } from './collision.js';

const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

export function createPlayer(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const part = (geo, color, y, x = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat(color));
    m.position.set(x, y, z);
    m.castShadow = true;
    group.add(m);
    return m;
  };
  const SKIN = 0xf1c9a5, SHIRT = 0x2f6fd0, PANTS = 0x28303d, HAIR = 0x2a1d14, SHOE = 0x1b1e24;
  part(new THREE.CapsuleGeometry(0.26, 0.3, 6, 16), SHIRT, 1.18);                                         // badan
  part(new THREE.SphereGeometry(0.21, 24, 16), SKIN, 1.78);                                                // kepala
  part(new THREE.SphereGeometry(0.225, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), HAIR, 1.8, 0, 0.025);  // rambut
  part(new THREE.SphereGeometry(0.03, 8, 8), 0x14171c, 1.79, -0.08, -0.19);                                // mata
  part(new THREE.SphereGeometry(0.03, 8, 8), 0x14171c, 1.79, 0.08, -0.19);
  const legGeo = new THREE.CapsuleGeometry(0.1, 0.6, 4, 12); legGeo.translate(0, -0.4, 0);
  const armGeo = new THREE.CapsuleGeometry(0.07, 0.45, 4, 10); armGeo.translate(0, -0.3, 0);
  const legL = part(legGeo, PANTS, 0.8, -0.13), legR = part(legGeo, PANTS, 0.8, 0.13);
  const armL = part(armGeo, SHIRT, 1.46, -0.35), armR = part(armGeo, SHIRT, 1.46, 0.35);
  [legL, legR].forEach((l) => {   // sepatu ikut bergerak bersama kaki
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), mat(SHOE));
    shoe.scale.set(1, 0.6, 1.5); shoe.position.set(0, -0.76, -0.05); shoe.castShadow = true; l.add(shoe);
  });
  [armL, armR].forEach((a) => {   // tangan
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(SKIN));
    hand.position.set(0, -0.55, 0); a.add(hand);
  });

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
