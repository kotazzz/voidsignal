// ================= Терминал массива =================
// ASCII-таблицы на кинескопе: мониторинг, диагностика, калибровка, ремонт сервера.
import { dishes } from '../../core/dishes.js';

const INK = 'rgba(160,255,200,.8)', DIM = 'rgba(160,255,200,.38)', WARN = '#ffd23c', BAD = '#ff6a50', HI = '#d8ffe6';
const bar = (v, n = 10) => `[${'#'.repeat(Math.round(v * n)).padEnd(n, '-')}]`;
const pct = v => `${Math.round(v * 100)}%`.padStart(4, ' ');

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

  let fs = 13, lh = 18;
  const font = (px, bold) => { g.font = `${bold ? 'bold ' : ''}${px + 3}px VT323, "Courier New", monospace`; };
  const text = (s, x, y, color = INK) => { g.fillStyle = color; g.fillText(s, x, y); };
  const header = (title, right) => {
    font(fs + 1, true);
    text(title, 24, 30, HI);
    g.textAlign = 'right'; font(fs); text(right || '', W - 24, 30, DIM); g.textAlign = 'left';
    g.fillStyle = DIM; g.fillRect(24, 38, W - 48, 1);
  };
  const colorOf = (d, up, p) => (!up ? BAD : p < 0.6 ? WARN : INK);

  // ---- мониторинг: таблица по последним опрошенным значениям
  function monitor(st) {
    header('МОНИТОРИНГ МАССИВА', `ОПРОС ${dishes[st.scan].letter}`);
    font(fs);
    const rowsN = 13, colW = (W - 48) / 2, top = 64;
    dishes.forEach((d, i) => {
      const col = i < rowsN ? 0 : 1, row = i % rowsN, x = 24 + col * colW, y = top + row * lh;
      const p = st.polled[i];
      const line = `${d.letter} ${d.name.slice(0, 10).toUpperCase().padEnd(10)} ${p.up ? bar(p.prec) + pct(p.prec) : ' СЕРВЕР НЕ ОТВЕЧАЕТ'.padEnd(15)}`;
      text((i === st.scan ? '>' : ' ') + line, x - 8, y, colorOf(d, p.up, p.prec));
    });
    const avg = st.polled.reduce((s, p) => s + (p.up ? p.prec : 0), 0) / dishes.length;
    text(`СРЕДНЯЯ ТОЧНОСТЬ ${pct(avg)}   СЕРВЕРЫ ВНЕ СЕТИ: ${st.polled.filter(p => !p.up).length}`, 24, H - 24, avg < 0.7 ? WARN : INK);
  }

  // ---- диагностика выбранного телескопа
  function diagnostics(st) {
    const d = dishes[st.sel];
    header(`ДИАГНОСТИКА · ${d.letter} ${d.name.toUpperCase()}`, st.op?.kind === 'diag' ? 'ВЫПОЛНЯЕТСЯ' : '');
    font(fs + 1);
    if (st.op?.kind === 'diag' && st.op.dish === st.sel) {
      text('СБОР ДАННЫХ…', 24, 80);
      text(bar(st.op.t / st.op.dur, 30), 24, 104);
      return;
    }
    if (!st.diag || st.diag.dish !== st.sel) {
      text('ДАННЫЕ ОТСУТСТВУЮТ', 24, 80, DIM);
      text('ВЫБЕРИТЕ ТЕЛЕСКОП И ЗАПУСТИТЕ ДИАГНОСТИКУ', 24, 104, DIM);
      return;
    }
    st.diag.lines.forEach(([k, v, color], i) => {
      text(k.padEnd(24, '.'), 24, 74 + i * (lh + 4));
      text(String(v), 24 + 26 * (fs + 1) * 0.6, 74 + i * (lh + 4), color || HI);
    });
    font(fs - 1); text(`СНЯТО ${st.diag.ago} С НАЗАД`, 24, H - 24, DIM);
  }

  // ---- калибровка
  function calibration(st) {
    const op = st.op && (st.op.kind === 'cal' || st.op.kind === 'calAll') ? st.op : null;
    header(op ? `КАЛИБРОВКА · ${dishes[op.dish].letter} ${dishes[op.dish].name.toUpperCase()}` : `КАЛИБРОВКА · ${dishes[st.sel].letter} ${dishes[st.sel].name.toUpperCase()}`, op?.kind === 'calAll' ? `ОЧЕРЕДЬ ${op.queue.length}` : '');
    font(fs + 1);
    if (!op) {
      const d = dishes[st.sel];
      text(`ТОЧНОСТЬ ${bar(d.prec, 20)} ${pct(d.prec)}`, 24, 80, d.prec < 0.6 ? WARN : INK);
      text(d.up ? 'НАЖМИТЕ «КАЛИБРОВАТЬ»' : 'СЕРВЕР НЕ РАБОТАЕТ: КАЛИБРОВКА НЕВОЗМОЖНА', 24, 112, d.up ? DIM : BAD);
      return;
    }
    const d = dishes[op.dish];
    text(`ТОЧНОСТЬ ${bar(d.prec, 20)} ${pct(d.prec)}`, 24, 80, INK);
    op.stages.forEach((s, i) => {
      const state = i < op.stage ? 'OK ' : i === op.stage ? '>> ' : '   ';
      text(`${state}${s.name.padEnd(22)}${i < op.stage ? bar(1, 12) : i === op.stage ? bar(op.sp, 12) : bar(0, 12)}`, 24, 124 + i * (lh + 6), i === op.stage ? HI : i < op.stage ? INK : DIM);
    });
  }

  // ---- ремонт сервера: повторить последовательность стрелок
  function repair(st) {
    const d = dishes[st.sel];
    header(`РЕМОНТ СЕРВЕРА · ${d.letter} ${d.name.toUpperCase()}`, st.record ? `РЕКОРД ${st.record.toFixed(1)} С` : '');
    font(fs + 1);
    const op = st.op?.kind === 'repair' ? st.op : null;
    if (!op) {
      text(d.up ? 'СЕРВЕР В НОРМЕ' : 'СЕРВЕР НЕ ОТВЕЧАЕТ', 24, 80, d.up ? INK : BAD);
      if (!d.up) text('НАЖМИТЕ «РЕМОНТ» И ПОВТОРИТЕ ПОСЛЕДОВАТЕЛЬНОСТЬ КРЕСТОВИНОЙ', 24, 108, DIM);
      return;
    }
    const arrows = { up: '↑', down: '↓', left: '←', right: '→' };
    text(`ВРЕМЯ ${op.t.toFixed(1)} С   ОСТАЛОСЬ ${Math.max(0, op.limit - op.t).toFixed(0)} С`, 24, 80);
    font(30, true);
    op.seq.forEach((dir, i) => text(arrows[dir], 24 + i * 52, 150, i < op.pos ? DIM : i === op.pos ? HI : INK));
    font(fs + 1);
    text(`${'■'.repeat(op.pos)}${'□'.repeat(op.seq.length - op.pos)}  ОШИБОК: ${op.errors}`, 24, 190);
  }

  return {
    draw(st) {
      acc += 1 / 60;
      g.fillStyle = '#010905';
      g.fillRect(0, 0, W, H);
      if (!st.live) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
      fs = Math.max(11, Math.min(17, Math.floor(W / 38)));
      lh = st.mode === 0 ? Math.min(36, Math.max(Math.round(fs * 1.45), Math.floor((H - 110) / 13))) : Math.round(fs * 1.45);
      font(fs);
      [monitor, diagnostics, calibration, repair][st.mode](st);
    },
  };
}
