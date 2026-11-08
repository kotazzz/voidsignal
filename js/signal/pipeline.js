// ================= Конвейер обработки =================
// Сигнал имеет уровень обработки k (0 — только что принят, 3 — максимум). Переход на
// следующий уровень — это проход четырёх этапов; каждый идёт по данным от начала к концу.
// Для элемента в позиции u ∈ [0,1) этап текущего прохода применён, если u < прогресса этапа:
//   декодинг    — на уровне 0 данные вообще получены (иначе пусто / статика);
//   коррекция   — меньше битовых ошибок (выбросы, выпадения);
//   дешифрование — меньше перемешанных блоков;
//   денойзинг   — меньше шума.
// Каждый уровень снижает остаток искажений: RESIDUAL[k]. Качество приёма добавляет свой остаток.

// стабильный хэш → [0,1)
export function hash(i, salt = 0) {
  let x = (Math.imul(i | 0, 374761393) + Math.imul(salt | 0, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export const MAX_LEVEL = 3;
const RESIDUAL = [1, 0.5, 0.2, 0.06];

// proc: { k, lv: [декод, корр, дешифр, деноиз] } → уровни для конвейера
export function levels(proc, quality) {
  const k = proc?.k ?? 0, lv = proc?.lv ?? [0, 0, 0, 0];
  return { k, lv, quality, decode: k >= 1 ? 1 : lv[0] };
}

// параметры искажений в точке u; scramble — доля перемешанных блоков (сравнивать с хэшем блока)
export function at(L, u) {
  const now = RESIDUAL[L.k], next = RESIDUAL[Math.min(MAX_LEVEL, L.k + 1)];
  const r = st => (L.k < MAX_LEVEL && u < L.lv[st] ? next : now);
  return {
    decoded: L.k >= 1 || u < L.lv[0],
    err: r(1) * 0.18 + (1 - L.quality) * 0.04,
    scramble: r(2) * 0.9,
    noise: r(3) * 0.42 + 0.02 + (1 - L.quality) * 0.1,
  };
}

// ключ кэша для уровней (шаг 0.5%)
export const levelKey = L => [L.k, ...L.lv, L.quality].map(v => Math.round(v * 200)).join(':');

// ---------- общий конвейер для звуковых данных ----------
export const SR = 11025;
const BLOCK = 2048;

export function processAudio(clean, L, seed) {
  const n = clean.length, out = new Float32Array(n), blocks = Math.ceil(n / BLOCK);
  for (let b = 0; b < blocks; b++) {
    const u = (b * BLOCK) / n, p = at(L, u);
    if (!p.decoded) continue;                                   // ещё не получено — тишина
    // перемешивание блоков: читаем чужой блок, иногда задом наперёд
    let src = b, rev = false;
    if (hash(b, seed ^ 10) < p.scramble) { src = Math.floor(hash(b, seed ^ 11) * blocks); rev = hash(b, seed ^ 12) < 0.5; }
    const drop = hash(b, seed ^ 13) < p.err * 1.2;              // выпадение блока
    for (let k = 0; k < BLOCK; k++) {
      const i = b * BLOCK + k;
      if (i >= n) break;
      const j = src * BLOCK + (rev ? BLOCK - 1 - k : k);
      let v = drop ? 0 : (clean[j] ?? 0);
      if (hash(i, seed ^ 14) < p.err * 0.015) v = hash(i, seed ^ 15) < 0.5 ? -0.95 : 0.95;   // щелчки
      v += (hash(i, seed ^ 16) - 0.5) * p.noise;
      out[i] = v;
    }
  }
  return out;
}

// ---------- WAV (16 бит, моно) ----------
export function encodeWav(samples, sr = SR) {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, s)) * 32767, true));
  return new Blob([buf], { type: 'audio/wav' });
}

// ---------- растр в PNG ----------
export function grayToPng(gray, w, h, scale = 4) {
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(1, gray[i])) * 255;
    img.data.set([v * 0.7, v, v * 0.8, 255], i * 4);
  }
  const t = document.createElement('canvas');
  t.width = w; t.height = h;
  t.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(t, 0, 0, c.width, c.height);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

// вывод растра в ячейку экрана с сохранением пропорций
export function blitGray(g, box, gray, w, h, tmp) {
  // присваивание размера сбрасывает canvas — делаем только при смене; ImageData живёт на tmp
  if (tmp.width !== w || tmp.height !== h || !tmp._img) { tmp.width = w; tmp.height = h; tmp._img = tmp.getContext('2d').createImageData(w, h); }
  const tg = tmp.getContext('2d'), img = tmp._img, d = img.data;
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(1, gray[i])) * 255;
    d[i * 4] = v * 0.66; d[i * 4 + 1] = v; d[i * 4 + 2] = v * 0.78; d[i * 4 + 3] = 255;
  }
  tg.putImageData(img, 0, 0);
  const k = Math.min(box.w / w, box.h / h), dw = w * k, dh = h * k;
  const x = box.x + (box.w - dw) / 2, y = box.y + (box.h - dh) / 2;
  g.imageSmoothingEnabled = false;
  g.drawImage(tmp, x, y, dw, dh);
  return { x, y, w: dw, h: dh };
}
