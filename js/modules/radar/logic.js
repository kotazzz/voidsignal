// ================= Логика триангулятора: сигналы, команды, симуляция =================
import { D2R, R2D, clamp, vec, toLL, slerp, angDist, basis, inTriangle } from '../../core/math.js';
import { beep, sweep, buzz, click } from '../../core/audio.js';
import { setLed, flashLed, clearLeds } from '../../core/leds.js';
import { log } from '../../core/clock.js';
import { unitOn } from '../../core/units.js';

const isOn = () => unitOn('radar');
import { slots, buffer, CONFIRM_TIME, makeId } from '../../core/buffer.js';
import { registerSignal } from '../../core/signals.js';
import { CFG, LAT_MAX, LON_MAX, fmtLat, fmtLon } from './config.js';
import { st, selCount } from './state.js';

// ---------- сигналы на небе ----------
// hidden — сигнал, который «найдёт» волна пинга
export function spawnSignal(hidden = false) {
  for (let tries = 0; tries < 50; tries++) {
    const lat = (Math.random() * 2 - 1) * (LAT_MAX - 14);
    const lon = (Math.random() * 2 - 1) * (LON_MAX - 16);
    const v = vec(lat, lon);
    if (st.signals.some(s => angDist(s.v, v) < 30)) continue;
    if (st.radars.some(r => angDist(r.v, v) < 6)) continue;
    st.signals.push({ id: makeId(), lat, lon, v, ...basis(lat, lon), R: 7 + Math.random() * 5, phase: Math.random(), captured: 0, life: Infinity, hidden });
    return true;
  }
  return false;
}

// ---------- индикаторы результата ----------
const RESULT_LEDS = ['disp', 'big', 'small', 'nf', 'ok'];
export const clearResults = () => clearLeds(RESULT_LEDS);

// ---------- команды ----------
export function select(i) {
  st.selected[i] = !st.selected[i];
  click();
  log(`R${i + 1} ${st.selected[i] ? 'ВКЛ' : 'ВЫКЛ'}`);
}

function actionAllowed() {
  if (st.cooldown.t > 0 || st.analysis) {
    flashLed('cdErr', 900);
    buzz();
    log(`ОТКАЗ: КУЛДАУН ${st.cooldown.t.toFixed(1)} С`);
    return false;
  }
  return true;
}
function startCooldown(total, kind) {
  st.cooldown.t = st.cooldown.total = total;
  st.cooldown.kind = kind;
}

export function doMove() {
  if (!isOn()) return;
  const n = selCount();
  if (n !== 1) {
    flashLed('sel', 1200);
    if (n === 0) st.swFlashUntil = st.T + 0.7;
    buzz();
    log(n === 0 ? 'ОТКАЗ: НЕ ВЫБРАН РАДАР' : 'ОТКАЗ: ВЫБРАНО НЕСКОЛЬКО РАДАРОВ');
    return;
  }
  if (!actionAllowed()) return;
  const idx = st.selected.indexOf(true), r = st.radars[idx];
  r.moving = { from: r.v, to: vec(st.ret.lat, st.ret.lon), t: 0 };
  startCooldown(CFG.moveCd, 'mov');
  clearResults();
  st.lastResult = null;
  setLed('move', 'blink');
  beep(660, 0.05); beep(880, 0.05, 'square', 0.03, 0.07);
  log(`R${idx + 1} → ${fmtLat(st.ret.lat).trim()} / ${fmtLon(st.ret.lon).trim()}`);
}

// ручной пинг: волна идёт от центра экрана и находит новые сигналы (по одному за пинг, не больше maxSignals)
export function doPing() {
  if (!isOn() || !actionAllowed() || st.ping) return;
  st.ping = { t: 0 };
  if (st.signals.filter(s => !s.captured).length < CFG.maxSignals) spawnSignal(true);
  startCooldown(CFG.pingCd, 'png');
  clearResults();
  sweep(300, 1400, CFG.pingTime, 'sine', 0.05);
  log('ПИНГ: ПОИСК СИГНАЛОВ');
}

export function doScan() {
  if (!isOn() || !actionAllowed()) return;
  const slot = slots[buffer.sel];
  if (slot.id || slot.busy) {
    flashLed('slot', 1200);
    buzz();
    log(`ОТКАЗ: СЛОТ ${buffer.sel + 1} ЗАНЯТ`);
    return;
  }
  slot.reserved = true;
  st.analysis = { t: 0, slot: buffer.sel };
  startCooldown(CFG.scanCd, 'scn');
  clearResults();
  st.lastResult = null;
  setLed('scan', 'blink');
  log(`АНАЛИЗ СИГНАЛА → СЛОТ ${buffer.sel + 1}`);
}

export function clearSlot(i) {
  if (!isOn()) { click(); return; }
  const s = slots[i];
  if (s.reserved || s.busy) { buzz(); log(`СЛОТ ${i + 1} ЗАНЯТ ОПЕРАЦИЕЙ`); return; }
  click();
  if (!s.id) return;
  // первое нажатие — запрос подтверждения, второе в течение 2 с — очистка
  if (s.confirm > st.T) {
    s.confirm = 0;
    s.busy = { kind: 'clear', t: 0 };
    log(`ОЧИСТКА СЛОТА ${i + 1}`);
  } else {
    s.confirm = st.T + CONFIRM_TIME;
    beep(880, 0.05); beep(880, 0.05, 'square', 0.03, 0.1);
    log(`СЛОТ ${i + 1}: НАЖМИТЕ CLR ЕЩЁ РАЗ`);
  }
}

// питание пропало посреди операции
export function abortOnPowerLoss() {
  if (st.ping) { st.signals = st.signals.filter(s => !s.hidden); st.ping = null; }
  if (!st.analysis) return;
  slots[st.analysis.slot].reserved = false;
  st.analysis = null;
  setLed('scan', false);
}

// ---------- анализ треугольника ----------
function evaluate() {
  const [A, B, C] = st.radars.map(r => r.v);
  const inside = st.signals.filter(s => !s.captured && inTriangle(A, B, C, s.v));
  if (!inside.length) return { code: 'nf' };

  const a = angDist(B, C), b = angDist(A, C), c = angDist(A, B);
  let minAng = 0;
  if (Math.min(a, b, c) > 0.5) {
    const ang = (x, y, z) => Math.acos(clamp((y * y + z * z - x * x) / (2 * y * z), -1, 1)) * R2D;
    minAng = Math.min(ang(a, b, c), ang(b, a, c), ang(c, a, b));
  }
  const rank = { ok: 0, big: 1, small: 1, disp: 2 };
  let best = null;
  for (const s of inside) {
    const d = [A, B, C].map(p => angDist(p, s.v));
    const mean = (d[0] + d[1] + d[2]) / 3;
    const ratio = Math.max(...d) / Math.max(0.01, Math.min(...d));
    let code;
    if (ratio > 2.3 || minAng < 20 || mean > 2.4 * s.R) code = 'disp';
    else if (mean > 1.35 * s.R) code = 'big';
    else if (mean < 0.65 * s.R) code = 'small';
    else code = 'ok';
    if (!best || rank[code] < rank[best.code]) best = { code, signal: s };
  }
  return best;
}

const RESULT_TEXT = {
  nf: 'СИГНАЛ НЕ НАЙДЕН: НЕТ ИСТОЧНИКА ВНУТРИ ТРЕУГОЛЬНИКА',
  disp: 'РАЗБРОС: РАДАР СЛИШКОМ ДАЛЕКО / ОСТРЫЙ ТРЕУГОЛЬНИК',
  big: 'ТРЕУГОЛЬНИК ВЕЛИК: СИГНАЛ СЛИШКОМ СЛАБ',
  small: 'ТРЕУГОЛЬНИК МАЛ: РАДАРЫ СЛИШКОМ БЛИЗКО',
  ok: 'СИГНАЛ ЗАХВАЧЕН',
};

function finishAnalysis() {
  const slot = slots[st.analysis.slot], slotN = st.analysis.slot + 1;
  slot.reserved = false;
  st.analysis = null;
  setLed('scan', false);
  const res = evaluate();
  st.lastResult = { code: res.code, t: st.T };
  if (res.code === 'ok') {
    res.signal.captured = st.T;
    registerSignal(res.signal.id);
    slot.id = res.signal.id;
    slot.shown = 0;
    slot.busy = { kind: 'write', t: 0 };
    log(`СИГНАЛ ${res.signal.id} ЗАХВАЧЕН → СЛОТ ${slotN}`);
    flashLed('ok', 2500, 'on');
    [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.12, 'square', 0.03, i * 0.09));
  } else {
    log(RESULT_TEXT[res.code]);
    setLed(res.code, 'on');
    beep(220, 0.18, 'square', 0.035); beep(165, 0.25, 'square', 0.035, 0.18);
  }
}

// ---------- шаг симуляции (только при включённом питании) ----------
export function simulate(dt, inp) {
  const { ret, cam, cooldown } = st, T = st.T;

  // прицел: разгон и инерция
  const k = 1 - Math.exp(-CFG.accel * dt);
  ret.vx += (inp.x * CFG.maxSpeed - ret.vx) * k;
  ret.vy += (inp.y * CFG.maxSpeed - ret.vy) * k;
  ret.lat += ret.vy * dt;
  ret.lon += (ret.vx * dt) / Math.max(0.3, Math.cos(ret.lat * D2R));
  let hit = false;
  if (Math.abs(ret.lat) > LAT_MAX) { ret.lat = Math.sign(ret.lat) * LAT_MAX; ret.vy *= -0.3; hit = true; }
  if (Math.abs(ret.lon) > LON_MAX) { ret.lon = Math.sign(ret.lon) * LON_MAX; ret.vx *= -0.3; hit = true; }
  if (hit) {
    if (T - st.limitFlash > 0.6) beep(140, 0.08, 'square', 0.03);
    st.limitFlash = T;
  }
  st.speed = Math.min(1, Math.hypot(ret.vx, ret.vy) / CFG.maxSpeed);

  const kc = 1 - Math.exp(-CFG.camFollow * dt);
  cam.lat += (ret.lat - cam.lat) * kc;
  cam.lon += (ret.lon - cam.lon) * kc;

  // перелёт радаров
  st.radars.forEach((r, i) => {
    if (!r.moving) return;
    r.moving.t += dt;
    const p = Math.min(1, r.moving.t / CFG.travel), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    r.v = slerp(r.moving.from, r.moving.to, e);
    [r.lat, r.lon] = toLL(r.v);
    if (p >= 1) {
      r.moving = null;
      setLed('move', false);
      beep(990, 0.07);
      log(`R${i + 1} НА ПОЗИЦИИ`);
    }
  });

  if (cooldown.t > 0) {
    cooldown.t = Math.max(0, cooldown.t - dt);
    if (cooldown.t === 0) beep(1400, 0.03, 'square', 0.02);
  }
  if (st.analysis) {
    st.analysis.t += dt;
    if (Math.floor(st.analysis.t * 8) !== Math.floor((st.analysis.t - dt) * 8)) beep(1800 + Math.random() * 600, 0.02, 'square', 0.012);
    if (st.analysis.t >= CFG.scanTime) finishAnalysis();
  }

  // волна пинга
  if (st.ping) {
    st.ping.t += dt;
    if (st.ping.t >= CFG.pingTime) {
      const found = st.signals.some(s => s.hidden);
      st.signals.forEach(s => { s.hidden = false; });
      st.ping = null;
      beep(990, 0.07);
      log(found ? 'ПИНГ: ОБНАРУЖЕН НОВЫЙ СИГНАЛ' : 'ПИНГ: НОВЫХ СИГНАЛОВ НЕТ');
    }
  }

  // сигналы сами не пропадают; исчезает только захваченный после показа метки
  st.signals = st.signals.filter(s => !s.captured || T - s.captured < 2.5);
}
