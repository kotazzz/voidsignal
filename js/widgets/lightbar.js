// ================= Светофорная шкала =================
// Сегменты слева направо (снизу вверх для вертикальной): красный → жёлтый → зелёный.
export function createLightBar(el, n, { vertical = false } = {}) {
  el.classList.add('lbar');
  el.classList.toggle('vert', vertical);
  const segs = Array.from({ length: n }, (_, i) => {
    const s = document.createElement('span');
    const f = i / n;
    s.className = `lbar-seg ${f < 0.4 ? 'red' : f < 0.7 ? 'yel' : 'grn'}`;
    el.appendChild(s);
    return s;
  });
  let last = -1;
  return {
    set(frac) {
      const k = Math.round(Math.max(0, Math.min(1, frac)) * n);
      if (k === last) return;
      last = k;
      segs.forEach((s, i) => s.classList.toggle('on', i < k));
    },
  };
}
