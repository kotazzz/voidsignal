// ================= Галетный переключатель =================
// Фиксированные положения. Клик по ручке — следующее положение, клик по метке — сразу на неё,
// перетаскивание по кругу и колесо мыши — пошагово.
// Поворачиваются только риски и указатель: блик и тень ручки неподвижны.
import { clamp, R2D } from '../core/math.js';
import { click } from '../core/audio.js';
import { onWheelStep } from './wheel.js';

export function createRotary(el, { labels, value = 0, spread = 40, onChange }) {
  const n = labels.length;
  const angles = labels.map((_, i) => (i - (n - 1) / 2) * spread);
  el.classList.add('rotary');
  el.innerHTML =
    labels.map((l, i) => `<span class="rot-lbl" data-i="${i}" style="--a:${angles[i]}deg"><b>${l}</b></span>`).join('') +
    angles.map(a => `<span class="rot-tick" style="--a:${a}deg"></span>`).join('') +
    '<div class="rot-knob"><span class="rot-grooves"></span><span class="rot-face"></span><span class="rot-arm"><span class="rot-pointer"></span></span></div>';
  const knob = el.querySelector('.rot-knob');
  const lbls = [...el.querySelectorAll('.rot-lbl')];
  let idx = -1;

  function set(i, silent = false) {
    i = clamp(i, 0, n - 1);
    if (i === idx) return;
    idx = i;
    knob.style.setProperty('--rot', `${angles[i]}deg`);
    if (!silent) { click(); onChange?.(i); }
  }

  lbls.forEach((l, i) => l.addEventListener('click', () => set(i)));

  const angleOf = e => {
    const r = knob.getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * R2D;
  };
  let drag = null;
  knob.addEventListener('pointerdown', e => {
    knob.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, moved: false };
  });
  knob.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return;
    drag.moved = true;
    const a = angleOf(e);
    let best = 0;
    angles.forEach((b, i) => { if (Math.abs(b - a) < Math.abs(angles[best] - a)) best = i; });
    set(best);
  });
  const end = () => {
    if (drag && !drag.moved) set((idx + 1) % n);
    drag = null;
  };
  knob.addEventListener('pointerup', end);
  knob.addEventListener('pointercancel', () => { drag = null; });
  onWheelStep(el, { gap: 320, onStep: dir => set(idx + dir) });

  set(value, true);
  return { get value() { return idx; }, set };
}
