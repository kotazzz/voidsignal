// Разметка модуля триангуляции
const toggle = i => `
  <div class="sw-col"><span class="led amber" data-led="sw${i}"></span><button class="toggle" data-sw="${i}"><span class="t-on">ON</span><span class="washer"></span><span class="lever"></span><span class="nut"></span><span class="t-off">OFF</span></button><span class="sw-label">R${i + 1}</span></div>`;

export default `
<div class="row top">
  <section class="panel screen-panel">
    <div class="bezel">
      <div class="crt">
        <canvas id="sky" width="800" height="600"></canvas>
        <div class="crt-roll"></div>
        <div class="crt-glass"></div>
      </div>
    </div>
    <div class="msg-strip"><div class="alnum" id="msgStrip"></div></div>
  </section>

  <section class="panel readout-panel">
    <div class="panel-title">Позиции радаров</div>
    <div class="seg-rows" id="segRows"></div>

    <div class="panel-title inline">Статус</div>
    <div class="led-grid">
      <div class="led-cell"><span class="led red" data-led="disp"></span><span>Разброс</span></div>
      <div class="led-cell"><span class="led red" data-led="big"></span><span>Треуг. велик</span></div>
      <div class="led-cell"><span class="led red" data-led="small"></span><span>Треуг. мал</span></div>
      <div class="led-cell"><span class="led red" data-led="nf"></span><span>Нет сигнала</span></div>
      <div class="led-cell"><span class="led red" data-led="cdErr"></span><span>Ошибка КД</span></div>
      <div class="led-cell"><span class="led red" data-led="sel"></span><span>Ошибка выбора</span></div>
      <div class="led-cell"><span class="led red" data-led="slot"></span><span>Слот занят</span></div>
      <div class="led-cell"><span class="led yellow" data-led="move"></span><span>Перемещение</span></div>
      <div class="led-cell"><span class="led yellow" data-led="scan"></span><span>Анализ</span></div>
      <div class="led-cell"><span class="led green" data-led="ok"></span><span>Захват</span></div>
    </div>

    <div class="panel-title inline">Буфер сигналов</div>
    <div class="buffer">
      <div class="slider" id="slider">
        <div class="slider-track"></div>
        <div class="slider-knob" id="sliderKnob"></div>
      </div>
      <div class="slots" id="slots"></div>
    </div>
  </section>
</div>

<div class="row bottom">
  <section class="panel joy-panel">
    <div class="panel-title">Наведение</div>
    <div class="joy-base" id="joy">
      <div class="joy-gate"></div>
      <div class="joy-boot"></div>
      <div class="joy-knob"></div>
    </div>
  </section>

  <section class="panel btn-panel">
    <div class="panel-title">Команды</div>
    <button class="btn" id="btnMove">Переместить сюда</button>
    <button class="btn" id="btnScan">Анализ сигнала</button>
    <button class="btn" id="btnPing">Пинг (поиск сигналов)</button>
  </section>

  <section class="panel sw-panel">
    <div class="panel-title">Выбор радара</div>
    <div class="sw-grid">${[0, 1, 2].map(toggle).join('')}</div>
  </section>

  <section class="panel cd-panel">
    <div class="panel-title">Кулдаун</div>
    <div class="cd-wrap">
      <div class="cd-bar" id="cdBar"></div>
      <div class="cd-side">
        <div class="seg-display small" id="segCd"></div>
        <div class="led-cell"><span class="led yellow" data-led="busy"></span><span>Ждите</span></div>
        <div class="led-cell"><span class="led green" data-led="ready"></span><span>Готов</span></div>
        <div class="led-cell"><span class="led amber" data-led="cdmov"></span><span>Перем.</span></div>
        <div class="led-cell"><span class="led amber" data-led="cdscn"></span><span>Скан</span></div>
        <div class="led-cell"><span class="led amber" data-led="cdpng"></span><span>Пинг</span></div>
      </div>
    </div>
  </section>
</div>`;
