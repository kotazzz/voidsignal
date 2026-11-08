// ================= Четыре кнопки проигрывателя =================
// Реверс, промотка, плей, стоп — кнопки с фиксацией, как на магнитофоне.
import { click, buzz } from '../core/audio.js';
import { MODES } from '../signal/player.js';

const ICONS = {
  rew: '<svg viewBox="0 0 24 16"><path d="M12 2 L12 14 L3 8 Z M22 2 L22 14 L13 8 Z"/></svg>',
  ff: '<svg viewBox="0 0 24 16"><path d="M2 2 L2 14 L11 8 Z M12 2 L12 14 L21 8 Z"/></svg>',
  play: '<svg viewBox="0 0 24 16"><path d="M7 1 L7 15 L19 8 Z"/></svg>',
  stop: '<svg viewBox="0 0 24 16"><path d="M6 2 H18 V14 H6 Z"/></svg>',
};
const TITLES = { rew: 'Реверс (перемотка назад)', ff: 'Промотка вперёд', play: 'Воспроизведение', stop: 'Стоп (повторно — в начало)' };

// onPress(mode) → bool: транспорт принял команду (false — отказ, кнопка не залипает)
export function createTransportButtons(el, { onPress }) {
  el.classList.add('latch-group', 'transport');
  el.innerHTML = MODES.map(m => `<button class="latch tp-${m}" title="${TITLES[m]}">${ICONS[m]}</button>`).join('');
  const btns = [...el.querySelectorAll('.latch')];
  btns.forEach((b, i) => b.addEventListener('click', () => {
    if (onPress(MODES[i])) click(); else buzz();
  }));
  return {
    // залипшие кнопки показывают состояние транспорта
    draw(t, enabled = true) {
      MODES.forEach((m, i) => btns[i].classList.toggle('latched', enabled && (m === 'stop' ? t.mode === 'stop' && t.stopLatched : t.mode === m)));
    },
  };
}
