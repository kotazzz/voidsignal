// ================= Горизонтальный ползунок с фиксацией =================
import { clamp } from '../core/math.js';
import { click } from '../core/audio.js';
import { onWheelStep } from './wheel.js';

export function createDetentSlider(el, { labels, value = 0, onChange }) {
  const n = labels.length;
  el.classList.add('hslider');
  const pos = i => `calc(14px + (100% - 28px) * ${i / (n - 1)})`;
  el.innerHTML =
    '<div class="hs-rail"><div class="hs-track"></div>' +
    labels.map((_, i) => `<span class="hs-notch" style="left:${pos(i)}"></span>`).join('') +
    '<div class="hs-knob"></div></div>' +
    `<div class="hs-labels">${labels.map((l, i) => `<span style="left:${pos(i)}">${l}</span>`).join('')}</div>`;
  const rail = el.querySelector('.hs-rail'), knob = el.querySelector('.hs-knob');
  const lbls = [...el.querySelectorAll('.hs-labels span')];
  let idx = -1;

  function set(i, silent = false) {
    i = clamp(i, 0, n - 1);
    if (i === idx) return;
    idx = i;
    knob.style.left = pos(i);
    if (!silent) { click(); onChange?.(i); }
  }
  function pick(e) {
    const r = rail.getBoundingClientRect();
    const f = (e.clientX - r.left - 14) / (r.width - 28);
    set(Math.round(clamp(f, 0, 1) * (n - 1)));
  }
  let drag = false;
  rail.addEventListener('pointerdown', e => { rail.setPointerCapture(e.pointerId); drag = true; pick(e); });
  rail.addEventListener('pointermove', e => { if (drag) pick(e); });
  rail.addEventListener('pointerup', () => { drag = false; });
  rail.addEventListener('pointercancel', () => { drag = false; });
  onWheelStep(el, { gap: 320, onStep: dir => set(idx + dir) });
  lbls.forEach((l, i) => l.addEventListener('click', () => set(i)));

  set(value, true);
  return { get value() { return idx; }, set };
}
