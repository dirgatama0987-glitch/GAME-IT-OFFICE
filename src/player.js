// Karakter pemain: model orang, gerak, lompat, animasi jalan, dan pindah lantai
import { input } from './input.js';
import { collide } from './collision.js';
import { FLOOR_H } from './progress.js';
import { createPerson, walkPose } from './person.js';

export function createPlayer(scene) {
  const rig = createPerson({ shirt: 0x2f6fd0, pants: 0x28303d, hair: 0x2a1d14, skin: 0xf1c9a5, style: 'short', tie: 0xd9534f });
  const group = rig.group;
  scene.add(group);
  group.position.set(0, 0, 9.5);

  let vy = 0, grounded = true, walkT = 0, amt = 0, faceA = 0, floorY = 0;

  // dipakai lift: pindahkan pemain ke lantai f
  function setFloor(f) {
    floorY = f * FLOOR_H;
    group.position.y = floorY;
    vy = 0;
    grounded = true;
  }

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
    if (group.position.y <= floorY) { group.position.y = floorY; vy = 0; grounded = true; }

    collide(group.position);

    const target = fp ? yaw : moving ? Math.atan2(-mx, -mz) : faceA;
    let da = target - faceA;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    faceA += da * Math.min(1, dt * 12);
    group.rotation.y = faceA;

    if (moving && grounded) walkT += dt * (run ? 13 : 9);
    amt += ((moving && grounded ? (run ? 1.3 : 1) : 0) - amt) * Math.min(1, dt * 10);
    walkPose(rig, walkT, amt);
    return { moving, run: !!run, grounded };
  }

  return { group, update, setFloor };
}
