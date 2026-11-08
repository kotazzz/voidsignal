// Разметка модуля «Телескопы»: карта массива | терминал | управление
const sub = text => `<div class="dc-sub"><span class="ctl-cap">${text}</span></div>`;

// наклейка-карта: белая, чёрный контур; светодиоды выступают из отверстий (их добавляет index.js)
const STICKER = `
<svg class="dish-sticker" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect x="0.6" y="0.6" width="98.8" height="98.8" rx="3" class="s-fill"/>
  <path class="s-line" d="M6 14 C14 4 38 6 52 3 C70 0 90 6 96 20 C101 34 95 48 97 60 C99 76 90 94 70 97 C54 99 40 94 26 96 C12 98 3 86 4 70 C5 56 2 44 4 32 C5 24 3 18 6 14 Z"/>
  <path class="s-thin" d="M12 20 C22 12 40 13 52 10 C68 8 84 13 89 24 C93 36 88 48 90 60 C91 72 84 86 68 89 C54 91 42 87 28 89 C17 90 10 80 11 68 C12 56 9 46 11 34 C12 28 10 24 12 20 Z"/>
  <path class="s-thin" d="M36 8 C40 24 34 34 44 46 C54 58 48 70 58 80 C62 86 62 92 66 97"/>
  <ellipse class="s-thin" cx="26" cy="46" rx="7" ry="4.5"/>
  <path class="s-dash" d="M4 52 C20 54 34 50 50 56 C66 62 80 54 97 50"/>
  <path class="s-dash" d="M14 90 C22 76 30 64 40 56"/>
  <path class="s-thin" d="M72 22 L76 18 L80 24 L84 20"/>
  <path class="s-line" d="M90 6 L93 13 L90 11.5 L87 13 Z"/>
  <text x="88.6" y="5.2" class="s-text">N</text>
  <path class="s-line" d="M6 96 H20 M6 94.5 V97.5 M13 95 V97 M20 94.5 V97.5"/>
  <text x="22" y="97.4" class="s-text">10 KM</text>
  <text x="36" y="99.2" class="s-text">ARRAY · SECTOR 7</text>
</svg>`;

export const mapHtml = STICKER;

export default `
<section class="panel dish-map-panel a-map">
  <div class="panel-title">Карта массива</div>
  <div class="dish-map" data-ref="map">${STICKER}</div>
</section>

<section class="panel t-screen a-term">
  <div class="panel-title">Терминал массива</div>
  <div class="bezel fill">
    <div class="crt fill">
      <canvas data-ref="term" width="640" height="480"></canvas>
      <div class="crt-glass"></div>
    </div>
  </div>
</section>

<section class="panel dc-side a-dctl">
  <div class="panel-title">Управление</div>
  <div class="dc-group">
    ${sub('Режим')}
    <div data-ref="modeSel"></div>
  </div>

  <div class="dc-group">
    ${sub('Выбор телескопа')}
    <div class="dpad" data-ref="dpad">
      <button class="pad pad-up" data-dir="up" title="Вверх"><svg viewBox="0 0 20 20"><path d="M10 4 L17 15 H3 Z"/></svg></button>
      <button class="pad pad-left" data-dir="left" title="Влево"><svg viewBox="0 0 20 20"><path d="M4 10 L15 3 V17 Z"/></svg></button>
      <span class="pad-core"></span>
      <button class="pad pad-right" data-dir="right" title="Вправо"><svg viewBox="0 0 20 20"><path d="M16 10 L5 3 V17 Z"/></svg></button>
      <button class="pad pad-down" data-dir="down" title="Вниз"><svg viewBox="0 0 20 20"><path d="M10 16 L3 5 H17 Z"/></svg></button>
    </div>
    <div class="alnum" data-ref="selDisp"></div>
  </div>

  <div class="dc-group">
    <div class="act-row"><span class="led green" data-ref="ledAct" title="Действие доступно в этом режиме"></span><button class="btn" data-ref="btnAct">Выполнить</button></div>
    <div class="act-row"><span class="led green" data-ref="ledAll" title="Доступно только в режиме калибровки"></span><button class="btn" data-ref="btnAll">Все по очереди</button></div>
    <div class="act-row"><span class="led-spacer"></span><button class="btn" data-ref="btnStop">Стоп</button></div>
  </div>

  <div class="dc-group bottom">
    <div class="dc-metrics">
      <span class="ctl-cap">Точность, %</span><div class="seg-display small" data-ref="avgSeg"></div>
      <span class="ctl-cap">Серверов в норме</span><div class="seg-display small" data-ref="srvSeg"></div>
      <span class="ctl-cap">Скорость загрузки, %</span><div class="seg-display small" data-ref="spdSeg"></div>
    </div>
  </div>
</section>`;
