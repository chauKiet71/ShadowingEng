/**
 * Thêm category "Thiết bị di động" + 10 bài từ nd_thiet_bi_di_dong.txt
 * EN tách theo câu; VI dịch bằng OpenAI (OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/add-mobile-devices-lessons.mjs
 *   node scripts/add-mobile-devices-lessons.mjs "C:/Users/DELL/Downloads/nd_thiet_bi_di_dong.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/nd_thiet_bi_di_dong.txt';

const CATEGORY_ID = '13';
const TOPIC = 'Thiết bị di động';
const START_LESSON_NUM = 146;

const LESSON_META = [
  {
    title: 'Điện thoại thông minh',
    description: 'Tìm hiểu smartphone và vai trò trong đời sống hiện đại',
    thumb: 'photo-1511707171634-5f897ff02aa9',
  },
  {
    title: 'Chọn điện thoại phù hợp',
    description: 'Các tiêu chí chọn smartphone phù hợp nhu cầu và ngân sách',
    thumb: 'photo-1592899677977-9c10ca588bbd',
  },
  {
    title: 'Cài đặt ứng dụng',
    description: 'Cách tải, cài đặt và cập nhật ứng dụng an toàn',
    thumb: 'photo-1551650975-87deedd944c3',
  },
  {
    title: 'Bảo quản điện thoại',
    description: 'Bảo vệ máy, pin và màn hình để dùng lâu hơn',
    thumb: 'photo-1601784551446-20c9e07cdbdb',
  },
  {
    title: 'So sánh các hệ điều hành',
    description: 'So sánh Android và iOS khi chọn điện thoại',
    thumb: 'photo-1512941937669-90a1b58e7e9c',
  },
  {
    title: 'Bảo mật thiết bị',
    description: 'Bảo vệ dữ liệu cá nhân trên smartphone',
    thumb: 'photo-1614064641938-3bbee52942c7',
  },
  {
    title: 'Đồng bộ dữ liệu',
    description: 'Đồng bộ ảnh, liên hệ và tệp qua đám mây giữa các thiết bị',
    thumb: 'photo-1451187580459-43490279c0fa',
  },
  {
    title: 'Xu hướng thiết bị di động',
    description: 'Các xu hướng mới: màn gập, sạc nhanh và AI',
    thumb: 'photo-1556656793-08538906a9f8',
  },
  {
    title: 'AI trên điện thoại',
    description: 'Trí tuệ nhân tạo hỗ trợ camera, pin và trợ lý ảo',
    thumb: 'photo-1677442136019-21780ecad995',
  },
  {
    title: 'Tương lai thiết bị di động',
    description: 'Công nghệ sẽ định hình smartphone trong tương lai',
    thumb: 'photo-1555774698-0b77e0d5fac6',
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
      /(id:\s*['"]13['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'thiet-bi-di-dong',
    name: 'Thiết bị di động',
    description: 'Học tiếng Anh về smartphone và công nghệ di động',
    icon: '📱',
    iconColor: 'bg-sky-500',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
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
  console.log(`Added category ${CATEGORY_ID}: Thiết bị di động`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env để dịch tiếng Việt');
  }

  // Verify thumbs used in LESSON_META (quick fail on 404)
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
