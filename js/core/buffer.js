// ================= Буфер сигналов =================
// Общая память на 5 ячеек: радар пишет захваченные сигналы, модуль настройки читает их ID.
import { clock, log } from './clock.js';
import { beep } from './audio.js';

export const SLOT_N = 5, SLOT_IO = 1.4;
export const CONFIRM_TIME = 2;   // окно подтверждения очистки, с

export const slots = Array.from({ length: SLOT_N }, () => ({ id: '', shown: 0, busy: null, reserved: false, confirm: 0 }));
export const buffer = { sel: 0 };

// ---------- идентификаторы: AB-12C ----------
export const ID_LETTERS = 'ABCDEFHKLNPRSTUXYZ', ID_CHARS = ID_LETTERS + '0123456789', ID_LEN = 6;
const pick = s => s[Math.floor(Math.random() * s.length)];
export const makeId = () => pick(ID_LETTERS) + pick(ID_LETTERS) + '-' + pick(ID_CHARS) + pick(ID_CHARS) + pick(ID_CHARS);

// ячейка с полностью записанным сигналом
export const readySlot = i => {
  const s = slots[i];
  return s && s.id && !s.busy ? s : null;
};
export const inBuffer = id => slots.some((s, i) => s.id === id && readySlot(i));

// запись / очистка ячеек (вызывается каждый кадр при включённом питании)
export function tickBuffer(dt) {
  const T = clock.t;
  slots.forEach((s, i) => {
    if (s.confirm && T >= s.confirm) {
      s.confirm = 0;
      beep(330, 0.08);
      log(`ОЧИСТКА СЛОТА ${i + 1} ОТМЕНЕНА`);
    }
    if (!s.busy) return;
    s.busy.t += dt;
    const p = Math.min(1, s.busy.t / SLOT_IO);
    const n = Math.floor(p * ID_LEN);
    s.shown = s.busy.kind === 'write' ? n : ID_LEN - n;
    if (p >= 1) {
      if (s.busy.kind === 'clear') { s.id = ''; s.shown = 0; log(`СЛОТ ${i + 1} ОЧИЩЕН`); }
      else { s.shown = ID_LEN; log(`ЗАПИСЬ В СЛОТ ${i + 1} ЗАВЕРШЕНА`); }
      s.busy = null;
      beep(1300, 0.04);
    }
  });
}

export function cancelConfirms() { slots.forEach(s => { s.confirm = 0; }); }
