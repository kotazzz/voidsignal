// ================= Модель приёмника: наводка, подстройка, загрузка =================
// Фазы: idle → search → (fail | locked) → done
import { clamp, wrap } from '../../core/math.js';
import { beep, buzz } from '../../core/audio.js';
import { flashLed, clearLeds } from '../../core/leds.js';
import { log } from '../../core/clock.js';
import { unitOn, linked } from '../../core/units.js';

const isOn = () => unitOn('tuner');
const radarLink = () => linked('radar', 'tuner');
const playbackLink = () => linked('tuner', 'playback');
import { inBuffer, ID_LEN } from '../../core/buffer.js';
import { openChannel, FREQ_MAX, POL_FULL, WAVES, POL_TYPES } from '../../core/signals.js';
import { saveSignal } from '../../core/storage.js';
import { downloadFactor } from '../../core/dishes.js';

export const ACQ_TIME = 3.4;     // наводка, с (без учёта запинок)
export const ACQ_SEGS = 12;
export const MAX_RATE = 9600;    // бит/с при идеальной настройке
const MIN_ACC = 0.12;            // ниже — приём невозможен
const WRONG_TYPE = 0.35;         // штраф за неверный тип сигнала / полярности

export const FREQ_STEPS = [1, 10, 100, 1000];
export const POL_STEPS = [1, 10, 100, 500];           // в десятых: 0.1 1 10 50 °
export const POL_STEP_LABELS = ['.1', '1', '10', '50'];

export const tn = {
  id: '',
  editing: false,
  phase: 'idle',
  acq: 0, stall: 0, failAt: 0,
  channel: null,
  // настройки приёмника
  rx: { freq: 5000, pol: 0, wave: 0, polType: 0 },
  freqStep: 2, polStep: 2,
  // измерение с дребезгом
  m: { freq: 0, pol: 0, wave: false, polType: false, drift: 0 },
  acc: 0, rate: 0, bits: 0, qsum: 0, quality: 0,
  saved: null,
};

// ---------- ввод идентификатора ----------
export function typeChar(ch) {
  let id = tn.id;
  if (id.length >= ID_LEN) return false;
  if (id.length < 2 && !/[A-Z]/.test(ch)) return false;
  id += ch;
  if (id.length === 2) id += '-';
  tn.id = id;
  return true;
}
export function eraseChar() {
  if (!tn.id) return false;
  tn.id = tn.id.length === 3 ? tn.id.slice(0, 1) : tn.id.slice(0, -1);
  return true;
}

// ---------- подстройка ----------
export function stepFreq(dir) {
  const v = clamp(tn.rx.freq + dir * FREQ_STEPS[tn.freqStep], 0, FREQ_MAX);
  if (v === tn.rx.freq) return false;
  tn.rx.freq = v;
  return true;
}
export function stepPol(dir) {
  tn.rx.pol = wrap(tn.rx.pol + dir * POL_STEPS[tn.polStep], POL_FULL);   // полярность циклична
  return true;
}

// ---------- дребезг точности ----------
// мелкая постоянная дрожь + редкие выбросы, затухающие за доли секунды
const makeJitter = () => ({ spike: 0, next: 1 + Math.random() * 3 });
const jitter = { freq: makeJitter(), pol: makeJitter() };
function shake(j, dt) {
  j.next -= dt;
  if (j.next <= 0) {
    j.spike = 0.12 + Math.random() * 0.38;
    j.next = 1.2 + Math.random() * 4;
  }
  j.spike *= Math.exp(-dt * 5);
  return clamp(j.spike + Math.random() * 0.035, 0, 0.9);
}

// ---------- команды ----------
export function load() {
  if (!isOn()) return;
  if (tn.phase === 'search' || tn.phase === 'locked') {
    buzz(); flashLed('t-busy', 900);
    log('ОТКАЗ: КАНАЛ ЗАНЯТ — СБРОСЬТЕ ПРИЁМ');
    return;
  }
  tn.editing = false;
  clearLeds(['t-nf']);
  if (!radarLink()) {
    buzz(); flashLed('t-link', 1200);
    log('ОТКАЗ: НЕТ СВЯЗИ С ТРИАНГУЛЯТОРОМ');
    return;
  }
  if (tn.id.length < ID_LEN) {
    buzz(); flashLed('t-id', 1200);
    log('ОТКАЗ: ВВЕДИТЕ ИДЕНТИФИКАТОР');
    return;
  }
  // неизвестный источник срывается на случайном этапе наводки
  const known = inBuffer(tn.id);
  Object.assign(tn, { phase: 'search', acq: 0, stall: 0, failAt: known ? 0 : 0.3 + Math.random() * 0.4, channel: null, saved: null });
  beep(440, 0.06); beep(660, 0.06, 'square', 0.03, 0.08);
  log(`НАВОДКА НА ${tn.id}`);
}

export function reset() {
  if (tn.phase === 'idle') return;
  Object.assign(tn, { phase: 'idle', acq: 0, channel: null, acc: 0, rate: 0 });
  beep(330, 0.08);
  log('ПРИЁМ СБРОШЕН');
}

export function powerLoss() {
  Object.assign(tn, { phase: 'idle', editing: false, acq: 0, channel: null, acc: 0, rate: 0 });
}

export function save() {
  if (tn.phase !== 'done' || tn.saved) {
    buzz();
    log(tn.saved ? 'СИГНАЛ УЖЕ СОХРАНЁН' : 'ОТКАЗ: ЗАГРУЗКА НЕ ЗАВЕРШЕНА');
    return;
  }
  if (!playbackLink()) {
    buzz(); flashLed('t-link', 1200);
    log('ОТКАЗ: НЕТ СВЯЗИ С ПАНЕЛЬЮ ВОСПРОИЗВЕДЕНИЯ');
    return;
  }
  const ch = tn.channel;
  const meta = {
    id: ch.id,
    savedAt: new Date().toISOString(),
    bits: ch.bits,
    quality: +tn.quality.toFixed(4),
    receiver: { freq: tn.rx.freq, pol: tn.rx.pol / 10, wave: WAVES[tn.rx.wave], polType: POL_TYPES[tn.rx.polType] },
    model: ch.model.kind,
  };
  tn.saved = saveSignal(meta, ch.payload(tn.quality));
  [880, 1175, 1568].forEach((f, i) => beep(f, 0.08, 'square', 0.03, i * 0.08));
  log(`СИГНАЛ ${ch.id} ПЕРЕДАН НА ВОСПРОИЗВЕДЕНИЕ`);
}

// ---------- шаг симуляции ----------
function lock() {
  tn.channel = openChannel(tn.id);
  Object.assign(tn, { phase: 'locked', acq: 1, bits: 0, qsum: 0, quality: 0 });
  [523, 784, 1047].forEach((f, i) => beep(f, 0.1, 'square', 0.03, i * 0.08));
  log(`ЗАХВАТ ${tn.id}: НАСТРОЙТЕ ПАРАМЕТРЫ`);
}
function fail() {
  tn.phase = 'fail';
  flashLed('t-nf', 2500, 'on');
  beep(220, 0.18, 'square', 0.035); beep(165, 0.25, 'square', 0.035, 0.18);
  log(`ИСТОЧНИК ${tn.id} НЕ НАЙДЕН В БУФЕРЕ`);
}

function measure(dt) {
  const raw = tn.channel.measure(tn.rx);
  const m = tn.m;
  m.freq = raw.freq * (1 - shake(jitter.freq, dt));
  m.pol = raw.pol * (1 - shake(jitter.pol, dt));
  m.wave = raw.wave;
  m.polType = raw.polType;
  m.drift = raw.drift;
  tn.acc = m.freq * m.pol * (m.wave ? 1 : WRONG_TYPE) * (m.polType ? 1 : WRONG_TYPE);
}

function download(dt) {
  tn.rate = tn.acc < MIN_ACC ? 0 : Math.round(MAX_RATE * tn.acc * tn.acc * downloadFactor());      // точность массива телескопов
  const got = Math.min(tn.rate * dt, tn.channel.bits - tn.bits);
  tn.bits += got;
  tn.qsum += tn.acc * got;
  if (tn.bits >= tn.channel.bits) {
    tn.phase = 'done';
    tn.rate = 0;
    tn.quality = tn.qsum / tn.channel.bits;
    [659, 784, 988, 1319].forEach((f, i) => beep(f, 0.12, 'square', 0.03, i * 0.09));
    log(`ЗАГРУЗКА ${tn.id} ЗАВЕРШЕНА: КАЧЕСТВО ${(tn.quality * 100).toFixed(1)}%`);
  }
}

export function simulate(dt) {
  // без триангулятора источник не удержать
  if ((tn.phase === 'search' || tn.phase === 'locked') && !radarLink()) {
    Object.assign(tn, { phase: 'fail', channel: null, acc: 0, rate: 0 });
    flashLed('t-link', 2500, 'on');
    buzz();
    log('СВЯЗЬ С ТРИАНГУЛЯТОРОМ ПОТЕРЯНА');
    return;
  }
  if (tn.phase === 'search') {
    const prev = tn.acq;
    if (tn.stall > 0) tn.stall -= dt;
    else {
      tn.acq += (dt / ACQ_TIME) * (0.4 + Math.random() * 1.3);
      if (Math.random() < dt * 1.2) tn.stall = 0.15 + Math.random() * 0.5;
    }
    if (Math.floor(tn.acq * ACQ_SEGS) > Math.floor(prev * ACQ_SEGS)) beep(900 + tn.acq * 1200, 0.025, 'square', 0.018);
    if (tn.failAt && tn.acq >= tn.failAt) fail();
    else if (tn.acq >= 1) lock();
  }
  if (tn.phase === 'locked' || tn.phase === 'done') measure(dt);
  if (tn.phase === 'locked') download(dt);
}
