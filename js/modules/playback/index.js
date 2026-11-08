// ================= Модуль «Воспроизведение» =================
// Память сохранённых сигналов. Здесь их слушают, смотрят в выбранной трактовке, переносят на
// накопитель для обработки (обработанные возвращают обратно) и отправляют на ПК.
// Список доступен только при связи с модулем настройки.
import { buzz, click, detent, thud } from '../../core/audio.js';
import { setLed } from '../../core/leds.js';
import { clock, log } from '../../core/clock.js';
import { unitBootTime, unitOn, linked } from '../../core/units.js';
import { archive } from '../../core/storage.js';
import { makeHolder, mounted } from '../../core/drives.js';
import { clamp } from '../../core/math.js';
import { makeDisplay, setDisplay } from '../../widgets/seg7.js';
import { makeAlnum, setAlnum } from '../../widgets/seg16.js';
import { createLightBar } from '../../widgets/lightbar.js';
import { createEncoder } from '../../widgets/encoder.js';
import { createDriveSlot } from '../../widgets/driveSlot.js';
import { createTransportButtons } from '../../widgets/transport.js';
import { createInterpretation } from '../../widgets/interpretation.js';
import { proc, quality, sizeKb, listenSamples, interpretation, meaningfulFor } from '../../signal/access.js';
import { createDriveIO } from '../../signal/driveIO.js';
import { createTransport } from '../../signal/player.js';
import { tx, startExport, abortExport, tickExport } from '../../signal/pcExport.js';
import template, { LIST_ROWS, LIST_COLS, BANK } from './template.js';
import { createView } from '../processing/view.js';

const ui = {};
const pb = { sel: 0, fi: 0 };
// семь слотов накопителей; у каждого свой обмен
const bank = Array.from({ length: BANK }, () => { const holder = makeHolder(null, true); return { holder, xfer: createDriveIO(holder) }; });
const busyIO = () => bank.find(b => b.xfer.busy())?.xfer;

const link = () => linked('tuner', 'playback');
const list = () => (link() ? archive : []);
const entry = () => list()[pb.sel] || null;
const isOn = () => unitOn('playback');
const current = () => interpretation(entry(), pb.fi);

// звук выбранной трактовки; если она не звуковая — поток «как есть»
const tape = createTransport(() => {
  const e = isOn() && entry();
  if (!e) return null;
  return {
    key: `${e.id}|${pb.fi}`,
    get() {
      const c = current();
      return c.fmt.audio && c.L.decode > 0 ? c.fmt.samples(c.content, c.L, c.seed) : listenSamples(e);
    },
  };
});

function browse(d) {
  const n = list().length, i = clamp(pb.sel + d, 0, Math.max(0, n - 1));
  if (i === pb.sel || !n) { thud(); return; }
  pb.sel = i;
  detent();
}

function press(mode) {
  if (!isOn()) return false;
  if (mode !== 'stop' && !entry()) { log('НЕТ СИГНАЛА ДЛЯ ВОСПРОИЗВЕДЕНИЯ'); return false; }
  return tape.press(mode);
}

// накопитель с сигналом → в память; пустой накопитель → выбранный сигнал на него
function importExport(slot, xfer) {
  if (!isOn()) return;
  if (xfer.busy()) { buzz(); return; }
  const d = slot.drive;
  if (!d) { buzz(); log('ВСТАВЬТЕ НАКОПИТЕЛЬ'); return; }
  if (!mounted(slot)) { buzz(); log('НАКОПИТЕЛЬ ИЗВЛЕЧЁН: ЗАБЕРИТЕ ЕГО'); return; }
  if (!link()) { buzz(); log('ОТКАЗ: НЕТ СВЯЗИ С МОДУЛЕМ НАСТРОЙКИ'); return; }
  if (d.signal) {
    const s = d.signal;
    if (archive.some(e => e.id === s.id)) { buzz(); log(`${s.id} УЖЕ В ПАМЯТИ`); return; }
    xfer.start('in', s, () => { d.signal = null; archive.push(s); pb.sel = archive.length - 1; });
  } else {
    const e = entry();
    if (!e) { buzz(); log('НЕТ СИГНАЛА ДЛЯ ЭКСПОРТА'); return; }
    tape.reset();
    xfer.start('out', e, () => {
      const i = archive.indexOf(e);
      if (i >= 0) archive.splice(i, 1);
      d.signal = e;
    });
  }
}

function toPc() {
  click();
  const c = current();
  if (!isOn()) return;
  if (!c) { buzz(); log('ОТКАЗ: НЕТ СИГНАЛА ДЛЯ ЭКСПОРТА'); return; }
  startExport(c.fmt, c.content, c.L, c.seed, c.e.id);
}

function statusText() {
  if (!link()) return 'NO LINK';
  const io = busyIO();
  if (io) return io.io.dir === 'in' ? 'IMPORT' : 'EXPORT';
  if (tx.phase === 'prep' || tx.phase === 'send') return 'TX PC';
  if (tape.mode === 'play') return 'PLAYING';
  if (tape.mode === 'ff') return 'FFWD';
  if (tape.mode === 'rew') return 'REWIND';
  if (!entry()) return 'NO DATA';
  return 'READY';
}

export default {
  id: 'playback',
  title: 'Воспроизведение',
  boot: 3.6,
  hints: 'крутилка — выбор сигнала · enter — play / стоп · щелчок по слоту — вставить / забрать накопитель',
  template,

  init(root) {
    root.querySelectorAll('[data-ref]').forEach(el => { ui[el.dataset.ref] = el; });
    ui.rows = Array.from({ length: LIST_ROWS }, () => {
      const row = document.createElement('div');
      row.className = 'alnum';
      ui.matrix.appendChild(row);
      return makeAlnum(row, LIST_COLS);
    });
    createEncoder(ui.listKnob, { detent: 30, every: 1, notch: 30, onStep: browse });
    ui.count = makeDisplay(ui.countSeg, 2);
    ui.size = makeDisplay(ui.sizeSeg, 3);
    ui.q = makeDisplay(ui.qSeg, 3);
    ui.lvl = makeDisplay(ui.lvlSeg, 1);
    ui.tp = createTransportButtons(ui.transport, { onPress: press });
    ui.interp = createInterpretation(ui.interp, { value: pb.fi, onChange: i => { pb.fi = i; } });
    ui.slots = bank.map(({ holder, xfer }) => {
      const el = document.createElement('div');
      ui.bank.appendChild(el);
      return createDriveSlot(el, holder, { compact: true, onTransfer: () => importExport(holder, xfer) });
    });
    ui.ioBarW = createLightBar(ui.ioBar, 16);
    ui.stat = makeAlnum(ui.status, 8);
    ui.txBarW = createLightBar(ui.txBar, 20);
    ui.tx = makeDisplay(ui.txSeg, 3);
    ui.btnExport.addEventListener('click', toPc);
    ui.view = createView(ui.out);
  },

  update(dt) {
    if (!isOn()) { bank.forEach(b => b.xfer.abort()); tape.reset(); abortExport('НЕТ ПИТАНИЯ'); return; }
    bank.forEach(b => b.xfer.tick(dt));
    tape.tick(dt);
    tickExport(dt);
  },

  draw(dt) {
    const bt = unitBootTime('playback'), show = bt >= 3.0, live = bt >= 2.0;
    const items = list();
    if (pb.sel >= items.length) pb.sel = Math.max(0, items.length - 1);
    const e = entry(), c = current();

    // список: окно вокруг выбранного; уровень обработки — последняя цифра
    const start = Math.max(0, Math.min(pb.sel - 2, items.length - LIST_ROWS));
    for (let r = 0; r < LIST_ROWS; r++) {
      const it = items[start + r];
      let s = '';
      if (!link()) s = r === 1 ? ' NO LINK' : '';
      else if (!items.length) s = r === 1 ? '  EMPTY' : '';
      else if (it) s = `${start + r === pb.sel ? '>' : ' '}${it.id} L${proc(it).k}`;
      setAlnum(ui.rows[r], show ? s.padEnd(LIST_COLS, ' ') : '');
    }
    setDisplay(ui.count, show ? String(items.length).padStart(2, ' ') : '');
    setDisplay(ui.size, show && e ? sizeKb(e).toFixed(1).padStart(4, ' ') : show ? '---' : '');
    setDisplay(ui.q, show && e ? String(Math.round(quality(e) * 100)).padStart(3, ' ') : show ? '---' : '');
    setDisplay(ui.lvl, show && e ? String(proc(e).k) : show ? '-' : '');
    setLed('p-nolink', show && !link() ? 'blink' : false);

    ui.tp.draw(tape, show && isOn());
    ui.interp.draw({ show, entry: e, fi: pb.fi });

    bank.forEach((b, i) => ui.slots[i].draw({ show, busy: b.xfer.busy(), progress: 0 }));
    ui.ioBarW.set(show ? busyIO()?.progress() ?? 0 : 0);
    const txp = tx.total ? tx.bits / tx.total : 0;
    ui.txBarW.set(show ? txp : 0);
    setDisplay(ui.tx, show ? String(Math.floor(txp * 100)).padStart(3, ' ') : '');
    setLed('p-tx', tx.phase === 'prep' || tx.phase === 'send' ? 'blink' : tx.phase === 'done' && show ? 'on' : false);
    setAlnum(ui.stat, show ? statusText().padEnd(8, ' ') : '');

    ui.view.draw(dt, {
      live, empty: false,
      notice: !link() ? ['НЕТ СВЯЗИ С МОДУЛЕМ НАСТРОЙКИ'] : !c ? ['НЕТ СОХРАНЁННЫХ СИГНАЛОВ'] : null,
      id: e?.id, fi: pb.fi, content: c?.content, L: c?.L, seed: c?.seed, t: clock.t,
      playhead: c?.fmt.audio ? tape.playhead() : null,
      meaning: c && meaningfulFor(e, pb.fi) ? c.fmt.meaning(c.content) : null,
    });
  },

  onPower(ev) {
    if (ev === 'shutdown') { tape.reset(); bank.forEach(b => b.xfer.abort()); abortExport('НЕТ ПИТАНИЯ'); }
  },

  onKey(e) {
    if (e.repeat) return false;
    if (e.code === 'Enter') { if (press(tape.mode === 'play' ? 'stop' : 'play')) click(); return true; }
    if (e.code === 'ArrowUp') { browse(-1); return true; }
    if (e.code === 'ArrowDown') { browse(1); return true; }
    return false;
  },

  activity() {
    if (busyIO() || tape.active() || tx.phase === 'send') return 'blink';
    return false;
  },
};
