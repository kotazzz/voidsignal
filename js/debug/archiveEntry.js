// Отладка: сразу положить сигнал в архив, минуя триангуляцию и настройку
import { makeId } from '../core/buffer.js';
import { registerSignal, openChannel } from '../core/signals.js';
import { saveSignal, archive } from '../core/storage.js';
import { log } from '../core/clock.js';
import { beep } from '../core/audio.js';
import { MAX_LEVEL } from '../signal/pipeline.js';

let countEl = null;

function add(quality, decoded = false) {
  const id = makeId();
  registerSignal(id);
  const ch = openChannel(id);
  const entry = saveSignal({
    id,
    savedAt: new Date().toISOString(),
    bits: ch.bits,
    quality: +quality.toFixed(4),
    model: ch.model.kind,
    debug: true,
  }, ch.payload(quality));
  if (decoded) entry.proc = { k: MAX_LEVEL, lv: [0, 0, 0, 0] };     // все три уровня обработки пройдены
  beep(1300, 0.04);
  log(`DEBUG: ${id} В АРХИВЕ, КАЧЕСТВО ${Math.round(quality * 100)}%`);
  refresh();
}

function refresh() {
  if (countEl) countEl.textContent = `В архиве: ${archive.length}`;
}

export default {
  title: 'Запись в архив сигналов',
  render(el) {
    el.classList.add('dbg-chips');
    [['Случайное качество', () => 0.6 + Math.random() * 0.4], ['Качество 100%', () => 1], ['Качество 50%', () => 0.5]]
      .forEach(([label, q]) => {
        const b = document.createElement('button');
        b.className = 'dbg-btn';
        b.textContent = label;
        b.addEventListener('click', () => add(q()));
        el.appendChild(b);
      });
    const full = document.createElement('button');
    full.className = 'dbg-btn';
    full.textContent = 'Полностью декодированный';
    full.addEventListener('click', () => add(1, true));
    el.appendChild(full);
    countEl = document.createElement('div');
    countEl.className = 'dbg-note';
    el.appendChild(countEl);
    refresh();
  },
  refresh,
};
