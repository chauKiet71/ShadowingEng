/**
 * Thêm category "Cung & Cầu" + 10 bài từ nd_cung_cau.txt
 * EN tách theo câu; VI dịch bằng OpenAI (OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/add-supply-demand-lessons.mjs
 *   node scripts/add-supply-demand-lessons.mjs "C:/Users/DELL/Downloads/nd_cung_cau.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/nd_cung_cau.txt';

const CATEGORY_ID = '14';
const TOPIC = 'Cung & Cầu';
const START_LESSON_NUM = 156;

const LESSON_META = [
  {
    title: 'Cung và cầu là gì?',
    description: 'Khái niệm cơ bản về cung, cầu và giá cả trên thị trường',
    thumb: 'photo-1611974789855-9c2a0a7236a3',
  },
  {
    title: 'Quy luật cung cầu',
    description: 'Cách quy luật cung cầu quyết định giá trong thị trường',
    thumb: 'photo-1553729459-efe14ef6055d',
  },
  {
    title: 'Giá cả và cung cầu',
    description: 'Giá cả truyền tín hiệu cho người mua và người bán',
    thumb: 'photo-1554224155-6726b3ff858f',
  },
  {
    title: 'Ví dụ về cung cầu',
    description: 'Các ví dụ đời thường về vé concert, trái cây và nhà ở',
    thumb: 'photo-1556742049-0cfed4f6a45d',
  },
  {
    title: 'Cung cầu trong đời sống',
    description: 'Cung cầu ảnh hưởng đến giá cả hàng ngày như thế nào',
    thumb: 'photo-1556740758-90de374c12ad',
  },
  {
    title: 'Yếu tố ảnh hưởng cầu',
    description: 'Thu nhập, sở thích và kỳ vọng làm thay đổi cầu',
    thumb: 'photo-1460925895917-afdab827c52f',
  },
  {
    title: 'Yếu tố ảnh hưởng cung',
    description: 'Chi phí, công nghệ và chính sách ảnh hưởng đến cung',
    thumb: 'photo-1507679799987-c73779587ccf',
  },
  {
    title: 'Cân bằng thị trường',
    description: 'Điểm cân bằng khi cung bằng cầu trên thị trường',
    thumb: 'photo-1590283603385-17ffb3a7f29f',
  },
  {
    title: 'Cung cầu và lạm phát',
    description: 'Mối liên hệ giữa cung cầu và lạm phát giá cả',
    thumb: 'photo-1526304640581-d334cdbbf45e',
  },
  {
    title: 'Cung cầu trong kinh tế toàn cầu',
    description: 'Cung cầu toàn cầu và chuỗi cung ứng quốc tế',
    thumb: 'photo-1486406146926-c627a92ad1ab',
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

function parseSource(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const lessons = [];
  let current = null;
  let bodyLines = [];

  const flush = () => {
    if (!current) return;
    const paragraph = bodyLines
      .join(' ')
      .replace(/\\+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!paragraph) return;
    lessons.push({
      ...current,
      sentencesEn: splitSentences(paragraph),
    });
    current = null;
    bodyLines = [];
  };

  for (const raw of lines) {
    const line = raw.trim().replace(/\\+$/g, '').trim();
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
      /(id:\s*['"]14['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'cung-cau',
    name: 'Cung & Cầu',
    description: 'Học tiếng Anh về kinh tế: cung, cầu và thị trường',
    icon: '📈',
    iconColor: 'bg-amber-500',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=200&fit=crop',
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
  console.log(`Added category ${CATEGORY_ID}: Cung & Cầu`);
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
