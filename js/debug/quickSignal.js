// Отладка: мгновенно положить новый захваченный сигнал в ячейку буфера
import { slots, SLOT_N, ID_LEN, makeId } from '../core/buffer.js';
import { registerSignal } from '../core/signals.js';
import { unitOn } from '../core/units.js';
import { log } from '../core/clock.js';
import { beep, buzz } from '../core/audio.js';

let cells = [];

function fill(i) {
  const s = slots[i];
  if (s.busy || s.reserved) { buzz(); return; }
  const id = makeId();
  registerSignal(id);
  s.id = id;
  s.confirm = 0;
  if (unitOn('radar')) {
    s.shown = 0;
    s.busy = { kind: 'write', t: 0 };       // с обычной анимацией записи
  } else {
    s.shown = ID_LEN;
  }
  beep(1300, 0.04);
  log(`DEBUG: СИГНАЛ ${id} → СЛОТ ${i + 1}`);
  refresh();
}

function refresh() {
  cells.forEach(({ id, btn }, i) => {
    const s = slots[i];
    id.textContent = s.id || '------';
    id.classList.toggle('empty', !s.id);
    btn.disabled = !!(s.busy || s.reserved);
    btn.textContent = s.id ? 'Заменить' : 'Загрузить';
  });
}

export default {
  title: 'Быстрая загрузка сигнала в слот',
  render(el) {
    el.classList.add('dbg-slots');
    cells = Array.from({ length: SLOT_N }, (_, i) => {
      const row = document.createElement('div');
      row.className = 'dbg-slot';
      row.innerHTML = `<span class="dbg-slot-n">${i + 1}</span><code class="dbg-slot-id"></code><button class="dbg-btn">Загрузить</button>`;
      const btn = row.querySelector('button');
      btn.addEventListener('click', () => fill(i));
      el.appendChild(row);
      return { id: row.querySelector('code'), btn };
    });
    const all = document.createElement('button');
    all.className = 'dbg-btn wide';
    all.textContent = 'Заполнить пустые';
    all.addEventListener('click', () => slots.forEach((s, i) => { if (!s.id && !s.busy && !s.reserved) fill(i); }));
    el.appendChild(all);
    refresh();
  },
  refresh,
};
