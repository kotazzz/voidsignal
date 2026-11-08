// ================= Ввод: джойстик и клавиатура наведения =================
export const JOY_MAX = 34;
export const joy = { active: false, x: 0, y: 0, kx: 0, ky: 0 };
export const keys = new Set();
let joyEl = null;

export function initJoystick(el) {
  joyEl = el;
  const move = e => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > JOY_MAX) { dx *= JOY_MAX / l; dy *= JOY_MAX / l; }
    joy.x = dx / JOY_MAX; joy.y = -dy / JOY_MAX;
  };
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); joy.active = true; move(e); });
  el.addEventListener('pointermove', e => { if (joy.active) move(e); });
  el.addEventListener('pointerup', releaseInput);
  el.addEventListener('pointercancel', releaseInput);
}

export function releaseInput() {
  joy.active = false; joy.x = joy.y = 0;
  keys.clear();
}

export function readInput() {
  if (joy.active) return { x: joy.x, y: joy.y };
  let x = 0, y = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) y += 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) y -= 1;
  const l = Math.hypot(x, y);
  return l > 1 ? { x: x / l, y: y / l } : { x, y };
}

// визуальное положение рукоятки (механика работает и без питания)
export function animateJoystick(dt, inp) {
  const kj = 1 - Math.exp(-20 * dt);
  joy.kx += (inp.x - joy.kx) * kj;
  joy.ky += (inp.y - joy.ky) * kj;
}

export function drawJoystick() {
  joyEl.style.setProperty('--jx', `${(joy.kx * JOY_MAX).toFixed(1)}px`);
  joyEl.style.setProperty('--jy', `${(-joy.ky * JOY_MAX).toFixed(1)}px`);
}
