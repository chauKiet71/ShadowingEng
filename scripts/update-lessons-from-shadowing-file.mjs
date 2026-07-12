/**
 * Cập nhật lesson-21 → lesson-80 từ file LESSON_SHADOWINGENG.txt
 * EN tách theo câu; VI dịch bằng OpenAI (cần OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/update-lessons-from-shadowing-file.mjs
 *   node scripts/update-lessons-from-shadowing-file.mjs "C:/Users/DELL/Downloads/LESSON_SHADOWINGENG.txt"
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import OpenAI from 'openai';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env') });

const lessonsPath = resolve(root, 'client/src/data/lessons.json');
const sourcePath =
  process.argv[2] ||
  'C:/Users/DELL/Downloads/LESSON_SHADOWINGENG.txt';

const TOPIC_MAP = [
  {
    heading: 'CÔNG VIỆC SỰ NGHIỆP',
    topic: 'Công việc & Sự nghiệp',
    categoryId: '3',
    startLesson: 21,
  },
  {
    heading: 'TIN TỨC XÃ HỘI',
    topic: 'Tin tức & Xã hội',
    categoryId: '4',
    startLesson: 31,
  },
  {
    heading: 'GIẢI TRÍ PHIM ẢNH',
    topic: 'Giải trí & Phim ảnh',
    categoryId: '5',
    startLesson: 41,
  },
  {
    heading: 'KHOA HỌC CÔNG NGHỆ',
    topic: 'Khoa học & Công nghệ',
    categoryId: '6',
    startLesson: 51,
  },
  {
    heading: 'SỨC KHỎE LỐI SỐNG',
    topic: 'Sức khỏe & Lối sống',
    categoryId: '7',
    startLesson: 61,
  },
  {
    heading: 'HỌC TẬP GIÁO DỤC',
    topic: 'Học tập & Giáo dục',
    categoryId: '8',
    startLesson: 71,
  },
];

function splitSentences(paragraph) {
  const cleaned = paragraph.replace(/\s+/g, ' ').trim();
  const parts = cleaned.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [];
  return parts
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (/[.!?]$/.test(s) ? s : `${s}.`));
}

function parseSource(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const lessons = [];
  let currentTopic = null;
  let current = null;
  let bodyLines = [];

  const flush = () => {
    if (!current || !currentTopic) return;
    const paragraph = bodyLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!paragraph) return;
    lessons.push({
      ...current,
      topic: currentTopic.topic,
      categoryId: currentTopic.categoryId,
      englishParagraph: paragraph,
      sentencesEn: splitSentences(paragraph),
    });
    current = null;
    bodyLines = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^-{5,}$/.test(line)) continue;
    if (/^Chào bạn,/i.test(line)) continue;
    if (/^Dưới đây là 10 chủ đề/i.test(line)) continue;
    if (/^Để tiếp tục/i.test(line)) continue;
    if (/khoảng 155/i.test(line)) continue;

    const topicHit = TOPIC_MAP.find((t) => line === t.heading);
    if (topicHit) {
      flush();
      currentTopic = { ...topicHit, index: 0 };
      continue;
    }

    const titleMatch = line.match(/^(\d+)\.\s+(.+?)\s*\(([^)]+)\)\s*$/);
    if (titleMatch && currentTopic) {
      flush();
      currentTopic.index += 1;
      const lessonNum = currentTopic.startLesson + currentTopic.index - 1;
      current = {
        id: `lesson-${String(lessonNum).padStart(2, '0')}`,
        lessonNum,
        titleVi: titleMatch[2].trim(),
        titleEn: titleMatch[3].trim(),
        description: titleMatch[2].trim(),
      };
      bodyLines = [];
      continue;
    }

    if (current) bodyLines.push(line);
  }

  flush();
  return lessons;
}

function estimateDuration(text) {
  const words = text.split(/\s+/).length;
  return Math.max(2.2, Math.min(9, words * 0.38 + 0.8));
}

function buildSentenceObjects(lessonNum, pairs) {
  let time = 0;
  return pairs.map(([english, vietnamese], index) => {
    const duration = estimateDuration(english);
    const sentence = {
      id: `${lessonNum}-${index + 1}`,
      english,
      phonetic: '',
      vietnamese,
      time_start: Math.round(time * 100) / 100,
      time_end: Math.round((time + duration) * 100) / 100,
    };
    time += duration + 0.25;
    return sentence;
  });
}

async function translateSentences(openai, sentencesEn) {
  const prompt = `Translate each English sentence to natural Vietnamese for English learners (A1-A2).
Return ONLY a JSON array of strings, same length and order as input. No markdown.

Input:
${JSON.stringify(sentencesEn, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You translate English lesson sentences to clear, natural Vietnamese. Output JSON array only.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '[]';
  const jsonText = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const translated = JSON.parse(jsonText);

  if (!Array.isArray(translated) || translated.length !== sentencesEn.length) {
    throw new Error(
      `Translation length mismatch: got ${translated?.length}, expected ${sentencesEn.length}`,
    );
  }

  return translated.map((t) => String(t).trim());
}

async function main() {
  const source = readFileSync(sourcePath, 'utf8');
  const parsed = parseSource(source);

  console.log(`Parsed ${parsed.length} lessons from:\n  ${sourcePath}\n`);
  if (parsed.length !== 60) {
    console.warn(`Expected 60 lessons (21-80), got ${parsed.length}`);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env để dịch tiếng Việt');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));

  let updated = 0;

  for (const item of parsed) {
    const index = lessons.findIndex((l) => l.id === item.id);
    if (index === -1) {
      console.warn(`Skip missing ${item.id}`);
      continue;
    }

    process.stdout.write(`${item.id} ${item.titleVi} ... `);

    const vi = await translateSentences(openai, item.sentencesEn);
    const pairs = item.sentencesEn.map((en, i) => [en, vi[i]]);
    const sentences = buildSentenceObjects(item.lessonNum, pairs);
    const duration = Math.ceil(sentences.at(-1).time_end);

    lessons[index] = {
      ...lessons[index],
      title: item.titleVi,
      description: item.description,
      topic: item.topic,
      categoryId: item.categoryId,
      duration,
      sentences,
    };

    updated += 1;
    console.log(`${sentences.length} câu, ~${duration}s`);
  }

  writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`, 'utf8');
  console.log(`\nĐã cập nhật ${updated} bài → ${lessonsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
