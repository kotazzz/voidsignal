// ================= Слот накопителя на панели =================
// Слева — индикаторы (зелёный: накопитель подключён, жёлтый: идёт обмен, красный: ошибка),
// затем сам слот, справа — кнопки «обмен» и «извлечь»; ниже — шкала передачи.
import { createDriveBay } from './driveBay.js';
import { createLightBar } from './lightbar.js';
import { mounted, eject } from '../core/drives.js';
import { click } from '../core/audio.js';

const IO_ICON = '<svg viewBox="0 0 20 20"><path d="M6 17 V4 M2.5 8 L6 4 L9.5 8 M14 3 V16 M10.5 12 L14 16 L17.5 12"/></svg>';
const EJECT_ICON = '<svg viewBox="0 0 20 20"><path d="M10 3 L17 12 H3 Z M3 15.5 H17" /></svg>';

export function createDriveSlot(el, holder, { onTransfer, errLed = false, compact = false }) {
  el.classList.add('drive-slot');
  el.classList.toggle('compact', compact);
  el.innerHTML =
    `<div class="ds-row"><div class="ds-leds"><span class="led green" title="Накопитель подключён"></span><span class="led yellow" title="Идёт обмен"></span>${errLed ? '<span class="led red" title="Ошибка: память панели и накопитель заняты записями"></span>' : ''}</div>` +
    '<div class="ds-bay"></div>' +
    `<button class="mini-btn ds-btn" title="Обмен: импорт / экспорт">${IO_ICON}</button>` +
    `<button class="mini-btn ds-btn" title="Извлечь накопитель">${EJECT_ICON}</button></div>` +
    (compact ? '' : '<div class="ds-bar"></div>');
  const [green, yellow, red] = el.querySelectorAll('.led');
  const [btnIO, btnEject] = el.querySelectorAll('.ds-btn');
  const bay = createDriveBay(el.querySelector('.ds-bay'), holder);
  const bar = compact ? null : createLightBar(el.querySelector('.ds-bar'), 16);
  btnIO.addEventListener('click', () => { click(); onTransfer(); });
  btnEject.addEventListener('click', () => eject(holder));

  const lamp = (led, st) => { led.classList.toggle('on', !!st); led.classList.toggle('blink', st === 'blink'); };
  return {
    // show — модуль загружен; busy/progress — обмен; err — ошибка
    draw({ show, busy, progress, err = false }) {
      bay.draw();
      bar?.set(show ? progress : 0);
      lamp(green, show && mounted(holder));
      lamp(yellow, show && busy ? 'blink' : false);
      if (red) lamp(red, show && err ? 'on' : false);
    },
  };
}
