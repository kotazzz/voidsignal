// ================= Интерпретация: спектрограмма =================
// Источник «рисует» в частотах: сигнал синтезируется аддитивно из скрытой картинки,
// а на экран выводится настоящее STFT обработанного сигнала.
import { createRng } from '../../core/math.js';
import { SR, grayToPng, levelKey, processAudio } from '../pipeline.js';
import { spectrogram } from '../fft.js';
import { junkAudio } from './sound.js';

const LEN = 9, BANDS = 64, COLS = 180, F_LO = 500, F_HI = 4600;
const N = 256, HOP = 128;

const SYMBOLS = [
  { name: 'КРУГ С ТОЧКОЙ', draw: (g, x, y) => { g.lineWidth = 3; g.beginPath(); g.arc(x, y, 18, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } },
  { name: 'ТРЕУГОЛЬНИК', draw: (g, x, y) => { g.lineWidth = 3; g.beginPath(); g.moveTo(x, y - 20); g.lineTo(x + 20, y + 16); g.lineTo(x - 20, y + 16); g.closePath(); g.stroke(); } },
  { name: 'СПИРАЛЬ', draw: (g, x, y) => { g.lineWidth = 2.5; g.beginPath(); for (let a = 0; a < 18; a += 0.2) g.lineTo(x + Math.cos(a) * a * 1.2, y + Math.sin(a) * a * 1.2); g.stroke(); } },
  { name: 'ЛИЦО', draw: (g, x, y) => { g.lineWidth = 3; g.beginPath(); g.arc(x, y, 20, 0, 7); g.stroke(); g.fillRect(x - 9, y - 8, 5, 5); g.fillRect(x + 4, y - 8, 5, 5); g.beginPath(); g.arc(x, y + 2, 10, 0.3, Math.PI - 0.3); g.stroke(); } },
  { name: 'ДВОЙНАЯ СПИРАЛЬ', draw: (g, x, y) => { g.lineWidth = 2; for (const s of [0, Math.PI]) { g.beginPath(); for (let k = -22; k <= 22; k++) g.lineTo(x + k, y + Math.sin(k * 0.3 + s) * 14); g.stroke(); } for (let k = -20; k <= 20; k += 5) { g.beginPath(); g.moveTo(x + k, y + Math.sin(k * 0.3) * 14); g.lineTo(x + k, y - Math.sin(k * 0.3) * 14); g.stroke(); } } },
];

// скрытая картинка: [время][полоса] → амплитуда
function mask(seed, id) {
  const c = document.createElement('canvas');
  c.width = COLS; c.height = BANDS;
  const g = c.getContext('2d'), sym = SYMBOLS[seed % SYMBOLS.length];
  g.fillStyle = '#000'; g.fillRect(0, 0, COLS, BANDS);
  g.fillStyle = g.strokeStyle = '#fff';
  g.font = 'bold 26px "Courier New", monospace';
  g.textBaseline = 'middle';
  g.fillText(id, 6, BANDS / 2 + 1);
  sym.draw(g, 150, BANDS / 2);
  const d = g.getImageData(0, 0, COLS, BANDS).data, m = new Float32Array(COLS * BANDS);
  for (let t = 0; t < COLS; t++) for (let b = 0; b < BANDS; b++) m[t * BANDS + b] = d[((BANDS - 1 - b) * COLS + t) * 4] / 255;
  return { m, symbol: sym.name };
}

// аддитивный синтез: осцилляторы через поворот комплексной фазы (без sin в цикле)
function paint(seed, id) {
  const { m, symbol } = mask(seed, id), n = SR * LEN, buf = new Float32Array(n), r = createRng(seed ^ 0x3a);
  for (let b = 0; b < BANDS; b++) {
    const f = F_LO + ((F_HI - F_LO) * b) / (BANDS - 1), w = (2 * Math.PI * f) / SR;
    const cw = Math.cos(w), sw = Math.sin(w);
    let re = Math.cos(r() * 6.28), im = Math.sin(r() * 6.28);
    for (let i = 0; i < n; i++) {
      const col = (i / n) * COLS, c0 = Math.floor(col), fr = col - c0;
      const a = (m[c0 * BANDS + b] || 0) * (1 - fr) + (m[Math.min(COLS - 1, c0 + 1) * BANDS + b] || 0) * fr;
      const nr = re * cw - im * sw; im = re * sw + im * cw; re = nr;
      if (a > 0.01) buf[i] += im * a;
    }
  }
  let peak = 0;
  for (const v of buf) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < n; i++) buf[i] *= 0.8 / (peak || 1);
  return { samples: buf, symbol };
}

function spec(c, L, seed) {
  const key = levelKey(L);
  if (c._key !== key) {
    c._key = key;
    c._out = processAudio(c.samples, L, seed);
    c._spec = spectrogram(c._out, N, HOP);
  }
  return c._spec;
}

function specGray(s) {
  // время по горизонтали, низкие частоты внизу
  const gray = new Float32Array(s.frames * s.bins);
  for (let f = 0; f < s.frames; f++) for (let k = 0; k < s.bins; k++) gray[(s.bins - 1 - k) * s.frames + f] = s.data[f * s.bins + k];
  return gray;
}

const tmp = document.createElement('canvas');

export default {
  id: 'SPEC',
  name: 'Спектрограмма',
  audio: true,

  make: (seed, id) => paint(seed, id),
  junk: junkAudio,
  samples(c, L, seed) { spec(c, L, seed); return c._out; },

  render(g, box, ctx) {
    const s = spec(ctx.content, ctx.L, ctx.seed);
    const axis = 30, area = { x: box.x + axis, y: box.y, w: box.w - axis, h: box.h - 16 };
    tmp.width = s.frames; tmp.height = s.bins;
    const tg = tmp.getContext('2d'), img = tg.createImageData(s.frames, s.bins), gray = specGray(s);
    for (let i = 0; i < gray.length; i++) {
      const v = gray[i] * gray[i] * 255;
      img.data[i * 4] = v * 0.66; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v * 0.78; img.data[i * 4 + 3] = 255;
    }
    tg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(tmp, area.x, area.y, area.w, area.h);
    // оси: кГц и секунды
    g.font = '10px "Courier New", monospace';
    g.fillStyle = 'rgba(160,255,200,.5)';
    for (let k = 0; k <= 5; k++) {
      const y = area.y + area.h - (k * 1000 / (SR / 2)) * area.h;
      g.fillRect(area.x - 4, y, 4, 1);
      g.fillText(`${k}k`, box.x, y + 3);
    }
    for (let sec = 0; sec <= LEN; sec += 3) g.fillText(`${sec}s`, area.x + (sec / LEN) * area.w - 6, area.y + area.h + 13);
    if (ctx.playhead !== null) {
      g.fillStyle = '#e8fff0';
      g.fillRect(area.x + (ctx.playhead / LEN) * area.w, area.y, 2, area.h);
    }
  },

  meaning: c => (c.symbol ? `СПЕКТР: СКРЫТОЕ ИЗОБРАЖЕНИЕ — ${c.symbol}` : null),

  async exportFile(c, L, seed) {
    const s = spec(c, L, seed);
    return { blob: await grayToPng(specGray(s), s.frames, s.bins, 3), ext: 'png' };
  },
};

