// ================= Главный экран =================
// Питание: главный выключатель консоли, выключатели модулей и предупреждающая наклейка.
// Сам выключатель и индикаторы PWR / STBY подключает main.js (они живут в разметке отсюда).
import { toggleUnit, unitSwitch, unitState } from '../../core/units.js';
import { modules } from '../registry.js';
import { trans, tr, pressReset } from '../../core/transformers.js';
import { makeDisplay, setDisplay } from '../../widgets/seg7.js';
import { createLightBar } from '../../widgets/lightbar.js';
import { click, relay } from '../../core/audio.js';
import template from './template.js';

const rows = [];
const xfm = [];

export default {
  id: 'home',
  title: 'Главная',
  hints: 'выключатели — питание модулей · главный автомат — питание консоли',
  template,

  init(root) {
    const xl = root.querySelector('[data-ref=xfmList]');
    trans.forEach((t, i) => {
      const el = document.createElement('div');
      el.className = 'xfm';
      el.innerHTML = `<div class="xfm-head"><span class="xfm-name">${t.name}</span><span class="xfm-main">ГЛАВНЫЙ</span></div>
        <div class="xfm-body"><div class="seg-display small"></div><span class="ctl-cap">%</span></div>
        <div class="xfm-bar"></div>
        <div class="xfm-foot"><span class="led green"></span><span class="xfm-stat"></span><button class="red-btn" title="Красная кнопка трансформатора"></button></div>`;
      xl.appendChild(el);
      el.querySelector('.red-btn').addEventListener('click', () => { click(); pressReset(i); });
      xfm.push({ el, seg: makeDisplay(el.querySelector('.seg-display'), 3), bar: createLightBar(el.querySelector('.xfm-bar'), 20), led: el.querySelector('.led'), stat: el.querySelector('.xfm-stat') });
    });
    const list = root.querySelector('[data-ref=unitList]');
    modules.forEach(m => {
      const row = document.createElement('div');
      row.className = 'unit-row';
      row.innerHTML = `<button class="unit-sw on" title="Питание модуля"><span class="us-i">I</span><span class="us-o">O</span></button>
        <span class="led green" data-led="unit-${m.id}"></span>
        <span class="unit-name">${m.title}</span>`;
      const sw = row.querySelector('.unit-sw');
      sw.addEventListener('click', () => { relay(); toggleUnit(m.id); sw.classList.toggle('on', unitSwitch(m.id)); });
      list.appendChild(row);
      rows.push({ id: m.id, led: row.querySelector('.led') });
    });
  },

  update() {},


  draw() {
    trans.forEach((t, i) => {
      const x = xfm[i];
      setDisplay(x.seg, String(Math.round(t.level * 100)).padStart(3, ' '));
      x.bar.set(t.level);
      x.el.classList.toggle('main', tr.main === i);
      x.led.className = `led ${t.down ? 'red' : t.level < 0.2 ? 'yellow' : 'green'} on${t.down ? ' blink' : ''}`;
      const text = t.down ? (t.restarted ? 'ЗАПУЩЕН · ЕЩЁ РАЗ' : 'РАЗРЯЖЕН') : tr.main === i ? 'РАСХОД' : 'ЗАРЯЖЕН';
      if (x.stat.textContent !== text) x.stat.textContent = text;
    });
    rows.forEach(r => {
      const s = unitState(r.id).state;
      r.led.classList.toggle('on', s === 'on' || s === 'boot');
      r.led.classList.toggle('blink', s === 'boot');
    });
  },
};
