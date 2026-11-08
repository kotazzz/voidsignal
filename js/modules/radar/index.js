// ================= Модуль «Триангуляция» =================
// Поиск сигналов на небе тремя радарами и запись захваченных ID в общий буфер.
import { click } from '../../core/audio.js';
import { unitState, unitOn } from '../../core/units.js';
import { clock } from '../../core/clock.js';
import { buffer } from '../../core/buffer.js';
import { CFG } from './config.js';
import { st } from './state.js';
import template from './template.js';
import { spawnSignal, select, doMove, doScan, doPing, clearResults, abortOnPowerLoss, simulate } from './logic.js';
import { initScreen, renderScreen, takeSnapshot, BOOT_LINES } from './screen.js';
import { initPanel, updatePanel, placeKnob, setSlotSel, ui } from './panel.js';
import { keys, initJoystick, releaseInput, readInput, animateJoystick, drawJoystick } from './input.js';

const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
const press = (btn, fn) => { btn.classList.add('pressed'); setTimeout(() => btn.classList.remove('pressed'), 120); fn(); };
let screenAcc = 1;

export default {
  id: 'radar',
  title: 'Триангуляция',
  boot: 6.6,
  hints: 'WASD / стрелки — наведение · 1 2 3 — радар · пробел — переместить · enter — анализ · E — пинг · [ ] — слот буфера',
  template,

  init(root) {
    initScreen(root.querySelector('#sky'));
    initPanel(root);
    initJoystick(root.querySelector('#joy'));
    spawnSignal(); spawnSignal();
  },

  update(dt) {
    st.T = clock.t;
    const inp = readInput();
    animateJoystick(dt, inp);
    const us = unitState('radar');
    if (us.state === 'boot') BOOT_LINES.forEach(([t0]) => { if (us.t - dt < t0 && us.t >= t0) click(); });
    if (unitOn('radar')) simulate(dt, inp);
  },

  draw(dt) {
    screenAcc += dt;
    if (screenAcc >= 1 / CFG.screenFps) {
      screenAcc %= 1 / CFG.screenFps;
      renderScreen();
    }
    updatePanel();
    drawJoystick();
  },

  onPower(ev) {
    if (ev === 'shutdown') { takeSnapshot(); abortOnPowerLoss(); }
    else if (ev === 'boot') clearResults();
  },

  onShow() { placeKnob(); },
  onHide() { releaseInput(); },

  onKey(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return NAV_KEYS.includes(e.code) || e.code === 'Space';
    switch (e.code) {
      case 'Digit1': case 'Digit2': case 'Digit3': select(+e.code.slice(-1) - 1); return true;
      case 'Space': press(ui.btnMove, doMove); return true;
      case 'Enter': press(ui.btnScan, doScan); return true;
      case 'KeyE': press(ui.btnPing, doPing); return true;
      case 'BracketLeft': setSlotSel(buffer.sel - 1); return true;
      case 'BracketRight': setSlotSel(buffer.sel + 1); return true;
    }
    return NAV_KEYS.includes(e.code);
  },
  onKeyUp(e) { keys.delete(e.code); },
  onBlur() { releaseInput(); },

  // индикатор активности на вкладке
  activity() {
    if (st.analysis || st.ping || st.radars.some(r => r.moving)) return 'blink';
    return false;
  },
};
