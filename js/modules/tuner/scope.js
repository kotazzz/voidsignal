// ================= Осциллограф =================
// Показывает сигнал гетеродина приёмника. При расстройке по частоте осциллограмма «плывёт»
// (биения), неверная форма даёт искажения, низкая точность — шум.
import { clamp } from '../../core/math.js';

const SHAPES = [
  ph => Math.sin(ph * Math.PI * 2),                       // синус
  ph => 2 * (ph - Math.floor(ph + 0.5)),                  // пила
  ph => (ph - Math.floor(ph) < 0.5 ? 0.85 : -0.85),       // прямоугольник
];

export function createScope(canvas) {
  const g = canvas.getContext('2d');
  let W = canvas.width, H = canvas.height, CY = H / 2;
  // разрешение холста следует за размером ячейки
  const fit = () => {
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = canvas.width = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    CY = H / 2;
  };
  new ResizeObserver(fit).observe(canvas.parentElement);
  fit();
  let phase = 0;

  function graticule() {
    g.strokeStyle = 'rgba(120,255,170,.10)';
    g.lineWidth = 1;
    g.beginPath();
    for (let i = 1; i < 10; i++) { const x = (W / 10) * i + 0.5; g.moveTo(x, 0); g.lineTo(x, H); }
    for (let i = 1; i < 6; i++) { const y = (H / 6) * i + 0.5; g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    g.strokeStyle = 'rgba(120,255,170,.22)';
    g.beginPath(); g.moveTo(0, CY + 0.5); g.lineTo(W, CY + 0.5); g.moveTo(W / 2 + 0.5, 0); g.lineTo(W / 2 + 0.5, H); g.stroke();
  }

  // st: { live, locked, wave, freq, drift, freqC, waveOk, t }
  function draw(dt, st) {
    if (!st.live) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    g.fillStyle = 'rgba(1,9,5,.5)';                       // послесвечение
    g.fillRect(0, 0, W, H);
    graticule();

    const cycles = 1.2 + (st.freq / 1000) * 1.1;
    let amp = 0, noise = 0.06, distort = 0;
    if (st.locked) {
      phase += st.drift * dt;
      amp = 0.62;
      noise = 0.04 + (1 - st.freqC) * 0.5;
      distort = st.waveOk ? 0 : 0.42;
    }
    const shape = SHAPES[st.wave];
    g.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const ph = (x / W) * cycles + phase;
      let y = shape(ph) * amp;
      if (distort) y = y * (1 - distort) + distort * Math.sin(ph * 7.3 + st.t * 9) * Math.sin(ph * 2.1 - st.t * 3);
      y += (Math.random() - 0.5) * noise * 2;
      const py = CY - clamp(y, -1.1, 1.1) * (H * 0.4);
      if (x === 0) g.moveTo(x, py); else g.lineTo(x, py);
    }
    g.strokeStyle = 'rgba(93,255,154,.22)';   // свечение — широкий полупрозрачный проход вместо shadowBlur
    g.lineWidth = 5;
    g.stroke();
    g.strokeStyle = '#a8ffc8';
    g.lineWidth = 1.6;
    g.stroke();

    g.font = '15px VT323, "Courier New", monospace';
    g.fillStyle = 'rgba(160,255,200,.55)';
    g.fillText(`CH1 ${String(st.freq).padStart(4, '0')} Hz`, 10, 18);
    g.textAlign = 'right';
    g.fillText(st.locked ? (Math.abs(st.drift) < 0.05 ? 'SYNC' : 'BEAT') : 'NO CARRIER', W - 10, 18);
    g.textAlign = 'left';
  }

  return { draw };
}
