/**
 * Thêm category "Tài chính cá nhân" + 10 bài từ nd_taichinh.txt
 * EN tách theo câu; VI dịch bằng OpenAI (OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/add-personal-finance-lessons.mjs
 *   node scripts/add-personal-finance-lessons.mjs "C:/Users/DELL/Downloads/nd_taichinh.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/nd_taichinh.txt';

const CATEGORY_ID = '16';
const TOPIC = 'Tài chính cá nhân';
const START_LESSON_NUM = 176;

const LESSON_META = [
  {
    title: 'Tiết kiệm tiền',
    description: 'Xây dựng thói quen tiết kiệm và chuẩn bị cho tương lai',
    thumb: 'photo-1553729459-efe14ef6055d',
  },
  {
    title: 'Lập ngân sách',
    description: 'Theo dõi thu chi và lập ngân sách hàng tháng',
    thumb: 'photo-1554224155-6726b3ff858f',
  },
  {
    title: 'Mua sắm thông minh',
    description: 'So sánh giá và tránh mua sắm bốc đồng',
    thumb: 'photo-1556742049-0cfed4f6a45d',
  },
  {
    title: 'Nhu cầu và mong muốn',
    description: 'Phân biệt nhu cầu thiết yếu và mong muốn cá nhân',
    thumb: 'photo-1454165804606-c3d57bc86b40',
  },
  {
    title: 'Ngân hàng trực tuyến',
    description: 'Sử dụng ngân hàng online tiện lợi và an toàn',
    thumb: 'photo-1563986768609-322da13575f3',
  },
  {
    title: 'Sử dụng thẻ tín dụng thông minh',
    description: 'Dùng thẻ tín dụng có trách nhiệm, tránh nợ xấu',
    thumb: 'photo-1556742111-a301076d9d18',
  },
  {
    title: 'Tránh nợ nần',
    description: 'Kiểm soát vay mượn và giữ ổn định tài chính',
    thumb: 'photo-1559526324-4b87b5e36e44',
  },
  {
    title: 'Quỹ tiết kiệm khẩn cấp',
    description: 'Xây quỹ dự phòng cho các tình huống bất ngờ',
    thumb: 'photo-1633158829585-23ba8f7c8caf',
  },
  {
    title: 'Mục tiêu tài chính',
    description: 'Đặt mục tiêu ngắn hạn và dài hạn về tiền bạc',
    thumb: 'photo-1460925895917-afdab827c52f',
  },
  {
    title: 'Đầu tư cơ bản',
    description: 'Hiểu rủi ro và cách bắt đầu đầu tư dài hạn',
    thumb: 'photo-1611974789855-9c2a0a7236a3',
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
      /(id:\s*['"]16['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'tai-chinh-ca-nhan',
    name: 'Tài chính cá nhân',
    description: 'Học tiếng Anh về tiết kiệm, ngân sách và đầu tư',
    icon: '💰',
    iconColor: 'bg-emerald-500',
    imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=200&h=200&fit=crop',
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
  console.log(`Added category ${CATEGORY_ID}: Tài chính cá nhân`);
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
