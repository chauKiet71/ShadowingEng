/**
 * Thêm category "Gia đình & Nuôi dạy con" + 10 bài từ nd_giao_tiep.txt
 * (File: Chủ đề Gia đình & Nuôi dạy con — không phải Thiết bị di động)
 * EN tách theo câu; VI dịch bằng OpenAI (OPENAI_API_KEY).
 *
 * Usage:
 *   node scripts/add-family-parenting-lessons.mjs
 *   node scripts/add-family-parenting-lessons.mjs "C:/Users/DELL/Downloads/nd_giao_tiep.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/nd_giao_tiep.txt';

const CATEGORY_ID = '15';
const TOPIC = 'Gia đình & Nuôi dạy con';
const START_LESSON_NUM = 166;

const LESSON_META = [
  {
    title: 'Giao tiếp trong gia đình',
    description: 'Lắng nghe, nói thật và gắn kết thành viên trong nhà',
    thumb: 'photo-1511895426328-dc8714191300',
  },
  {
    title: 'Dành thời gian cùng gia đình',
    description: 'Hoạt động đơn giản giúp xây dựng tình cảm gia đình',
    thumb: 'photo-1609220136736-443140cffec6',
  },
  {
    title: 'Tôn trọng cha mẹ',
    description: 'Thể hiện lòng biết ơn và tôn trọng với cha mẹ',
    thumb: 'photo-1476703993599-0035a21b17a9',
  },
  {
    title: 'Truyền thống gia đình',
    description: 'Giữ gìn phong tục và kỷ niệm qua các thế hệ',
    thumb: 'photo-1544776193-352d25ca82cd',
  },
  {
    title: 'Kỷ niệm những dịp đặc biệt',
    description: 'Sinh nhật, ngày lễ và những khoảnh khắc đáng nhớ',
    thumb: 'photo-1464349095431-e9a21285b5f3',
  },
  {
    title: 'Giải quyết mâu thuẫn trong gia đình',
    description: 'Nói chuyện bình tĩnh để hóa giải bất đồng',
    thumb: 'photo-1529156069898-49953e39b3ac',
  },
  {
    title: 'Chăm sóc người lớn tuổi trong gia đình',
    description: 'Yêu thương và hỗ trợ ông bà, người lớn tuổi',
    thumb: 'photo-1581579438747-1dc8d17bbce4',
  },
  {
    title: 'Giá trị gia đình',
    description: 'Những nguyên tắc giúp gia đình gắn bó và hạnh phúc',
    thumb: 'photo-1491438590914-bc09fcaaf77a',
  },
  {
    title: 'Mối quan hệ anh chị em',
    description: 'Xây dựng tình anh chị em dựa trên tôn trọng và hỗ trợ',
    thumb: 'photo-1503454537195-1dcabb73ffb9',
  },
  {
    title: 'Cân bằng giữa gia đình và công việc',
    description: 'Sắp xếp thời gian để vừa làm việc vừa gắn bó gia đình',
    thumb: 'photo-1600880292203-757bb62b4baf',
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
    let line = raw.trim();
    if (!line) continue;
    if (/^Chủ đề:/i.test(line)) continue;
    if (/^Nội dung:/i.test(line)) continue;

    line = line.replace(/^Tên bài học:\s*/i, '');

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
      /(id:\s*['"]15['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'gia-dinh-nuoi-day-con',
    name: 'Gia đình & Nuôi dạy con',
    description: 'Giao tiếp và gắn kết trong gia đình qua tiếng Anh',
    icon: '👨‍👩‍👧‍👦',
    iconColor: 'bg-rose-400',
    imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=200&h=200&fit=crop',
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
  console.log(`Added category ${CATEGORY_ID}: Gia đình & Nuôi dạy con`);
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
