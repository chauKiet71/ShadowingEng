import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { toIPA } from 'phonemize';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lessonsPath = join(__dirname, '../client/src/data/lessons.json');

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
let filled = 0;

for (const lesson of lessons) {
  for (const sentence of lesson.sentences) {
    if (sentence.phonetic?.trim()) continue;
    const ipa = toIPA(sentence.english).trim();
    sentence.phonetic = ipa ? `/${ipa}/` : '';
    filled += 1;
  }
}

writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');
console.log(`Filled ${filled} phonetic entries in ${lessonsPath}`);
