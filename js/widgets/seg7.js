// ================= 7-сегментные индикаторы =================
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', '_': 'd', ' ': '' };

export function makeDisplay(el, n) {
  const digits = [];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'seg-digit';
    d.segs = {};
    for (const c of 'abcdefg') {
      const s = document.createElement('span');
      s.className = `seg s-${c}`;
      d.appendChild(s); d.segs[c] = s;
    }
    d.dp = document.createElement('span');
    d.dp.className = 'dp';
    d.appendChild(d.dp);
    el.appendChild(d); digits.push(d);
  }
  return { digits, last: null };
}

// '.' зажигает точку предыдущего разряда; dpMask — индексы разрядов с принудительной точкой
export function setDisplay(disp, str, dpMask = null) {
  const key = dpMask ? `${str}|${dpMask}` : str;
  if (disp.last === key) return;
  disp.last = key;
  const cells = [];
  for (const ch of str) {
    if (ch === '.' && cells.length) cells[cells.length - 1].dp = true;
    else cells.push({ ch, dp: false });
  }
  disp.digits.forEach((d, i) => {
    const c = cells[i] || { ch: ' ', dp: false }, on = SEG[c.ch] || '';
    for (const k in d.segs) d.segs[k].classList.toggle('on', on.includes(k));
    d.dp.classList.toggle('on', c.dp || (dpMask !== null && dpMask.includes(i)));
  });
}
