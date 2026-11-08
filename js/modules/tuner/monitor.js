// ================= Видеоканал: маленький ЧБ кинескоп, 1 кадр/с =================
// Без захвата — белый шум. После захвата — вращающаяся 3D-модель источника,
// зашумлённая обратно пропорционально точности настройки.
import { clamp, createRng } from '../../core/math.js';

export function createMonitor(canvas) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const img = g.createImageData(W, H);
  const buf = new Float32Array(W * H);
  let stars = null, starSeed = -1;

  const put = (x, y, v) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    buf[i] = Math.max(buf[i], v);
  };
  function line(x0, y0, x1, y1, v) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1;
    for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, v);
  }

  function background(seed) {
    if (starSeed !== seed) {
      const r = createRng(seed ^ 0x9e3779b9);
      stars = Array.from({ length: 26 }, () => [r() * W, r() * H, 0.25 + r() * 0.5]);
      starSeed = seed;
    }
    for (const [x, y, v] of stars) put(x, y, v);
  }

  // ---------- планета с кольцами ----------
  function planet(rot, seed) {
    const cx = W / 2, cy = H / 2, R = H * 0.29, tilt = 0.42;
    const ct = Math.cos(tilt), stl = Math.sin(tilt);
    const L = [-0.55, -0.45, 0.7];
    const bands = 6 + (seed % 5);
    const ring = (front) => {
      for (let i = 0; i < 360; i++) {
        const a = (i / 360) * Math.PI * 2 + rot * 0.3;
        for (let r = 1.45; r <= 1.95; r += 0.1) {
          const x = Math.cos(a) * r, z = Math.sin(a) * r;
          const y = -z * stl, zz = z * ct;
          if ((zz > 0) !== front) continue;
          const sx = cx + x * R, sy = cy + y * R;
          if (!front && Math.hypot(sx - cx, sy - cy) < R) continue;   // за диском планеты
          put(sx, sy, r > 1.7 && r < 1.8 ? 0.2 : 0.62);
        }
      }
    };
    ring(false);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / R, dy = (y - cy) / R, r2 = dx * dx + dy * dy;
        if (r2 > 1) continue;
        const nz = Math.sqrt(1 - r2);
        const ny = dy * ct - nz * stl, nzz = dy * stl + nz * ct;          // наклон оси
        const lon = Math.atan2(dx, nzz) + rot, lat = Math.asin(clamp(ny, -1, 1));
        const tex = 0.55 + 0.28 * Math.sin(lat * bands + Math.sin(lon * 2 + seed) * 0.9) + 0.12 * Math.sin(lon * 5 + lat * 3);
        const sh = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
        buf[y * W + x] = 0.04 + tex * sh;
      }
    }
    ring(true);
  }

  // ---------- спутник: каркас корпуса, панели, антенна ----------
  const BOX = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const BOX_E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  function satellite(rot, seed) {
    const cx = W / 2, cy = H / 2, sc = H * 0.2;
    const ry = rot, rx = 0.45 + Math.sin(rot * 0.7) * 0.15, rz = 0.25;
    const cy1 = Math.cos(ry), sy1 = Math.sin(ry), cx1 = Math.cos(rx), sx1 = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
    const P = ([x, y, z]) => {
      let X = x * cy1 + z * sy1, Z = -x * sy1 + z * cy1, Y = y;
      const Y2 = Y * cx1 - Z * sx1; Z = Y * sx1 + Z * cx1; Y = Y2;
      const X2 = X * cz - Y * sz; Y = X * sz + Y * cz; X = X2;
      const f = 4 / (4 + Z);
      return [cx + X * sc * f, cy + Y * sc * f, Z];
    };
    const seg = (a, b, v = 1) => {
      const p = P(a), q = P(b);
      const depth = 0.55 + 0.45 * clamp(0.5 - (p[2] + q[2]) / 6, 0, 1);
      line(p[0], p[1], q[0], q[1], v * depth);
    };
    // корпус
    const body = BOX.map(([x, y, z]) => [x * 0.45, y * 0.45, z * 0.6]);
    BOX_E.forEach(([a, b]) => seg(body[a], body[b]));
    // солнечные панели с решёткой
    const span = 1.5 + (seed % 3) * 0.25;
    for (const s of [-1, 1]) {
      const x0 = s * 0.55, x1 = s * (0.55 + span), h = 0.42;
      seg([s * 0.45, 0, 0], [x0, 0, 0], 0.8);
      seg([x0, -h, 0], [x1, -h, 0]); seg([x0, h, 0], [x1, h, 0]);
      seg([x0, -h, 0], [x0, h, 0]); seg([x1, -h, 0], [x1, h, 0]);
      for (let k = 1; k < 4; k++) { const x = x0 + ((x1 - x0) * k) / 4; seg([x, -h, 0], [x, h, 0], 0.5); }
      seg([x0, 0, 0], [x1, 0, 0], 0.5);
    }
    // тарелка антенны
    const dz = 0.6, dr = 0.38, N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
      seg([Math.cos(a) * dr, Math.sin(a) * dr, dz + 0.25], [Math.cos(b) * dr, Math.sin(b) * dr, dz + 0.25], 0.9);
      if (i % 2 === 0) seg([0, 0, dz], [Math.cos(a) * dr, Math.sin(a) * dr, dz + 0.25], 0.45);
    }
    seg([0, 0, dz], [0, 0, dz + 0.55], 0.9);
  }

  // ---------- кадр ----------
  // st: { mode: 'off' | 'noise' | 'image', kind, seed, rot, clarity }
  function draw(st) {
    const d = img.data;
    if (st.mode === 'off') {
      for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
      return;
    }
    buf.fill(0);
    let noise = 1;
    if (st.mode === 'image') {
      background(st.seed);
      (st.kind === 'planet' ? planet : satellite)(st.rot, st.seed);
      noise = 0.14 + 0.86 * Math.pow(1 - clamp(st.clarity, 0, 1), 1.3);
    }
    const roll = Math.random() < noise * 0.35 ? Math.floor((Math.random() - 0.5) * H * 0.4) : 0;   // срыв кадровой
    const ghost = Math.round(2 + noise * 4);                                                     // многолучевость
    for (let y = 0; y < H; y++) {
      const torn = Math.random() < noise * 0.18;                                                 // помеха по строке
      const shift = torn ? Math.floor((Math.random() - 0.5) * 12) : 0;
      const sy = ((y + roll) % H + H) % H;
      for (let x = 0; x < W; x++) {
        const sx = clamp(x + shift, 0, W - 1);
        let v = buf[sy * W + sx] + 0.3 * noise * buf[sy * W + clamp(sx - ghost, 0, W - 1)];
        v = v * (1 - noise) + Math.random() * noise;
        if (torn) v += 0.25;
        const c = clamp(v, 0, 1) * 255, i = (y * W + x) * 4;
        d[i] = c * 0.93; d[i + 1] = c * 0.96; d[i + 2] = c; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }

  return { draw };
}
