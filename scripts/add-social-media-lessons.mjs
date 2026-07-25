/**
 * Thêm category "Mạng xã hội & Sáng tạo nội dung" + 10 bài từ nd_mxh.txt
 * EN tách theo câu; VI dịch bằng OpenAI (OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/add-social-media-lessons.mjs
 *   node scripts/add-social-media-lessons.mjs "C:/Users/DELL/Downloads/nd_mxh.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/nd_mxh.txt';

const CATEGORY_ID = '19';
const TOPIC = 'Mạng xã hội & Sáng tạo nội dung';
const START_LESSON_NUM = 206;

const LESSON_META = [
  {
    title: 'Mạng xã hội',
    description: 'Sử dụng mạng xã hội có trách nhiệm và cân bằng',
    thumb: 'photo-1611162617474-5b21e879e113',
  },
  {
    title: 'Tạo video ngắn',
    description: 'Lên ý tưởng, quay và dựng video ngắn hấp dẫn',
    thumb: 'photo-1492691527719-9d1e07e534b4',
  },
  {
    title: 'Trở thành nhà sáng tạo nội dung',
    description: 'Xây dựng sự nghiệp sáng tạo nội dung bền vững',
    thumb: 'photo-1516321318423-f06f85e504b3',
  },
  {
    title: 'Xây dựng thương hiệu cá nhân',
    description: 'Tạo hình ảnh cá nhân chân thực và đáng tin trên mạng',
    thumb: 'photo-1432888498266-38ffec3eaf0a',
  },
  {
    title: 'An toàn trên Internet',
    description: 'Bảo vệ thông tin cá nhân và tránh rủi ro trực tuyến',
    thumb: 'photo-1563986768609-322da13575f3',
  },
  {
    title: 'Giao tiếp trực tuyến',
    description: 'Giao tiếp lịch sự và rõ ràng trên các nền tảng số',
    thumb: 'photo-1516321497487-e288fb19713f',
  },
  {
    title: 'Tiếp thị qua người có sức ảnh hưởng',
    description: 'Hiểu influencer marketing và cách tiếp cận thông minh',
    thumb: 'photo-1557838923-2985c318be48',
  },
  {
    title: 'Đối mặt với bình luận tiêu cực',
    description: 'Giữ bình tĩnh và xử lý phản hồi tiêu cực trên mạng',
    thumb: 'photo-1516321318423-f06f85e504b3',
  },
  {
    title: 'Tạo nội dung có giá trị',
    description: 'Tạo nội dung hữu ích thay vì chỉ chạy theo lượt xem',
    thumb: 'photo-1454165804606-c3d57bc86b40',
  },
  {
    title: 'Quản lý thời gian sử dụng màn hình',
    description: 'Cân bằng thời gian online và offline để sống khỏe hơn',
    thumb: 'photo-1512941937669-90a1b58e7e9c',
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
  const named = line.match(/^Tên bài học:\s*(.+)$/i);
  if (named) {
    const rest = named[1].trim();
    const withNum = rest.match(/^(?:bài\s+)?(\d+)[.:]\s+(.+)$/i);
    if (withNum) {
      return { index: Number(withNum[1]), rawTitle: withNum[2].trim() };
    }
    return { index: 1, rawTitle: rest };
  }

  const cleaned = line.replace(/^Bài\s+/i, '').trim();
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
      /(id:\s*['"]19['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'mang-xa-hoi-sang-tao-noi-dung',
    name: 'Mạng xã hội & Sáng tạo nội dung',
    description: 'Học tiếng Anh về mạng xã hội, video ngắn và sáng tạo nội dung',
    icon: '📱',
    iconColor: 'bg-indigo-500',
    imageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop',
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
  console.log(`Added category ${CATEGORY_ID}: Mạng xã hội & Sáng tạo nội dung`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env để dịch tiếng Việt');
  }

  for (const t of [...new Set(LESSON_META.map((m) => m.thumb))]) {
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
