// Отладка: множитель скорости декодирования
import { settings } from '../core/settings.js';
import { log } from '../core/clock.js';

const STEPS = [1, 2, 5, 10, 50, 100];
let btns = [];

function refresh() {
  btns.forEach((b, i) => b.classList.toggle('active', STEPS[i] === settings.decodeSpeed));
}

export default {
  title: 'Множитель скорости декодирования',
  render(el) {
    el.classList.add('dbg-chips');
    btns = STEPS.map(k => {
      const b = document.createElement('button');
      b.className = 'dbg-btn';
      b.textContent = `x${k}`;
      b.addEventListener('click', () => {
        settings.decodeSpeed = k;
        log(`DEBUG: СКОРОСТЬ ДЕКОДИРОВАНИЯ x${k}`);
        refresh();
      });
      el.appendChild(b);
      return b;
    });
    refresh();
  },
  refresh,
};
