/**
 * Thêm category "Ngôn ngữ & Văn hóa" + 10 bài từ nd_ngon_ngu.txt
 * EN tách theo câu; VI dịch bằng OpenAI (OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/add-language-culture-lessons.mjs
 *   node scripts/add-language-culture-lessons.mjs "C:/Users/DELL/Downloads/nd_ngon_ngu.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/nd_ngon_ngu.txt';

const CATEGORY_ID = '12';
const TOPIC = 'Ngôn ngữ & Văn hóa';
const START_LESSON_NUM = 136;

const LESSON_META = [
  {
    title: 'Chào hỏi ở các quốc gia',
    description: 'Cách chào hỏi và bày tỏ sự tôn trọng ở nhiều nền văn hóa',
    thumb: 'photo-1529156069898-49953e39b3ac',
  },
  {
    title: 'Ngôn ngữ trên thế giới',
    description: 'Đa dạng ngôn ngữ thế giới và tầm quan trọng của việc bảo tồn',
    thumb: 'photo-1546410531-bb4caa6b424d',
  },
  {
    title: 'Cử chỉ và ý nghĩa',
    description: 'Ngôn ngữ cơ thể và ý nghĩa khác nhau giữa các nền văn hóa',
    thumb: 'photo-1573496359142-b8d87734a5a2',
  },
  {
    title: 'Lễ hội truyền thống',
    description: 'Các lễ hội văn hóa gắn kết cộng đồng trên thế giới',
    thumb: 'photo-1514525253161-7a46d19cd819',
  },
  {
    title: 'Khác biệt văn hóa',
    description: 'Hiểu sự khác biệt về thời gian, không gian và phép lịch sự',
    thumb: 'photo-1521737711867-e3b97375f902',
  },
  {
    title: 'Văn hóa giao tiếp',
    description: 'Giao tiếp trực tiếp, gián tiếp và kỹ năng lắng nghe liên văn hóa',
    thumb: 'photo-1556761175-b413da4baf72',
  },
  {
    title: 'Thành ngữ trong cuộc sống',
    description: 'Thành ngữ tiếng Anh và cách dùng trong đời sống',
    thumb: 'photo-1455390582262-044cdead277a',
  },
  {
    title: 'Sốc văn hóa',
    description: 'Nhận biết và vượt qua sốc văn hóa khi sống ở nước ngoài',
    thumb: 'photo-1488646953014-85cb44e25828',
  },
  {
    title: 'Bảo tồn ngôn ngữ',
    description: 'Bảo vệ ngôn ngữ bản địa và bản sắc văn hóa',
    thumb: 'photo-1503676260728-1c00da094a0b',
  },
  {
    title: 'Toàn cầu hóa và văn hóa',
    description: 'Toàn cầu hóa ảnh hưởng thế nào đến bản sắc văn hóa địa phương',
    thumb: 'photo-1526778548025-fa2f459cd5c1',
  },
];

function splitSentences(paragraph) {
  const cleaned = paragraph.replace(/\s+/g, ' ').trim();
  // Split after .!? (optional closing quote) when the next token starts a new sentence.
  const parts = cleaned.split(/(?<=[.!?]["']?)(?=\s+[A-Z"'])/);
  return parts
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => (/[.!?]["']?$/.test(s) ? s : `${s}.`));
}

function parseSource(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const lessons = [];
  let current = null;
  let bodyLines = [];

  const flush = () => {
    if (!current) return;
    const paragraph = bodyLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!paragraph) return;
    lessons.push({
      ...current,
      sentencesEn: splitSentences(paragraph),
    });
    current = null;
    bodyLines = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^Chủ đề:/i.test(line)) continue;

    const titleMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (titleMatch) {
      flush();
      const index = Number(titleMatch[1]);
      const meta = LESSON_META[index - 1];
      if (!meta) {
        throw new Error(`Thiếu LESSON_META cho bài ${index}: ${titleMatch[2]}`);
      }
      current = {
        index,
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
  const prompt = `Translate each English sentence to natural Vietnamese for English learners (A2-B1).
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

function ensureCategory() {
  let src = readFileSync(categoriesPath, 'utf8');
  if (src.includes(`id: '${CATEGORY_ID}'`) || src.includes(`id: "${CATEGORY_ID}"`)) {
    src = src.replace(
      /(id:\s*['"]12['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'ngon-ngu-van-hoa',
    name: 'Ngôn ngữ & Văn hóa',
    description: 'Khám phá ngôn ngữ và văn hóa các nước qua tiếng Anh',
    icon: '🌍',
    iconColor: 'bg-violet-500',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&h=200&fit=crop',
    lessonCount: ${LESSON_META.length},
  },
];`;

  if (!src.includes('];')) {
    throw new Error('Không tìm thấy kết thúc mảng categories');
  }
  src = src.replace(
    /\];\s*\n\s*export function getCategoryById/,
    `${block}\n\nexport function getCategoryById`,
  );
  writeFileSync(categoriesPath, src);
  console.log(`Added category ${CATEGORY_ID}: Ngôn ngữ & Văn hóa`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env để dịch tiếng Việt');
  }

  const source = readFileSync(sourcePath, 'utf8');
  const parsed = parseSource(source);
  console.log(`Parsed ${parsed.length} lessons from:\n  ${sourcePath}`);

  if (parsed.length !== LESSON_META.length) {
    throw new Error(
      `Expected ${LESSON_META.length} lessons, got ${parsed.length}`,
    );
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
  lessons = lessons.filter((l) => l.categoryId !== CATEGORY_ID);

  const added = [];

  for (const item of parsed) {
    const lessonNum = START_LESSON_NUM + item.index - 1;
    const id = `lesson-${lessonNum}`;
    process.stdout.write(
      `${id} ${item.titleVi} (${item.sentencesEn.length} câu) ... `,
    );

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
      level: 'INTERMEDIATE',
      topic: TOPIC,
      sentences,
    });
    console.log(`~${duration}s`);
  }

  lessons.push(...added);
  writeFileSync(lessonsPath, `${JSON.stringify(lessons, null, 2)}\n`);
  ensureCategory();

  console.log(
    JSON.stringify(
      {
        totalLessons: lessons.length,
        added: added.length,
        ids: added.map((l) => l.id),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
