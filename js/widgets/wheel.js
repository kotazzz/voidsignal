// ================= Колесо мыши → дискретные шаги =================
// Накопление до порога и пауза между шагами: один жест колеса (или инерция трекпада)
// даёт один шаг, а не десяток.
export function onWheelStep(el, { threshold = 90, gap = 260, onStep }) {
  let acc = 0, lastStep = 0, lastEvent = 0;
  el.addEventListener('wheel', e => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastEvent > 220) acc = 0;           // новый жест
    lastEvent = now;
    acc += e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1);
    if (Math.abs(acc) < threshold) return;
    const dir = acc < 0 ? 1 : -1;
    acc = 0;
    if (now - lastStep < gap) return;             // инерция: шаг уже сделан
    lastStep = now;
    onStep(dir);
  }, { passive: false });
}
