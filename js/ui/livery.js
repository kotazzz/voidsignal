// ================= Лакокрасочная полоса на корпусе =================
// Пять приглушённых полос краски идут вдоль верхней части корпуса, ломаются на 45° вниз
// и снова на 45° вправо. Геометрия пересчитывается по ширине консоли.
const COLORS = ['#a8433a', '#b87a35', '#b5a043', '#5b8456', '#47709a'];
const PITCH = 13;           // толщина одной полосы
const TOP = 58;             // верхняя кромка первой полосы
const DROP = 56;            // на сколько уходит вниз
const NS = 'http://www.w3.org/2000/svg';
const K = Math.SQRT2 - 1;   // сдвиг угла излома у параллельных линий при 45°

export function initLivery(consoleEl) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'livery');
  svg.setAttribute('aria-hidden', 'true');
  consoleEl.prepend(svg);

  const draw = () => {
    const w = consoleEl.clientWidth, h = TOP + PITCH * COLORS.length + DROP + 4;
    const bend = w * 0.56;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.innerHTML = COLORS.map((c, i) => {
      const d = i * PITCH, y = TOP + PITCH / 2 + d;
      const pts = [[-4, y], [bend - K * d, y], [bend + DROP - K * d, y + DROP], [w + 4, y + DROP]];
      return `<polyline points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${PITCH}" stroke-linejoin="miter"/>`;
    }).join('');
  };
  draw();
  new ResizeObserver(draw).observe(consoleEl);
}
