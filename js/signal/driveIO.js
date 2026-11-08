// ================= Обмен с накопителем =================
// Перенос сигнала между памятью панели и накопителем в её слоте. Длится секунды,
// пока идёт обмен — накопитель заблокирован в слоте.
import { beep, buzz } from '../core/audio.js';
import { log } from '../core/clock.js';

export function createDriveIO(holder) {
  const io = { dir: null, t: 0, total: 1, signal: null, done: null };

  return {
    io,
    busy: () => !!io.dir,
    progress: () => (io.dir ? Math.min(1, io.t / io.total) : 0),

    // dir: 'in' (накопитель → панель) | 'out' (панель → накопитель)
    start(dir, signal, done) {
      Object.assign(io, { dir, t: 0, total: 1.5 + (signal.meta.bits || 131072) / 60000, signal, done });
      holder.locked = true;
      beep(dir === 'in' ? 520 : 780, 0.05); beep(dir === 'in' ? 780 : 520, 0.05, 'square', 0.03, 0.07);
      log(`${dir === 'in' ? 'ИМПОРТ' : 'ЭКСПОРТ'} ${signal.id} ${dir === 'in' ? 'С НАКОПИТЕЛЯ' : 'НА НАКОПИТЕЛЬ'} ${holder.drive.id}`);
    },

    tick(dt) {
      if (!io.dir) return;
      io.t += dt;
      if (Math.floor(io.t * 10) !== Math.floor((io.t - dt) * 10)) beep(2200 + Math.random() * 800, 0.008, 'square', 0.008);
      if (io.t < io.total) return;
      const { done, signal, dir } = io;
      io.dir = null;
      holder.locked = false;
      done();
      beep(1300, 0.05);
      log(`${signal.id}: ${dir === 'in' ? 'ИМПОРТИРОВАН' : 'ЗАПИСАН НА НАКОПИТЕЛЬ'}`);
    },

    abort() {
      if (!io.dir) return;
      io.dir = null;
      holder.locked = false;
      buzz();
      log('ОБМЕН С НАКОПИТЕЛЕМ ПРЕРВАН');
    },
  };
}
