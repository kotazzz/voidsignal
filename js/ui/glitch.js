// ================= Помехи на кинескопах =================
// Раз в 10–20 с на долю секунды рвёт картинку на случайном кинескопе активного модуля;
// при переключении вкладки даёт короткую вспышку.
const rnd = (a, b) => a + Math.random() * (b - a);

export function initGlitch(consoleEl) {
  const crts = () => [...consoleEl.querySelectorAll('.module.active .crt')];
  const pulse = (el, cls, ms) => {
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  };

  const tear = () => {
    setTimeout(tear, rnd(10000, 20000));
    if (consoleEl.classList.contains('off')) return;
    const list = crts();
    if (!list.length) return;
    const el = list[Math.floor(Math.random() * list.length)];
    el.style.setProperty('--ty', `${rnd(10, 90).toFixed(0)}%`);
    pulse(el, 'tear', 90);
  };
  setTimeout(tear, rnd(6000, 12000));

  document.getElementById('tabs').addEventListener('click', () => {
    if (consoleEl.classList.contains('off')) return;
    setTimeout(() => crts().forEach(el => pulse(el, 'flash', 160)), 0);
  });
}
