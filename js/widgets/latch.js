// ================= Кнопки с взаимной фиксацией =================
// Как на старом магнитофоне: нажатая кнопка залипает, нажатие другой её отпускает.
import { beep } from '../core/audio.js';

export function createLatchGroup(el, { labels, value = 0, onChange }) {
  el.classList.add('latch-group');
  el.innerHTML = labels.map(l => `<button class="latch"><span class="latch-cap">${l}</span></button>`).join('');
  const btns = [...el.querySelectorAll('.latch')];
  let idx = -1;

  function set(i, silent = false) {
    if (i === idx) { if (!silent) beep(180, 0.03, 'triangle', 0.05); return; }
    idx = i;
    btns.forEach((b, k) => b.classList.toggle('latched', k === i));
    if (!silent) {
      beep(220, 0.04, 'triangle', 0.07); beep(1900, 0.01, 'square', 0.02);
      onChange?.(i);
    }
  }
  btns.forEach((b, i) => b.addEventListener('click', () => set(i)));

  set(value, true);
  return { get value() { return idx; }, set };
}
