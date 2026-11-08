// ================= Интерпретация: изображение =================
// Источник передаёт растр 96×72. Сцена генерируется из seed: узнаваемый объект + фон + зерно.
import { createRng } from '../../core/math.js';
import { hash, at, levelKey, grayToPng, blitGray } from '../pipeline.js';

const W = 96, H = 72, BLK = 8;

// ---------- сцены ----------
const star = (g, r, n = 40) => {
  for (let i = 0; i < n; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillRect(r() * W, r() * H, 1, 1); }
  g.globalAlpha = 1;
};
const sphere = (g, x, y, rad, lx = -0.4, ly = -0.4) => {
  const gr = g.createRadialGradient(x + lx * rad, y + ly * rad, rad * 0.1, x, y, rad);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#777'); gr.addColorStop(1, '#111');
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
};

const SCENES = [
  { name: 'ПЛАНЕТА С КОЛЬЦАМИ', draw(g, r) {
    star(g, r);
    const x = 40 + r() * 16, y = 34 + r() * 6, rad = 15 + r() * 6, tilt = -0.2 - r() * 0.3;
    g.strokeStyle = '#999'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, rad * 1.9, rad * 0.45, tilt, Math.PI, Math.PI * 2); g.stroke();
    sphere(g, x, y, rad);
    g.strokeStyle = '#ccc';
    g.beginPath(); g.ellipse(x, y, rad * 1.9, rad * 0.45, tilt, 0, Math.PI); g.stroke();
    for (let i = 0; i < 4; i++) { g.globalAlpha = 0.25; g.fillStyle = '#000'; g.fillRect(x - rad, y - rad * 0.6 + i * rad * 0.35, rad * 2, 2); }
    g.globalAlpha = 1;
  } },
  { name: 'СПИРАЛЬНАЯ ГАЛАКТИКА', draw(g, r) {
    star(g, r, 25);
    const cx = W / 2, cy = H / 2, arms = 2 + Math.floor(r() * 2), rot = r() * 6;
    for (let i = 0; i < 900; i++) {
      const arm = i % arms, t = r() * 4.2, a = rot + t * 1.6 + (arm * Math.PI * 2) / arms + (r() - 0.5) * 0.5;
      const d = 3 + t * 8;
      g.globalAlpha = 0.25 + 0.6 * (1 - t / 4.2);
      g.fillStyle = '#fff';
      g.fillRect(cx + Math.cos(a) * d * 1.3, cy + Math.sin(a) * d * 0.7, 1, 1);
    }
    g.globalAlpha = 1;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 9);
    gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(cx - 10, cy - 10, 20, 20);
  } },
  { name: 'ГУМАНОИДНАЯ ФИГУРА', draw(g, r) {
    // пиктограмма в духе послания Аресибо: фигура, шкала роста, ряд планет
    g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round';
    const x = 34 + r() * 10, y = 16;
    g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.moveTo(x, y + 6); g.lineTo(x, y + 28);
    g.moveTo(x - 12, y + 12 + r() * 6); g.lineTo(x, y + 12); g.lineTo(x + 12, y + 12 + r() * 6);
    g.moveTo(x, y + 28); g.lineTo(x - 8, y + 46); g.moveTo(x, y + 28); g.lineTo(x + 8, y + 46);
    g.stroke();
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + 22, y - 6); g.lineTo(x + 22, y + 46); g.stroke();
    for (let i = 0; i <= 6; i++) g.fillRect(x + 20, y - 6 + i * 8.6, 5, 1);
    for (let i = 0; i < 9; i++) { const s = 1 + (i === 2 ? 2 : r() * 2); g.fillRect(6 + i * 9, 66 - s, s * 1.5, s * 1.5); }
  } },
  { name: 'ИСКУССТВЕННЫЙ СПУТНИК', draw(g, r) {
    star(g, r, 50);
    g.save();
    g.translate(48, 36); g.rotate((r() - 0.5) * 0.9);
    g.fillStyle = '#bbb'; g.fillRect(-7, -9, 14, 18);
    g.fillStyle = '#555'; g.fillRect(-7, -9, 14, 4);
    for (const s of [-1, 1]) {
      g.fillStyle = '#888'; g.fillRect(s > 0 ? 10 : -38, -6, 28, 12);
      g.strokeStyle = '#222'; g.lineWidth = 1;
      for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo((s > 0 ? 10 : -38) + i * 5.6, -6); g.lineTo((s > 0 ? 10 : -38) + i * 5.6, 6); g.stroke(); }
      g.fillStyle = '#ddd'; g.fillRect(s > 0 ? 7 : -10, -1, 3, 2);
    }
    g.strokeStyle = '#eee'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 16, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.moveTo(0, 9); g.lineTo(0, 13); g.stroke();
    g.restore();
  } },
  { name: 'ЛИЦО', draw(g, r) {
    const x = 48, y = 38;
    const gr = g.createRadialGradient(x - 6, y - 8, 2, x, y, 28);
    gr.addColorStop(0, '#ddd'); gr.addColorStop(1, '#222');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(x, y, 20, 26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000';
    const ey = y - 6 - r() * 3;
    g.beginPath(); g.ellipse(x - 8, ey, 4, 2.5 + r() * 2, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(x + 8, ey, 4, 2.5 + r() * 2, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(x - 1, y - 2, 2, 8);
    g.beginPath(); g.ellipse(x, y + 12, 7, 1.5 + r() * 3, 0, 0, Math.PI * 2); g.fill();
  } },
  { name: 'КАРТА ПУЛЬСАРОВ', draw(g, r) {
    const cx = 44, cy = 38;
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 1;
    const n = 12 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, len = 10 + r() * 30;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); g.stroke();
      for (let k = 0; k < 4; k++) if (r() < 0.6) g.fillRect(cx + Math.cos(a) * (len - k * 2.5) - 1, cy + Math.sin(a) * (len - k * 2.5) - 2, 1, 4);
    }
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 46, cy); g.stroke();
    g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();
  } },
  { name: 'ГЕОМЕТРИЧЕСКИЙ ЗНАК', draw(g, r) {
    const cx = 48, cy = 36, sides = 3 + Math.floor(r() * 4);
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const rad = 30 - k * 9, rot = r() * Math.PI;
      g.beginPath();
      for (let i = 0; i <= sides; i++) { const a = rot + (i / sides) * Math.PI * 2; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
      g.stroke();
    }
    g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillRect(cx + Math.cos(a) * 34 - 1, cy + Math.sin(a) * 34 - 1, 2, 2); }
  } },
  { name: 'ПОВЕРХНОСТЬ С КРАТЕРАМИ', draw(g, r) {
    star(g, r, 30);
    const gr = g.createLinearGradient(0, 30, 0, H);
    gr.addColorStop(0, '#888'); gr.addColorStop(1, '#222');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, 34 + Math.sin(x * 0.07 + r()) * 4 + r() * 3);
    g.lineTo(W, H); g.fill();
    for (let i = 0; i < 7; i++) {
      const x = r() * W, y = 44 + r() * 24, s = 2 + r() * 6;
      g.fillStyle = '#111'; g.beginPath(); g.ellipse(x, y, s * 1.6, s * 0.5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#bbb'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 0.5, s * 1.6, s * 0.5, 0, 0.2, Math.PI - 0.2); g.stroke();
    }
    sphere(g, 18 + r() * 60, 12, 5, 0.4, -0.2);
  } },
];

function rasterize(draw) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  draw(g);
  const d = g.getImageData(0, 0, W, H).data, out = new Float32Array(W * H);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}

const tmp = document.createElement('canvas');

export default {
  id: 'IMG',
  name: 'Изображение',
  audio: false,

  make(seed) {
    const r = createRng(seed), scene = SCENES[seed % SCENES.length];
    const pix = rasterize(g => scene.draw(g, r));
    for (let i = 0; i < pix.length; i++) pix[i] = pix[i] * 0.9 + (hash(i, seed) - 0.5) * 0.12;   // зерно оригинала
    return { pix, scene: scene.name };
  },

  // неверная трактовка: байты как растр — полосы и периодика без образа
  junk(seed) {
    const pix = new Float32Array(W * H), r = createRng(seed ^ 0x55);
    let period = 3 + Math.floor(r() * 9);
    for (let y = 0; y < H; y++) {
      if (r() < 0.15) period = 3 + Math.floor(r() * 13);
      const base = r();
      for (let x = 0; x < W; x++) pix[y * W + x] = ((x + y * 7) % period < period / 2 ? base : 1 - base) * 0.7 + r() * 0.3;
    }
    return { pix, scene: null };
  },

  process(c, L, seed, t, out = new Float32Array(W * H)) {
    const bw = W / BLK, nb = bw * (H / BLK);
    const frame = Math.floor(t * 8);
    for (let y = 0; y < H; y++) {
      const p = at(L, y / H);
      // строки с неисправленными ошибками иногда сдвинуты
      const shift = hash(y, seed ^ 3) < p.err * 0.8 ? Math.floor((hash(y, seed ^ 4) - 0.5) * 16) : 0;
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (!p.decoded) { out[i] = hash(i, frame) * 0.25; continue; }
        let sx = (x + shift + W) % W, sy = y;
        const b = Math.floor(sy / BLK) * bw + Math.floor(sx / BLK);
        if (hash(b, seed ^ 8) < p.scramble) {                // блоки 8×8 переставлены
          const nbk = Math.floor(hash(b, seed ^ 5) * nb);
          sx = (nbk % bw) * BLK + (sx % BLK); sy = Math.floor(nbk / bw) * BLK + (sy % BLK);
        }
        let v = c.pix[sy * W + sx];
        if (hash(i, seed ^ 6) < p.err) v = hash(i, seed ^ 7) < 0.5 ? 0 : 1;       // битые пиксели
        v += (hash(i, frame ^ seed) - 0.5) * p.noise * 2;
        out[i] = v;
      }
    }
    return out;
  },

  render(g, box, ctx) {
    // шум зависит от t только через кадр (8 Гц) — между кадрами растр не меняется
    const c = ctx.content, key = `${levelKey(ctx.L)}|${ctx.seed}|${Math.floor(ctx.t * 8)}`;
    if (c._key !== key) { c._key = key; c._out = this.process(c, ctx.L, ctx.seed, ctx.t, c._out); }
    blitGray(g, box, c._out, W, H, tmp);
  },

  meaning: c => c.scene,

  async exportFile(c, L, seed) {
    return { blob: await grayToPng(this.process(c, L, seed, 0), W, H, 6), ext: 'png' };
  },
};
