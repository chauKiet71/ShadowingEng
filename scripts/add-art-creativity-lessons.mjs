/**
 * Thêm category "Nghệ thuật & Sáng tạo" + 10 bài từ ndth75.txt
 *
 * Usage:
 *   node scripts/add-art-creativity-lessons.mjs
 *   node scripts/add-art-creativity-lessons.mjs "C:/Users/DELL/Downloads/ndth75.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/ndth75.txt';

const CATEGORY_ID = '24';
const TOPIC = 'Nghệ thuật & Sáng tạo';
const START_LESSON_NUM = 256;

const LESSON_META = [
  {
    title: 'Tầm quan trọng của nghệ thuật',
    description: 'Nghệ thuật giúp thể hiện cảm xúc và kết nối con người',
    thumb: 'photo-1513364776144-60967b0f800f',
  },
  {
    title: 'Sự sáng tạo trong cuộc sống hằng ngày',
    description: 'Phát triển tư duy sáng tạo trong học tập và công việc',
    thumb: 'photo-1454165804606-c3d57bc86b40',
  },
  {
    title: 'Sức mạnh của âm nhạc',
    description: 'Âm nhạc giảm stress và gắn kết văn hóa',
    thumb: 'photo-1511379938547-c1f69419868d',
  },
  {
    title: 'Hội họa và nghệ thuật thị giác',
    description: 'Truyền tải ý tưởng qua màu sắc và hình ảnh',
    thumb: 'photo-1460661419201-fd4cecdf8a8b',
  },
  {
    title: 'Văn học và kể chuyện',
    description: 'Văn học nuôi dưỡng trí tưởng tượng và giá trị sống',
    thumb: 'photo-1481627834876-b7833e8f5570',
  },
  {
    title: 'Vai trò của nghệ sĩ',
    description: 'Nghệ sĩ lan tỏa sáng tạo và giá trị văn hóa',
    thumb: 'photo-1460661419201-fd4cecdf8a8b',
  },
  {
    title: 'Nghệ thuật số và công nghệ',
    description: 'Công nghệ mở rộng khả năng sáng tạo nghệ thuật',
    thumb: 'photo-1550745165-9bc0b252726f',
  },
  {
    title: 'Nghệ thuật và cảm xúc',
    description: 'Nghệ thuật giúp thể hiện và thấu hiểu cảm xúc',
    thumb: 'photo-1491438590914-bc09fcaaf77a',
  },
  {
    title: 'Sáng tạo và đổi mới',
    description: 'Sáng tạo và đổi mới thúc đẩy tiến bộ xã hội',
    thumb: 'photo-1488190211105-8b0e65b80b4e',
  },
  {
    title: 'Tương lai của nghệ thuật',
    description: 'Nghệ thuật tiếp tục phát triển với công nghệ mới',
    thumb: 'photo-1516321318423-f06f85e504b3',
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
      /(id:\s*['"]24['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'nghe-thuat-sang-tao',
    name: 'Nghệ thuật & Sáng tạo',
    description: 'Học tiếng Anh về nghệ thuật, âm nhạc, văn học và sáng tạo',
    icon: '🎨',
    iconColor: 'bg-pink-500',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop',
    lessonCount: ${LESSON_META.length},
  },
];`;

  src = src.replace(
    /\];\s*\n\s*export function getCategoryById/,
    `${block}\n\nexport function getCategoryById`,
  );
  writeFileSync(categoriesPath, src);
  console.log(`Added category ${CATEGORY_ID}: Nghệ thuật & Sáng tạo`);
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
