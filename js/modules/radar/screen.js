// ================= Отрисовка главного кинескопа =================
import { D2R, c01, vec, dot, basis, arc, smallCircle, angDist } from '../../core/math.js';
import { unitState } from '../../core/units.js';
import { CFG, fmtLat, fmtLon } from './config.js';
import { st, selCount } from './state.js';
import { grid, gridLabels, border, ticks, domStars, outStars } from './sky.js';

const GREEN = '#9dffc0';
const { cam, ret, radars, selected } = st;
let cv, ctx, W, H, CX, CY, HH, S, SWEEP_R;
let warpK = 0.07, T = 0, snapshot = null, noiseFrames = [];

export const BOOT_LINES = [
  [1.9, 'VS-3 ROM 2.14'],
  [2.3, 'ТЕСТ ИНДИКАТОРОВ ....... OK'],
  [2.7, 'ПРОГРЕВ ЭЛТ ............ OK'],
  [3.1, 'КАРТА НЕБА ............. OK'],
  [3.6, 'РАДАРЫ R1 R2 R3 ........ OK'],
  [4.0, 'БУФЕР СИГНАЛОВ ......... OK'],
  [4.5, 'ПОИСК СИГНАЛОВ ......... '],
];

export function initScreen(canvas) {
  cv = canvas;
  ctx = cv.getContext('2d');
  W = cv.width; H = cv.height; CX = W / 2; CY = H / 2; HH = H / 2;
  S = Math.sin(CFG.halfFov * D2R);
  SWEEP_R = Math.hypot(W, H) / 2;
  // кадры «снега» для прогрева
  noiseFrames = Array.from({ length: 4 }, () => {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 240;
    const g = c.getContext('2d'), img = g.createImageData(320, 240);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v * 0.75; img.data[i + 1] = v; img.data[i + 2] = v * 0.85; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

// последний кадр перед отключением — для анимации схлопывания
export function takeSnapshot() {
  snapshot = document.createElement('canvas');
  snapshot.width = W; snapshot.height = H;
  snapshot.getContext('2d').drawImage(cv, 0, 0);
}

// ---------- проекция ----------
function project(v) {
  const z = dot(v, cam.C), x = dot(v, cam.E) / S, y = dot(v, cam.N) / S;
  const f = 1 + warpK * (x * x + y * y);
  return { x: CX + x * f * HH, y: CY - y * f * HH, z };
}
function strokePath(vs) {
  ctx.beginPath();
  let pen = false;
  for (const v of vs) {
    const p = project(v);
    if (p.z < 0.1) { pen = false; continue; }
    if (pen) ctx.lineTo(p.x, p.y); else { ctx.moveTo(p.x, p.y); pen = true; }
  }
  ctx.stroke();
}
const pingR = () => (st.ping ? Math.min(1, st.ping.t / CFG.pingTime) * SWEEP_R : 0);
const onScreen = (p, m = 0) => p.z > 0.3 && p.x > m && p.x < W - m && p.y > m && p.y < H - m;

// ---------- слои ----------
function drawGrid(rv) {
  ctx.lineWidth = 1;
  const n = Math.ceil(rv.grid * grid.length);
  for (let i = 0; i < n; i++) {
    const g = grid[i];
    ctx.strokeStyle = g.main ? 'rgba(120,255,170,.32)' : 'rgba(120,255,170,.13)';
    strokePath(g.pts);
  }
  if (rv.grid < 1) return;
  ctx.font = '14px VT323, "Courier New", monospace';
  ctx.fillStyle = 'rgba(140,255,180,.18)';
  for (const l of gridLabels) {
    const p = project(l.v);
    if (onScreen(p)) ctx.fillText(l.t, p.x + 3, p.y - 3);
  }
  ctx.strokeStyle = 'rgba(255,120,60,.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  strokePath(border);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,110,60,.35)';
  for (const t of ticks) strokePath(t);
}

function drawStars(rv) {
  const zmin = 0.45;
  const pass = (list, color, mul) => {
    ctx.fillStyle = color;
    const n = Math.floor(rv.stars * list.length);
    for (let i = 0; i < n; i++) {
      const s = list[i];
      if (dot(s.v, cam.C) < zmin) continue;
      const p = project(s.v);
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) continue;
      ctx.globalAlpha = s.m * mul * (0.7 + 0.3 * Math.sin(T * s.tw + s.ph));
      const sz = s.m > 0.85 ? 2.6 : s.m > 0.55 ? 1.8 : 1.1;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
  };
  pass(domStars, '#d2ffe2', 1);
  pass(outStars, '#ff8a5c', 0.35);

  // хроматическая аберрация при движении
  const speed = st.speed;
  if (speed > 0.08) {
    const l = Math.hypot(ret.vx, ret.vy) || 1;
    const ox = (ret.vx / l) * speed * 4, oy = (-ret.vy / l) * speed * 4;
    ctx.globalCompositeOperation = 'lighter';
    for (const [col, sg] of [['#ff2040', 1], ['#2060ff', -1]]) {
      ctx.fillStyle = col;
      for (const s of domStars) {
        if (s.m < 0.5 || dot(s.v, cam.C) < zmin) continue;
        const p = project(s.v);
        ctx.globalAlpha = s.m * speed * 0.7;
        ctx.fillRect(p.x + ox * sg - 1, p.y + oy * sg - 1, 2, 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}

function drawSignals(rv) {
  for (const s of st.signals) {
    const p = project(s.v);
    if (p.z < 0.2) continue;
    if (s.hidden && !(st.ping && Math.hypot(p.x - CX, p.y - CY) <= pingR())) continue;   // ещё не найден пингом
    if (rv.sweep < 1 && Math.hypot(p.x - CX, p.y - CY) > rv.sweep * SWEEP_R) continue;
    if (s.captured) {
      const e = T - s.captured, sz = Math.max(12, 46 - e * 40);
      ctx.strokeStyle = `rgba(110,255,130,${1 - e / 2.5})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - sz, p.y - sz, sz * 2, sz * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = 'bold 15px VT323, "Courier New", monospace';
      ctx.fillText('LOCK', p.x - 14, p.y - sz - 6);
      ctx.lineWidth = 1.5;
      strokePath(smallCircle(s.v, s.E, s.N, s.R * 0.5));
      continue;
    }
    // затухание: последние 20 с волны слабеют, центр мерцает
    const fade = c01(s.life / 20), dying = s.life < 20;
    const str = 0.2 + 0.8 * fade;
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const ph = (T * 0.35 + s.phase + k / 3) % 1;
      ctx.strokeStyle = `rgba(110,230,255,${(1 - ph) * 0.85 * str})`;
      strokePath(smallCircle(s.v, s.E, s.N, Math.max(0.1, ph * s.R * 1.15)));
    }
    const b = dying ? (Math.random() < 0.5 ? 1 : 0) : 0.5 + 0.5 * Math.sin(T * 6 + s.phase * 6);
    ctx.fillStyle = `rgba(190,245,255,${(0.4 + b * 0.6) * str})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 + b, 0, Math.PI * 2); ctx.fill();
    ctx.font = '14px VT323, "Courier New", monospace';
    ctx.fillStyle = dying ? 'rgba(255,140,90,.8)' : 'rgba(140,230,255,.45)';
    ctx.fillText(dying ? `${s.id} ${Math.ceil(s.life)}` : s.id, p.x + 8, p.y + 16);
  }
}

function drawTriangle() {
  const [A, B, C] = radars.map(r => r.v);
  const { analysis, lastResult } = st;
  let col = 'rgba(255,180,60,.55)';
  if (analysis) col = Math.floor(T * 12) % 2 ? 'rgba(255,230,90,.95)' : 'rgba(255,230,90,.35)';
  else if (lastResult && T - lastResult.t < 5) col = lastResult.code === 'ok' ? 'rgba(110,255,130,.9)' : 'rgba(255,80,60,.85)';
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 5]);
  ctx.lineDashOffset = -T * 22;
  strokePath(arc(A, B)); strokePath(arc(B, C)); strokePath(arc(C, A));
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  if (analysis) {
    const ph = (analysis.t * 1.4) % 1;
    ctx.strokeStyle = `rgba(255,230,90,${1 - ph})`;
    for (const r of radars) {
      const bs = basis(r.lat, r.lon);
      strokePath(smallCircle(r.v, bs.E, bs.N, ph * 22, 36));
    }
  }
}

function drawRadars() {
  const retV = vec(ret.lat, ret.lon);
  radars.forEach((r, i) => {
    const sel = selected[i];
    if (r.moving) {
      ctx.strokeStyle = 'rgba(255,220,90,.6)';
      ctx.setLineDash([3, 5]);
      strokePath(arc(r.v, r.moving.to, 20));
      ctx.setLineDash([]);
      const d = project(r.moving.to);
      if (d.z > 0.2) {
        ctx.beginPath();
        ctx.moveTo(d.x - 6, d.y - 6); ctx.lineTo(d.x + 6, d.y + 6);
        ctx.moveTo(d.x + 6, d.y - 6); ctx.lineTo(d.x - 6, d.y + 6);
        ctx.stroke();
      }
    } else if (sel && selCount() === 1) {
      ctx.strokeStyle = 'rgba(255,220,120,.35)';
      ctx.setLineDash([2, 6]);
      strokePath(arc(r.v, retV, 20));
      ctx.setLineDash([]);
    }

    const p = project(r.v);
    if (p.z < 0.3) return;
    const col = sel ? '#fff1a0' : '#ffb43c';
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 9); ctx.lineTo(p.x + 8, p.y + 6); ctx.lineTo(p.x - 8, p.y + 6); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y + 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 15px VT323, "Courier New", monospace';
    ctx.fillText(`R${i + 1}`, p.x + 11, p.y - 8);
    if (sel) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = T * 30;
      ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  });
}

function drawReticle() {
  const p = project(vec(ret.lat, ret.lon));
  const col = selCount() === 1 ? '#fff1a0' : '#eaffef';
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(p.x + dx * 6, p.y + dy * 6);
    ctx.lineTo(p.x + dx * 24, p.y + dy * 24);
  }
  const b = 30;
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    ctx.moveTo(p.x + sx * b, p.y + sy * (b - 8));
    ctx.lineTo(p.x + sx * b, p.y + sy * b);
    ctx.lineTo(p.x + sx * (b - 8), p.y + sy * b);
  }
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
}

function drawEdgeArrow(v, color, label) {
  const p = project(v);
  if (onScreen(p, 24)) return;
  const a = Math.atan2(-dot(v, cam.N), dot(v, cam.E));
  const x = CX + Math.cos(a) * (W / 2 - 30), y = CY + Math.sin(a) * (H / 2 - 30);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.font = '14px VT323, "Courier New", monospace';
  ctx.fillText(label, x - 14 - Math.cos(a) * 18, y + 4 - Math.sin(a) * 18);
}

function drawHud() {
  ctx.font = '16px VT323, "Courier New", monospace';
  ctx.fillStyle = GREEN;
  ctx.globalAlpha = 0.7;
  const live = st.signals.filter(s => !s.captured && !s.hidden).length;
  ctx.fillText(`SIG ${live}`, 40, 38);
  ctx.textAlign = 'right';
  ctx.fillText(selected.map((on, i) => (on ? `R${i + 1}` : '')).filter(Boolean).join(' ') || '--', W - 40, 38);
  ctx.textAlign = 'left';
  ctx.fillText(`${fmtLat(ret.lat).replace(' ', '+')}  ${fmtLon(ret.lon).replace(' ', '+')}`, 40, H - 32);
  ctx.textAlign = 'right';
  const bars = Math.round(st.speed * 8);
  ctx.fillText(`${'▮'.repeat(bars)}${'▯'.repeat(8 - bars)}`, W - 40, H - 32);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';

  if (T - st.limitFlash < 1.2 && Math.floor(T * 6) % 2) {
    ctx.fillStyle = '#ff6a40';
    ctx.fillText('◄ ГРАНИЦА СЕКТОРА ►', CX, 62);
  }
  if (st.analysis) {
    ctx.fillStyle = '#ffe066';
    ctx.fillText(`АНАЛИЗ ${'■'.repeat(Math.ceil((st.analysis.t / CFG.scanTime) * 12)).padEnd(12, '□')}`, CX, 86);
  }
  ctx.textAlign = 'left';
}

// ---------- питание кинескопа ----------
const FULL = { grid: 1, stars: 1, radars: true, sweep: 1, noise: 0, bright: 1 };
const reveal = bt => ({
  grid: c01((bt - 2.4) / 1.0),
  stars: c01((bt - 2.9) / 1.3),
  radars: bt >= 3.6,
  sweep: c01((bt - 4.5) / 1.7),
  noise: 1 - c01((bt - 1.5) / 1.4),
  bright: c01((bt - 1.0) / 1.8),
});

function drawNoise(alpha, y = 0, h = H) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(noiseFrames[Math.floor(Math.random() * 4)], 0, Math.random() * 40, 320, 200, 0, y, W, h);
  ctx.globalAlpha = 1;
}

function drawBootText(bt, rv) {
  ctx.font = '16px VT323, "Courier New", monospace';
  ctx.fillStyle = GREEN;
  BOOT_LINES.forEach(([t0, text], i) => {
    if (bt < t0) return;
    let line = text.slice(0, Math.floor((bt - t0) * 45));
    if (i === BOOT_LINES.length - 1 && rv.sweep >= 1) line += `НАЙДЕНО ${st.signals.filter(s => !s.captured && !s.hidden).length}`;
    ctx.fillText(line, 40, 40 + i * 18);
  });
  if (Math.floor(bt * 3) % 2) ctx.fillText('_', 40, 40 + BOOT_LINES.length * 18);
}

function drawShutdown(t) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (t < 0.22) {                         // картинка схлопывается в строку
    const k = 1 - (t / 0.22) * 0.995;
    if (snapshot) ctx.drawImage(snapshot, 0, CY - (H * k) / 2, W, H * k);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(200,255,220,${(t / 0.22) * 0.6})`;
    ctx.fillRect(0, CY - (H * k) / 2, W, H * k);
    ctx.globalCompositeOperation = 'source-over';
  } else if (t < 0.45) {                  // строка стягивается в точку
    const w = W * (1 - (t - 0.22) / 0.23);
    ctx.fillStyle = 'rgba(157,255,192,.25)';          // ореол вместо shadowBlur
    ctx.fillRect(CX - w / 2, CY - 6, w, 12);
    ctx.fillStyle = '#e8fff0';
    ctx.fillRect(CX - w / 2, CY - 1.5, w, 3);
  } else if (t < 1.8) {                   // остаточное свечение точки
    const a = 1 - (t - 0.45) / 1.35;
    ctx.fillStyle = `rgba(157,255,192,${0.25 * a})`;
    ctx.beginPath(); ctx.arc(CX, CY, 3 + 9 * a, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(230,255,240,${a})`;
    ctx.beginPath(); ctx.arc(CX, CY, 1 + 2.5 * a, 0, Math.PI * 2); ctx.fill();
  }
}

function drawWarmup(bt) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  if (bt < 0.55) return;
  // ореол линии развёртки — полупрозрачная полоса вместо shadowBlur
  if (bt < 1.0) {                         // строка развёртки растягивается
    const p = (bt - 0.55) / 0.45, w = W * p * p;
    ctx.fillStyle = 'rgba(157,255,192,.2)';
    ctx.fillRect(CX - w / 2, CY - 5, w, 10);
    ctx.fillStyle = `rgba(220,255,235,${0.4 + 0.6 * p})`;
    ctx.fillRect(CX - w / 2, CY - 1, w, 2);
  } else {                                // и раскрывается по вертикали
    const p = c01((bt - 1.0) / 0.5), h = H * (1 - Math.pow(1 - p, 3));
    drawNoise(0.55, CY - h / 2, h);
    ctx.fillStyle = `rgba(157,255,192,${0.2 * (1 - p)})`;
    ctx.fillRect(0, CY - 5, W, 10);
    ctx.fillStyle = `rgba(220,255,235,${1 - p})`;
    ctx.fillRect(0, CY - 1, W, 2);
  }
}

export function renderScreen() {
  T = st.T;
  const pw = unitState('radar');      // общее питание + выключатель модуля
  if (pw.state === 'off') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); return; }
  if (pw.state === 'shutdown') { drawShutdown(pw.t); return; }
  const bt = pw.state === 'boot' ? pw.t : Infinity;
  if (bt < 1.5) { drawWarmup(bt); return; }
  const rv = bt === Infinity ? FULL : reveal(bt);

  cam.C = vec(cam.lat, cam.lon);
  ({ E: cam.E, N: cam.N } = basis(cam.lat, cam.lon));
  warpK = 0.07 + 0.09 * st.speed;

  // послесвечение люминофора: при движении шлейф длиннее
  ctx.fillStyle = `rgba(1,9,5,${0.62 - 0.36 * st.speed})`;
  ctx.fillRect(0, 0, W, H);

  drawGrid(rv);
  drawStars(rv);
  drawSignals(rv);
  if (rv.radars) {
    drawTriangle();
    drawRadars();
    drawReticle();
  }
  if (rv.sweep >= 1) {
    for (const s of st.signals) if (!s.captured && !s.hidden) drawEdgeArrow(s.v, '#6ee6ff', `${angDist(s.v, vec(ret.lat, ret.lon)).toFixed(0)}°`);
    radars.forEach((r, i) => drawEdgeArrow(r.v, '#ffb43c', `R${i + 1}`));
  }

  if (bt === Infinity) {
    drawHud();
    if (st.ping) {                        // волна пинга — то же кольцо, что ищет сигналы при запуске
      const k = st.ping.t / CFG.pingTime;
      ctx.strokeStyle = `rgba(110,230,255,${0.8 * (1 - k * 0.5)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, CY, pingR(), 0, Math.PI * 2); ctx.stroke();
    }
  } else {
    if (rv.sweep > 0 && rv.sweep < 1) {   // кольцо поиска сигналов
      ctx.strokeStyle = `rgba(110,230,255,${0.8 * (1 - rv.sweep * 0.5)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, CY, rv.sweep * SWEEP_R, 0, Math.PI * 2); ctx.stroke();
    }
    drawBootText(bt, rv);
    if (rv.noise > 0) drawNoise(rv.noise * 0.45);
    if (rv.bright < 1) {
      ctx.fillStyle = `rgba(0,0,0,${(1 - rv.bright) * 0.75})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}
