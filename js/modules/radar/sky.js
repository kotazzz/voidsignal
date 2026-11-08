// ================= Небо: звёзды, сетка, граница сектора =================
import { vec, toLL, dot, norm, createRng } from '../../core/math.js';
import { LAT_MAX, LON_MAX } from './config.js';

const srand = createRng(0x5eed1234);
const gauss = () => (srand() + srand() + srand() + srand() - 2) / 1.2;

const stars = [];
for (let i = 0; i < 2600; i++) {
  const z = srand() * 2 - 1, p = srand() * Math.PI * 2, q = Math.sqrt(1 - z * z);
  stars.push({ v: [q * Math.cos(p), q * Math.sin(p), z], m: 0.25 + Math.pow(srand(), 3) * 0.75 });
}
const bandN = norm(vec(55, 35)); // «Млечный путь»
for (let i = 0; i < 2200; i++) {
  const z = srand() * 2 - 1, p = srand() * Math.PI * 2, q = Math.sqrt(1 - z * z);
  const v = [q * Math.cos(p), q * Math.sin(p), z], k = dot(v, bandN);
  const w = norm([v[0] - bandN[0] * k, v[1] - bandN[1] * k, v[2] - bandN[2] * k]);
  const off = gauss() * 0.09;
  stars.push({ v: norm([w[0] + bandN[0] * off, w[1] + bandN[1] * off, w[2] + bandN[2] * off]), m: 0.15 + srand() * 0.3 });
}
for (const s of stars) {
  const [la, lo] = toLL(s.v);
  s.dom = Math.abs(la) <= LAT_MAX && Math.abs(lo) <= LON_MAX;
  s.ph = srand() * 6.28;
  s.tw = 1 + srand() * 3;
}
export const domStars = stars.filter(s => s.dom), outStars = stars.filter(s => !s.dom);

export const grid = [];
for (let lat = -50; lat <= 50; lat += 10) {
  const l = []; for (let lon = -LON_MAX; lon <= LON_MAX; lon += 3) l.push(vec(lat, lon));
  grid.push({ pts: l, main: lat === 0 });
}
for (let lon = -105; lon <= 105; lon += 15) {
  const l = []; for (let lat = -LAT_MAX; lat <= LAT_MAX; lat += 3) l.push(vec(lat, lon));
  grid.push({ pts: l, main: lon === 0 });
}

export const border = [];
for (let lon = -LON_MAX; lon <= LON_MAX; lon += 2) border.push(vec(LAT_MAX, lon));
for (let lat = LAT_MAX; lat >= -LAT_MAX; lat -= 2) border.push(vec(lat, LON_MAX));
for (let lon = LON_MAX; lon >= -LON_MAX; lon -= 2) border.push(vec(-LAT_MAX, lon));
for (let lat = -LAT_MAX; lat <= LAT_MAX; lat += 2) border.push(vec(lat, -LON_MAX));

export const ticks = [];
for (let lon = -LON_MAX; lon <= LON_MAX; lon += 4) {
  ticks.push([vec(LAT_MAX, lon), vec(LAT_MAX + 2, lon - 1.5)]);
  ticks.push([vec(-LAT_MAX, lon), vec(-LAT_MAX - 2, lon - 1.5)]);
}
for (let lat = -LAT_MAX; lat <= LAT_MAX; lat += 4) {
  ticks.push([vec(lat, LON_MAX), vec(lat - 1.5, LON_MAX + 2.5)]);
  ticks.push([vec(lat, -LON_MAX), vec(lat - 1.5, -LON_MAX - 2.5)]);
}

export const gridLabels = [];
for (let lon = -90; lon <= 90; lon += 30) gridLabels.push({ v: vec(0, lon), t: `${lon}°` });
for (let lat = -40; lat <= 40; lat += 20) if (lat) gridLabels.push({ v: vec(lat, 0), t: `${lat > 0 ? '+' : ''}${lat}°` });
