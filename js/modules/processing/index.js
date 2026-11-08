// ================= Модуль «Обработка» =================
// Сигнал приносят на накопителе, импортируют в память панели и поднимают уровень обработки
// (до 3). Поток можно трактовать как изображение, звук, текст или спектрограмму — осмысленной
// окажется только одна трактовка. Обработанный сигнал уносят обратно на воспроизведение.
import { buzz, click } from '../../core/audio.js';
import { setLed } from '../../core/leds.js';
import { clock, log } from '../../core/clock.js';
import { unitBootTime, unitOn } from '../../core/units.js';
import { settings } from '../../core/settings.js';
import { mounted } from '../../core/drives.js';
import { makeDisplay, setDisplay } from '../../widgets/seg7.js';
import { makeAlnum, setAlnum } from '../../widgets/seg16.js';
import { createLightBar } from '../../widgets/lightbar.js';
import { createDriveSlot } from '../../widgets/driveSlot.js';
import { createTransportButtons } from '../../widgets/transport.js';
import { createInterpretation } from '../../widgets/interpretation.js';
import { MAX_LEVEL } from '../../signal/pipeline.js';
import { proc, quality, sizeKb, interpretation } from '../../signal/access.js';
import { createTransport } from '../../signal/player.js';
import template from './template.js';
import { pr, slot, xfer, STAGES, eta, etaLevel, meaningful, setFormat, toggleRun, importExport, powerLoss, simulate } from './model.js';
import { createView } from './view.js';

const ui = {};
const pressBtn = (btn, fn) => { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 120); fn(); };
const fmtEta = s => {
  s = Math.min(5999, Math.ceil(s));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}.${String(s % 60).padStart(2, '0')}`;
};

function statusText() {
  if (xfer.busy()) return xfer.io.dir === 'in' ? 'IMPORT' : 'EXPORT';
  if (!pr.signal) return 'NO DATA';
  const p = proc(pr.signal);
  if (p.k >= MAX_LEVEL) return 'MAX LVL';
  if (pr.running) return STAGES[pr.stage].code;
  return p.lv.some(v => v > 0) ? 'PAUSED' : `LEVEL ${p.k}`;
}

const current = () => interpretation(pr.signal, pr.format);

// звук текущей трактовки — только если она звуковая и что-то уже декодировано
const tape = createTransport(() => {
  const c = current();
  if (!unitOn('processing') || !c) return null;
  if (!c.fmt.audio) { log(`ТРАКТОВКА «${c.fmt.name.toUpperCase()}» НЕ ЗВУКОВАЯ`); return null; }
  if (c.L.decode <= 0) { log('НЕТ ДЕКОДИРОВАННЫХ ДАННЫХ'); return null; }
  return { key: `${c.e.id}|${pr.format}`, get: () => c.fmt.samples(c.content, c.L, c.seed) };
});

function press(mode) {
  if (!unitOn('processing')) return false;
  const ok = tape.press(mode);
  if (!ok && mode !== 'stop') buzz();
  return ok;
}

export default {
  id: 'processing',
  title: 'Обработка',
  boot: 4.6,
  hints: 'щелчок по слоту — накопитель · обмен / извлечь — кнопки справа от слота · enter — старт · галетник — трактовка',
  template,

  init(root) {
    root.querySelectorAll('[data-ref]').forEach(el => { ui[el.dataset.ref] = el; });
    ui.slotW = createDriveSlot(ui.slot, slot, { onTransfer: importExport, errLed: true });
    ui.mem = makeAlnum(ui.memDisp, 6);
    ui.size = makeDisplay(ui.sizeSeg, 3);
    ui.q = makeDisplay(ui.qSeg, 3);

    ui.tp = createTransportButtons(ui.transport, { onPress: press });
    ui.interp = createInterpretation(ui.interp, { value: pr.format, onChange: i => { tape.reset(); setFormat(i); } });

    ui.lvl = makeDisplay(ui.lvlSeg, 1);
    ui.btnRun.addEventListener('click', toggleRun);
    ui.stBars = STAGES.map((_, i) => createLightBar(ui[`stBar${i}`], 12));
    ui.rate = makeDisplay(ui.rateSeg, 5);
    ui.eta = makeDisplay(ui.etaSeg, 4);
    ui.etaLvl = makeDisplay(ui.etaLvlSeg, 4);
    ui.spd = makeDisplay(ui.spdSeg, 3);
    ui.stat = makeAlnum(ui.status, 8);

    ui.view = createView(ui.out);
  },

  update(dt) {
    if (!unitOn('processing')) { tape.reset(); xfer.abort(); pr.running = false; return; }
    simulate(dt);
    tape.tick(dt);
  },

  draw(dt) {
    const bt = unitBootTime('processing'), show = bt >= 3.0, live = bt >= 2.0;
    const c = current(), e = pr.signal, p = e && proc(e);

    // ошибка: память занята, а на вставленном накопителе тоже есть запись
    ui.slotW.draw({ show, busy: xfer.busy(), progress: xfer.progress(), err: !!e && mounted(slot) && !!slot.drive.signal });
    ui.tp.draw(tape, show && unitOn('processing'));
    ui.interp.draw({ show, entry: e, fi: pr.format });
    setAlnum(ui.mem, show ? (e ? e.id : '------') : '');
    setDisplay(ui.size, show && e ? sizeKb(e).toFixed(1).padStart(4, ' ') : show ? '---' : '');
    setDisplay(ui.q, show && e ? String(Math.round(quality(e) * 100)).padStart(3, ' ') : show ? '---' : '');

    setDisplay(ui.lvl, show && p ? String(p.k) : show ? '-' : '');
    [1, 2, 3].forEach(k => setLed(`r-l${k}`, show && p && p.k >= k ? 'on' : false));
    STAGES.forEach((_, i) => {
      const v = p && p.k < MAX_LEVEL ? p.lv[i] : p ? 1 : 0;
      ui.stBars[i].set(show ? v : 0);
      setLed(`d-st${i}`, !show || !p ? false : pr.running && pr.stage === i ? 'blink' : v >= 1 ? 'on' : false);
    });
    setDisplay(ui.rate, show ? String(pr.running ? Math.min(99999, pr.rate) : 0).padStart(5, ' ') : '');
    setDisplay(ui.eta, show && e ? fmtEta(eta()) : show ? '--.--' : '');
    setDisplay(ui.etaLvl, show && e ? fmtEta(etaLevel()) : show ? '--.--' : '');
    setDisplay(ui.spd, show ? String(settings.decodeSpeed).padStart(3, ' ') : '');
    setAlnum(ui.stat, show ? statusText().padEnd(8, ' ') : '');

    ui.view.draw(dt, {
      live, empty: !c,
      id: c?.e.id, fi: pr.format, content: c?.content, L: c?.L, seed: c?.seed, t: clock.t,
      playhead: c?.fmt.audio ? tape.playhead() : null,
      meaning: c && meaningful() ? c.fmt.meaning(c.content) : null,
    });
  },

  onPower(ev) {
    if (ev === 'shutdown') { powerLoss(); tape.reset(); }
  },

  onKey(e) {
    if (e.repeat) return false;
    if (e.code === 'Enter') { pressBtn(ui.btnRun, toggleRun); return true; }
    return false;
  },

  activity() {
    if (pr.running || xfer.busy() || tape.active()) return 'blink';
    return false;
  },
};
