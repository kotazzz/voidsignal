// ================= Консоль VS-3: каркас, вкладки, питание, главный цикл =================
import { clock, log } from './core/clock.js';
import { power, isLive, isOn, BOOT, onPower, togglePower, tickPower, cutPower } from './core/power.js';
import { tickTransformers, onCut } from './core/transformers.js';
import { scanLeds, setLed } from './core/leds.js';
import { click, startHum, stopHum } from './core/audio.js';
import { tickBuffer, cancelConfirms } from './core/buffer.js';
import { registerUnit, onUnit, tickUnits, unitState } from './core/units.js';
import { modules } from './modules/registry.js';
import home from './modules/home/index.js';
import { initDebug } from './debug/index.js';
import { rack, hand } from './core/drives.js';
import { createDriveBay, driveLabel } from './widgets/driveBay.js';
import { initLivery } from './ui/livery.js';
import { initGlitch } from './ui/glitch.js';

const $ = id => document.getElementById(id);
const consoleEl = $('console'), tabsEl = $('tabs'), deckEl = $('modules'), hintsEl = $('hints');
initLivery(consoleEl);
initGlitch(consoleEl);
document.fonts?.load('16px VT323');
const GLOBAL_HINTS = 'TAB — модуль · P — питание';

// ---------- сборка панелей и вкладок ----------
// первая вкладка — главный экран (питание), остальные — модули; внутри вкладки модуля
// два индикатора: активность и связь с предыдущим модулем
const panels = [home, ...modules];
modules.forEach(m => registerUnit(m.id, m.boot));
const tabs = panels.map(m => {
  const sec = document.createElement('div');
  sec.className = `module mod-${m.id}`;
  sec.innerHTML = m.template;
  deckEl.appendChild(sec);
  m.root = sec;
  m.init(sec);
  scanLeds(sec);

  const i = modules.indexOf(m);
  const leds = i < 0 ? '' : `<span class="tab-leds"><span class="led yellow" data-led="tab-${m.id}"></span>${i > 0 && !m.nolink ? `<span class="led green" data-led="link-${i}" title="Связь: ${modules[i - 1].title} — ${m.title}"></span>` : ''}</span>`;
  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.innerHTML = `${leds}<span class="tab-lbl">${m.title}</span>`;
  tab.addEventListener('click', () => show(m));
  tabsEl.appendChild(tab);
  return tab;
});
scanLeds(tabsEl);

let active = null;
function show(m, silent = false) {
  if (m === active) return;
  if (!silent) click();
  active?.onHide?.();
  active = m;
  panels.forEach((x, i) => {
    x.root.classList.toggle('active', x === m);
    tabs[i].classList.toggle('latched', x === m);
  });
  hintsEl.textContent = `${m.hints} · ${GLOBAL_HINTS}`;
  m.onShow?.();
}
show(home, true);

// ---------- питание ----------
const powerSw = $('powerSw'), ledStby = $('ledStby'), ledPwr = $('ledPwr');
function setPowerClasses() {
  const live = isLive();
  powerSw.classList.toggle('on', live);
  ledPwr.classList.toggle('on', live);
  ledStby.classList.toggle('on', !live);
  consoleEl.classList.toggle('off', !live);
  consoleEl.classList.toggle('lamp-test', power.state === 'boot' && power.t < BOOT.lampEnd);
}
onPower(ev => {
  setPowerClasses();
  if (ev === 'boot') startHum();
  if (ev === 'shutdown' || ev === 'off') stopHum();
  if (ev === 'shutdown') cancelConfirms();
  if (ev === 'on') log('СИСТЕМА ГОТОВА. НАВЕДИТЕ ПРИЦЕЛ.');
  modules.forEach(m => m.onPower?.(ev));
});
powerSw.addEventListener('click', togglePower);
// отдельный выключатель модуля шлёт модулю те же события, что и общее питание
onUnit((id, ev) => modules.find(m => m.id === id)?.onPower?.(ev));

// ---------- клавиатура ----------
// поля ввода и отладочное окно живут своей клавиатурой (Tab двигает фокус)
const ownsKeys = e => !!e.target.closest?.('input, select, textarea, .dbg-overlay');
window.addEventListener('keydown', e => {
  if (ownsKeys(e)) return;
  if (active.onKey?.(e)) return;
  if (e.repeat) return;
  if (e.code === 'KeyP') togglePower();
  else if (e.code === 'Tab') {
    e.preventDefault();
    const i = panels.indexOf(active);
    show(panels[(i + (e.shiftKey ? panels.length - 1 : 1)) % panels.length]);
  }
});
window.addEventListener('keyup', e => modules.forEach(m => m.onKeyUp?.(e)));
window.addEventListener('blur', () => modules.forEach(m => m.onBlur?.()));

// ---------- стойка накопителей и «рука» оператора ----------
const bays = rack.map(h => { const el = document.createElement('div'); $('rackBays').appendChild(el); return createDriveBay(el, h); });
const handEl = $('handDrive');
let handLast = null;
function drawDrives() {
  bays.forEach(b => b.draw());
  const text = driveLabel(hand.drive);
  if (text !== handLast) {
    handLast = text;
    handEl.textContent = text || '—';
    document.body.classList.toggle('carrying', !!hand.drive);
  }
}

onCut(cutPower);
initDebug();

// ---------- главный цикл ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock.t += dt;
  tickPower(dt);
  tickUnits(dt);
  // состояние модулей — один раз за кадр
  const st = modules.map(m => unitState(m.id)), isUp = i => st[i].state === 'on', isLive = i => isUp(i) || st[i].state === 'boot';
  tickTransformers(dt, st.filter(s => s.state === 'on').length, isOn());
  if (isUp(modules.findIndex(m => m.id === 'radar'))) tickBuffer(dt);           // буфер — память триангулятора
  modules.forEach(m => m.update(dt));
  modules.forEach((m, i) => {
    const off = !isLive(i), lamp = st[i].state === 'boot' && st[i].t < BOOT.lampEnd;
    if (off !== m.offLast) { m.offLast = off; m.root.classList.toggle('off', off); }
    if (lamp !== m.lampLast) { m.lampLast = lamp; m.root.classList.toggle('lamp-test', lamp); }
    setLed(`tab-${m.id}`, isUp(i) && m.activity?.());
    if (i > 0 && !m.nolink) setLed(`link-${i}`, isUp(i - 1) && isUp(i) ? 'on' : isLive(i - 1) && isLive(i) ? 'blink' : false);
  });
  active.draw?.(dt);
  drawDrives();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
