import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsPath = join(root, 'client/src/data/lessons.json');
const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));

const lesson = lessons.find((l) => l.id === 'lesson-107');
if (lesson) {
  const idx = lesson.sentences.findIndex((s) => s.id === '107-4');
  if (idx > 0) {
    const prev = lesson.sentences[idx - 1];
    const curr = lesson.sentences[idx];
    const next = lesson.sentences[idx + 1];
    const start = prev.time_end;
    const end = Math.max(start + 1.4, next?.time_start ?? start + 1.4);
    curr.time_start = Number(start.toFixed(2));
    curr.time_end = Number((start + 1.35).toFixed(2));
    if (next && curr.time_end >= next.time_start) {
      next.time_start = Number((curr.time_end + 0.05).toFixed(2));
    }
    console.log('Fixed 107-4', curr.time_start, curr.time_end);
    writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');
  }
}

const srcDir = join(root, 'client/public/audio');
const destDir = join(root, 'public/audio');
mkdirSync(destDir, { recursive: true });

let copied = 0;
for (let n = 103; n <= 112; n += 1) {
  const name = `lesson-${n}.mp3`;
  const from = join(srcDir, name);
  const to = join(destDir, name);
  if (!existsSync(from)) {
    console.warn(`Missing ${name}`);
    continue;
  }
  copyFileSync(from, to);
  copied += 1;
  console.log(`Copied ${name}`);
}
console.log(`Copied ${copied}/10 new audio files`);
