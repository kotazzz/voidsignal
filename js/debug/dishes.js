// Отладка: массив телескопов и трансформаторы
import { degradeAll, downRandomServer, repairAll, dishes } from '../core/dishes.js';
import { trans } from '../core/transformers.js';
import { log } from '../core/clock.js';

const ACTIONS = [
  ['Быстрая деградация −20%', () => { degradeAll(0.2); log('DEBUG: ТОЧНОСТЬ ТЕЛЕСКОПОВ УПАЛА'); }],
  ['Деградация до ~40%', () => { degradeAll(0.6); log('DEBUG: ТЕЛЕСКОПЫ СИЛЬНО ДЕГРАДИРОВАЛИ'); }],
  ['Уронить случайный сервер', () => { const d = downRandomServer(); log(d ? `DEBUG: СЕРВЕР ТЕЛЕСКОПА ${d.letter} ОТКАЗАЛ` : 'DEBUG: ВСЕ СЕРВЕРЫ УЖЕ ВНЕ СЕТИ'); }],
  ['Починить всё', () => { repairAll(); log('DEBUG: ТЕЛЕСКОПЫ ИСПРАВНЫ'); }],
  ['Трансформаторы до 5%', () => { trans.forEach(t => { if (!t.down) t.level = Math.min(t.level, 0.05); }); log('DEBUG: ТРАНСФОРМАТОРЫ РАЗРЯЖАЮТСЯ'); }],
];

export default {
  title: 'Телескопы и трансформаторы',
  render(el) {
    el.classList.add('dbg-chips');
    ACTIONS.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.className = 'dbg-btn';
      b.textContent = label;
      b.addEventListener('click', fn);
      el.appendChild(b);
    });
    const note = document.createElement('div');
    note.className = 'dbg-note';
    el.appendChild(note);
    this.refresh = () => { note.textContent = `Средняя точность: ${Math.round(dishes.reduce((s, d) => s + d.prec, 0) / dishes.length * 100)}% · серверов вне сети: ${dishes.filter(d => !d.up).length}`; };
    this.refresh();
  },
};
