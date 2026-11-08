// ================= Бесконечная крутилка (энкодер) =================
// Без упоров: вращение перетаскиванием по кругу или колесом. Каждые `detent` градусов — один шаг.
import { R2D } from '../core/math.js';
import { onWheelStep } from './wheel.js';

// Шаг логический: перетаскивание — один шаг на `detent` градусов, колесо — один шаг на щелчок.
// Визуально ручка прыгает на `notch` градусов только раз в `every` шагов: скачки показывают
// «шаговость», а мышь и колесо ощущаются одинаково.
export function createEncoder(el, { detent = 15, every = 1, notch = 30, onStep }) {
  el.classList.add('encoder');
  el.style.setProperty('--detent', `${notch}deg`);   // риски совпадают с визуальным шагом
  el.innerHTML = '<div class="enc-skirt"></div><div class="enc-cap"></div><div class="enc-knurl"></div><div class="enc-face"></div><div class="enc-arm"><span class="enc-dimple"></span></div>';
  let count = 0, acc = 0, lastA = null;

  function step(dir) {
    count += dir;
    el.style.setProperty('--rot', `${Math.floor(count / every) * notch}deg`);   // освещение не вращается
    onStep(dir);
  }
  function turn(deg) {
    acc += deg;
    while (acc >= detent) { acc -= detent; step(1); }
    while (acc <= -detent) { acc += detent; step(-1); }
  }

  const angleOf = e => {
    const r = el.getBoundingClientRect();
    return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * R2D;
  };
  el.addEventListener('dragstart', e => e.preventDefault());
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); lastA = angleOf(e); });
  el.addEventListener('pointermove', e => {
    if (lastA === null) return;
    const r = el.getBoundingClientRect();
    if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < 12) return;   // у оси угол «дрожит»
    const a = angleOf(e);
    let d = a - lastA;
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    lastA = a;
    turn(d);
  });
  const end = () => { lastA = null; };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  onWheelStep(el, { threshold: 100, gap: 0, onStep: step });

  return { turn };
}
