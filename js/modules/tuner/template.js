// Разметка модуля настройки на сигнал.
// Сетка: верх — наводка | видеоканал | поляриметр | приём; низ — частота | осциллограф | полярность.
const ledCell = (color, id, text) => `<div class="led-cell"><span class="led ${color}" data-led="${id}"></span><span>${text}</span></div>`;

// органы подстройки параметра: индикатор, совпадение, шаг + крутилка, выбор типа
const control = (key, title, unit, typeTitle, typeRef, typeLed) => `
  <section class="panel t-ctl a-${key}">
    <div class="panel-title">${title}</div>
    <div class="ctl-readout"><div class="seg-display" data-ref="${key}Seg"></div><span class="t-unit">${unit}</span></div>
    <div class="ctl-match"><span class="ctl-cap">Совпадение</span><div data-ref="${key}Bar"></div></div>
    <div class="ctl-knobs">
      <div class="ctl-knob"><div data-ref="${key}Step"></div><span class="ctl-cap">Шаг</span></div>
      <div class="ctl-knob"><div data-ref="${key}Knob"></div><span class="ctl-cap">Настройка</span></div>
    </div>
    <div class="ctl-type">
      <div class="ctl-type-head"><span class="ctl-cap">${typeTitle}</span>${ledCell('green', typeLed, 'Верно')}</div>
      <div data-ref="${typeRef}"></div>
    </div>
  </section>`;

const crt = (ref, w, h, cls = '') => `
  <div class="crt ${cls}">
    <canvas data-ref="${ref}" width="${w}" height="${h}"></canvas>
    <div class="crt-glass"></div>
  </div>`;

export const waveLabels = [
  '<svg viewBox="0 0 24 12"><path d="M1 6 C4 -1 8 -1 12 6 S20 13 23 6"/></svg>SIN',
  '<svg viewBox="0 0 24 12"><path d="M1 11 L11 1 L11 11 L21 1 L21 11"/></svg>SAW',
  '<svg viewBox="0 0 24 12"><path d="M1 11 L1 1 L8 1 L8 11 L15 11 L15 1 L22 1 L22 11"/></svg>SQR',
];
export const polTypeLabels = ['<b>α</b>ALPHA', '<b>β</b>BETA', '<b>ω</b>OMEGA'];

export default `
<section class="panel t-acq a-acq">
  <div class="panel-title">Наводка на источник</div>
  <div class="acq-id">
    <div class="alnum lg id-field" data-ref="idField" title="Клик — ввод идентификатора"></div>
    <button class="mini-btn tall" data-ref="idBuf" title="Взять ID из выбранного слота буфера">БУФ</button>
  </div>
  <div class="acq-cmd">
    <button class="btn" data-ref="btnLoad">Загрузить сигнал</button>
    <button class="mini-btn tall" data-ref="btnReset" title="Сбросить приём">СБР</button>
  </div>
  <div class="acq-track">
    <div data-ref="acqBar"></div>
    ${ledCell('green', 't-lock', 'Захват')}
  </div>
  <div class="led-row">
    ${ledCell('yellow', 't-search', 'Поиск')}
    ${ledCell('red', 't-nf', 'Нет источн.')}
    ${ledCell('red', 't-id', 'Ошибка ID')}
    ${ledCell('red', 't-busy', 'Занято')}
    ${ledCell('red', 't-link', 'Нет связи')}
  </div>
</section>

<section class="panel t-screen a-mon">
  <div class="panel-title">Видеоканал</div>
  <div class="bezel">${crt('mon', 96, 72, 'bw')}</div>
</section>

<section class="panel t-screen a-polar">
  <div class="panel-title">Поляриметр</div>
  <div class="round-bezel">${crt('polar', 240, 240, 'round')}</div>
</section>

<section class="panel t-tele a-tele">
  <div class="panel-title">Приём</div>
  <div class="tele-grid">
    <span class="ctl-cap">Точность</span><div class="seg-display small" data-ref="accSeg"></div><span class="t-unit">%</span>
    <span class="ctl-cap">Скорость</span><div class="seg-display small" data-ref="rateSeg"></div><span class="t-unit">бит/с</span>
    <span class="ctl-cap">Загрузка</span><div class="seg-display small" data-ref="progSeg"></div><span class="t-unit">%</span>
  </div>
  <div data-ref="progBar"></div>
  <div class="tele-status"><div class="alnum" data-ref="status"></div></div>
  <div class="tele-save">
    <button class="btn" data-ref="btnSave">Сохранить</button>
    <div class="tele-leds">
      ${ledCell('yellow', 't-rx', 'Приём')}
      ${ledCell('green', 't-done', 'Готово')}
      ${ledCell('amber', 't-saved', 'Сохранён')}
    </div>
  </div>
</section>

${control('freq', 'Частота', 'Гц', 'Тип сигнала', 'waveSel', 't-wave')}

<section class="panel t-screen a-scope">
  <div class="panel-title">Осциллограф</div>
  <div class="bezel fill">${crt('scope', 520, 280, 'fill')}</div>
</section>

${control('pol', 'Полярность', '°', 'Тип полярности', 'polTypeSel', 't-ptype')}`;
