// ================= Модель панели обработки =================
// В памяти панели — один сигнал, загруженный с накопителя. «Старт» поднимает уровень
// обработки на единицу (максимум 3): проход из четырёх этапов. Закончив этап,
// панель сама переходит к следующему незавершённому.
// Каждый этап проходит весь объём сигнала со своей скоростью, которая «гуляет» и проседает.
import { clamp } from '../../core/math.js';
import { beep, buzz } from '../../core/audio.js';
import { log } from '../../core/clock.js';
import { unitOn } from '../../core/units.js';
import { makeHolder, mounted } from '../../core/drives.js';
import { settings } from '../../core/settings.js';
import { MAX_LEVEL } from '../../signal/pipeline.js';
import { proc, quality, entryLevels, matchesFor, detectedFor, meaningfulFor } from '../../signal/access.js';
import { createDriveIO } from '../../signal/driveIO.js';

export const STAGES = [
  { short: 'ДЕКОД', name: 'Декодинг', code: 'DECODE', rate: 2600 },
  { short: 'КОРР', name: 'Коррекция', code: 'CORRECT', rate: 1100 },
  { short: 'ДЕШИФ', name: 'Дешифрование', code: 'DECRYPT', rate: 700 },
  { short: 'ДЕНОЙЗ', name: 'Денойзинг', code: 'DENOISE', rate: 1700 },
];

export const pr = { signal: null, format: 0, stage: 0, running: false, rate: 0, flut: 1, dip: 0, nextDip: 4 };
export const slot = makeHolder(null, true);
export const xfer = createDriveIO(slot);

const isOn = () => unitOn('processing');
export const levelsNow = () => (pr.signal ? entryLevels(pr.signal) : null);
export const cap = (p, st) => (st === 0 ? 1 : p.lv[0]);
export const bits = () => pr.signal?.meta.bits || 131072;

// номинальная скорость этапа: плохой приём сильнее всего тормозит коррекцию
export const baseRate = st => {
  const q = pr.signal ? quality(pr.signal) : 1;
  return STAGES[st].rate * (st === 1 ? 0.35 + 0.65 * q : 0.8 + 0.2 * q) * settings.decodeSpeed;
};
export const eta = (st = pr.stage) => {
  if (!pr.signal) return 0;
  const p = proc(pr.signal);
  return (Math.max(0, cap(p, st) - p.lv[st]) * bits()) / baseRate(st);
};
// оставшееся время всего прохода до следующего уровня
export const etaLevel = () => (pr.signal && proc(pr.signal).k < MAX_LEVEL ? STAGES.reduce((s, _, i) => s + ((1 - proc(pr.signal).lv[i]) * bits()) / baseRate(i), 0) : 0);

export const matches = (f = pr.format) => matchesFor(pr.signal, f);
export const detected = () => detectedFor(pr.signal, pr.format);
export const meaningful = () => meaningfulFor(pr.signal, pr.format);

// ---------- команды ----------
export function setFormat(i) { pr.format = i; }

export function toggleRun() {
  if (!isOn()) return;
  if (xfer.busy()) { buzz(); log('ОТКАЗ: ИДЁТ ОБМЕН С НАКОПИТЕЛЕМ'); return; }
  if (!pr.signal) { buzz(); log('НЕТ СИГНАЛА: ИМПОРТИРУЙТЕ С НАКОПИТЕЛЯ'); return; }
  const p = proc(pr.signal);
  if (p.k >= MAX_LEVEL) { buzz(); log(`${pr.signal.id}: МАКСИМАЛЬНЫЙ УРОВЕНЬ ОБРАБОТКИ`); return; }
  if (!pr.running) pickStage(p);
  pr.running = !pr.running;
  beep(pr.running ? 660 : 440, 0.06);
  log(pr.running ? `ОБРАБОТКА ${pr.signal.id}: УРОВЕНЬ ${p.k} → ${p.k + 1}` : 'ОБРАБОТКА ПРИОСТАНОВЛЕНА');
}

export function resetPass() {
  if (!pr.signal) return;
  proc(pr.signal).lv.fill(0);
  pr.running = false;
  log(`${pr.signal.id}: ТЕКУЩИЙ ПРОХОД СБРОШЕН`);
}

// одна кнопка: накопитель с сигналом → в память панели; пустой накопитель → сигнал на него
export function importExport() {
  if (!isOn()) return;
  if (xfer.busy()) { buzz(); return; }
  const d = slot.drive;
  if (!d) { buzz(); log('ВСТАВЬТЕ НАКОПИТЕЛЬ'); return; }
  if (!mounted(slot)) { buzz(); log('НАКОПИТЕЛЬ ИЗВЛЕЧЁН: ЗАБЕРИТЕ ЕГО'); return; }
  if (d.signal && !pr.signal) {
    const s = d.signal;
    xfer.start('in', s, () => { d.signal = null; pr.signal = s; });
  } else if (!d.signal && pr.signal) {
    const s = pr.signal;
    pr.running = false;
    xfer.start('out', s, () => { pr.signal = null; d.signal = s; });
  } else {
    buzz();
    log(d.signal ? 'ПАМЯТЬ ПАНЕЛИ ЗАНЯТА: СНАЧАЛА ЭКСПОРТИРУЙТЕ СИГНАЛ' : 'НАКОПИТЕЛЬ И ПАМЯТЬ ПУСТЫ');
  }
}

export function powerLoss() { pr.running = false; pr.rate = 0; xfer.abort(); }

// ---------- шаг ----------
function flutter(dt) {
  pr.flut = clamp(pr.flut + (Math.random() - 0.5) * dt * 2.2, 0.55, 1.35);
  pr.nextDip -= dt;
  if (pr.nextDip <= 0) { pr.dip = 0.3 + Math.random() * 1.2; pr.nextDip = 3 + Math.random() * 8; }
  if (pr.dip > 0) pr.dip -= dt;
  return pr.flut * (pr.dip > 0 ? 0.12 : 1) * (0.92 + Math.random() * 0.16);
}

// следующий этап, которому есть что делать (сначала текущий, затем по порядку)
function pickStage(p) {
  const order = [pr.stage, 0, 1, 2, 3];
  const st = order.find(i => p.lv[i] < cap(p, i));
  if (st !== undefined && st !== pr.stage) { pr.stage = st; log(`ЭТАП: ${STAGES[st].name.toUpperCase()}`); }
}

export function simulate(dt) {
  xfer.tick(dt);
  if (!pr.running || !pr.signal) { pr.rate = 0; return; }
  const p = proc(pr.signal), st = pr.stage, c = cap(p, st);
  if (p.lv[st] >= c) {
    if (p.lv.every(v => v >= 1)) {                      // проход завершён — новый уровень
      p.k += 1;
      p.lv.fill(0);
      pr.running = false;
      pr.rate = 0;
      [659, 784, 988, 1319].forEach((f, i) => beep(f, 0.12, 'square', 0.03, i * 0.09));
      log(`${pr.signal.id}: УРОВЕНЬ ОБРАБОТКИ ${p.k}${p.k < MAX_LEVEL ? ' — НАЖМИТЕ СТАРТ ДЛЯ СЛЕДУЮЩЕГО' : ' (МАКСИМУМ)'}`);
      return;
    }
    beep(1200, 0.04);
    pickStage(p);
    return;
  }
  pr.rate = Math.round(baseRate(st) * flutter(dt));
  const prev0 = p.lv[0];
  p.lv[st] = Math.min(c, p.lv[st] + (pr.rate * dt) / bits());
  if (st === 0 && p.k === 0 && prev0 < 0.35 && p.lv[0] >= 0.35 && matches()) beep(1568, 0.08, 'square', 0.03);
}

