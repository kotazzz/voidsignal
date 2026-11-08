// ================= Светодиоды =================
// Реестр по атрибуту data-led. Модули используют свои префиксы id, чтобы не пересекаться.
const leds = {};
const timers = {};

export function scanLeds(root) {
  root.querySelectorAll('[data-led]').forEach(el => { leds[el.dataset.led] = el; });
  // фаза для волны лампового теста и мерцания: от положения на экране
  root.querySelectorAll('.led').forEach(el => {
    const x = el.getBoundingClientRect().left / Math.max(1, window.innerWidth);
    el.style.setProperty('--d', `${(x * 0.9).toFixed(2)}s`);
    el.style.setProperty('--fl', `${(Math.random() * 6).toFixed(1)}s`);
  });
}

// st: false | true/'on' | 'blink'
export function setLed(id, st) {
  const el = leds[id];
  if (!el) return;
  el.classList.toggle('on', !!st);
  el.classList.toggle('blink', st === 'blink');
}

export function flashLed(id, dur = 900, after = false) {
  setLed(id, 'blink');
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => setLed(id, after), dur);
}

export function clearLeds(ids) {
  ids.forEach(id => { clearTimeout(timers[id]); setLed(id, false); });
}
