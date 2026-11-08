// Список модулей консоли. Порядок = порядок вкладок.
//
// Контракт модуля:
//   id, title, hints, template       — идентификатор, подпись вкладки, подсказка, HTML-разметка
//   boot                             — время загрузки модуля, с (не больше BOOT.end)
//   init(root)                       — однократная инициализация после вставки разметки
//   update(dt)                       — симуляция; вызывается каждый кадр для всех модулей
//   draw(dt)                         — отрисовка; вызывается только для активной вкладки
//   onPower(ev)?                     — 'boot' | 'lamp-end' | 'on' | 'shutdown' | 'off'
//   onShow()? / onHide()?            — переключение вкладок
//   onKey(e)? → bool                 — true, если клавиша обработана (глобальные не сработают)
//   onKeyUp(e)? / onBlur()?
//   activity()? → false|'on'|'blink' — индикатор на вкладке
import radar from './radar/index.js';
import tuner from './tuner/index.js';
import playback from './playback/index.js';
import processing from './processing/index.js';
import dishes from './dishes/index.js';

export const modules = [radar, tuner, playback, processing, dishes];
