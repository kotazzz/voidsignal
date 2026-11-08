// ================= Сохранение сигналов =================
// Текущая реализация: бинарный Blob в архиве в памяти (без выгрузки файлом).
// Механика будет меняться — модули обращаются только к saveSignal() / archive.
//
// Формат контейнера v1 (little-endian):
//   0  u8[4]  'VSIG'
//   4  u16    версия
//   6  u16    резерв
//   8  u32    длина JSON-заголовка
//  12  JSON   метаданные (UTF-8)
//   …  u8[]   полезная нагрузка
const MAGIC = [0x56, 0x53, 0x49, 0x47];
const VERSION = 1;

export const archive = [];

export function encodeSignal(meta, payload) {
  const json = new TextEncoder().encode(JSON.stringify(meta));
  const head = new DataView(new ArrayBuffer(12));
  MAGIC.forEach((b, i) => head.setUint8(i, b));
  head.setUint16(4, VERSION, true);
  head.setUint32(8, json.length, true);
  return new Blob([head.buffer, json, payload], { type: 'application/octet-stream' });
}

// повторное сохранение того же ID заменяет запись
export function saveSignal(meta, payload) {
  const blob = encodeSignal(meta, payload);
  const entry = { id: meta.id, meta, blob, savedAt: Date.now() };
  const i = archive.findIndex(e => e.id === entry.id);
  if (i >= 0) archive[i] = entry; else archive.push(entry);
  return entry;
}
