// ================= Модуль «Настройка» =================
// Наводка на захваченный источник по ID из буфера, подстройка частоты/полярности/типов
// под скрытые параметры сигнала, загрузка данных и сохранение.
import { beep, buzz, click, tick, thud } from '../../core/audio.js';
import { setLed, flashLed } from '../../core/leds.js';
import { clock, log } from '../../core/clock.js';
import { unitBootTime, unitOn, linked } from '../../core/units.js';

const isOn = () => unitOn('tuner');
import { buffer, readySlot, ID_CHARS, ID_LEN } from '../../core/buffer.js';
import { makeDisplay, setDisplay } from '../../widgets/seg7.js';
import { makeAlnum, setAlnum } from '../../widgets/seg16.js';
import { createLightBar } from '../../widgets/lightbar.js';
import { createRotary } from '../../widgets/rotary.js';
import { createEncoder } from '../../widgets/encoder.js';
import { createDetentSlider } from '../../widgets/detentSlider.js';
import { createLatchGroup } from '../../widgets/latch.js';
import template, { waveLabels, polTypeLabels } from './template.js';
import { tn, ACQ_SEGS, POL_STEP_LABELS, typeChar, eraseChar, stepFreq, stepPol, load, reset, save, powerLoss, simulate } from './model.js';
import { createMonitor } from './monitor.js';
import { createScope } from './scope.js';
import { createPolar } from './polar.js';

const MONITOR_FPS = 1;
const ui = {};
let monAcc = 1, monPhase = '';

const press = (btn, fn) => { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 120); fn(); };
const keyChar = e => (/^Key[A-Z]$/.test(e.code) ? e.code.slice(3) : /^(Digit|Numpad)\d$/.test(e.code) ? e.code.slice(-1) : null);
const isLocked = () => tn.phase === 'locked' || tn.phase === 'done';

function idText() {
  let s = tn.id;
  if (tn.editing && s.length < ID_LEN && Math.floor(clock.t * 3) % 2) s += '_';
  return s.padEnd(ID_LEN, ' ');
}

function statusText() {
  if (tn.editing) return 'ENTER ID';
  if (!linked('radar', 'tuner') && tn.phase !== 'done') return 'NO LINK';
  switch (tn.phase) {
    case 'search': return Math.floor(clock.t * 3) % 2 ? 'SEARCH' : 'SEARCH..';
    case 'fail': return 'NO SIGNL';
    case 'locked': return tn.rate > 0 ? 'LOADING' : 'TUNING';
    case 'done': return tn.saved ? 'SAVED' : 'COMPLETE';
    default: return 'READY';
  }
}

function idFromBuffer() {
  const s = readySlot(buffer.sel);
  if (!isOn()) { click(); return; }
  if (!linked('radar', 'tuner')) { buzz(); flashLed('t-link', 1200); log('ОТКАЗ: НЕТ СВЯЗИ С ТРИАНГУЛЯТОРОМ'); return; }
  if (!s) { buzz(); flashLed('t-id', 900); log(`СЛОТ ${buffer.sel + 1} ПУСТ`); return; }
  tn.id = s.id;
  tn.editing = false;
  click();
  log(`ID ${s.id} ИЗ СЛОТА ${buffer.sel + 1}`);
}

export default {
  id: 'tuner',
  title: 'Настройка',
  boot: 5.2,
  hints: 'клик по полю ID — ввод · БУФ — ID из выбранного слота · enter — загрузить · колесо / вращение — крутилки',
  template,

  init(root) {
    root.querySelectorAll('[data-ref]').forEach(el => { ui[el.dataset.ref] = el; });

    // --- наводка ---
    ui.id = makeAlnum(ui.idField, ID_LEN);
    ui.idField.addEventListener('click', () => {
      if (!isOn()) return;
      tn.editing = !tn.editing;
      click();
    });
    document.addEventListener('pointerdown', e => {
      if (tn.editing && !ui.idField.contains(e.target) && e.target !== ui.btnLoad) tn.editing = false;
    });
    ui.idBuf.addEventListener('click', idFromBuffer);
    ui.btnLoad.addEventListener('click', load);
    ui.btnReset.addEventListener('click', () => { click(); reset(); });
    ui.acq = createLightBar(ui.acqBar, ACQ_SEGS);

    // --- телеметрия ---
    ui.acc = makeDisplay(ui.accSeg, 3);
    ui.rate = makeDisplay(ui.rateSeg, 4);
    ui.prog = makeDisplay(ui.progSeg, 3);
    ui.progress = createLightBar(ui.progBar, 20);
    ui.status = makeAlnum(ui.status, 8);
    ui.btnSave.addEventListener('click', save);

    // --- частота ---
    ui.freq = makeDisplay(ui.freqSeg, 4);
    createRotary(ui.freqStep, { labels: ['1', '10', '100', '1K'], value: tn.freqStep, onChange: i => { tn.freqStep = i; } });
    createEncoder(ui.freqKnob, { detent: 12, every: 3, onStep: d => (stepFreq(d) ? tick() : thud()) });
    ui.freqMatch = createLightBar(ui.freqBar, 14);

    // --- полярность ---
    ui.pol = makeDisplay(ui.polSeg, 4);
    createRotary(ui.polStep, { labels: POL_STEP_LABELS, value: tn.polStep, onChange: i => { tn.polStep = i; } });
    createEncoder(ui.polKnob, { detent: 12, every: 3, onStep: d => { stepPol(d); tick(); } });
    ui.polMatch = createLightBar(ui.polBar, 14);

    // --- типы ---
    createDetentSlider(ui.waveSel, { labels: waveLabels, value: tn.rx.wave, onChange: i => { tn.rx.wave = i; } });
    createLatchGroup(ui.polTypeSel, { labels: polTypeLabels, value: tn.rx.polType, onChange: i => { tn.rx.polType = i; } });

    // --- экраны ---
    ui.monitor = createMonitor(ui.mon);
    ui.scopeView = createScope(ui.scope);
    ui.polarView = createPolar(ui.polar);
  },

  update(dt) {
    if (isOn()) simulate(dt);
  },

  draw(dt) {
    const bt = unitBootTime('tuner'), vis = t0 => bt >= t0;
    const locked = isLocked(), m = tn.m, rx = tn.rx;
    const show = vis(3.0);

    // наводка
    setAlnum(ui.id, show ? idText() : '');
    ui.idField.classList.toggle('editing', tn.editing);
    const acq = !show || tn.phase === 'idle' ? 0
      : tn.phase === 'fail' ? (Math.floor(clock.t * 4) % 2 ? tn.acq : 0)
      : tn.acq;
    ui.acq.set(acq);
    setLed('t-lock', locked ? 'on' : false);
    setLed('t-search', tn.phase === 'search' ? 'blink' : false);

    // подстройка
    setDisplay(ui.freq, show ? String(rx.freq).padStart(4, '0') : '');
    setDisplay(ui.pol, show ? (rx.pol / 10).toFixed(1).padStart(5, '0') : '');
    ui.freqMatch.set(show && locked ? m.freq : 0);
    ui.polMatch.set(show && locked ? m.pol : 0);
    setLed('t-wave', locked && m.wave ? 'on' : false);
    setLed('t-ptype', locked && m.polType ? 'on' : false);

    // телеметрия
    const total = tn.channel ? tn.channel.bits : 1;
    const prog = locked ? tn.bits / total : 0;
    setDisplay(ui.acc, show ? (locked ? Math.min(99.9, tn.acc * 100).toFixed(1) : '0.0').padStart(4, ' ') : '');
    setDisplay(ui.rate, show ? String(tn.phase === 'locked' ? tn.rate : 0).padStart(4, ' ') : '');
    setDisplay(ui.prog, show ? String(Math.floor(prog * 100)).padStart(3, ' ') : '');
    ui.progress.set(show ? prog : 0);
    setAlnum(ui.status, show ? statusText().padEnd(8, ' ') : '');
    setLed('t-rx', tn.phase === 'locked' && tn.rate > 0 ? 'blink' : false);
    setLed('t-done', tn.phase === 'done' ? 'on' : false);
    setLed('t-saved', tn.saved ? 'on' : false);

    // экраны
    const live = vis(2.0);
    ui.scopeView.draw(dt, { live, locked, wave: rx.wave, freq: rx.freq, drift: m.drift, freqC: m.freq, waveOk: m.wave, t: clock.t });
    ui.polarView.draw(dt, { live, locked, pol: rx.pol / 10, polC: m.pol, polType: rx.polType, polOk: m.polType });

    const phaseKey = `${live}|${locked}`;
    monAcc += dt;
    if (monAcc >= 1 / MONITOR_FPS || phaseKey !== monPhase) {
      monAcc = 0;
      monPhase = phaseKey;
      const model = tn.channel?.model;
      ui.monitor.draw({
        mode: !live ? 'off' : locked && model ? 'image' : 'noise',
        kind: model?.kind, seed: model?.seed ?? 0,
        rot: clock.t * 0.55, clarity: tn.acc,
      });
    }
  },

  onPower(ev) {
    if (ev === 'shutdown') powerLoss();
  },

  onKey(e) {
    if (tn.editing) {
      e.preventDefault();
      if (e.code === 'Enter' || e.code === 'NumpadEnter') press(ui.btnLoad, load);
      else if (e.code === 'Escape') { tn.editing = false; click(); }
      else if (e.code === 'Backspace') { if (eraseChar()) tick(); }
      else {
        const ch = keyChar(e);
        if (ch && ID_CHARS.includes(ch) && typeChar(ch)) tick();
        else if (ch) beep(160, 0.05, 'square', 0.03);
      }
      return true;
    }
    if (e.code === 'Enter' && !e.repeat) { press(ui.btnLoad, load); return true; }
    return false;
  },

  activity() {
    if (tn.phase === 'search' || (tn.phase === 'locked' && tn.rate > 0)) return 'blink';
    if (tn.phase === 'locked' || (tn.phase === 'done' && !tn.saved)) return 'on';
    return false;
  },
};
