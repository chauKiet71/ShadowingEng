/**
 * Thêm category "Lịch sử & Di sản" + 10 bài từ ndth73.txt
 *
 * Usage:
 *   node scripts/add-history-heritage-lessons.mjs
 *   node scripts/add-history-heritage-lessons.mjs "C:/Users/DELL/Downloads/ndth73.txt"
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
  process.argv[2] || 'C:/Users/DELL/Downloads/ndth73.txt';

const CATEGORY_ID = '22';
const TOPIC = 'Lịch sử & Di sản';
const START_LESSON_NUM = 236;

const LESSON_META = [
  {
    title: 'Tầm quan trọng của lịch sử',
    description: 'Học lịch sử để hiểu quá khứ và định hướng tương lai',
    thumb: 'photo-1488190211105-8b0e65b80b4e',
  },
  {
    title: 'Di sản văn hóa',
    description: 'Giữ gìn truyền thống, lễ hội và giá trị văn hóa dân tộc',
    thumb: 'photo-1548013146-72479768bada',
  },
  {
    title: 'Nhân vật lịch sử nổi tiếng',
    description: 'Học hỏi từ những nhân vật đã thay đổi thế giới',
    thumb: 'photo-1529156069898-49953e39b3ac',
  },
  {
    title: 'Các nền văn minh cổ đại',
    description: 'Khám phá Ai Cập, Hy Lạp, La Mã và Trung Hoa cổ đại',
    thumb: 'photo-1469854523086-cc02fe5d8800',
  },
  {
    title: 'Công trình và di tích lịch sử',
    description: 'Bảo tồn đền đài, lâu đài và các di tích lịch sử',
    thumb: 'photo-1552832230-c0197dd311b5',
  },
  {
    title: 'Lễ hội truyền thống',
    description: 'Giữ gìn lễ hội như một phần di sản văn hóa',
    thumb: 'photo-1511895426328-dc8714191300',
  },
  {
    title: 'Bảo tàng và tầm quan trọng của chúng',
    description: 'Vai trò của bảo tàng trong giáo dục và bảo tồn lịch sử',
    thumb: 'photo-1517457373958-b7bdd4587205',
  },
  {
    title: 'Bảo vệ di sản thế giới',
    description: 'Chung tay bảo vệ các di sản văn hóa và thiên nhiên',
    thumb: 'photo-1501785888041-af3ef285b470',
  },
  {
    title: 'Di sản địa phương và bản sắc cộng đồng',
    description: 'Giữ bản sắc địa phương qua nghề truyền thống và phong tục',
    thumb: 'photo-1491438590914-bc09fcaaf77a',
  },
  {
    title: 'Vai trò của giới trẻ trong bảo tồn di sản',
    description: 'Thanh niên cùng bảo tồn và lan tỏa di sản văn hóa',
    thumb: 'photo-1522202176988-66273c2fd55f',
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
      /(id:\s*['"]22['"][\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, src);
    console.log(`Updated category ${CATEGORY_ID} lessonCount=${LESSON_META.length}`);
    return;
  }

  const block = `  {
    id: '${CATEGORY_ID}',
    slug: 'lich-su-di-san',
    name: 'Lịch sử & Di sản',
    description: 'Học tiếng Anh về lịch sử, di sản văn hóa và bảo tồn',
    icon: '🏛️',
    iconColor: 'bg-stone-500',
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=200&h=200&fit=crop',
    lessonCount: ${LESSON_META.length},
  },
];`;

  src = src.replace(
    /\];\s*\n\s*export function getCategoryById/,
    `${block}\n\nexport function getCategoryById`,
  );
  writeFileSync(categoriesPath, src);
  console.log(`Added category ${CATEGORY_ID}: Lịch sử & Di sản`);
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Thiếu OPENAI_API_KEY trong backend/.env');
  }

  for (const t of [...new Set(LESSON_META.map((m) => m.thumb))]) {
    const r = await fetch(`https://images.unsplash.com/${t}?w=600&h=340&fit=crop`, {
      method: 'HEAD',
    });
    if (r.status !== 200) {
      console.warn(`Thumb may be unavailable (${r.status}): ${t}`);
    }
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
      level: 'INTERMEDIATE',
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
