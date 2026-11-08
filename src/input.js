// Input PC (keyboard + mouse) dan mobile (joystick + sentuh)
export const coarse = matchMedia('(pointer:coarse)').matches;

export const input = {
  keys: {},
  joyX: 0, joyZ: 0, joyRun: false,
  yaw: 0, pitch: 0.25,
  started: false,
  onToggleCam() {},
  onZoom() {},
  onInteract() {},
  onKey() {},
  onPrimary() {}
};

export function look(dx, dy) {
  input.yaw -= dx * 0.0025;
  input.pitch = Math.max(-1.2, Math.min(1.2, input.pitch - dy * 0.0025));
}

export function initInput(canvas) {
  const $ = (id) => document.getElementById(id);
  let drag = false;

  addEventListener('keydown', (e) => {
    if (!input.started) return;
    input.keys[e.code] = true;
    if (e.code === 'KeyV') input.onToggleCam();
    if (e.code === 'KeyE') input.onInteract();
    input.onKey(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', (e) => { input.keys[e.code] = false; });
  canvas.addEventListener('wheel', (e) => {
    if (!input.started) return;
    e.preventDefault();
    input.onZoom(e.deltaY * 0.003);
  }, { passive: false });

  canvas.addEventListener('mousedown', () => { if (input.started) drag = true; });
  addEventListener('mouseup', () => { drag = false; });
  addEventListener('mousemove', (e) => {
    if (!input.started || coarse) return;
    if (document.pointerLockElement || drag) look(e.movementX, e.movementY);
  });
  canvas.addEventListener('click', () => {
    if (!input.started || coarse) return;
    if (document.pointerLockElement) input.onPrimary();
    else if (canvas.requestPointerLock) canvas.requestPointerLock();
  });

  $('go').onclick = () => {
    input.started = true;
    $('ov').style.display = 'none';
    if (coarse) $('touch').style.display = 'block';
    else if (canvas.requestPointerLock) canvas.requestPointerLock();
  };
  if (coarse) $('help').textContent = 'Joystick kiri untuk jalan · geser layar kanan untuk melihat · tombol Lompat, Kamera, E (interaksi), dan Bangun';

  // joystick
  const joyEl = $('joy'), knob = $('knob');
  let jid = null, lid = null, lx = 0, ly = 0;
  function jmove(e) {
    const r = joyEl.getBoundingClientRect();
    let dx = (e.clientX - r.left - 60) / 50, dy = (e.clientY - r.top - 60) / 50;
    const l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; }
    input.joyX = dx; input.joyZ = -dy; input.joyRun = Math.hypot(dx, dy) > 0.9;
    knob.style.left = 40 + dx * 40 + 'px'; knob.style.top = 40 + dy * 40 + 'px';
  }
  joyEl.addEventListener('pointerdown', (e) => { jid = e.pointerId; joyEl.setPointerCapture(jid); jmove(e); });
  joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === jid) jmove(e); });
  const jend = (e) => {
    if (e.pointerId !== jid) return;
    jid = null; input.joyX = input.joyZ = 0; input.joyRun = false;
    knob.style.left = knob.style.top = '40px';
  };
  joyEl.addEventListener('pointerup', jend);
  joyEl.addEventListener('pointercancel', jend);

  // geser layar untuk kamera
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.clientX > innerWidth * 0.35 && lid === null) { lid = e.pointerId; lx = e.clientX; ly = e.clientY; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId === lid) { look((e.clientX - lx) * 1.4, (e.clientY - ly) * 1.4); lx = e.clientX; ly = e.clientY; }
  });
  const lend = (e) => { if (e.pointerId === lid) lid = null; };
  canvas.addEventListener('pointerup', lend);
  canvas.addEventListener('pointercancel', lend);

  $('bJ').addEventListener('pointerdown', () => { input.keys.JumpBtn = true; });
  $('bJ').addEventListener('pointerup', () => { input.keys.JumpBtn = false; });
  $('bV').addEventListener('pointerdown', () => input.onToggleCam());
  $('bE').addEventListener('pointerdown', () => input.onInteract());
  $('bB').addEventListener('pointerdown', () => input.onKey('KeyB'));
}
