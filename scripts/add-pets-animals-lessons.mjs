/**
 * Thêm category "Thú cưng & Động vật" + 10 bài từ ndth74.txt
 *
 * Usage:
 *   node scripts/add-pets-animals-lessons.mjs
 *   node scripts/add-pets-animals-lessons.mjs "C:/Users/DELL/Downloads/ndth74.txt"
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
const sourcePath =
  process.argv[2] || 'C:/Users/DELL/Downloads/ndth74.txt';

const CATEGORY_ID = '23';
const TOPIC = 'Thú cưng & Động vật';
const START_LESSON_NUM = 246;

const LESSON_META = [
  {
    title: 'Tầm quan trọng của động vật',
    description: 'Động vật trong hệ sinh thái và đời sống con người',
    thumb: 'photo-1500530855697-b586d89ba3ee',
  },
  {
    title: 'Lợi ích của việc nuôi thú cưng',
    description: 'Thú cưng mang lại niềm vui và trách nhiệm',
    thumb: 'photo-1548199973-03cce0bbc87b',
  },
  {
    title: 'Bảo vệ động vật',
    description: 'Chung tay bảo vệ động vật và môi trường sống',
    thumb: 'photo-1474511320723-9a56873867b5',
  },
  {
    title: 'Động vật có nguy cơ tuyệt chủng',
    description: 'Hiểu nguyên nhân và cách bảo vệ loài đang bị đe dọa',
    thumb: 'photo-1546182990-dffeafbe841d',
  },
  {
    title: 'Chó – Người bạn của con người',
    description: 'Chó là người bạn trung thành và đáng tin cậy',
    thumb: 'photo-1552053831-71594a27632d',
  },
  {
    title: 'Mèo – Thú cưng phổ biến',
    description: 'Mèo mang lại sự ấm áp và thư giãn mỗi ngày',
    thumb: 'photo-1514888286974-6c03e2ca1dba',
  },
  {
    title: 'Bảo tồn động vật hoang dã',
    description: 'Bảo vệ động vật hoang dã và môi trường tự nhiên',
    thumb: 'photo-1516426122078-c23e76319801',
  },
  {
    title: 'Trí thông minh của động vật',
    description: 'Khám phá khả năng học hỏi và giao tiếp của động vật',
    thumb: 'photo-1544551763-46a013bb70d5',
  },
  {
    title: 'Mối quan hệ giữa con người và động vật',
    description: 'Xây dựng mối quan hệ tôn trọng với động vật',
    thumb: 'photo-1450778869180-41d0601e046e',
  },
  {
    title: 'Tương lai của việc bảo vệ động vật',
    description: 'Cùng hành động để bảo vệ động vật trong tương lai',
    thumb: 'photo-1530789253388-582c481c54b0',
  },
];

function splitSentences(paragraph) {
  const cleaned = paragraph.replace(/\s+/g, ' ').trim();
  return cleaned
    .split(/(?<=[.!?]["']?)(?=\s+[A-Z"'])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (/[.!?]["']?$/.test(s) ? s : `${s}.`));
}

function parseTitleLine(line) {
  const cleaned = line
    .replace(/^Tên bài học:\s*/i, '')
    .replace(/^Bài\s+/i, '')
    .trim();
  const match =
    cleaned.match(/^(\d+)[.:]\s+(.+)$/) || cleaned.match(/^(\d+)\.\s+(.+)$/);
  if (!match) return null;
  return { index: Number(match[1]), rawTitle: match[2].trim() };
}

function parseSource(text) {
  const lessons = [];
  let current = null;
  let bodyLines = [];

  const flush = () => {
    if (!current) return;
    const paragraph = bodyLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!paragraph) return;
    lessons.push({ ...current, sentencesEn: splitSentences(paragraph) });
    current = null;
    bodyLines = [];
  };

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || line === '---') continue;
    if (/^Chủ đề:/i.test(line) || /^Nội dung:/i.test(line)) continue;

    const title = parseTitleLine(line);
    if (title) {
      flush();
      const meta = LESSON_META[title.index - 1];
      if (!meta) {
        throw new Error(`Thiếu LESSON_META cho bài ${title.index}: ${title.rawTitle}`);
      }
      current = {
        index: title.index,
        titleVi: meta.title,
        description: meta.description,
        thumb: meta.thumb,
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
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, Math.min(12, words * 0.38 + 0.8));
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
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'You translate English lesson sentences to clear, natural Vietnamese for A2-B1 learners. Output JSON array only.',
      },
      {
        role: 'user',
        content: `Translate each sentence. Return ONLY a JSON array of strings, same length/order.\n\n${JSON.stringify(sentencesEn, null, 2)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '[]';
  const translated = JSON.parse(
    raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim(),
  );
  if (!Array.isArray(translated) || translated.length !== sentencesEn.length) {
    throw new Error(
      `Translation length mismatch: got ${translated?.length}, expected ${sentencesEn.length}`,
    );
  }
  return translated.map((t) => String(t).trim());
}

function ensureCategory() {
  let src = readFileSync(categoriesPath, 'utf8');
  if (src.includes(`id: '${CATEGORY_ID}'`) || src.includes(`id: "${CATEGORY_ID}"`)) {
    src = src.replace(
      /(id:\s*['"]23['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'thu-cung-dong-vat',
    name: 'Thú cưng & Động vật',
    description: 'Học tiếng Anh về thú cưng, động vật hoang dã và bảo tồn',
    icon: '🐾',
    iconColor: 'bg-amber-600',
    imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=200&h=200&fit=crop',
    lessonCount: ${LESSON_META.length},
  },
];`;

  src = src.replace(
    /\];\s*\n\s*export function getCategoryById/,
    `${block}\n\nexport function getCategoryById`,
  );
  writeFileSync(categoriesPath, src);
  console.log(`Added category ${CATEGORY_ID}: Thú cưng & Động vật`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env');
  }

  const parsed = parseSource(readFileSync(sourcePath, 'utf8'));
  console.log(`Parsed ${parsed.length} lessons from:\n  ${sourcePath}`);
  if (parsed.length !== LESSON_META.length) {
    throw new Error(`Expected ${LESSON_META.length} lessons, got ${parsed.length}`);
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  lessons = lessons.filter((l) => l.categoryId !== CATEGORY_ID);

  const added = [];
  for (const item of parsed) {
    const lessonNum = START_LESSON_NUM + item.index - 1;
    const id = `lesson-${lessonNum}`;
    process.stdout.write(`${id} ${item.titleVi} (${item.sentencesEn.length} câu) ... `);
    const vi = await translateSentences(openai, item.sentencesEn);
    const pairs = item.sentencesEn.map((en, i) => [en, vi[i]]);
    const sentences = buildSentenceObjects(lessonNum, pairs);
    const duration = Math.ceil(sentences.at(-1).time_end);
    added.push({
      id,
      categoryId: CATEGORY_ID,
      title: item.titleVi,
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
  ensureCategory();
  console.log(JSON.stringify({ added: added.length, ids: added.map((l) => l.id) }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
