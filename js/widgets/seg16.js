// ================= 16-сегментные индикаторы =================
const SEG16 = {
  a1: [5, 3, 13.5, 3], a2: [16.5, 3, 25, 3], b: [27, 5, 27, 23], c: [27, 27, 27, 45],
  d1: [5, 47, 13.5, 47], d2: [16.5, 47, 25, 47], e: [3, 27, 3, 45], f: [3, 5, 3, 23],
  g1: [5, 25, 13.5, 25], g2: [16.5, 25, 25, 25], h: [5.5, 6, 12.8, 21.5], i: [15, 5.5, 15, 22.5],
  j: [24.5, 6, 17.2, 21.5], k: [12.8, 28.5, 5.5, 44], l: [15, 27.5, 15, 44.5], m: [17.2, 28.5, 24.5, 44],
  p: [28, 47, 28, 47.4], q1: [15, 14, 15, 14.4], q2: [15, 35, 15, 35.4],     // точка и двоеточие
};
const FONT16 = {
  0: 'a1 a2 b c d1 d2 e f j k', 1: 'b c j', 2: 'a1 a2 b g1 g2 e d1 d2', 3: 'a1 a2 b c d1 d2 g2',
  4: 'f g1 g2 b c', 5: 'a1 a2 f g1 g2 c d1 d2', 6: 'a1 a2 f e d1 d2 c g1 g2', 7: 'a1 a2 b c',
  8: 'a1 a2 b c d1 d2 e f g1 g2', 9: 'a1 a2 b c d1 d2 f g1 g2',
  A: 'a1 a2 b c e f g1 g2', B: 'a1 a2 b c d1 d2 g2 i l', C: 'a1 a2 f e d1 d2', D: 'a1 a2 b c d1 d2 i l',
  E: 'a1 a2 f e d1 d2 g1', F: 'a1 a2 f e g1', G: 'a1 a2 f e d1 d2 c g2', H: 'f e b c g1 g2',
  I: 'a1 a2 i l d1 d2', K: 'f e g1 j m', L: 'f e d1 d2', M: 'f e b c h j',
  N: 'f e b c h m', O: 'a1 a2 b c d1 d2 e f', P: 'a1 a2 b f e g1 g2', R: 'a1 a2 b f e g1 g2 m',
  S: 'a1 a2 f g1 g2 c d1 d2', T: 'a1 a2 i l', U: 'f e d1 d2 c b', V: 'f e k j', W: 'f e b c k m',
  X: 'h j k m', Y: 'h j l', Z: 'a1 a2 j k d1 d2',
  J: 'b c d1 d2 e', Q: 'a1 a2 b c d1 d2 e f m',
  // кириллица (где буква не похожа на латинскую — приближение)
  А: 'a1 a2 b c e f g1 g2', Б: 'a1 a2 f e g1 g2 c d1 d2', В: 'a1 a2 b c d1 d2 g2 i l', Г: 'a1 a2 f e',
  Д: 'a1 a2 b c d1 d2 e', Е: 'a1 a2 f e d1 d2 g1', Ё: 'a1 a2 f e d1 d2 g1', Ж: 'g1 g2 h i j k l m',
  З: 'a1 a2 b c d1 d2 g2', И: 'f e b c j k', Й: 'f e b c j k', К: 'f e g1 j m',
  Л: 'a1 a2 b c k', М: 'f e b c h j', Н: 'f e b c g1 g2', О: 'a1 a2 b c d1 d2 e f',
  П: 'a1 a2 b c e f', Р: 'a1 a2 b f e g1 g2', С: 'a1 a2 f e d1 d2', Т: 'a1 a2 i l',
  У: 'h j l', Ф: 'f e b c g1 g2 i l', Х: 'h j k m', Ц: 'f e d1 d2 c b p',
  Ч: 'f g1 g2 b c', Ш: 'f e b c d1 d2 i l', Щ: 'f e b c d1 d2 i l p', Ъ: 'a1 i l g2 c d2',
  Ь: 'f e g1 g2 c d1 d2', Э: 'a1 a2 b c d1 d2 g2', Ю: 'f e g1 a2 b c d2',
  Я: 'a1 a2 b f g1 g2 c k',
  '.': 'p', ',': 'p', ':': 'q1 q2', '/': 'j k', '(': 'j m', ')': 'h k', '[': 'a1 f e d1', ']': 'a2 b c d2',
  '+': 'g1 g2 i l', '|': 'i l', '=': 'd1 d2 g1 g2', '→': 'g1 g2 h k', '—': 'g1 g2', '«': 'j m', '»': 'h k',
  '-': 'g1 g2', '_': 'd1 d2', '?': 'a1 a2 b g2 l', '>': 'h k', '<': 'j m', '*': 'g1 g2 h i j k l m', ' ': '',
};
const SVGNS = 'http://www.w3.org/2000/svg';

export function makeAlnum(el, n) {
  const chars = [];
  for (let c = 0; c < n; c++) {
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 30 50');
    const segs = {};
    for (const [name, [x1, y1, x2, y2]] of Object.entries(SEG16)) {
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
      ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      svg.appendChild(ln); segs[name] = ln;
    }
    el.appendChild(svg); chars.push(segs);
  }
  return { chars, last: null };
}

export function setAlnum(disp, str) {
  str = str.replace(/Ы/g, 'Ь|');                     // «ы» = «ь» + «|»
  if (disp.last === str) return;
  disp.last = str;
  disp.chars.forEach((segs, i) => {
    const on = (FONT16[str[i]] ?? '').split(' ');
    for (const k in segs) segs[k].classList.toggle('on', on.includes(k));
  });
}
