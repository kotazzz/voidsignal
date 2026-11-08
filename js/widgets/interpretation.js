// ================= Выбор трактовки потока =================
// Галетный переключатель формата и столбец индикаторов: структура / шум / опознано.
// Общий для панелей воспроизведения и обработки.
import { FORMATS } from '../core/signals.js';
import { createRotary } from './rotary.js';
import { detectedFor, noisyFor, meaningfulFor } from '../signal/access.js';

export function createInterpretation(el, { value = 0, onChange }) {
  el.classList.add('interp');
  el.innerHTML =
    '<div class="dc-rotary"><div class="interp-rot"></div></div>' +
    '<div class="led-list">' +
    '<div class="led-cell"><span class="led green"></span><span>Структура</span></div>' +
    '<div class="led-cell"><span class="led red"></span><span>Шум</span></div>' +
    '<div class="led-cell"><span class="led amber"></span><span>Опознано</span></div></div>';
  const rot = createRotary(el.querySelector('.interp-rot'), { labels: FORMATS, value, spread: 44, onChange });
  const [struct, noise, mean] = el.querySelectorAll('.led');
  return {
    get value() { return rot.value; },
    set: rot.set,
    draw({ show, entry, fi }) {
      struct.classList.toggle('on', show && detectedFor(entry, fi));
      noise.classList.toggle('on', show && noisyFor(entry, fi));
      mean.classList.toggle('on', show && meaningfulFor(entry, fi));
    },
  };
}
