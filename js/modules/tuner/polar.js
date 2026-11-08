// ================= Поляриметр: круглый кинескоп =================
// Луч от центра к краю, повёрнутый на угол полярности (0° — вверх, по часовой).
// Чем хуже настройка, тем сильнее луч «дрожит».
import { D2R } from '../../core/math.js';

const GLYPH = ['α', 'β', 'ω'];

export function createPolar(canvas) {
  const g = canvas.getContext('2d');
  const W = canvas.width, C = W / 2, R = W / 2 - 14;

  function scale() {
    g.strokeStyle = 'rgba(120,255,170,.14)';
    g.lineWidth = 1;
    for (const k of [0.33, 0.66, 1]) { g.beginPath(); g.arc(C, C, R * k, 0, Math.PI * 2); g.stroke(); }
    g.beginPath();
    for (let a = 0; a < 360; a += 15) {
      const r0 = a % 90 ? R - 6 : R - 14, s = Math.sin(a * D2R), c = -Math.cos(a * D2R);
      g.moveTo(C + s * r0, C + c * r0); g.lineTo(C + s * R, C + c * R);
    }
    g.stroke();
    g.font = '13px VT323, "Courier New", monospace';
    g.fillStyle = 'rgba(140,255,180,.3)';
    g.textAlign = 'center';
    [[0, '0'], [90, '90'], [180, '180'], [270, '270']].forEach(([a, t]) => {
      const s = Math.sin(a * D2R), c = -Math.cos(a * D2R);
      g.fillText(t, C + s * (R - 24), C + c * (R - 24) + 4);
    });
    g.textAlign = 'left';
  }

  // st: { live, locked, pol (градусы), polC, polType, polOk }
  function draw(dt, st) {
    if (!st.live) { g.fillStyle = '#000'; g.fillRect(0, 0, W, W); return; }
    g.fillStyle = 'rgba(1,9,5,.35)';
    g.fillRect(0, 0, W, W);
    scale();

    const wobble = st.locked ? (1 - st.polC) * 36 + (st.polOk ? 0 : 10) : 4;
    const a = (st.pol + (Math.random() - 0.5) * wobble) * D2R;
    const s = Math.sin(a), c = -Math.cos(a);
    g.strokeStyle = st.locked ? '#c4ffd8' : 'rgba(160,255,200,.45)';
    const col = g.strokeStyle, tx = C + s * R, ty = C + c * R;
    g.beginPath(); g.moveTo(C, C); g.lineTo(tx, ty);
    g.strokeStyle = `rgba(93,255,154,${st.locked ? 0.26 : 0.14})`;   // свечение — широкий проход вместо shadowBlur
    g.lineWidth = st.locked ? 8 : 5;
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = col;
    g.beginPath(); g.arc(tx, ty, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(C, C, 2.5, 0, Math.PI * 2); g.fill();

    g.font = '21px VT323, "Courier New", monospace';
    g.fillStyle = 'rgba(160,255,200,.6)';
    g.textAlign = 'center';
    g.fillText(GLYPH[st.polType], C + R * 0.5, C + R * 0.56);
    g.textAlign = 'left';
  }

  return { draw };
}
