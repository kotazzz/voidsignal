// ================= Выходной кинескоп панели обработки =================
// Рамка, заголовок и служебные состояния; содержимое рисует выбранная интерпретация.
import { formats } from '../../signal/formats/index.js';

const FPS = 10;
const INK = 'rgba(160,255,200,.55)';

export function createView(canvas) {
  const g = canvas.getContext('2d');
  let W = canvas.width, H = canvas.height, acc = 1;
  const fit = () => {
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = canvas.width = Math.round(r.width);
    H = canvas.height = Math.round(r.height);
    acc = 1;
  };
  new ResizeObserver(fit).observe(canvas.parentElement);
  fit();

  function centered(text, sub) {
    g.textAlign = 'center';
    g.fillStyle = INK;
    g.font = '17px VT323, "Courier New", monospace';
    g.fillText(text, W / 2, H / 2);
    if (sub) { g.font = '14px VT323, "Courier New", monospace'; g.fillText(sub, W / 2, H / 2 + 20); }
    g.textAlign = 'left';
  }

  function statik(level) {
    const step = 4;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      g.fillStyle = `rgba(168,255,200,${Math.random() * level})`;
      g.fillRect(x, y, step, step);
    }
  }

  // st: { live, notice?, empty, id, fi, content, L, seed, t, playhead, meaning }
  function draw(dt, st) {
    acc += dt;
    if (acc < 1 / FPS) return;
    acc = 0;
    if (!st.live) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    g.fillStyle = '#010905';
    g.fillRect(0, 0, W, H);
    if (st.notice) { statik(0.06); centered(st.notice[0], st.notice[1]); return; }
    if (st.empty) { statik(0.06); centered('ПАМЯТЬ ПУСТА', 'ВСТАВЬТЕ НАКОПИТЕЛЬ И НАЖМИТЕ КНОПКУ ОБМЕНА'); return; }

    const f = formats[st.fi];
    g.font = '15px VT323, "Courier New", monospace';
    g.fillStyle = INK;
    g.fillText(`${st.id}  ·  ${f.name.toUpperCase()}`, 24, 24);
    g.textAlign = 'right';
    g.fillText(`УРОВЕНЬ ${st.L.k}`, W - 24, 24);
    g.textAlign = 'left';
    if (st.L.decode <= 0) { statik(0.18); centered('ОЖИДАНИЕ ДЕКОДИНГА'); return; }

    const box = { x: 24, y: 40, w: W - 48, h: H - 76 };
    f.render(g, box, st);

    if (st.meaning) {
      g.font = 'bold 15px VT323, "Courier New", monospace';
      g.fillStyle = '#d8ffe6';
      g.fillText(`ОПОЗНАНО: ${st.meaning}`, 24, H - 14);
    }
  }

  return { draw };
}
