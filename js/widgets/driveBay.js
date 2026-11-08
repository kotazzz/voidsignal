// ================= Ячейка для накопителя =================
// Утопленный приёмник; вставленный накопитель — картридж с наклейкой (номер + содержимое),
// индикатором «записано» и тремя индикаторами уровня обработки L1–L3.
// У слота панели есть крышка: она сама закрывается, когда накопитель вставлен.
import { exchange } from '../core/drives.js';
import { proc } from '../signal/access.js';

export const driveLabel = d => (d ? `${d.id} · ${d.signal ? d.signal.id : 'ПУСТ'}` : '');

export function createDriveBay(el, holder, { onChange } = {}) {
  el.classList.add('drive-bay');
  el.innerHTML =
    '<span class="drive"><span class="drive-label"></span>' +
    '<span class="drive-leds"><i class="dl rec" title="Записан сигнал"></i><b></b>' +
    '<i class="dl l1" title="Уровень 1"></i><i class="dl l2" title="Уровень 2"></i><i class="dl l3" title="Уровень 3"></i></span>' +
    '<span class="drive-notch"></span></span>' +
    (holder.hasLid ? '<span class="drive-lid"><span class="lid-grip"></span></span>' : '');
  const label = el.querySelector('.drive-label');
  const dots = ['rec', 'l1', 'l2', 'l3'].map(c => el.querySelector(`.dl.${c}`));
  let last = null;
  el.addEventListener('click', () => { if (exchange(holder)) onChange?.(); });
  return {
    holder,
    draw() {
      const d = holder.drive, k = d?.signal ? proc(d.signal).k : 0;
      const key = `${driveLabel(d)}|${k}|${holder.lid}`;
      if (key === last) return;
      last = key;
      el.classList.toggle('loaded', !!d);
      el.classList.toggle('closed', !!holder.lid);
      label.textContent = driveLabel(d);
      dots[0].classList.toggle('on', !!d?.signal);
      dots.slice(1).forEach((x, i) => x.classList.toggle('on', k > i));
    },
  };
}
