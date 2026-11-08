// ================= Общая математика =================
export const D2R = Math.PI / 180, R2D = 180 / Math.PI;

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const c01 = x => clamp(x, 0, 1);
export const wrap = (x, m) => ((x % m) + m) % m;

// ---------- сферическая геометрия ----------
export const vec = (lat, lon) => {
  const a = lat * D2R, b = lon * D2R, c = Math.cos(a);
  return [c * Math.cos(b), c * Math.sin(b), Math.sin(a)];
};
export const toLL = v => [Math.asin(clamp(v[2], -1, 1)) * R2D, Math.atan2(v[1], v[0]) * R2D];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
export const angDist = (a, b) => Math.acos(clamp(dot(a, b), -1, 1)) * R2D;
export const basis = (lat, lon) => {
  const a = lat * D2R, b = lon * D2R;
  return {
    E: [-Math.sin(b), Math.cos(b), 0],
    N: [-Math.sin(a) * Math.cos(b), -Math.sin(a) * Math.sin(b), Math.cos(a)],
  };
};
export function slerp(a, b, t) {
  const om = Math.acos(clamp(dot(a, b), -1, 1));
  if (om < 1e-6) return a.slice();
  const s = Math.sin(om), k1 = Math.sin((1 - t) * om) / s, k2 = Math.sin(t * om) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}
export const arc = (a, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => slerp(a, b, i / n));
export function smallCircle(c, E, N, rDeg, n = 40) {
  const r = rDeg * D2R, cr = Math.cos(r), sr = Math.sin(r), out = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2, ct = Math.cos(t) * sr, st = Math.sin(t) * sr;
    out.push([c[0] * cr + E[0] * ct + N[0] * st, c[1] * cr + E[1] * ct + N[1] * st, c[2] * cr + E[2] * ct + N[2] * st]);
  }
  return out;
}
export function inTriangle(A, B, C, P) {
  const d1 = dot(cross(A, B), P), d2 = dot(cross(B, C), P), d3 = dot(cross(C, A), P);
  return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}

// ---------- детерминированный генератор (mulberry32) ----------
export function createRng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
