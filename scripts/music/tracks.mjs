/**
 * Партитуры семи фоновых треков.
 *
 * Здесь нет синтеза — только музыка: тональность, гармония, ритм и то, какие
 * слои в какой части играют. Движок в `engine.mjs`.
 *
 * Правила, которым подчинены все семь:
 *
 * 1. Фон не должен тянуть внимание. Мелодия появляется не раньше второй
 *    части и держится в середине регистра; ведущие голоса тихие.
 * 2. У каждого трека своя тональность и свой лад, иначе три темы разведки
 *    сливаются в одну. Лады взяты под регионы: дорийский — лес, эолийский —
 *    затонувшие руины, фригийский — огненные глубины.
 * 3. Форма одинаковая: вступление, A, B, A с мелодией, кода. Повтор A после
 *    B — то, что делает петлю слышимой как замысел, а не как обрыв.
 * 4. Трек начинается и кончается тишиной (нарастание и угасание в движке):
 *    игра переключает их подряд, и щелчок на стыке был бы слышен.
 */
import { SR, makeRng, midiToFreq, renderVoice, renderDrum, reverb, delay, master } from './engine.mjs';

/** Лады. Числа — полутоны от тоники. */
const MODES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11]
};

const NOTE_NAMES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** Нота лада по ступени: ступени больше шести уходят в следующую октаву. */
function scaleNote(root, mode, degree) {
  const steps = MODES[mode];
  const octave = Math.floor(degree / steps.length);
  const index = ((degree % steps.length) + steps.length) % steps.length;
  return root + steps[index] + octave * 12;
}

/** Трезвучие (или септаккорд) на ступени лада — терциями по тому же ладу. */
function chordOn(root, mode, degree, size = 3) {
  const notes = [];
  for (let i = 0; i < size; i++) notes.push(scaleNote(root, mode, degree + i * 2));
  return notes;
}

/**
 * Семь треков. `bars` — длина в тактах, темп и размер задают длительность:
 * при 4/4 такт равен 240/bpm секунд.
 */
export const TRACKS = [
  {
    file: 'assets/audio/menu-cinematic/bgm_menu_cinematic_01.mp3',
    title: 'Перед дорогой',
    note: 'Меню, победа, финал. Медленная, просторная, без ударных до середины.',
    seed: 20261028,
    key: 'A', octave: 3, mode: 'aeolian',
    bpm: 72, bars: 40,
    progression: [0, 5, 2, 6],
    family: 'cinematic'
  },
  {
    file: 'assets/audio/exploration/bgm_exploration_01.mp3',
    title: 'Лесной тракт',
    note: 'Карта и город. Дорийский лад — светлее обычного минора.',
    seed: 11,
    key: 'D', octave: 3, mode: 'dorian',
    bpm: 96, bars: 48,
    progression: [0, 6, 3, 6],
    family: 'travel'
  },
  {
    file: 'assets/audio/exploration/bgm_exploration_02.mp3',
    title: 'Затонувшие руины',
    note: 'Та же роль, другая тональность и более тяжёлый бас.',
    seed: 12,
    key: 'F', octave: 3, mode: 'aeolian',
    bpm: 88, bars: 44,
    progression: [0, 2, 5, 4],
    family: 'travel'
  },
  {
    file: 'assets/audio/exploration/bgm_exploration_03.mp3',
    title: 'Огненные глубины',
    note: 'Фригийский лад: вторая ступень понижена, отсюда тревога.',
    seed: 13,
    key: 'E', octave: 3, mode: 'phrygian',
    bpm: 92, bars: 44,
    progression: [0, 1, 0, 6],
    family: 'travel'
  },
  {
    file: 'assets/audio/battle/bgm_battle_01.mp3',
    title: 'Короткая стычка',
    note: 'Бой. Ровный восьмой пульс, бас на каждую долю.',
    seed: 21,
    key: 'E', octave: 2, mode: 'aeolian',
    bpm: 138, bars: 72,
    progression: [0, 5, 6, 0],
    family: 'battle'
  },
  {
    file: 'assets/audio/battle/bgm_battle_02.mp3',
    title: 'Строй держать',
    note: 'Бой. Гармонический минор даёт мажорную доминанту — звучит жёстче.',
    seed: 22,
    key: 'A', octave: 2, mode: 'harmonic',
    bpm: 148, bars: 76,
    progression: [0, 3, 4, 0],
    family: 'battle'
  },
  {
    file: 'assets/audio/battle/bgm_battle_03.mp3',
    title: 'Последний рубеж',
    note: 'Бой с боссом: самый быстрый темп и нисходящая гармония.',
    seed: 23,
    key: 'D', octave: 2, mode: 'aeolian',
    bpm: 158, bars: 80,
    progression: [0, 6, 5, 4],
    family: 'battle'
  }
];

/**
 * Разбивка на части. Доли считаются от общего числа тактов, чтобы форма
 * держалась при любой длине: вступление, A, B, A с мелодией, кода.
 */
function sectionsFor(bars) {
  const intro = Math.max(4, Math.round(bars * 0.12));
  const a1 = Math.round(bars * 0.26);
  const b = Math.round(bars * 0.26);
  const a2 = Math.round(bars * 0.26);
  const outro = bars - intro - a1 - b - a2;
  return [
    { name: 'intro', bars: intro },
    { name: 'a1', bars: a1 },
    { name: 'b', bars: b },
    { name: 'a2', bars: a2 },
    { name: 'outro', bars: Math.max(2, outro) }
  ];
}

/**
 * Мотив мелодии: четыре-пять ступеней, которые потом повторяются на каждом
 * аккорде с небольшими изменениями. Так мелодия запоминается — случайная
 * последовательность нот звучит как ошибка, сколько её ни украшай.
 */
function makeMotif(rng) {
  const shapes = [
    [0, 2, 1, 4],
    [4, 2, 0, 1],
    [0, 1, 2, 4, 2],
    [2, 4, 3, 1],
    [0, 4, 2, 1]
  ];
  return shapes[Math.floor(rng() * shapes.length)];
}

/** Сколько секунд длится доля и такт. */
function timing(bpm) {
  const beat = 60 / bpm;
  return { beat, bar: beat * 4 };
}

/**
 * Собрать трек целиком. Возвращает стереобуфер Float32.
 */
export function renderTrack(track) {
  const rng = makeRng(track.seed);
  const { beat, bar } = timing(track.bpm);
  const root = NOTE_NAMES[track.key] + (track.octave + 1) * 12;
  const sections = sectionsFor(track.bars);
  const totalSeconds = track.bars * bar + 3;
  const buffer = new Float32Array(Math.ceil(totalSeconds * SR) * 2);
  const motif = makeMotif(rng);

  const isBattle = track.family === 'battle';
  const isCinematic = track.family === 'cinematic';

  let barIndex = 0;
  for (const section of sections) {
    for (let inner = 0; inner < section.bars; inner++, barIndex++) {
      const t0 = barIndex * bar;
      const degree = track.progression[barIndex % track.progression.length];
      const chord = chordOn(root, track.mode, degree, 3);
      const bassNote = chord[0] - 12;

      const playPad = section.name !== 'outro' || inner < section.bars - 1;
      const playDrums = isBattle
        ? section.name !== 'intro' || inner >= Math.floor(section.bars / 2)
        : section.name === 'b' || section.name === 'a2';
      const playArp = section.name !== 'intro';
      const playLead = section.name === 'a2' || (section.name === 'b' && !isCinematic);

      /* ── Подложка: аккорд целым тактом, мягкая атака, тихо. */
      if (playPad) {
        chord.forEach((note, i) => {
          renderVoice(buffer, {
            start: t0,
            duration: bar * (isCinematic ? 1.9 : 1.0),
            freq: midiToFreq(note + (isCinematic ? 0 : 12)),
            gain: isCinematic ? 0.1 : 0.062,
            /* Пила ярче треугольника на полтора десятка децибел в верхней
               половине спектра. Для боя это уместно, для меню — песок поверх
               подложки, поэтому кинематографичная тема берёт треугольник и
               срез ниже. */
            wave: isCinematic ? 'triangle' : 'saw',
            attack: isCinematic ? 0.8 : 0.08,
            decay: 0.4,
            sustain: 0.65,
            release: isCinematic ? 1.4 : 0.5,
            cutoff: isCinematic ? 520 : 1200,
            pan: (i - 1) * 0.42,
            detune: (i - 1) * 7,
            rng
          });
        });
      }

      /* ── Бас: в бою на каждую долю, в пути — половинками. */
      const bassHits = isBattle ? [0, 1, 1.5, 2, 3, 3.5] : isCinematic ? [0] : [0, 2];
      for (const hit of bassHits) {
        renderVoice(buffer, {
          start: t0 + hit * beat,
          duration: isBattle ? beat * 0.42 : beat * (isCinematic ? 3.6 : 1.7),
          freq: midiToFreq(bassNote),
          gain: isBattle ? 0.3 : 0.2,
          wave: isBattle ? 'square' : 'triangle',
          attack: 0.006,
          decay: 0.09,
          sustain: isBattle ? 0.45 : 0.8,
          release: isBattle ? 0.09 : 0.5,
          pulseWidth: 0.32,
          cutoff: isBattle ? 2200 : 900,
          drive: isBattle ? 0.9 : 0,
          rng
        });
      }

      /* ── Арпеджио: держит пульс и не мешает мелодии, потому что тихое. */
      if (playArp) {
        const step = isBattle ? beat / 2 : beat;
        const steps = Math.round(bar / step);
        for (let s = 0; s < steps; s++) {
          const note = chord[s % chord.length] + (s >= chord.length ? 12 : 0);
          renderVoice(buffer, {
            start: t0 + s * step,
            duration: step * 0.82,
            freq: midiToFreq(note + 12),
            gain: isBattle ? 0.085 : 0.07,
            wave: isCinematic ? 'sine' : 'square',
            attack: 0.005,
            decay: 0.05,
            sustain: 0.35,
            release: 0.1,
            pulseWidth: 0.22,
            cutoff: 3200,
            pan: (s % 2 ? 0.3 : -0.3),
            rng
          });
        }
      }

      /* ── Мелодия: мотив на ступенях текущего аккорда, иногда со сдвигом. */
      if (playLead) {
        const variation = Math.floor(rng() * 3) - 1;
        motif.forEach((step, i) => {
          const noteDegree = degree + step + (i === motif.length - 1 ? variation : 0);
          const note = scaleNote(root, track.mode, noteDegree) + (isBattle ? 24 : 12);
          const span = bar / motif.length;
          renderVoice(buffer, {
            start: t0 + i * span,
            duration: span * 0.88,
            freq: midiToFreq(note),
            gain: isBattle ? 0.13 : 0.12,
            wave: isCinematic ? 'triangle' : 'triangle',
            attack: isCinematic ? 0.06 : 0.012,
            decay: 0.12,
            sustain: 0.6,
            release: 0.22,
            vibratoRate: 5.2,
            vibratoDepth: 0.0035,
            cutoff: 4200,
            pan: 0.12,
            rng
          });
        });
      }

      /* ── Ударные. */
      if (playDrums) {
        if (isBattle) {
          renderDrum(buffer, 'kick', t0, 0.5, rng);
          renderDrum(buffer, 'kick', t0 + beat * 2, 0.44, rng);
          renderDrum(buffer, 'kick', t0 + beat * 2.75, 0.3, rng);
          renderDrum(buffer, 'snare', t0 + beat, 0.3, rng);
          renderDrum(buffer, 'snare', t0 + beat * 3, 0.3, rng);
          for (let h = 0; h < 8; h++) {
            renderDrum(buffer, h === 7 ? 'hatOpen' : 'hat', t0 + h * beat / 2, h % 2 ? 0.07 : 0.11, rng);
          }
          /* Переход в конце каждой четвёртой фразы: без него форма не слышна. */
          if (barIndex % 8 === 7) {
            renderDrum(buffer, 'tom', t0 + beat * 3, 0.26, rng);
            renderDrum(buffer, 'tom', t0 + beat * 3.5, 0.3, rng);
          }
        } else {
          renderDrum(buffer, 'kick', t0, 0.34, rng);
          renderDrum(buffer, isCinematic ? 'tom' : 'snare', t0 + beat * 2, isCinematic ? 0.2 : 0.16, rng);
          if (!isCinematic) {
            for (let h = 0; h < 4; h++) renderDrum(buffer, 'hat', t0 + h * beat, h % 2 ? 0.05 : 0.08, rng);
          }
        }
      }
    }
  }

  delay(buffer, {
    time: beat * (isBattle ? 0.75 : 1.5),
    feedback: isBattle ? 0.22 : 0.3,
    mix: isCinematic ? 0.26 : 0.16
  });
  reverb(buffer, {
    mix: isCinematic ? 0.3 : isBattle ? 0.16 : 0.22,
    decay: isCinematic ? 0.82 : 0.74
  });
  master(buffer, {
    peak: 0.89,
    fadeIn: isCinematic ? 2.4 : 1.0,
    fadeOut: isCinematic ? 3.2 : 2.2
  });
  return buffer;
}
