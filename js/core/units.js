// ================= Питание модулей и связь между ними =================
// У каждого модуля свой выключатель поверх общего питания. Модуль стартует быстрее консоли
// (кинескопы уже прогреты), поэтому его загрузка начинается сразу с середины общей.
//
// Время загрузки у модулей разное (регистрируется в registerUnit): внутри модуль живёт по общей
// шкале 0…BOOT.end, но проходит её быстрее или медленнее.
//
// Цепочка зависимостей: триангуляция → настройка → воспроизведение. Обработка получает
// сигналы на накопителях и от связи не зависит (индикатор лишь показывает, что оба включены).
import { power, BOOT } from './power.js';
import { beep } from './audio.js';

const SKIP = 1.6;          // с какого момента общей загрузки стартует отдельно включённый модуль
const OFF_ANIM = 1.8;      // длительность гашения экрана

const units = {};
const listeners = new Set();
export const onUnit = fn => listeners.add(fn);
const emit = (id, ev) => listeners.forEach(fn => fn(id, ev));

export function registerUnit(id, boot = BOOT.end) { units[id] = { on: true, t: 99, wasOn: false, boot: Math.min(boot, BOOT.end) }; }
export const unitSwitch = id => units[id].on;

// эффективное состояние модуля с учётом общего питания: { state: off|boot|on|shutdown, t }
export function unitState(id) {
  const u = units[id];
  if (power.state === 'off') return { state: 'off', t: 0 };
  if (power.state === 'shutdown') return { state: 'shutdown', t: power.t };
  if (!u.on) return u.t < OFF_ANIM ? { state: 'shutdown', t: u.t } : { state: 'off', t: 0 };
  const own = u.t + SKIP;
  const rt = power.state === 'boot' ? Math.min(power.t, own) : own;     // реальное время загрузки
  return rt >= u.boot ? { state: 'on', t: 0 } : { state: 'boot', t: (rt * BOOT.end) / u.boot };
}
export const unitOn = id => unitState(id).state === 'on';
export const unitLive = id => { const s = unitState(id).state; return s === 'on' || s === 'boot'; };
// как bootTime(): Infinity — работает, -1 — погашен
export const unitBootTime = id => { const s = unitState(id); return s.state === 'on' ? Infinity : s.state === 'boot' ? s.t : -1; };

// связь есть, когда оба модуля полностью работают
export const linked = (a, b) => unitOn(a) && unitOn(b);

export function toggleUnit(id) {
  const u = units[id];
  u.on = !u.on;
  u.t = 0;
  beep(90, 0.06, 'square', 0.05); beep(2600, 0.01, 'square', 0.02);
  const live = power.state === 'boot' || power.state === 'on';
  if (live) emit(id, u.on ? 'boot' : 'shutdown');
}

export function tickUnits(dt) {
  for (const id in units) {
    const u = units[id];
    u.t += dt;
    const on = unitOn(id);
    if (on && !u.wasOn && u.on && power.state === 'on') emit(id, 'on');
    u.wasOn = on;
  }
}
