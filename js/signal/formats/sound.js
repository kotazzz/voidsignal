// ================= Интерпретация: звук =================
// Хаотичная «мелодия» из событий: тоны, пилы, серии пиков, дребезг, свипы, трели.
// Это не белый шум — у каждого события есть высота, форма и огибающая.
import { createRng } from '../../core/math.js';
import { SR, processAudio, encodeWav, levelKey } from '../pipeline.js';

const LEN = 9;   // с

const env = (k, n, a = 0.02, r = 0.2) => {
  const t = k / n;
  return Math.min(1, t / a, (1 - t) / r);
};

// генераторы событий: пишут в буфер начиная с позиции s0
const VOICES = {
  sine(buf, s0, n, e, r) {           // тон с вибрато
    const vib = 3 + r() * 5, depth = 0.004 + r() * 0.01;
    let ph = 0;
    for (let k = 0; k < n; k++) {
      ph += (2 * Math.PI * e.f * (1 + Math.sin((k / SR) * vib * 6.28) * depth)) / SR;
      buf[s0 + k] += Math.sin(ph) * e.amp * env(k, n);
    }
  },
  saw(buf, s0, n, e) {               // пила: гудящий низкий тон
    let ph = 0;
    for (let k = 0; k < n; k++) {
      ph = (ph + e.f / SR) % 1;
      buf[s0 + k] += (2 * ph - 1) * e.amp * 0.6 * env(k, n, 0.05, 0.3);
    }
  },
  beeps(buf, s0, n, e, r) {          // серия коротких пиков
    const period = Math.floor(SR * (0.05 + r() * 0.09)), on = Math.floor(period * (0.3 + r() * 0.3));
    let ph = 0;
    for (let k = 0; k < n; k++) {
      ph += (2 * Math.PI * e.f) / SR;
      const m = k % period;
      if (m < on) buf[s0 + k] += Math.sign(Math.sin(ph)) * e.amp * 0.5 * env(m, on, 0.05, 0.3);
    }
  },
  chatter(buf, s0, n, e, r) {        // дребезг: нерегулярные затухающие импульсы
    let next = 0, amp = 0, ph = 0;
    for (let k = 0; k < n; k++) {
      if (k >= next) { amp = e.amp * (0.5 + r() * 0.5); next = k + Math.floor(SR * (0.008 + r() * 0.04)); }
      amp *= 0.993;
      ph += (2 * Math.PI * e.f) / SR;
      buf[s0 + k] += Math.sin(ph) * amp;
    }
  },
  chirp(buf, s0, n, e) {             // свип частоты
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const f = e.f * Math.pow(e.f2 / e.f, k / n);
      ph += (2 * Math.PI * f) / SR;
      buf[s0 + k] += Math.sin(ph) * e.amp * env(k, n, 0.05, 0.15);
    }
  },
  trill(buf, s0, n, e, r) {          // быстрые переключения между двумя тонами
    const rate = 8 + r() * 14, ratio = 1.12 + r() * 0.4;
    let ph = 0;
    for (let k = 0; k < n; k++) {
      const hi = Math.floor((k / SR) * rate) % 2;
      ph += (2 * Math.PI * e.f * (hi ? ratio : 1)) / SR;
      buf[s0 + k] += Math.sin(ph) * e.amp * 0.8 * env(k, n);
    }
  },
};
const KINDS = Object.keys(VOICES);
const KIND_NAMES = { sine: 'тоны', saw: 'гул', beeps: 'серии пиков', chatter: 'дребезг', chirp: 'свипы', trill: 'трели' };

export function synth(seed) {
  const r = createRng(seed ^ 0x5d), buf = new Float32Array(SR * LEN), events = [];
  // у каждого источника свой «словарь» звуков и своя тональность
  const palette = KINDS.filter(() => r() < 0.65);
  if (palette.length < 2) palette.push('sine', 'beeps');
  const root = 180 + r() * 300;
  let t = 0.1;
  while (t < LEN - 0.4) {
    const kind = palette[Math.floor(r() * palette.length)];
    const d = Math.min(LEN - t - 0.05, 0.12 + r() * (kind === 'saw' ? 1.4 : 0.8));
    const f = root * Math.pow(2, Math.floor(r() * 24) / 12) * (kind === 'saw' ? 0.35 : kind === 'beeps' ? 3 : 1);
    const e = { kind, t, d, f: Math.min(f, 4500), f2: Math.min(4500, f * (r() < 0.5 ? 0.3 : 3)), amp: 0.25 + r() * 0.35 };
    VOICES[kind](buf, Math.floor(t * SR), Math.floor(d * SR), e, r);
    events.push(e);
    t += r() < 0.25 ? d * 0.4 : d + r() * 0.35;      // иногда события наслаиваются
  }
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < buf.length; i++) buf[i] *= 0.8 / (peak || 1);
  return { samples: buf, events, palette };
}

// байты как PCM: так звучит не-звуковой поток
export function junkAudio(seed) {
  const r = createRng(seed ^ 0x99), buf = new Float32Array(SR * LEN);
  let v = 0, run = 0;
  for (let i = 0; i < buf.length; i++) {
    if (run-- <= 0) { v = (r() * 2 - 1) * 0.7; run = Math.floor(r() * 6); }
    buf[i] = v;
  }
  return { samples: buf, events: [], palette: [] };
}

// кэш обработанного сигнала: пересчёт только при изменении уровней
export function processed(c, L, seed) {
  const key = levelKey(L);
  if (c._key !== key) { c._key = key; c._out = processAudio(c.samples, L, seed); }
  return c._out;
}

// осциллограмма всего фрагмента + «лупа» вокруг курсора
export function drawWave(g, box, samples, playhead, t = 0) {
  const n = samples.length, top = { ...box, h: box.h * 0.62 }, zoom = { x: box.x, y: box.y + box.h * 0.7, w: box.w, h: box.h * 0.3 };
  const cols = Math.floor(top.w), per = n / cols, mid = top.y + top.h / 2;
  g.fillStyle = 'rgba(168,255,200,.75)';
  for (let x = 0; x < cols; x++) {
    let lo = 0, hi = 0;
    for (let k = Math.floor(x * per); k < Math.floor((x + 1) * per); k += 4) { const v = samples[k]; if (v < lo) lo = v; if (v > hi) hi = v; }
    g.fillRect(top.x + x, mid - hi * top.h * 0.5, 1, Math.max(1, (hi - lo) * top.h * 0.5));
  }
  g.strokeStyle = 'rgba(120,255,170,.15)';
  g.strokeRect(top.x + 0.5, top.y + 0.5, top.w - 1, top.h - 1);
  for (let s = 1; s < LEN; s++) g.fillRect(top.x + (s / LEN) * top.w, top.y + top.h, 1, 4);

  const c = playhead ?? (t * 0.4) % (LEN - 0.05);     // без воспроизведения лупа медленно бежит по записи
  const at0 = Math.floor(c * SR), span = Math.floor(SR * 0.04);
  g.strokeStyle = '#b4ffcf';
  g.lineWidth = 1.4;
  g.beginPath();
  for (let x = 0; x < zoom.w; x += 2) {
    const v = samples[at0 + Math.floor((x / zoom.w) * span)] || 0, y = zoom.y + zoom.h / 2 - v * zoom.h * 0.48;
    if (x) g.lineTo(zoom.x + x, y); else g.moveTo(zoom.x + x, y);
  }
  g.stroke();
  if (playhead !== null) {
    g.fillStyle = '#e8fff0';
    g.fillRect(top.x + (playhead / LEN) * top.w, top.y, 2, top.h);
  }
}

export default {
  id: 'SND',
  name: 'Звук',
  audio: true,

  make: synth,
  junk: junkAudio,
  samples(c, L, seed) { return processed(c, L, seed); },

  render(g, box, ctx) {
    drawWave(g, box, processed(ctx.content, ctx.L, ctx.seed), ctx.playhead, ctx.t);
  },

  meaning: c => (c.events.length ? `ЗВУК: ${c.events.length} СОБЫТИЙ — ${c.palette.map(k => KIND_NAMES[k]).join(', ').toUpperCase()}` : null),

  async exportFile(c, L, seed) {
    return { blob: encodeWav(processed(c, L, seed)), ext: 'wav' };
  },
};
