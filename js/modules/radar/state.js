// ================= Состояние триангулятора =================
import { vec } from '../../core/math.js';

export const st = {
  T: 0,
  ret: { lat: 0, lon: 0, vx: 0, vy: 0 },              // прицел
  cam: { lat: 0, lon: 0, C: null, E: null, N: null },
  radars: [[-6, -14], [9, -4], [-7, 7]].map(([lat, lon]) => ({ lat, lon, v: vec(lat, lon), moving: null })),
  selected: [false, false, false],                      // тумблеры независимы
  signals: [],
  ping: null,                                           // волна ручного поиска сигналов
  cooldown: { t: 0, total: 1, kind: '' },
  analysis: null,
  lastResult: null,
  limitFlash: -10,
  swFlashUntil: 0,
  speed: 0,
};

export const selCount = () => st.selected.filter(Boolean).length;
