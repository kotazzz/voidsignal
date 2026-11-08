// ================= Отладочная панель =================
// Кнопка у правого края экрана открывает модальное окно с опциями.
// Новая опция — объект { title, render(el) } в списке OPTIONS.
import quickSignal from './quickSignal.js';
import decodeSpeed from './decodeSpeed.js';
import archiveEntry from './archiveEntry.js';
import dishesDbg from './dishes.js';

const OPTIONS = [quickSignal, archiveEntry, decodeSpeed, dishesDbg];

export function initDebug() {
  const btn = document.createElement('button');
  btn.className = 'dbg-toggle';
  btn.innerHTML = '<span>Debug</span>';
  btn.title = 'Отладка (F2)';

  const overlay = document.createElement('div');
  overlay.className = 'dbg-overlay';
  overlay.innerHTML = `
    <div class="dbg-modal" role="dialog" aria-label="Отладка">
      <header class="dbg-head"><span>Отладка</span><button class="dbg-close" aria-label="Закрыть">×</button></header>
      <div class="dbg-body"></div>
    </div>`;
  const body = overlay.querySelector('.dbg-body');
  OPTIONS.forEach(opt => {
    const sec = document.createElement('section');
    sec.className = 'dbg-opt';
    sec.innerHTML = `<div class="dbg-opt-title">${opt.title}</div><div class="dbg-opt-body"></div>`;
    opt.render(sec.querySelector('.dbg-opt-body'));
    body.appendChild(sec);
  });

  document.body.append(btn, overlay);

  const isOpen = () => overlay.classList.contains('open');
  let timer = 0;
  const setOpen = open => {
    overlay.classList.toggle('open', open);
    clearInterval(timer);
    if (open) {
      OPTIONS.forEach(o => o.refresh?.());
      timer = setInterval(() => OPTIONS.forEach(o => o.refresh?.()), 250);
    }
  };
  btn.addEventListener('click', () => setOpen(!isOpen()));
  overlay.querySelector('.dbg-close').addEventListener('click', () => setOpen(false));
  overlay.addEventListener('pointerdown', e => { if (e.target === overlay) setOpen(false); });

  // перехватываем клавиши раньше модулей, пока окно открыто
  window.addEventListener('keydown', e => {
    if (e.code === 'F2') { e.preventDefault(); setOpen(!isOpen()); e.stopImmediatePropagation(); return; }
    if (!isOpen()) return;
    if (e.code === 'Escape') setOpen(false);
    e.stopImmediatePropagation();
  }, true);
}
