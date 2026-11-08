// ================= Проигрыватель: перемотка назад / вперёд, воспроизведение, стоп =================
// Логика обычного кассетника. Положение ленты хранится в самом транспорте: стоп не сбрасывает его,
// повторный стоп возвращает ленту в начало. Звук один на всю консоль — запуск одного
// транспорта останавливает другой.
import { ac } from '../core/audio.js';
import { SR } from './pipeline.js';

const FAST = 4;          // скорость перемотки относительно воспроизведения
let sounding = null;     // транспорт, который сейчас звучит

export const MODES = ['rew', 'ff', 'play', 'stop'];

// source() → { key, get() } | null: текущий сигнал; key меняется, когда сигнал другой, звук считает get()
export function createTransport(source) {
  const t = { mode: 'stop', pos: 0, stopLatched: true, key: null, samples: null, src: null, bufs: {}, t0: 0, p0: 0 };

  const length = () => (t.samples ? t.samples.length / SR : 0);

  function silence() {
    if (t.src) { try { t.src.stop(); } catch (e) { /* уже остановлен */ } t.src = null; }
    if (sounding === t) sounding = null;
  }

  function sound() {
    const other = sounding;
    silence();
    if (t.mode === 'stop' || !t.samples) return;
    if (other && other !== t) other.halt();
    try {
      const a = ac(), back = t.mode === 'rew';
      const k = back ? 'rev' : 'fwd';
      if (!t.bufs[k]) {                                  // буферы кэшируются до смены записи или обработки
        const data = back ? Float32Array.from(t.samples).reverse() : t.samples;
        t.bufs[k] = a.createBuffer(1, data.length, SR);
        t.bufs[k].copyToChannel(data, 0);
      }
      const buf = t.bufs[k];
      const src = a.createBufferSource(), g = a.createGain();
      src.buffer = buf;
      src.playbackRate.value = t.mode === 'play' ? 1 : FAST;
      g.gain.value = t.mode === 'play' ? 0.5 : 0.22;
      src.connect(g).connect(a.destination);
      src.start(0, back ? Math.max(0, length() - t.pos) : t.pos);
      t.src = src; t.t0 = a.currentTime; t.p0 = t.pos;   // опорная точка для хода ленты по аудио-часам
      sounding = t;
    } catch (e) { /* без звука */ }
  }

  function load(refresh) {
    const s = source();
    if (!s) return false;
    if (s.key !== t.key) {              // другая запись — новая лента
      silence();
      Object.assign(t, { key: s.key, samples: s.get(), bufs: {}, pos: 0, mode: 'stop', stopLatched: true });
    } else if (refresh) { t.samples = s.get(); t.bufs = {}; }     // обработка продвинулась — звук другой
    return true;
  }

  // кнопки: mode — 'rew' | 'ff' | 'play' | 'stop'; возвращает false, если нечего проигрывать
  t.press = mode => {
    if (mode === 'stop') {
      if (t.mode !== 'stop') { t.mode = 'stop'; t.stopLatched = false; silence(); }    // первое нажатие: только отмена
      else { t.pos = 0; t.stopLatched = true; }                                          // второе: к началу, стоп залипает
      return true;
    }
    if (!load(t.mode === 'stop')) return false;
    if (mode === t.mode) return true;
    if ((mode === 'rew' && t.pos <= 0) || (mode === 'ff' && t.pos >= length()) || (mode === 'play' && t.pos >= length())) {
      if (mode === 'play') t.pos = 0;                                                    // плей в конце — с начала
      else return false;
    }
    t.mode = mode;
    t.stopLatched = false;
    sound();
    return true;
  };

  // сменился сигнал или пропало питание: лента остановлена и перемотана
  t.reset = () => { silence(); Object.assign(t, { mode: 'stop', pos: 0, stopLatched: true, key: null, samples: null, bufs: {} }); };
  t.halt = () => { if (t.mode !== 'stop') { t.mode = 'stop'; silence(); } };

  t.tick = dt => {
    const s = source();
    if (!s) { if (t.key !== null) t.reset(); return; }
    if (s.key !== t.key) { t.reset(); return; }
    if (t.mode === 'stop') return;
    const L = length();
    const rate = t.mode === 'rew' ? -FAST : t.mode === 'ff' ? FAST : 1;
    // звук идёт по часам аудиоконтекста, лента — за ним (кадры могут тормозить); без звука — по dt
    t.pos = t.src ? t.p0 + rate * (ac().currentTime - t.t0) : t.pos + rate * dt;
    if (t.pos >= L && t.mode !== 'rew') { t.pos = L; t.mode = 'stop'; silence(); }          // стоп сам не нажимается
    else if (t.pos <= 0 && t.mode === 'rew') { t.pos = 0; t.mode = 'stop'; silence(); }
  };

  t.active = () => t.mode !== 'stop';
  // положение для индикации или null, если лента не тронута
  t.playhead = () => (t.mode !== 'stop' || t.pos > 0 ? t.pos : null);
  return t;
}
