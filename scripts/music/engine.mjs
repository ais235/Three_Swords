/**
 * Маленький синтезатор для фоновой музыки игры.
 *
 * Зачем он вообще. У семи треков, которые лежали в игре, не было записано
 * происхождение: ни в коммите, ни в документах, ни в метаданных. Восстановить
 * его нельзя, а выпускать 17 МБ звука неизвестного происхождения — риск,
 * который не виден до претензии. Музыка, собранная кодом в этом репозитории,
 * закрывает вопрос навсегда: автор — проект, лицензия — проекта, и любой трек
 * пересобирается из исходника одной командой.
 *
 * Здесь только движок: осцилляторы, огибающие, фильтр, задержка, реверберация,
 * ударные и сведение. Сами партитуры — в `tracks.mjs`, чтобы править музыку
 * можно было, не трогая синтез.
 *
 * Всё считается в Float32 от -1 до 1 при 44100 Гц, стерео. Ничего не играется
 * в реальном времени: буфер считается целиком и уходит в WAV.
 */

export const SR = 44100;

/** Детерминированный генератор: та же партитура даёт тот же файл побайтно. */
export function makeRng(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Нота MIDI в герцы. 69 — это ля первой октавы, 440 Гц. */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* ─────────────────────────── Осцилляторы ───────────────────────────
 *
 * Пила и меандр, посчитанные «в лоб», дают наложение спектра: у них
 * бесконечно много гармоник, а частота дискретизации конечна, и всё, что
 * выше половины её, заворачивается обратно в слышимый диапазон. На
 * спектрограмме первого варианта это была ровная шумовая дымка от 1800 Гц
 * до 15 кГц на -45 дБ — на слух песок поверх подложки.
 *
 * Лечится PolyBLEP: в точке разрыва формы в неё подмешивается короткий
 * полином, сглаживающий скачок ровно на длину одного шага фазы. Стоит это
 * два умножения на отсчёт — в отличие от сложения сотни синусоид.
 */
function polyBlep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

const OSC = {
  sine: phase => Math.sin(phase * Math.PI * 2),
  /* У треугольника гармоники падают как 1/n², наложение ниже порога
     слышимости — сглаживать нечего. */
  triangle: phase => 4 * Math.abs(phase - Math.floor(phase + 0.5)) - 1,
  saw: (phase, width, rng, dt) => {
    const t = phase - Math.floor(phase);
    return 2 * t - 1 - polyBlep(t, dt);
  },
  square: (phase, width = 0.5, rng, dt) => {
    const t = phase - Math.floor(phase);
    const shifted = t + (1 - width);
    const wrapped = shifted - Math.floor(shifted);
    return (t < width ? 1 : -1) + polyBlep(t, dt) - polyBlep(wrapped, dt);
  },
  /* Шум не зависит от фазы: его берут из генератора, переданного снаружи. */
  noise: (phase, width, rng) => rng() * 2 - 1
};

/** Огибающая ADSR в долях секунды. Атака и спад не короче 4 мс — иначе щелчок. */
function envelopeAt(time, duration, { attack = 0.01, decay = 0.08, sustain = 0.7, release = 0.12 }) {
  const a = Math.max(0.004, attack);
  const r = Math.max(0.004, release);
  if (time < 0) return 0;
  if (time < a) return time / a;
  if (time < a + decay) return 1 - (1 - sustain) * ((time - a) / decay);
  if (time < duration) return sustain;
  const over = time - duration;
  if (over < r) return sustain * (1 - over / r);
  return 0;
}

/**
 * Один голос, подмешанный в стереобуфер.
 *
 * `pan` — от -1 (слева) до 1 (справа), по закону равной мощности: иначе
 * середина проваливается по громкости относительно краёв.
 */
export function renderVoice(buffer, options) {
  const {
    start, duration, freq, gain = 0.2, wave = 'triangle', pan = 0,
    attack, decay, sustain, release,
    pulseWidth = 0.5, detune = 0, vibratoRate = 0, vibratoDepth = 0,
    glideFrom = 0, rng = Math.random, cutoff = 0, drive = 0
  } = options;

  const osc = OSC[wave] || OSC.triangle;
  const env = { attack, decay, sustain, release };
  const releaseTail = Math.max(0.004, release ?? 0.12);
  const totalFrames = Math.ceil((duration + releaseTail) * SR);
  const startFrame = Math.round(start * SR);
  const angleL = Math.cos((pan + 1) * Math.PI / 4);
  const angleR = Math.sin((pan + 1) * Math.PI / 4);

  /* Однополюсный фильтр нижних частот: коэффициент считается один раз. */
  const filterK = cutoff > 0 ? Math.exp(-2 * Math.PI * cutoff / SR) : 0;
  let filtered = 0;
  let phase = 0;

  for (let i = 0; i < totalFrames; i++) {
    const frame = startFrame + i;
    if (frame < 0 || frame * 2 + 1 >= buffer.length) continue;
    const t = i / SR;
    const amp = envelopeAt(t, duration, env);
    if (amp <= 0) continue;

    /* Портаменто: частота подъезжает к целевой за первые 40 мс. */
    const glide = glideFrom > 0 ? Math.min(1, t / 0.04) : 1;
    const base = glideFrom > 0 ? glideFrom + (freq - glideFrom) * glide : freq;
    const vibrato = vibratoDepth > 0 ? 1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoRate * t) : 1;
    const f = base * vibrato * Math.pow(2, detune / 1200);

    const dt = f / SR;
    phase += dt;
    let sample = osc(phase, pulseWidth, rng, dt);

    if (cutoff > 0) {
      filtered = sample * (1 - filterK) + filtered * filterK;
      sample = filtered;
    }
    if (drive > 0) sample = Math.tanh(sample * (1 + drive)) / Math.tanh(1 + drive);

    const value = sample * amp * gain;
    buffer[frame * 2] += value * angleL;
    buffer[frame * 2 + 1] += value * angleR;
  }
}

/** Ударные: не ноты, а короткие шумовые и тоновые всплески. */
export function renderDrum(buffer, kind, start, gain, rng) {
  const startFrame = Math.round(start * SR);
  const write = (i, left, right) => {
    const frame = startFrame + i;
    if (frame < 0 || frame * 2 + 1 >= buffer.length) return;
    buffer[frame * 2] += left;
    buffer[frame * 2 + 1] += right;
  };

  if (kind === 'kick') {
    /* Бочка: синус, частота которого падает со 120 до 45 Гц за 90 мс. */
    const frames = Math.round(0.34 * SR);
    let phase = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / SR;
      const f = 45 + 75 * Math.exp(-t / 0.045);
      phase += f / SR;
      const amp = Math.exp(-t / 0.14) * gain;
      const v = Math.tanh(Math.sin(phase * Math.PI * 2) * 1.6) * amp;
      write(i, v, v);
    }
    return;
  }

  if (kind === 'snare') {
    /* Малый: шум плюс два тона, чтобы был не только «пш», но и тело. */
    const frames = Math.round(0.26 * SR);
    let low = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / SR;
      const amp = Math.exp(-t / 0.075) * gain;
      const noise = rng() * 2 - 1;
      low = noise * 0.35 + low * 0.65;
      const body = Math.sin(2 * Math.PI * 185 * t) * 0.5 + Math.sin(2 * Math.PI * 278 * t) * 0.3;
      const v = (noise * 0.75 + low * 0.5 + body * Math.exp(-t / 0.05)) * amp;
      write(i, v * 0.96, v);
    }
    return;
  }

  if (kind === 'hat' || kind === 'hatOpen') {
    const length = kind === 'hat' ? 0.055 : 0.21;
    const frames = Math.round(length * SR);
    let high = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / SR;
      const amp = Math.exp(-t / (length / 3)) * gain;
      const noise = rng() * 2 - 1;
      /* Полосовой «на коленке»: из шума вычитается его же сглаженная версия. */
      high = noise * 0.6 + high * 0.4;
      const v = (noise - high) * amp;
      write(i, v * 0.8, v);
    }
    return;
  }

  if (kind === 'tom') {
    const frames = Math.round(0.3 * SR);
    let phase = 0;
    for (let i = 0; i < frames; i++) {
      const t = i / SR;
      const f = 92 + 60 * Math.exp(-t / 0.07);
      phase += f / SR;
      const amp = Math.exp(-t / 0.13) * gain;
      const v = Math.sin(phase * Math.PI * 2) * amp;
      write(i, v, v * 0.92);
    }
    return;
  }

  if (kind === 'clap') {
    /* Хлопок: три шумовых всплеска подряд — одиночный звучит как щелчок. */
    for (const offset of [0, 0.011, 0.023]) {
      const begin = Math.round(offset * SR);
      const frames = Math.round(0.15 * SR);
      for (let i = 0; i < frames; i++) {
        const t = i / SR;
        const amp = Math.exp(-t / 0.045) * gain * 0.6;
        const v = (rng() * 2 - 1) * amp;
        write(begin + i, v, v * 0.9);
      }
    }
  }
}

/* ───────────────────────── Пространство ─────────────────────────
 * Реверберация Шрёдера: четыре гребенчатых фильтра параллельно, два
 * всепропускающих последовательно. Для фона этого достаточно, а главное —
 * она дешёвая и предсказуемая.
 */
export function reverb(buffer, { mix = 0.22, decay = 0.76 } = {}) {
  const combDelays = [1557, 1617, 1491, 1422, 1277, 1356];
  const allpassDelays = [225, 556];
  const out = new Float32Array(buffer.length);

  for (let channel = 0; channel < 2; channel++) {
    const frames = buffer.length / 2;
    const wet = new Float32Array(frames);

    for (let c = 0; c < combDelays.length; c++) {
      /* Левый и правый каналы берут чуть разную длину линии задержки —
         иначе реверберация получается строго по центру и звучит плоско. */
      const size = combDelays[c] + channel * 23;
      const line = new Float32Array(size);
      let index = 0;
      let store = 0;
      for (let i = 0; i < frames; i++) {
        const delayed = line[index];
        wet[i] += delayed / combDelays.length;
        store = delayed * 0.2 + store * 0.8;
        line[index] = buffer[i * 2 + channel] + store * decay;
        index = (index + 1) % size;
      }
    }

    for (const size of allpassDelays) {
      const line = new Float32Array(size);
      let index = 0;
      for (let i = 0; i < frames; i++) {
        const delayed = line[index];
        const input = wet[i];
        wet[i] = -input + delayed;
        line[index] = input + delayed * 0.5;
        index = (index + 1) % size;
      }
    }

    for (let i = 0; i < frames; i++) {
      out[i * 2 + channel] = buffer[i * 2 + channel] * (1 - mix) + wet[i] * mix;
    }
  }
  buffer.set(out);
}

/** Задержка с обратной связью: ею держится «эхо» мелодии в медленных темах. */
export function delay(buffer, { time = 0.375, feedback = 0.3, mix = 0.2 } = {}) {
  const frames = buffer.length / 2;
  const offset = Math.round(time * SR);
  if (offset <= 0 || offset >= frames) return;
  for (let i = offset; i < frames; i++) {
    /* Крест-накрест: эхо левого уходит вправо и наоборот — так шире. */
    const left = buffer[(i - offset) * 2 + 1] * feedback;
    const right = buffer[(i - offset) * 2] * feedback;
    buffer[i * 2] += left * mix;
    buffer[i * 2 + 1] += right * mix;
  }
}

/**
 * Сведение: убрать постоянную составляющую, подвести к целевому уровню и
 * мягко ограничить. Жёсткое ограничение даёт треск, поэтому tanh.
 */
export function master(buffer, { peak = 0.89, fadeIn = 0.8, fadeOut = 2.2 } = {}) {
  const frames = buffer.length / 2;

  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i];
  const dc = sum / buffer.length;
  for (let i = 0; i < buffer.length; i++) buffer[i] -= dc;

  let max = 0;
  for (let i = 0; i < buffer.length; i++) max = Math.max(max, Math.abs(buffer[i]));
  if (max > 0) {
    const gain = peak / max;
    for (let i = 0; i < buffer.length; i++) buffer[i] = Math.tanh(buffer[i] * gain * 1.08) * 0.94;
  }

  const inFrames = Math.round(fadeIn * SR);
  const outFrames = Math.round(fadeOut * SR);
  for (let i = 0; i < inFrames && i < frames; i++) {
    const k = i / inFrames;
    buffer[i * 2] *= k;
    buffer[i * 2 + 1] *= k;
  }
  for (let i = 0; i < outFrames && i < frames; i++) {
    const k = i / outFrames;
    const frame = frames - 1 - i;
    buffer[frame * 2] *= k;
    buffer[frame * 2 + 1] *= k;
  }
}

/** 16-битный WAV: в него упираются и ffmpeg, и любой проигрыватель. */
export function toWav(buffer) {
  const frames = buffer.length / 2;
  const dataBytes = frames * 2 * 2;
  const out = Buffer.alloc(44 + dataBytes);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 4, 28);
  out.writeUInt16LE(4, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  for (let i = 0; i < buffer.length; i++) {
    const clamped = Math.max(-1, Math.min(1, buffer[i]));
    out.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return out;
}
