// ================= Экспорт на ПК =================
// Своего ПК в консоли пока нет: файл уходит по последовательной линии прямо на компьютер
// оператора. Сначала готовится файл текущей трактовки, затем идёт передача, в конце — загрузка.
import { beep, buzz } from '../core/audio.js';
import { log } from '../core/clock.js';

export const BAUD = 115200;

export const tx = { phase: 'idle', bits: 0, total: 0, rate: 0, name: '', blob: null };
//  phase: idle | prep | send | done | fail

export async function startExport(fmt, content, L, seed, id) {
  if (tx.phase === 'prep' || tx.phase === 'send') { buzz(); log('ОТКАЗ: ПЕРЕДАЧА УЖЕ ИДЁТ'); return; }
  if (L.decode <= 0) { buzz(); log('ОТКАЗ: НЕТ ДЕКОДИРОВАННЫХ ДАННЫХ'); return; }
  Object.assign(tx, { phase: 'prep', bits: 0, total: 0, rate: 0, blob: null });
  beep(880, 0.05);
  log('ПОДГОТОВКА ФАЙЛА...');
  const { blob, ext } = await fmt.exportFile(content, L, seed);
  if (tx.phase !== 'prep') return;                 // успели отменить
  Object.assign(tx, { phase: 'send', blob, total: blob.size * 8, name: `${id}_${fmt.id}.${ext}` });
  log(`ПЕРЕДАЧА ${tx.name}: ${(blob.size / 1024).toFixed(1)} КБ`);
}

export function abortExport(reason) {
  if (tx.phase !== 'prep' && tx.phase !== 'send') return;
  tx.phase = 'fail';
  tx.rate = 0;
  buzz();
  log(`ПЕРЕДАЧА ПРЕРВАНА: ${reason}`);
}

function deliver() {
  const url = URL.createObjectURL(tx.blob), a = document.createElement('a');
  a.href = url; a.download = tx.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function tickExport(dt) {
  if (tx.phase !== 'send') return;
  tx.rate = Math.round(BAUD * (0.75 + Math.random() * 0.25));
  tx.bits = Math.min(tx.total, tx.bits + tx.rate * dt);
  if (tx.bits >= tx.total) {
    tx.phase = 'done';
    tx.rate = 0;
    deliver();
    [1046, 1568].forEach((f, i) => beep(f, 0.08, 'square', 0.03, i * 0.1));
    log(`ФАЙЛ ${tx.name} ПЕРЕДАН`);
  }
}
