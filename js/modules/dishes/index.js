// ================= Модуль «Телескопы» =================
// Менеджер массива из 26 радиотелескопов. Точность тарелок сама падает и тормозит загрузку
// в «Настройке». Режимы: мониторинг (опрос по кругу), диагностика одного телескопа,
// калибровка (до 100 %) и ремонт упавшего сервера мини-игрой на крестовине.
import { buzz, click, tick, thud, beep } from '../../core/audio.js';
import { clock, log } from '../../core/clock.js';
import { isOn as powerOn } from '../../core/power.js';
import { unitBootTime, unitOn } from '../../core/units.js';
import { dishes, neighbor, tickDishes, calibrate, meanPrecision, serversDown, downloadFactor } from '../../core/dishes.js';
import { makeDisplay, setDisplay } from '../../widgets/seg7.js';
import { makeAlnum, setAlnum } from '../../widgets/seg16.js';
import { createDetentSlider } from '../../widgets/detentSlider.js';
import template from './template.js';
import { createView } from './view.js';

const MODES = ['МОНИТОР', 'ДИАГН.', 'КАЛИБР.', 'РЕМОНТ'];
const DIRS = ['up', 'down', 'left', 'right'];

const ui = {};
const dm = {
  mode: 0, sel: 0,
  scan: 0, scanT: 0, fast: 0,                       // опрос: текущий телескоп, таймер, оставшиеся быстрые шаги
  polled: dishes.map(d => ({ prec: d.prec, up: d.up })),
  op: null, diag: null, record: null,
};
let holes = [];

const isOn = () => unitOn('dishes');
const sel = () => dishes[dm.sel];
const busy = () => !!dm.op;

// ---------- опрос ----------
function poll(i) { dm.polled[i] = { prec: dishes[i].prec, up: dishes[i].up }; }

// ---------- операции ----------
function cancelOp(silent) {
  if (!dm.op) return;
  if (!silent) log(`ОПЕРАЦИЯ НАД ТЕЛЕСКОПОМ ${dishes[dm.op.dish].letter} ПРЕРВАНА`);
  dm.op = null;
}

function startDiag() {
  const d = sel();
  dm.op = { kind: 'diag', dish: dm.sel, t: 0, dur: 3.2 };
  log(`ДИАГНОСТИКА ТЕЛЕСКОПА ${d.letter} ${d.name.toUpperCase()}`);
}

function diagLines(d) {
  const r = k => ((d.seed * (k + 3)) % 1000) / 1000;
  const loss = 1 - d.prec;
  const bad = c => (c ? '#ff6a50' : undefined), warn = c => (c ? '#ffd23c' : undefined);
  return [
    ['ТОЧНОСТЬ НАВЕДЕНИЯ', `${(d.prec * 100).toFixed(1)}%`, warn(d.prec < 0.6)],
    ['СЕРВЕР', d.up ? 'В СЕТИ' : 'НЕ ОТВЕЧАЕТ', bad(!d.up)],
    ['ОШИБКА АЗИМУТА', `${(loss * 2.6 + r(1) * 0.1).toFixed(2)} ГРАД`],
    ['ОШИБКА ВОЗВЫШЕНИЯ', `${(loss * 1.9 + r(2) * 0.1).toFixed(2)} ГРАД`],
    ['ЛЮФТ ПРИВОДА', `${(0.1 + loss * 1.4 + r(3) * 0.2).toFixed(2)} ММ`],
    ['ТЕМПЕРАТУРА ПРИЁМНИКА', `${(31 + r(4) * 6 + loss * 18).toFixed(1)} °C`, warn(loss > 0.35)],
    ['ОТНОШЕНИЕ СИГНАЛ/ШУМ', `${(34 * d.prec + 4 + r(5) * 2).toFixed(1)} ДБ`],
    ['ВРЕМЯ С КАЛИБРОВКИ', `${Math.max(0, Math.round((clock.t - d.lastCal) / 60))} МИН`],
    ['СКОРОСТЬ ДЕГРАДАЦИИ', `${(d.rate * 3600 * 100).toFixed(1)}%/Ч`],
    ['ВКЛАД В ЗАГРУЗКУ', d.up ? `${(d.prec * 100 / dishes.length).toFixed(1)}%` : '0.0%', bad(!d.up)],
  ];
}

function startCal(i, queue = null) {
  const d = dishes[i], deficit = Math.max(0.1, 1 - d.prec);
  dm.op = {
    kind: queue ? 'calAll' : 'cal', dish: i, t: 0, queue: queue || [], p0: d.prec, stage: 0, sp: 0,
    stages: [
      { name: 'ПОДГОТОВКА', dur: 2 },
      { name: 'ГРУБАЯ НАВОДКА', dur: 3 + 6 * deficit },
      { name: 'ТОНКАЯ ПОДСТРОЙКА', dur: 4 + 10 * deficit },
      { name: 'ПРОВЕРКА', dur: 2 },
    ],
  };
  log(`КАЛИБРОВКА ТЕЛЕСКОПА ${d.letter} ${d.name.toUpperCase()}`);
}

function startRepair() {
  const seq = Array.from({ length: 6 }, () => DIRS[Math.floor(Math.random() * 4)]);
  dm.op = { kind: 'repair', dish: dm.sel, t: 0, limit: 40, seq, pos: 0, errors: 0 };
  log(`РЕМОНТ СЕРВЕРА ТЕЛЕСКОПА ${sel().letter}: ПОВТОРИТЕ ПОСЛЕДОВАТЕЛЬНОСТЬ`);
}

function stepOp(dt) {
  const op = dm.op;
  if (!op) return;
  op.t += dt;
  const d = dishes[op.dish];
  if (op.kind === 'diag') {
    if (op.t >= op.dur) {
      dm.diag = { dish: op.dish, lines: diagLines(d), at: clock.t, ago: 0 };
      dm.op = null;
      poll(op.dish);
      beep(1046, 0.08);
      log(`ДИАГНОСТИКА ТЕЛЕСКОПА ${d.letter} ЗАВЕРШЕНА`);
    }
  } else if (op.kind === 'cal' || op.kind === 'calAll') {
    if (!d.up) { log(`КАЛИБРОВКА ПРЕРВАНА: СЕРВЕР ТЕЛЕСКОПА ${d.letter} ОТКАЗАЛ`); buzz(); dm.op = null; return; }
    let t = op.t, k = 0;
    while (k < op.stages.length - 1 && t >= op.stages[k].dur) { t -= op.stages[k].dur; k++; }
    op.stage = k;
    op.sp = Math.min(1, t / op.stages[k].dur);
    const total = op.stages[1].dur + op.stages[2].dur, done = k === 1 ? op.sp * op.stages[1].dur : k === 2 ? op.stages[1].dur + op.sp * op.stages[2].dur : k > 2 ? total : 0;
    d.prec = Math.max(d.prec, op.p0 + (1 - op.p0) * Math.min(1, done / total) * 0.97);
    if (op.t >= op.stages.reduce((s, x) => s + x.dur, 0)) {
      calibrate(d);
      poll(op.dish);
      beep(784, 0.1); beep(1175, 0.12, 'square', 0.03, 0.1);
      log(`ТЕЛЕСКОП ${d.letter} ОТКАЛИБРОВАН: 100%`);
      const next = op.queue.shift();
      dm.op = null;
      if (next !== undefined) startCal(next, op.queue);
    }
  } else if (op.kind === 'repair' && op.t >= op.limit) {
    dm.op = null;
    buzz();
    log(`РЕМОНТ СЕРВЕРА ТЕЛЕСКОПА ${d.letter} НЕ УДАЛСЯ: ВРЕМЯ ВЫШЛО`);
  }
}

// ---------- команды ----------
function act() {
  click();
  if (!isOn()) return;
  if (busy()) { buzz(); log('ОТКАЗ: ОПЕРАЦИЯ УЖЕ ИДЁТ'); return; }
  const d = sel();
  if (dm.mode === 0) { dm.fast = dishes.length; log('ОПРОС ВСЕХ ТЕЛЕСКОПОВ'); }
  else if (dm.mode === 1) startDiag();
  else if (dm.mode === 2) {
    if (!d.up) { buzz(); log(`ОТКАЗ: СЕРВЕР ТЕЛЕСКОПА ${d.letter} НЕ РАБОТАЕТ`); return; }
    if (d.prec >= 0.999) { buzz(); log(`ТЕЛЕСКОП ${d.letter} УЖЕ ОТКАЛИБРОВАН`); return; }
    startCal(dm.sel);
  } else {
    if (d.up) { buzz(); log(`СЕРВЕР ТЕЛЕСКОПА ${d.letter} В НОРМЕ`); return; }
    startRepair();
  }
}

function actAll() {
  click();
  if (!isOn()) return;
  if (dm.mode !== 2) { buzz(); log('КАЛИБРОВКА ВСЕХ: ПЕРЕКЛЮЧИТЕ РЕЖИМ НА КАЛИБРОВКУ'); return; }
  if (busy()) { buzz(); log('ОТКАЗ: ОПЕРАЦИЯ УЖЕ ИДЁТ'); return; }
  const queue = dishes.filter(d => d.up && d.prec < 0.999).sort((a, b) => a.prec - b.prec).map(d => d.i);
  if (!queue.length) { buzz(); log('КАЛИБРОВКА ВСЕХ: НЕЧЕГО КАЛИБРОВАТЬ'); return; }
  log(`КАЛИБРОВКА ВСЕХ ТЕЛЕСКОПОВ: ${queue.length} ШТ.`);
  startCal(queue.shift(), queue);
}

function dpad(dir) {
  if (!isOn()) { click(); return; }
  const op = dm.op;
  if (op?.kind === 'repair') {                       // во время ремонта крестовина — ввод последовательности
    if (op.seq[op.pos] === dir) {
      op.pos++; tick();
      if (op.pos >= op.seq.length) {
        const d = dishes[op.dish];
        d.up = true; poll(op.dish);
        const t = op.t;
        const rec = dm.record === null || t < dm.record;
        dm.record = rec ? t : dm.record;
        dm.op = null;
        beep(784, 0.1); beep(1175, 0.12, 'square', 0.03, 0.1);
        log(`СЕРВЕР ТЕЛЕСКОПА ${d.letter} ВОССТАНОВЛЕН ЗА ${t.toFixed(1)} С${rec ? ' · НОВЫЙ РЕКОРД' : ''}`);
      }
    } else { op.pos = 0; op.errors++; op.t += 1; buzz(); }
    return;
  }
  if (busy()) { buzz(); return; }
  const next = neighbor(dm.sel, dir);
  if (next === dm.sel) { thud(); return; }
  dm.sel = next;
  detentClick();
}
const detentClick = () => { tick(); beep(160, 0.02, 'triangle', 0.04); };

// ---------- светодиоды на карте ----------
function buildMap(root) {
  const map = ui.map;
  holes = dishes.map(d => {
    const hole = document.createElement('div');
    hole.className = 'dish-hole';
    hole.style.left = `${d.x}%`;
    hole.style.top = `${d.y}%`;
    hole.title = `${d.letter} · ${d.name}`;
    hole.innerHTML = `<span class="led"></span><span class="dish-letter">${d.letter}</span>`;
    map.appendChild(hole);
    return { hole, led: hole.firstChild, cls: '' };
  });
}

export default {
  id: 'dishes',
  title: 'Телескопы',
  boot: 4.0,
  nolink: true,
  hints: 'крестовина / стрелки — выбор телескопа · enter — действие · слайдер — режим',
  template,

  init(root) {
    root.querySelectorAll('[data-ref]').forEach(el => { ui[el.dataset.ref] = el; });
    buildMap(root);
    createDetentSlider(ui.modeSel, { labels: MODES, value: 0, onChange: i => { cancelOp(); dm.mode = i; } });
    ui.dpad.querySelectorAll('.pad').forEach(b => b.addEventListener('click', () => dpad(b.dataset.dir)));
    ui.sel = makeAlnum(ui.selDisp, 12);
    ui.avg = makeDisplay(ui.avgSeg, 3);
    ui.srv = makeDisplay(ui.srvSeg, 2);
    ui.spd = makeDisplay(ui.spdSeg, 3);
    ui.btnAct.addEventListener('click', act);
    ui.btnAll.addEventListener('click', actAll);
    ui.btnStop.addEventListener('click', () => { click(); if (isOn()) cancelOp(); });
    ui.view = createView(ui.term);
  },

  update(dt) {
    if (powerOn()) tickDishes(dt);                     // массив стареет, пока консоль под питанием
    if (!isOn()) { dm.op = null; return; }
    stepOp(dt);
    if (dm.diag) dm.diag.ago = Math.round(clock.t - dm.diag.at);
    // опрос по кругу: обновляет таблицу; быстрый — по кнопке
    dm.scanT += dt;
    const period = dm.fast > 0 ? 0.07 : 0.55;
    if (dm.scanT >= period) {
      dm.scanT = 0;
      dm.scan = (dm.scan + 1) % dishes.length;
      poll(dm.scan);
      if (dm.fast > 0) dm.fast--;
    }
  },

  draw() {
    const bt = unitBootTime('dishes'), show = bt >= 3.0, live = bt >= 2.0;
    const T = clock.t;

    holes.forEach((h, i) => {
      const d = dishes[i];
      const color = !d.up ? 'red' : d.prec < 0.6 ? 'yellow' : 'green';
      let state;
      if (dm.mode === 0) state = i === dm.scan && Math.floor(T * 10) % 2 ? '' : d.up ? 'on' : 'on blink';      // опрашиваемый моргает
      else state = i === dm.sel ? 'on blink' : '';                                                        // остальные погашены
      const key = `${color} ${state}`;
      if (h.cls !== key) { h.cls = key; h.led.className = `led ${key}`; }
    });

    // индикаторы доступности действий в текущем режиме
    const d = sel();
    const can = dm.mode === 2 ? d.up && d.prec < 0.999 : dm.mode === 3 ? !d.up : true;
    ui.ledAct.classList.toggle('on', show && !dm.op && can);
    ui.ledAll.classList.toggle('on', show && !dm.op && dm.mode === 2 && dishes.some(x => x.up && x.prec < 0.999));
    setAlnum(ui.sel, show ? `${sel().letter} ${sel().name.toUpperCase()}`.slice(0, 12).padEnd(12, ' ') : '');
    setDisplay(ui.avg, show ? String(Math.round(meanPrecision() * 100)).padStart(3, ' ') : '');
    setDisplay(ui.srv, show ? String(dishes.length - serversDown()).padStart(2, ' ') : '');
    setDisplay(ui.spd, show ? String(Math.round(downloadFactor() * 100)).padStart(3, ' ') : '');

    ui.view.draw({ live, mode: dm.mode, scan: dm.scan, polled: dm.polled, sel: dm.sel, op: dm.op, diag: dm.diag, record: dm.record });
  },

  onPower(ev) { if (ev === 'shutdown') dm.op = null; },

  onKey(e) {
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (map[e.code]) { e.preventDefault(); dpad(map[e.code]); return true; }
    if (e.repeat) return false;
    if (e.code === 'Enter') { act(); return true; }
    return false;
  },

  activity() {
    if (dm.op) return 'blink';
    return serversDown() ? 'on' : false;
  },
};
