// ================= БПФ и спектрограмма =================
// Радикс-2, на месте. Спектрограмма — настоящее STFT с окном Ханна.

const tables = new Map();
function table(n) {
  if (!tables.has(n)) {
    const cos = new Float32Array(n / 2), sin = new Float32Array(n / 2), win = new Float32Array(n), rev = new Uint32Array(n);
    for (let i = 0; i < n / 2; i++) { cos[i] = Math.cos((-2 * Math.PI * i) / n); sin[i] = Math.sin((-2 * Math.PI * i) / n); }
    for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
    tables.set(n, { cos, sin, win, rev });
  }
  return tables.get(n);
}

export function fft(re, im) {
  const n = re.length, { cos, sin, rev } = table(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2, step = n / size;
    for (let s = 0; s < n; s += size) {
      for (let k = 0; k < half; k++) {
        const c = cos[k * step], si = sin[k * step], a = s + k, b = a + half;
        const tr = re[b] * c - im[b] * si, ti = re[b] * si + im[b] * c;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

// → { data: Float32Array(frames × bins) в дБ-нормировке 0..1, frames, bins }
export function spectrogram(samples, n = 256, hop = 128) {
  const { win } = table(n), bins = n / 2;
  const frames = Math.max(1, Math.floor((samples.length - n) / hop) + 1);
  const data = new Float32Array(frames * bins), re = new Float32Array(n), im = new Float32Array(n);
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < n; i++) { re[i] = (samples[f * hop + i] || 0) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < bins; k++) {
      const db = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-9);
      data[f * bins + k] = Math.max(0, Math.min(1, (db + 50) / 70));
    }
  }
  return { data, frames, bins };
}
