// ================= Скрытые параметры сигналов =================
// Параметры генерируются случайно при захвате и живут только в этом замыкании.
// Наружу отдаётся канал, который лишь сравнивает настройки приёмника с эталоном.
import { clamp, wrap, createRng } from './math.js';

export const FREQ_MAX = 9999;              // Гц
export const POL_FULL = 3600;              // полярность в десятых долях градуса
export const WAVES = ['SIN', 'SAW', 'SQR'];
export const POL_TYPES = ['ALPHA', 'BETA', 'OMEGA'];
export const MODELS = ['planet', 'satellite'];
export const FORMATS = ['IMG', 'SND', 'TXT', 'SPEC'];   // во что на самом деле складываются данные

const registry = new Map();
const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = n => Math.floor(Math.random() * n);

export function registerSignal(id) {
  if (registry.has(id)) return;
  registry.set(id, Object.freeze({
    freq: Math.round(rnd(120, FREQ_MAX - 120)),
    pol: rndInt(POL_FULL),
    wave: rndInt(WAVES.length),
    polType: rndInt(POL_TYPES.length),
    model: rndInt(MODELS.length),
    format: rndInt(FORMATS.length),
    seed: rndInt(2 ** 31),
    bits: 8192 * Math.round(rnd(10, 26)),
  }));
}

export const isKnown = id => registry.has(id);

export function openChannel(id) {
  const p = registry.get(id);
  return p ? new Channel(id, p) : null;
}

// поток для декодера: знает только, верна ли выбранная интерпретация
export function openStream(id) {
  const p = registry.get(id);
  return p ? new Stream(id, p) : null;
}

class Stream {
  #format;
  constructor(id, p) {
    this.#format = p.format;
    this.id = id;
    this.seed = p.seed;
    Object.freeze(this);
  }
  matches(format) { return format === this.#format; }
}

// близость в логарифмической шкале: грубая подстройка видна издалека, точная — только вблизи
const LOG_F = Math.log10(1 + FREQ_MAX), LOG_P = Math.log10(1 + POL_FULL / 2);
const closeness = (d, L) => 1 - clamp(Math.log10(1 + d) / L, 0, 1);

class Channel {
  #p;
  constructor(id, p) {
    this.#p = p;
    this.id = id;
    this.bits = p.bits;
    this.model = Object.freeze({ kind: MODELS[p.model], seed: p.seed });
    Object.freeze(this);
  }

  // rx: { freq (Гц), pol (десятые градуса), wave, polType }
  measure(rx) {
    const p = this.#p;
    const df = rx.freq - p.freq;
    const dp = Math.abs(wrap(rx.pol - p.pol + POL_FULL / 2, POL_FULL) - POL_FULL / 2);
    return {
      freq: closeness(Math.abs(df), LOG_F),
      pol: closeness(dp, LOG_P),
      wave: rx.wave === p.wave,
      polType: rx.polType === p.polType,
      drift: clamp(df / 50, -40, 40),       // биения: скорость «уплывания» осциллограммы
    };
  }

  // полезная нагрузка: детерминирована сигналом, искажается пропорционально потере качества
  payload(quality) {
    const rng = createRng(this.#p.seed), out = new Uint8Array(this.bits / 8);
    const loss = (1 - quality) * 0.5;
    for (let i = 0; i < out.length; i++) {
      const b = Math.floor(rng() * 256);
      out[i] = Math.random() < loss ? Math.floor(Math.random() * 256) : b;
    }
    return out;
  }
}
