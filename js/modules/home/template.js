// Разметка главного экрана: питание модулей | главный выключатель | предупреждающая наклейка
export default `
<section class="panel home-power">
  <div class="panel-title">Главное питание</div>
  <div class="danger-frame">
    <div class="danger-plate">
      <div class="power-leds">
        <div class="led-cell"><span class="led red keep on" id="ledStby"></span><span>STBY</span></div>
        <div class="led-cell"><span class="led green keep" id="ledPwr"></span><span>PWR</span></div>
      </div>
      <button class="power-switch" id="powerSw" aria-label="Питание">
        <span class="pb-mark on">I</span>
        <span class="pb-mark off">O</span>
        <span class="pb-slot"><span class="pb-handle"></span></span>
        <span class="pb-flag"></span>
      </button>
    </div>
  </div>
  <span class="power-caption">Питание консоли</span>
</section>

<section class="panel home-units">
  <div class="panel-title">Питание модулей</div>
  <div class="unit-list" data-ref="unitList"></div>
</section>

<section class="panel home-xfm">
  <div class="panel-title">Трансформаторы</div>
  <div class="xfm-list" data-ref="xfmList"></div>
</section>

<div class="home-warn">
  <div class="sticker">
    <div class="sticker-head">
      <svg class="sticker-icon" viewBox="0 0 64 56" aria-hidden="true">
        <path d="M32 3 L61 53 H3 Z" fill="none" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
        <path d="M36 17 L22 34 H31 L28 46 L42 28 H33 Z" fill="#111"/>
      </svg>
      <div>
        <div class="sticker-title">DANGER</div>
        <div class="sticker-sub">HIGH VOLTAGE</div>
      </div>
    </div>
    <p>Work with high voltage equipment is hazardous and can be fatal.</p>
    <p>Authorized personnel only. Disconnect from mains and discharge capacitors before opening the enclosure.</p>
    <div class="sticker-foot">VS-3 · 380 V · 50 Hz · GROUND REQUIRED</div>
  </div>
  <div class="plates">
    <div class="nameplate"><b>VS-3</b><span>Deep sky triangulator</span><span>S/N 00417 · REV 3.2</span><span class="barcode"></span></div>
    <div class="nameplate dark"><b>Caution</b><span>Do not open under power</span><span>Service: qualified only</span></div>
    <div class="nameplate"><b>Ground</b><span>Earth bond · 4 mm²</span><span>Inspected 08/84</span></div>
  </div>
</div>`;
