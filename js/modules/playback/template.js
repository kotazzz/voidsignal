// Разметка панели воспроизведения: список, прослушивание, трактовка | экран | накопитель, экспорт на ПК
const ledCell = (color, id, text) => `<div class="led-cell"><span class="led ${color}" data-led="${id}"></span><span>${text}</span></div>`;
const sub = text => `<div class="dc-sub"><span class="ctl-cap">${text}</span></div>`;

export const LIST_ROWS = 10, LIST_COLS = 10, BANK = 7;

export default `
<section class="panel dc-side a-src">
  <div class="panel-title">Сохранённые сигналы</div>
  <div class="dc-group">
    <div class="dc-matrix" data-ref="matrix"></div>
    <div class="dc-browse">
      <div class="ctl-knob"><div data-ref="listKnob"></div><span class="ctl-cap">Выбор сигнала</span></div>
      <div class="dc-metrics">
        <span class="ctl-cap">Записей</span><div class="seg-display small" data-ref="countSeg"></div>
      </div>
    </div>
    ${ledCell('red', 'p-nolink', 'Нет связи с настройкой')}
  </div>
</section>

<section class="panel t-screen a-out">
  <div class="panel-title">Монитор воспроизведения</div>
  <div class="bezel fill">
    <div class="crt fill">
      <canvas data-ref="out" width="640" height="480"></canvas>
      <div class="crt-glass"></div>
    </div>
  </div>
</section>

<section class="panel a-ctl">
  <div class="panel-title">Прослушивание и интерпретация</div>
  <div class="ctl-row">
    <div class="dc-group">
      ${sub('Прослушивание')}
      <div data-ref="transport"></div>
    </div>
    <div class="dc-group">
      ${sub('Интерпретация')}
      <div data-ref="interp"></div>
    </div>
  </div>
</section>

<section class="panel dc-side a-proc">
  <div class="panel-title">Накопители</div>
  <div class="dc-group">
    <div class="ds-bank" data-ref="bank"></div>
    <div data-ref="ioBar"></div>
  </div>

  <div class="dc-group">
    ${sub('Экспорт на ПК')}
    <div data-ref="txBar"></div>
    <div class="dc-row">
      <button class="btn" data-ref="btnExport">На ПК</button>
      <div class="seg-display small" data-ref="txSeg"></div>
      ${ledCell('yellow', 'p-tx', 'TX')}
    </div>
  </div>

  <div class="dc-group bottom">
    ${sub('Статус')}
    <div class="tele-status"><div class="alnum" data-ref="status"></div></div>
    <div class="dc-metrics">
      <span class="ctl-cap">Размер, КБ</span><div class="seg-display small" data-ref="sizeSeg"></div>
      <span class="ctl-cap">Качество</span><div class="seg-display small" data-ref="qSeg"></div>
      <span class="ctl-cap">Уровень обработки</span><div class="seg-display small" data-ref="lvlSeg"></div>
    </div>
  </div>
</section>`;
