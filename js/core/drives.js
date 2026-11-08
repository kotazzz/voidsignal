// ================= Сменные накопители =================
// Физические носители сигналов между панелями. Накопитель всегда в одном месте:
// в ячейке стойки, в руке оператора или в слоте панели. Перенос — щелчками по ячейкам.
import { click, buzz, thud } from './audio.js';

export const drives = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].map(id => ({ id, signal: null }));
export const hand = { drive: null };

// держатель — любой объект с полем drive (ячейка стойки, слот панели); locked — идёт обмен данными.
// У слота панели есть крышка (lid): вставленный накопитель закрывается ею и подключается к панели;
// вынуть его можно только после «извлечения», которое открывает крышку.
export const makeHolder = (drive = null, hasLid = false) => ({ drive, locked: false, hasLid, lid: false });
export const mounted = h => !!h.drive && (!h.hasLid || h.lid);
export const rack = drives.map(d => makeHolder(d));

// щелчок по держателю: взять накопитель в руку или вставить тот, что в руке
export function exchange(holder) {
  if (holder.locked) { buzz(); return false; }
  if (!hand.drive && holder.drive) {
    if (holder.hasLid && holder.lid) { buzz(); return false; }   // крышка закрыта
    hand.drive = holder.drive; holder.drive = null;
    click();
    return true;
  }
  if (hand.drive && !holder.drive) {
    holder.drive = hand.drive; hand.drive = null;
    if (holder.hasLid) holder.lid = true;
    thud(); click();
    return true;
  }
  buzz();
  return false;
}

// кнопка «извлечь»: накопитель отключается, крышка открывается
export function eject(holder) {
  if (!holder.drive || !holder.lid) { buzz(); return false; }
  if (holder.locked) { buzz(); return false; }
  holder.lid = false;
  click(); thud();
  return true;
}
