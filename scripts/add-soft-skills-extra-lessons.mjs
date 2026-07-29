/**
 * Thêm bài 6-10 vào category "Kỹ năng mềm" từ nd11.txt.
 *
 * Usage:
 *   node scripts/add-soft-skills-extra-lessons.mjs
 *   node scripts/add-soft-skills-extra-lessons.mjs "C:/Users/DELL/Downloads/nd11.txt"
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import OpenAI from 'openai';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
config({ path: resolve(root, '.env') });

const lessonsPath = resolve(root, 'client/src/data/lessons.json');
const categoriesPath = resolve(root, 'client/src/data/categories.ts');
const sourcePath = process.argv[2] || 'C:/Users/DELL/Downloads/nd11.txt';

const CATEGORY_ID = '20';
const TOPIC = 'Kỹ năng mềm';

const LESSON_META = {
  6: {
    lessonNum: 221,
    title: 'Tư duy phản biện',
    description: 'Phân tích thông tin, kiểm tra bằng chứng và đưa ra quyết định',
    thumb: 'photo-1454165804606-c3d57bc86b40',
  },
  7: {
    lessonNum: 222,
    title: 'Kỹ năng giao tiếp',
    description: 'Chia sẻ ý tưởng, lắng nghe và xây dựng mối quan hệ',
    thumb: 'photo-1521791136064-7986c2920216',
  },
  8: {
    lessonNum: 223,
    title: 'Kỹ năng lãnh đạo',
    description: 'Dẫn dắt, hỗ trợ và truyền cảm hứng cho người khác',
    thumb: 'photo-1522071820081-009f0129c71c',
  },
  9: {
    lessonNum: 224,
    title: 'Kỹ năng thích nghi',
    description: 'Linh hoạt trước thay đổi và những tình huống mới',
    thumb: 'photo-1484480974693-6ca0a78fb36b',
  },
  10: {
    lessonNum: 225,
    title: 'Trí tuệ cảm xúc',
    description: 'Hiểu, quản lý cảm xúc và đồng cảm với người khác',
    thumb: 'photo-1506784983877-45594efa4cbe',
  },
};

function splitSentences(paragraph) {
  const cleaned = paragraph.replace(/\s+/g, ' ').trim();
  return cleaned
    .split(/(?<=[.!?]["']?)(?=\s+[A-Z"'])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) =>
      /[.!?]["']?$/.test(sentence) ? sentence : `${sentence}.`,
    );
}

function parseTitle(line) {
  const cleaned = line.replace(/^Bài\s+/i, '').trim();
  const match = cleaned.match(/^(\d+)[.:]\s+(.+)$/);
  if (!match) return null;
  return { index: Number(match[1]), rawTitle: match[2].trim() };
}

function parseSource(text) {
  const parsed = [];
  let current = null;
  let body = [];

  const flush = () => {
    if (!current) return;
    const paragraph = body.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph) {
      parsed.push({ ...current, sentencesEn: splitSentences(paragraph) });
    }
    current = null;
    body = [];
  };

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || line === '---' || /^Nội dung:/i.test(line)) continue;

    const title = parseTitle(line);
    if (title && LESSON_META[title.index]) {
      flush();
      current = { index: title.index, ...LESSON_META[title.index] };
      continue;
    }

    if (current) body.push(line);
  }

  flush();
  return parsed;
}

function estimateDuration(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, Math.min(12, words * 0.38 + 0.8));
}

function buildSentences(lessonNum, english, vietnamese) {
  let time = 0;
  return english.map((text, index) => {
    const duration = estimateDuration(text);
    const sentence = {
      id: `${lessonNum}-${index + 1}`,
      english: text,
      phonetic: '',
      vietnamese: vietnamese[index],
      time_start: Math.round(time * 100) / 100,
      time_end: Math.round((time + duration) * 100) / 100,
    };
    time += duration + 0.25;
    return sentence;
  });
}

async function translate(openai, sentences) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'Translate English lesson sentences into clear, natural Vietnamese for A2-B1 learners. Return only a JSON array of strings with identical length and order.',
      },
      { role: 'user', content: JSON.stringify(sentences) },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '[]';
  const result = JSON.parse(
    raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
  );
  if (!Array.isArray(result) || result.length !== sentences.length) {
    throw new Error(
      `Translation length mismatch: got ${result?.length}, expected ${sentences.length}`,
    );
  }
  return result.map((value) => String(value).trim());
}

function updateCategoryCount() {
  let source = readFileSync(categoriesPath, 'utf8');
  source = source.replace(
    /(id:\s*['"]20['"][\s\S]*?lessonCount:\s*)\d+/,
    '$110',
  );
  writeFileSync(categoriesPath, source);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env');
  }

  const parsed = parseSource(readFileSync(sourcePath, 'utf8'));
  if (parsed.length !== 5) {
    throw new Error(`Expected 5 lessons, got ${parsed.length}`);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  const newIds = new Set(parsed.map(({ lessonNum }) => `lesson-${lessonNum}`));
  lessons = lessons.filter((lesson) => !newIds.has(lesson.id));

  const added = [];
  for (const item of parsed) {
    const id = `lesson-${item.lessonNum}`;
    process.stdout.write(`${id} ${item.title} (${item.sentencesEn.length} câu) ... `);
    const vietnamese = await translate(openai, item.sentencesEn);
    const sentences = buildSentences(
      item.lessonNum,
      item.sentencesEn,
      vietnamese,
    );
    const duration = Math.ceil(sentences.at(-1).time_end);
    added.push({
      id,
      categoryId: CATEGORY_ID,
      title: item.title,
      description: item.description,
      thumbnailUrl: `https://images.unsplash.com/${item.thumb}?w=600&h=340&fit=crop`,
      audioUrl: '',
      duration,
      level: 'BEGINNER',
      topic: TOPIC,
      sentences,
    });
    console.log(`~${duration}s`);
  }

  lessons.push(...added);
  writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`);
  updateCategoryCount();
  console.log(`Added ${added.length} lessons: ${[...newIds].join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
