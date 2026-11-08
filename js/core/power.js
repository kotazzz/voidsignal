// ================= Питание =================
// off → boot → on → shutdown → off. Модули подписываются через onPower().
import { beep, sweep, buzz } from './audio.js';
import { log } from './clock.js';

export const BOOT = { lampEnd: 1.4, end: 6.6 };
export const power = { state: 'off', t: 0, blocked: false };   // blocked — упавший трансформатор

export const isOn = () => power.state === 'on';
export const isLive = () => power.state === 'boot' || power.state === 'on';
// время с начала загрузки: Infinity — система работает, -1 — выключена
export const bootTime = () => (isOn() ? Infinity : power.state === 'boot' ? power.t : -1);

const listeners = new Set();
export const onPower = fn => listeners.add(fn);
const emit = ev => listeners.forEach(fn => fn(ev));

// аварийное отключение: трансформатор разряжен
export function cutPower() {
  if (!isLive()) return;
  power.state = 'shutdown';
  power.t = 0;
  sweep(900, 40, 0.6, 'sine', 0.04);
  emit('shutdown');
}

export function togglePower() {
  if (!isLive() && power.blocked) { buzz(); log('НЕТ ПИТАНИЯ: ЗАПУСТИТЕ ТРАНСФОРМАТОР НА ГЛАВНОМ ЭКРАНЕ'); return; }
  beep(70, 0.12, 'square', 0.06); beep(2200, 0.015, 'square', 0.03);
  power.t = 0;
  if (isLive()) {
    power.state = 'shutdown';
    sweep(900, 40, 0.6, 'sine', 0.04);
    emit('shutdown');
  } else {
    power.state = 'boot';
    sweep(40, 90, 1.2, 'sawtooth', 0.05, 0.35);     // размагничивание
    sweep(14800, 15200, 2.5, 'sine', 0.004, 0.6);   // писк строчной развёртки
    beep(1000, 0.15, 'square', 0.025, 0.05);
    emit('boot');
  }
}

export function tickPower(dt) {
  if (power.state === 'on' || power.state === 'off') return;
  const prev = power.t;
  power.t += dt;
  if (power.state === 'boot') {
    if (prev < BOOT.lampEnd && power.t >= BOOT.lampEnd) emit('lamp-end');
    if (power.t >= BOOT.end) {
      power.state = 'on';
      beep(1046, 0.08); beep(1568, 0.12, 'square', 0.03, 0.1);
      emit('on');
    }
  } else if (power.t > 1.8) {
    power.state = 'off';
    emit('off');
  }
}
