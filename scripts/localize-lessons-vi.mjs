import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { titleByEnglish, topicByCategory } from './lesson-labels-vi.mjs';

const outPath = join(dirname(fileURLToPath(import.meta.url)), '../client/src/data/lessons.json');

const lessons = JSON.parse(readFileSync(outPath, 'utf8'));

for (const lesson of lessons) {
  const viTitle = titleByEnglish[lesson.title] ?? lesson.title;
  if (!titleByEnglish[lesson.title] && !Object.values(titleByEnglish).includes(lesson.title)) {
    console.warn(`Missing Vietnamese title for: ${lesson.title} (${lesson.id})`);
  }

  lesson.title = viTitle;
  lesson.topic = topicByCategory[lesson.categoryId] ?? lesson.topic;
}

writeFileSync(outPath, JSON.stringify(lessons, null, 2), 'utf8');
console.log(`Localized ${lessons.length} lessons -> ${outPath}`);
