// ================= Реестр интерпретаций =================
// Порядок совпадает с FORMATS в core/signals.js (скрытый формат сигнала — индекс в этом списке).
//
// Контракт интерпретации:
//   id, name, audio                — код, название, можно ли прослушать
//   make(seed, id) → content        — настоящие данные (если трактовка верна)
//   junk(seed) → content            — во что превращается поток при неверной трактовке
//   render(g, box, ctx)             — вывод на экран; ctx: { content, L, seed, t, playhead }
//   samples?(content, L, seed)      — обработанный звук (для audio-форматов)
//   meaning(content) → string|null  — осмысление полностью декодированных данных
//   exportFile(content, L, seed)    — Promise<{ blob, ext }> для выгрузки на ПК
import image from './image.js';
import sound from './sound.js';
import text from './text.js';
import spectrum from './spectrum.js';
import { FORMATS } from '../../core/signals.js';

export const formats = [image, sound, text, spectrum];
formats.forEach((f, i) => { if (f.id !== FORMATS[i]) throw new Error(`порядок форматов: ${f.id} ≠ ${FORMATS[i]}`); });

// контент кэшируется на сигнал и трактовку
const cache = new Map();
export function content(fi, stream, match) {
  const key = `${stream.id}|${fi}|${match}`;
  if (!cache.has(key)) cache.set(key, match ? formats[fi].make(stream.seed, stream.id) : formats[fi].junk(stream.seed));
  return cache.get(key);
}
