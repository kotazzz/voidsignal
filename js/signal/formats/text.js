// ================= Интерпретация: текст =================
// Пойманные сообщения захардкожены. Шифр — сдвиг по алфавиту: пробелы и длина слов видны
// и до дешифрования, поэтому структура текста угадывается раньше смысла.
import { createRng } from '../../core/math.js';
import { hash, at } from '../pipeline.js';

const MESSAGES = [
  { title: 'МАЯК', text: 'ЭТО МАЯК ПОСЛЕДНЕЙ СТАНЦИИ. МЫ ЖДАЛИ ОТВЕТА ЧЕТЫРЕ ТЫСЯЧИ ЦИКЛОВ. ЕСЛИ ВЫ СЛЫШИТЕ ЭТО — МЫ БЫЛИ ЗДЕСЬ. МЫ БЫЛИ ЗДЕСЬ. МЫ БЫЛИ ЗДЕСЬ.' },
  { title: 'СИГНАЛ БЕДСТВИЯ', text: 'КООРДИНАТЫ ВЕРНЫ. ГРУЗ НЕ ДОСТАВЛЕН. ЭКИПАЖ В АНАБИОЗЕ, ШЕСТЬ КАПСУЛ ИЗ ДВЕНАДЦАТИ. ОРБИТА ДЕГРАДИРУЕТ. ПОВТОРЯЮ: ОРБИТА ДЕГРАДИРУЕТ.' },
  { title: 'ПРЕДУПРЕЖДЕНИЕ', text: 'НЕ ОТВЕЧАЙТЕ НА ЭТОТ СИГНАЛ. ОНИ СЛУШАЮТ ТЕХ, КТО ОТВЕЧАЕТ. ВЫКЛЮЧИТЕ ПЕРЕДАТЧИКИ. ЭТО СООБЩЕНИЕ БУДЕТ ПОВТОРЯТЬСЯ, ПОКА У НАС ЕСТЬ ЭНЕРГИЯ.' },
  { title: 'ЖУРНАЛ ЭКСПЕДИЦИИ', text: 'ЖУРНАЛ 0417. ТРЕТЬЯ ЛУНА ПОГАСЛА. ПРИБОРЫ ФИКСИРУЮТ РЕГУЛЯРНЫЙ ИМПУЛЬС ИЗ-ПОД ЛЬДА. ПЕРИОД — СОРОК ДВЕ СЕКУНДЫ. БУРИМ ДАЛЬШЕ.' },
  { title: 'ПРИВЕТСТВИЕ', text: 'ПРИВЕТСТВУЕМ. МЫ ПОСЫЛАЕМ ЭТО ВСЕМ, КТО УМЕЕТ СЧИТАТЬ. 1. 1. 2. 3. 5. 8. 13. 21. ЕСЛИ ВЫ ПОНЯЛИ — ПРОДОЛЖИТЕ РЯД НА ЧАСТОТЕ ВОДОРОДА.' },
  { title: 'ТЕЛЕМЕТРИЯ ЗОНДА', text: 'АВТОМАТИЧЕСКИЙ ЗОНД К-7. ЭНЕРГИЯ 3 %. ОБРАЗЦЫ СОБРАНЫ: 14. ПУТИ ДОМОЙ НЕТ. ПЕРЕДАЮ ДАННЫЕ ДО ПОЛНОГО РАЗРЯДА. КОНЕЦ СВЯЗИ.' },
  { title: 'КОЛЫБЕЛЬНАЯ', text: 'СПИ, МАЛЕНЬКИЙ КОРАБЛЬ. ЗВЁЗДЫ ГОРЯТ ДЛЯ ТЕБЯ. КОГДА ТЫ ПРОСНЁШЬСЯ, МЫ УЖЕ БУДЕМ ДОМА. СПИ. СПИ. СПИ.' },
  { title: 'ОБРЫВОК ПЕРЕГОВОРОВ', text: '...ПОВТОРИТЕ ПОСЛЕДНЕЕ. ВИЖУ ЕГО. ОНО БОЛЬШЕ, ЧЕМ МЫ ДУМАЛИ. ОНО НЕ ДВИЖЕТСЯ. ОНО СМОТРИТ НА... [ПЕРЕДАЧА ПРЕРВАНА]' },
];
const ALPHA = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789';
export const GLYPHS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789#%&@*+=<>/\\|';

const cipher = (ch, k) => {
  const i = ALPHA.indexOf(ch);
  return i < 0 ? ch : ALPHA[(i + k) % ALPHA.length];
};

export default {
  id: 'TXT',
  name: 'Текст',
  audio: false,

  make(seed) { return MESSAGES[seed % MESSAGES.length]; },

  junk(seed) {
    const r = createRng(seed ^ 0x77);
    let text = '';
    while (text.length < 160) {
      const run = GLYPHS[Math.floor(r() * GLYPHS.length)];
      text += r() < 0.3 ? run.repeat(2 + Math.floor(r() * 4)) : GLYPHS[Math.floor(r() * GLYPHS.length)];
    }
    return { title: null, text };
  },

  process(c, L, seed, t) {
    const n = c.text.length, frame = Math.floor(t * 6), key = 3 + (seed % 20);
    const chars = [];
    for (let i = 0; i < n; i++) {
      const p = at(L, i / n);
      if (!p.decoded) break;
      let ch = c.text[i], hot = false;
      if (hash(Math.floor(i / 6), seed ^ 9) < p.scramble) ch = cipher(ch, key);   // шифруется группами по 6 знаков
      if (hash(i, seed ^ 2) < p.err * 1.6 && ch !== ' ') { ch = GLYPHS[Math.floor(hash(i, seed ^ 3) * GLYPHS.length)]; hot = true; }
      if (hash(i, frame ^ seed) < p.noise * 0.25) { ch = GLYPHS[Math.floor(hash(i, frame) * GLYPHS.length)]; hot = true; }
      chars.push({ ch, hot });
    }
    return chars;
  },

  render(g, box, ctx) {
    const chars = this.process(ctx.content, ctx.L, ctx.seed, ctx.t);
    const fs = Math.max(13, Math.min(22, Math.floor(box.w / 30))), cw = fs * 0.62, lh = fs * 1.55;
    const cols = Math.max(10, Math.floor(box.w / cw));
    g.font = `${fs}px "Courier New", monospace`;
    g.textBaseline = 'top';
    // перенос по словам
    let col = 0, row = 0;
    const wordLen = i => { let k = i; while (k < chars.length && chars[k].ch !== ' ') k++; return k - i; };
    for (let i = 0; i < chars.length; i++) {
      if (chars[i].ch === ' ') { col++; if (col >= cols) { col = 0; row++; } continue; }
      if (col > 0 && (i === 0 || chars[i - 1].ch === ' ') && col + wordLen(i) > cols) { col = 0; row++; }
      g.fillStyle = chars[i].hot ? 'rgba(168,255,200,.45)' : '#b4ffcf';
      g.fillText(chars[i].ch, box.x + col * cw, box.y + row * lh);
      col++;
    }
    if (ctx.L.decode < 1 && Math.floor(ctx.t * 3) % 2) { g.fillStyle = '#b4ffcf'; g.fillText('_', box.x + col * cw, box.y + row * lh); }
  },

  meaning: c => (c.title ? `СООБЩЕНИЕ: ${c.title}` : null),

  async exportFile(c, L, seed) {
    const s = this.process(c, L, seed, 0).map(x => x.ch).join('');
    return { blob: new Blob([s + '\n'], { type: 'text/plain;charset=utf-8' }), ext: 'txt' };
  },
};
