import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsPath = join(root, 'client/src/data/lessons.json');
const audioDir = join(root, 'client/public/audio');

const ids = Array.from({ length: 10 }, (_, i) => `lesson-${93 + i}`);

function estimateMp3Duration(buffer) {
  const id3Size =
    buffer.toString('ascii', 0, 3) === 'ID3'
      ? ((buffer[6] & 0x7f) << 21) |
        ((buffer[7] & 0x7f) << 14) |
        ((buffer[8] & 0x7f) << 7) |
        (buffer[9] & 0x7f) +
        10
      : 0;
  return Math.max(1, (buffer.length - id3Size) / (128 * 1024 / 8));
}

function needsFix(lesson) {
  return lesson.sentences.some((s) => s.time_end - s.time_start < 0.35);
}

function redistribute(lesson, audioSeconds) {
  const weights = lesson.sentences.map((s) =>
    Math.max(1, s.english.split(/\s+/).filter(Boolean).length),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  const gap = 0.12;
  const speakBudget = Math.max(audioSeconds - gap * lesson.sentences.length, audioSeconds * 0.9);
  let t = 0;
  for (let i = 0; i < lesson.sentences.length; i += 1) {
    const dur = (weights[i] / total) * speakBudget;
    lesson.sentences[i].time_start = Math.round(t * 100) / 100;
    lesson.sentences[i].time_end = Math.round((t + dur) * 100) / 100;
    t += dur + gap;
  }
  lesson.duration = Math.ceil(audioSeconds);
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
let fixed = 0;

for (const id of ids) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) continue;
  const audioPath = join(audioDir, `${id}.mp3`);
  if (!existsSync(audioPath)) {
    console.warn(`Missing audio ${id}`);
    continue;
  }
  const audioSeconds = estimateMp3Duration(readFileSync(audioPath));
  if (needsFix(lesson)) {
    redistribute(lesson, audioSeconds);
    fixed += 1;
    console.log(`Fixed ${id} → duration ${lesson.duration}s`);
  } else {
    // still sync duration to audio if off by >2s
    if (Math.abs(lesson.duration - audioSeconds) > 2) {
      lesson.duration = Math.ceil(audioSeconds);
      console.log(`Adjusted duration ${id} → ${lesson.duration}s`);
    } else {
      console.log(`OK ${id}`);
    }
  }
}

writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');
console.log(`Fixed ${fixed} lessons`);
