// ================= Массив радиотелескопов =================
// 26 тарелок (A–Z), у каждой точность наведения и сервер. Точность сама медленно падает, серверы
// иногда отказывают. Средняя точность работающих тарелок задаёт скорость загрузки в «Настройке».
import { clamp } from './math.js';
import { log, clock } from './clock.js';

const NAMES = ['Altair', 'Betelgeuse', 'Capella', 'Deneb', 'Electra', 'Fomalhaut', 'Gacrux', 'Hadar', 'Izar', 'Jabbah', 'Kochab', 'Lyra', 'Mizar', 'Nunki', 'Orion', 'Polaris', 'Quasar', 'Rigel', 'Sirius', 'Tarazed', 'Unukalhai', 'Vega', 'Wezen', 'Xamidimura', 'Yildun', 'Zubenelgenubi'];

// размещение на местности группами: [x в процентах карты, строка 0…7]
const SPOTS = [
  [8, 0], [20, 0],                       // A B — угловая пара на северо-западе
  [66, 0], [78, 0], [90, 0],             // C D E — линия на северо-востоке
  [30, 1], [40, 2], [50, 3], [60, 4], [70, 5],   // F–J — диагональ
  [10, 3], [18, 3], [12, 4], [20, 4],    // K–N — плотный кластер на западе
  [84, 2], [94, 2], [88, 3],             // O P Q — кластер на востоке
  [8, 7], [20, 7], [80, 7], [92, 7],     // R S T U — угловые пары на юге
  [50, 5], [50, 6], [50, 7],             // V W X — вертикаль по центру
  [30, 6], [68, 6],                      // Y Z — одиночные
];
export const ROW_N = 8;
export const rowY = r => 8 + r * 12;       // процент карты по вертикали

export const dishes = NAMES.map((name, i) => ({
  i, letter: String.fromCharCode(65 + i), name,
  x: SPOTS[i][0], row: SPOTS[i][1], y: rowY(SPOTS[i][1]),
  prec: 0.9 + Math.random() * 0.1,                 // точность 0…1
  up: true,                                          // сервер работает
  rate: 0.00006 + Math.random() * 0.00024,           // скорость деградации, доля в секунду
  seed: Math.floor(Math.random() * 1e6),
  lastCal: -Math.random() * 1500,                    // время последней калибровки (с, до старта — в прошлом)
}));

// строки местности: индексы тарелок слева направо
export const rows = Array.from({ length: ROW_N }, (_, r) => dishes.filter(d => d.row === r).sort((a, b) => a.x - b.x).map(d => d.i));

// джойстик-крестовина: влево/вправо — по строке, на краю переход на соседнюю строку; вверх/вниз — упор
export function neighbor(i, dir) {
  const d = dishes[i], line = rows[d.row], k = line.indexOf(i);
  if (dir === 'left' || dir === 'right') {
    const step = dir === 'right' ? 1 : -1;
    if (line[k + step] !== undefined) return line[k + step];
    for (let r = d.row + step; r >= 0 && r < ROW_N; r += step) {
      if (rows[r].length) return step > 0 ? rows[r][0] : rows[r][rows[r].length - 1];
    }
    return i;
  }
  const step = dir === 'down' ? 1 : -1;
  for (let r = d.row + step; r >= 0 && r < ROW_N; r += step) {
    if (!rows[r].length) continue;
    return rows[r].reduce((best, j) => (Math.abs(dishes[j].x - d.x) < Math.abs(dishes[best].x - d.x) ? j : best), rows[r][0]);
  }
  return i;
}

// ---------- показатели массива ----------
export const meanPrecision = () => dishes.reduce((s, d) => s + (d.up ? d.prec : 0), 0) / dishes.length;
export const serversDown = () => dishes.filter(d => !d.up).length;
// множитель скорости загрузки: 100 % у идеального массива, не меньше 20 %
export const downloadFactor = () => 0.2 + 0.8 * meanPrecision();

// ---------- симуляция ----------
export function tickDishes(dt) {
  for (const d of dishes) {
    d.prec = Math.max(0.2, d.prec - d.rate * dt * (0.6 + Math.random() * 0.8));
    if (d.up && Math.random() < dt / (720 * dishes.length)) {       // в среднем один отказ за ~12 минут
      d.up = false;
      log(`СЕРВЕР ТЕЛЕСКОПА ${d.letter} ${d.name.toUpperCase()} ОТКАЗАЛ`);
    }
  }
}

export function calibrate(d) { d.prec = 1; d.lastCal = clock.t; }

// отладка
export function degradeAll(by = 0.2) { dishes.forEach(d => { d.prec = clamp(d.prec - by * (0.5 + Math.random()), 0.2, 1); }); }
export function downRandomServer() {
  const ok = dishes.filter(d => d.up);
  if (!ok.length) return null;
  const d = ok[Math.floor(Math.random() * ok.length)];
  d.up = false;
  return d;
}
export function repairAll() { dishes.forEach(d => { d.up = true; d.prec = 1; d.lastCal = clock.t; }); }
