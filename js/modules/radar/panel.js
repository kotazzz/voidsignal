// ================= Панель триангулятора: индикаторы, буфер, кулдаун =================
import { clamp } from '../../core/math.js';
import { click } from '../../core/audio.js';
import { setLed } from '../../core/leds.js';
import { unitBootTime, unitOn } from '../../core/units.js';
import { slots, buffer, SLOT_N, ID_LEN } from '../../core/buffer.js';
import { makeDisplay, setDisplay } from '../../widgets/seg7.js';
import { makeAlnum, setAlnum } from '../../widgets/seg16.js';
import { fmtLat, fmtLon } from './config.js';
import { st } from './state.js';
import { select, clearSlot, doMove, doScan, doPing } from './logic.js';
import { msg } from '../../core/clock.js';

const CD_SEGS = 16, MSG_CELLS = 64;
let msgDisp, rowUI, slotUI, cdDisp, cdSegs, toggles, slotsEl, sliderEl, knobEl;
export const ui = {};

export function initPanel(root) {
  const $ = s => root.querySelector(s);

  const segRows = $('#segRows');
  rowUI = st.radars.map((_, i) => {
    const row = document.createElement('div');
    row.className = 'seg-row';
    row.innerHTML = `<span class="seg-id">R${i + 1}</span><span class="seg-lbl">LAT</span><div class="seg-display"></div><span class="seg-lbl">LON</span><div class="seg-display"></div>`;
    segRows.appendChild(row);
    const [latEl, lonEl] = row.querySelectorAll('.seg-display');
    return { row, lat: makeDisplay(latEl, 4), lon: makeDisplay(lonEl, 5) };
  });
  cdDisp = makeDisplay($('#segCd'), 3);

  slotsEl = $('#slots');
  slotUI = slots.map((_, i) => {
    const row = document.createElement('div');
    row.className = 'slot';
    row.innerHTML = `<span class="slot-n">${i + 1}</span><span class="led green" data-led="occ${i}"></span><span class="led yellow" data-led="act${i}"></span><div class="alnum"></div><button class="mini-btn">CLR</button>`;
    slotsEl.appendChild(row);
    row.querySelector('.mini-btn').addEventListener('click', () => clearSlot(i));
    return { row, id: makeAlnum(row.querySelector('.alnum'), ID_LEN) };
  });

  const cdBar = $('#cdBar');
  cdSegs = Array.from({ length: CD_SEGS }, (_, i) => {
    const s = document.createElement('div');
    s.className = i < 6 ? 'cd-seg' : i < 12 ? 'cd-seg mid' : 'cd-seg hot';
    cdBar.appendChild(s);
    return s;
  });

  toggles = [...root.querySelectorAll('.toggle')];
  toggles.forEach(t => t.addEventListener('click', () => select(+t.dataset.sw)));

  ui.btnMove = $('#btnMove');
  ui.btnScan = $('#btnScan');
  ui.btnMove.addEventListener('click', doMove);
  ui.btnScan.addEventListener('click', doScan);
  ui.btnPing = $('#btnPing');
  ui.btnPing.addEventListener('click', doPing);
  msgDisp = makeAlnum($('#msgStrip'), MSG_CELLS);

  // слайдер буфера: 5 фиксированных положений
  sliderEl = $('#slider');
  knobEl = $('#sliderKnob');
  const pick = e => {
    const y = e.clientY - sliderEl.getBoundingClientRect().top;
    let best = 0;
    for (let i = 1; i < SLOT_N; i++) if (Math.abs(slotCenter(i) - y) < Math.abs(slotCenter(best) - y)) best = i;
    setSlotSel(best);
  };
  let drag = false;
  sliderEl.addEventListener('pointerdown', e => { sliderEl.setPointerCapture(e.pointerId); drag = true; pick(e); });
  sliderEl.addEventListener('pointermove', e => { if (drag) pick(e); });
  sliderEl.addEventListener('pointerup', () => { drag = false; });
  sliderEl.addEventListener('pointercancel', () => { drag = false; });
  placeKnob();
  new ResizeObserver(placeKnob).observe(slotsEl);
}

const slotCenter = i => slotUI[i].row.offsetTop - slotsEl.offsetTop + slotUI[i].row.offsetHeight / 2;
export function placeKnob() { knobEl.style.top = `${slotCenter(buffer.sel)}px`; }

export function setSlotSel(i) {
  i = clamp(i, 0, SLOT_N - 1);
  if (i === buffer.sel) return;
  buffer.sel = i;
  click();
  placeKnob();
}

export function updatePanel() {
  const T = st.T;
  // во время загрузки данные появляются на индикаторах постепенно
  const bt = unitBootTime('radar');
  const vis = t0 => bt >= t0;

  st.radars.forEach((r, i) => {
    const u = rowUI[i];
    const v = vis(2.4 + 0.3 * i);
    setDisplay(u.lat, v ? fmtLat(r.lat) : '');
    setDisplay(u.lon, v ? fmtLon(r.lon) : '');
    u.row.classList.toggle('moving', !!r.moving);
    toggles[i].classList.toggle('on', st.selected[i]);
    setLed(`sw${i}`, !vis(3.0) ? false : T < st.swFlashUntil || r.moving ? 'blink' : st.selected[i] ? 'on' : false);
  });

  slots.forEach((s, i) => {
    if (!vis(3.3 + 0.15 * i)) {
      setLed(`occ${i}`, false); setLed(`act${i}`, false); setAlnum(slotUI[i].id, '');
      return;
    }
    setLed(`occ${i}`, s.id && !(s.busy && s.busy.kind === 'write') ? 'on' : false);
    const asking = s.confirm > T;
    setLed(`act${i}`, s.busy ? 'blink' : s.reserved || asking ? 'on' : false);
    setAlnum(slotUI[i].id, asking
      ? (Math.floor(T * 4) % 2 ? 'CLEAR?' : '      ')
      : s.id.slice(0, s.shown).padEnd(ID_LEN, ' '));
  });

  // кулдаун
  const { cooldown } = st;
  const busy = cooldown.t > 0 || !!st.analysis;
  const frac = cooldown.t / cooldown.total;
  cdSegs.forEach((s, i) => s.classList.toggle('on', vis(3.0) && i < Math.ceil(frac * CD_SEGS)));
  setDisplay(cdDisp, vis(3.0) ? cooldown.t.toFixed(1).padStart(4, ' ') : '');
  setLed('busy', vis(3.0) && busy ? 'on' : false);
  setLed('ready', unitOn('radar') && !busy ? 'on' : false);
  setLed('cdmov', busy && cooldown.kind === 'mov' ? 'on' : false);
  setLed('cdscn', busy && cooldown.kind === 'scn' ? 'on' : false);
  setLed('cdpng', busy && cooldown.kind === 'png' ? 'on' : false);

  // строка сообщений под экраном: «[код] текст»; длинные прокручиваются
  let line = '';
  if (vis(3.3) && msg.text) {
    const full = `[${msg.code}] ${msg.text}`;
    const off = Math.max(0, Math.min(full.length - MSG_CELLS, Math.floor((T - msg.t - 1.5) * 9)));
    line = full.slice(off, off + MSG_CELLS);
  }
  setAlnum(msgDisp, line.padEnd(MSG_CELLS, ' '));
}
