/**
 * Thêm category "Ẩm thực" + 10 bài từ nd_am_thuc.txt
 * EN tách theo câu; VI dịch bằng OpenAI (OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/add-cuisine-lessons.mjs
 *   node scripts/add-cuisine-lessons.mjs "C:/Users/DELL/Downloads/nd_am_thuc.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/nd_am_thuc.txt';

const CATEGORY_ID = '18';
const TOPIC = 'Ẩm thực';
const START_LESSON_NUM = 196;

const LESSON_META = [
  {
    title: 'Ăn uống lành mạnh',
    description: 'Chế độ ăn cân bằng giúp khỏe mạnh và đầy năng lượng',
    thumb: 'photo-1512621776951-a57141f2eefd',
  },
  {
    title: 'Nấu ăn tại nhà',
    description: 'Nấu ăn tại nhà giúp tiết kiệm và gắn kết gia đình',
    thumb: 'photo-1556910103-1c02745aae4d',
  },
  {
    title: 'Ẩm thực đường phố',
    description: 'Khám phá món đường phố và lưu ý an toàn thực phẩm',
    thumb: 'photo-1504674900247-0877df9cc836',
  },
  {
    title: 'Món ăn truyền thống',
    description: 'Giữ gìn văn hóa qua các món ăn truyền thống',
    thumb: 'photo-1555126634-323283e090fa',
  },
  {
    title: 'Ẩm thực quốc tế',
    description: 'Khám phá hương vị và văn hóa ẩm thực các nước',
    thumb: 'photo-1414235077428-338989a2e8c0',
  },
  {
    title: 'Ăn tại nhà hàng',
    description: 'Trải nghiệm nhà hàng và phép lịch sự khi dùng bữa',
    thumb: 'photo-1517248135467-4c7edcad34c4',
  },
  {
    title: 'An toàn thực phẩm',
    description: 'Thói quen giữ thực phẩm sạch và an toàn mỗi ngày',
    thumb: 'photo-1606787366850-de6330128bfc',
  },
  {
    title: 'Chế độ ăn chay và thuần chay',
    description: 'Hiểu chế độ vegetarian và vegan một cách cân bằng',
    thumb: 'photo-1540420773420-3366772f4999',
  },
  {
    title: 'Đồ ăn nhanh – Lợi ích và hạn chế',
    description: 'Cân nhắc lợi ích và rủi ro của đồ ăn nhanh',
    thumb: 'photo-1568901346375-23c9450c58cd',
  },
  {
    title: 'Thử những món ăn mới',
    description: 'Mở rộng trải nghiệm bằng cách khám phá món mới',
    thumb: 'photo-1540189549336-e6e99c3679fe',
  },
];

function splitSentences(paragraph) {
  const cleaned = paragraph.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(/(?<=[.!?]["']?)(?=\s+[A-Z"'])/);
  return parts
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
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
    if (!line || line === '---') continue;
    if (/^Chủ đề:/i.test(line)) continue;
    if (/^Nội dung:/i.test(line)) continue;

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
      /(id:\s*['"]18['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'am-thuc',
    name: 'Ẩm thực',
    description: 'Học tiếng Anh về món ăn, nấu nướng và văn hóa ẩm thực',
    icon: '🍜',
    iconColor: 'bg-orange-500',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop',
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
  console.log(`Added category ${CATEGORY_ID}: Ẩm thực`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env để dịch tiếng Việt');
  }

  for (const t of LESSON_META.map((m) => m.thumb)) {
    const r = await fetch(`https://images.unsplash.com/${t}?w=600&h=340&fit=crop`, {
      method: 'HEAD',
    });
    if (r.status !== 200) throw new Error(`Thumb 404: ${t}`);
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
      level: 'BEGINNER',
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
