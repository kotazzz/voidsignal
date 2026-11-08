// ================= Доступ к данным сохранённого сигнала =================
// Общий для панелей воспроизведения и обработки: поток (проверка трактовки), состояние
// обработки (едет вместе с сигналом на накопителе) и звук для прослушивания.
import { openStream } from '../core/signals.js';
import { levels, MAX_LEVEL } from './pipeline.js';
import { formats, content } from './formats/index.js';

const streams = new WeakMap();
export const stream = entry => {
  if (!streams.has(entry)) streams.set(entry, openStream(entry.id));
  return streams.get(entry);
};

// состояние обработки хранится в самой записи
export function proc(entry) {
  if (!entry.proc) entry.proc = { k: 0, lv: [0, 0, 0, 0] };
  return entry.proc;
}

export const quality = entry => entry.meta.quality ?? 1;
export const sizeKb = entry => (entry.meta.bits || 0) / 8 / 1024;
export const entryLevels = entry => levels(proc(entry), quality(entry));

// звук сигнала «как есть»: звуковые форматы звучат собой, остальные — как поток байтов.
// На уровне 0 до декодинга сигнал слышен сырым — с полным шумом.
const SND = 1, SPEC = 3;
export function listenSamples(entry) {
  const s = stream(entry), L = entryLevels(entry);
  const fi = s.matches(SPEC) ? SPEC : SND, match = s.matches(fi);
  const raw = L.k === 0 ? { ...L, lv: [1, ...L.lv.slice(1)], decode: 1 } : L;
  return formats[fi].samples(content(fi, s, match), raw, s.seed);
}

// ---------- трактовка записи ----------
const DETECT_AT = 0.35;     // с этой доли первого декодинга верная трактовка показывает структуру
export const matchesFor = (entry, fi) => !!entry && stream(entry).matches(fi);
export const detectedFor = (entry, fi) => { const p = entry && proc(entry); return !!p && matchesFor(entry, fi) && (p.k >= 1 || p.lv[0] >= DETECT_AT); };
export const meaningfulFor = (entry, fi) => !!entry && matchesFor(entry, fi) && proc(entry).k >= MAX_LEVEL;
export const noisyFor = (entry, fi) => { const p = entry && proc(entry); return !!p && (p.k > 0 || p.lv[0] > 0.05) && !detectedFor(entry, fi); };

// всё, что нужно для вывода и экспорта выбранной трактовки записи
export function interpretation(entry, fi) {
  if (!entry) return null;
  const s = stream(entry);
  return { e: entry, fi, fmt: formats[fi], content: content(fi, s, s.matches(fi)), L: entryLevels(entry), seed: s.seed };
}
