// ================= Трансформаторы =================
// Три трансформатора питают консоль. Расход идёт у «главного» (он меняется раз в несколько минут)
// и тем быстрее, чем больше модулей включено. При нуле питание пропадает, пока трансформатор
// не запустят красной кнопкой; повторное нажатие возвращает заряд на 100 %.
import { power } from './power.js';
import { log } from './clock.js';
import { beep } from './audio.js';

export const trans = ['T1', 'T2', 'T3'].map(name => ({ name, level: 1, down: false, restarted: false }));
export const tr = { main: Math.floor(Math.random() * 3), timer: 0 };
const SHIFT = 600;                 // смена главного трансформатора, с
let cut = null;                    // функция отключения питания (задаёт main.js)
export const onCut = fn => { cut = fn; };

export const anyDown = () => trans.some(t => t.down);

// units — сколько модулей включено; live — консоль под питанием
export function tickTransformers(dt, units, live) {
  power.blocked = anyDown();
  if (!live) return;
  tr.timer += dt;
  if (tr.timer > SHIFT) { tr.timer = 0; tr.main = Math.floor(Math.random() * trans.length); }
  const t = trans[tr.main];
  t.level = Math.max(0, t.level - (0.00004 + 0.00009 * units) * dt);
  if (t.level <= 0 && !t.down) {
    t.down = true;
    t.restarted = false;
    power.blocked = true;
    log(`ТРАНСФОРМАТОР ${t.name} РАЗРЯЖЕН: ПИТАНИЕ ОТКЛЮЧЕНО`);
    cut?.();
  }
}

// красная кнопка: упавший запускается, затем сбрасывается на 100 %; живой — сразу на 100 %
export function pressReset(i) {
  const t = trans[i];
  if (t.down && !t.restarted) {
    t.restarted = true;
    beep(220, 0.1, 'square', 0.04); beep(440, 0.1, 'square', 0.04, 0.12);
    log(`ТРАНСФОРМАТОР ${t.name} ЗАПУЩЕН: НАЖМИТЕ ЕЩЁ РАЗ ДЛЯ СБРОСА ЗАРЯДА`);
    return;
  }
  t.level = 1; t.down = false; t.restarted = false;
  beep(660, 0.08); beep(990, 0.1, 'square', 0.03, 0.1);
  log(`ТРАНСФОРМАТОР ${t.name}: ЗАРЯД 100%`);
  power.blocked = anyDown();
}
