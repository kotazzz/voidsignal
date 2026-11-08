// ================= Аудио =================
let actx = null;
// контекст, созданный вне жеста пользователя, стартует в suspended — будим при каждом обращении
export const ac = () => {
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume().catch(() => { /* ждём жеста */ });
  return actx;
};

const safe = fn => { try { fn(); } catch (e) { /* без звука */ } };

export function beep(f = 880, d = 0.06, type = 'square', vol = 0.03, delay = 0) {
  safe(() => {
    const a = ac(), o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + delay;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + d + 0.02);
  });
}

export function sweep(f0, f1, d, type = 'sine', vol = 0.05, delay = 0) {
  safe(() => {
    const a = ac(), o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.05, d / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0 + d + 0.02);
  });
}

export const buzz = () => { beep(110, 0.25, 'sawtooth', 0.04); beep(98, 0.25, 'sawtooth', 0.03, 0.05); };
export const click = () => { beep(2400, 0.012, 'square', 0.02); beep(300, 0.03, 'triangle', 0.05); };
export const tick = () => beep(3400, 0.006, 'square', 0.012);
export const thud = () => beep(90, 0.05, 'triangle', 0.06);

// характерный щелчок фиксатора ручки: сухой «тик» + глухой удар корпуса
export function detent() {
  safe(() => {
    const a = ac(), t0 = a.currentTime, n = Math.floor(a.sampleRate * 0.012);
    const b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6);
    const src = a.createBufferSource(), hp = a.createBiquadFilter(), g = a.createGain();
    src.buffer = b; hp.type = 'highpass'; hp.frequency.value = 2500; g.gain.value = 0.25;
    src.connect(hp).connect(g).connect(a.destination);
    src.start(t0);
  });
  beep(160, 0.025, 'triangle', 0.05);
}

// щелчок силового реле: фиксатор + глухой удар якоря
export function relay() {
  detent();
  beep(70, 0.05, 'triangle', 0.07, 0.012);
}

// фоновое гудение трансформаторов: 60 Гц + гармоники через фильтр, медленно нарастает
let hum = null;
export function startHum() {
  if (hum) return;
  try {
    const a = ac(), t0 = a.currentTime, lp = a.createBiquadFilter(), g = a.createGain();
    if (a.state === 'suspended') a.resume();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.014, t0 + 2.5);
    const oscs = [[60, 'sawtooth', 0.8], [120, 'sine', 0.5], [180, 'sine', 0.15]].map(([f, type, k]) => {
      const o = a.createOscillator(), og = a.createGain();
      o.type = type; o.frequency.value = f; og.gain.value = k;
      o.connect(og).connect(lp);
      o.start();
      return o;
    });
    lp.connect(g).connect(a.destination);
    hum = { g, oscs };
  } catch (e) { /* без звука */ }
}
export function stopHum() {
  if (!hum) return;
  const { g, oscs } = hum;
  hum = null;
  try {
    const t0 = ac().currentTime;
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
    oscs.forEach(o => o.stop(t0 + 0.9));
  } catch (e) { /* без звука */ }
}
