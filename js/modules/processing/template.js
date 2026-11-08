// Разметка панели обработки: накопитель, прослушивание и трактовка | выход | обработка
import { STAGES } from './model.js';

const ledCell = (color, id, text) => `<div class="led-cell"><span class="led ${color}" data-led="${id}"></span><span>${text}</span></div>`;
const sub = text => `<div class="dc-sub"><span class="ctl-cap">${text}</span></div>`;

export default `
<section class="panel dc-side a-src">
  <div class="panel-title">Накопитель</div>
  <div class="dc-group">
    <div data-ref="slot"></div>
  </div>

  <div class="dc-group">
    ${sub('В памяти панели')}
    <div class="alnum lg" data-ref="memDisp"></div>
    <div class="dc-metrics">
      <span class="ctl-cap">Размер, КБ</span><div class="seg-display small" data-ref="sizeSeg"></div>
      <span class="ctl-cap">Качество</span><div class="seg-display small" data-ref="qSeg"></div>
    </div>
  </div>
</section>

<section class="panel dc-side a-lis">
  <div class="panel-title">Прослушивание</div>
  <div class="dc-group">
    ${sub('Прослушивание')}
    <div data-ref="transport"></div>
  </div>
  <div class="dc-group grow">
    ${sub('Интерпретация')}
    <div data-ref="interp"></div>
  </div>
</section>

<section class="panel t-screen a-out">
  <div class="panel-title">Выход обработки</div>
  <div class="bezel fill">
    <div class="crt fill">
      <canvas data-ref="out" width="640" height="480"></canvas>
      <div class="crt-glass"></div>
    </div>
  </div>
</section>

<section class="panel dc-side a-proc">
  <div class="panel-title">Обработка</div>
  <div class="proc-cols">
  <div class="proc-col">
  <div class="dc-group">
    <div class="dc-level">
      <span class="ctl-cap">Уровень</span>
      <div class="seg-display" data-ref="lvlSeg"></div>
      <div class="dc-level-leds">
        ${[1, 2, 3].map(k => ledCell('green', `r-l${k}`, `L${k}`)).join('')}
      </div>
    </div>
    <div class="dc-row">
      <button class="btn" data-ref="btnRun">Старт / пауза</button>
    </div>
  </div>
  </div>

  <div class="proc-col">
  <div class="dc-group">
    ${sub('Этапы')}
    <div class="dc-stages">
      ${STAGES.map((s, i) => `<div class="dc-stage">${ledCell('yellow', `d-st${i}`, s.name)}<div data-ref="stBar${i}"></div></div>`).join('')}
    </div>
  </div>
  </div>

  <div class="proc-col">
  <div class="dc-group">
    <div class="dc-metrics">
      <span class="ctl-cap">Скорость, бит/с</span><div class="seg-display small" data-ref="rateSeg"></div>
      <span class="ctl-cap">Этап, осталось</span><div class="seg-display small" data-ref="etaSeg"></div>
      <span class="ctl-cap">До уровня</span><div class="seg-display small" data-ref="etaLvlSeg"></div>
      <span class="ctl-cap">Множитель</span><div class="seg-display small" data-ref="spdSeg"></div>
    </div>
    <div class="tele-status"><div class="alnum" data-ref="status"></div></div>
  </div>
  </div>
  </div>
</section>`;
