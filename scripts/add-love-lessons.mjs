import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsPath = join(root, 'client/src/data/lessons.json');
const categoriesPath = join(root, 'client/src/data/categories.ts');
const docPath = 'D:\\Code\\ShowdingEng\\_docx_love.txt';

const CATEGORY_ID = '10';
const TOPIC = 'Tình yêu';
const START_LESSON_NUM = 93;

const LESSON_META = [
  {
    title: 'Làm quen',
    description: 'Làm quen tại quán cà phê và xin số điện thoại',
    thumb: 'photo-1495474472287-4d71bcdd2085',
  },
  {
    title: 'Hẹn hò đầu tiên',
    description: 'Buổi hẹn hò đầu tiên tại nhà hàng Ý',
    thumb: 'photo-1517248135467-4c7edcad34c4',
  },
  {
    title: 'Lời tỏ tình',
    description: 'Thổ lộ tình cảm với người bạn thân',
    thumb: 'photo-1518199266791-5375a83190b7',
  },
  {
    title: 'Giận hờn',
    description: 'Tranh cãi và chia sẻ cảm xúc khi giận hờn',
    thumb: 'photo-1516589178581-6cd7833ae3b2',
  },
  {
    title: 'Làm hòa',
    description: 'Xin lỗi và làm lành sau cãi vã',
    thumb: 'photo-1529333166437-7750a6dd5a70',
  },
  {
    title: 'Kỷ niệm ngày yêu',
    description: 'Kỷ niệm ngày yêu và nhìn lại hành trình bên nhau',
    thumb: 'photo-1522673607200-164d1b6ce486',
  },
  {
    title: 'Gặp gỡ gia đình',
    description: 'Gặp bố mẹ lần đầu và tạo ấn tượng tốt',
    thumb: 'photo-1511895426328-dc8714191300',
  },
  {
    title: 'Yêu xa',
    description: 'Duy trì mối quan hệ khi phải sống xa nhau',
    thumb: 'photo-1529156069898-49953e39b3ac',
  },
  {
    title: 'Cầu hôn',
    description: 'Khoảnh khắc cầu hôn và lời hứa bên nhau',
    thumb: 'photo-1465495976277-4387d4b0b4c6',
  },
  {
    title: 'Chuẩn bị đám cưới',
    description: 'Lên kế hoạch và chuẩn bị cho ngày cưới',
    thumb: 'photo-1519741497674-611481863552',
  },
];

function estimateDuration(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2.2, Math.min(10, words * 0.38 + 0.8));
}

function cleanEnglish(raw) {
  let text = raw.trim();
  text = text.replace(/^"+|"+$/g, '').trim();
  text = text.replace(/\bcan t\b/gi, "can't");
  text = text.replace(/\bdidn t\b/gi, "didn't");
  text = text.replace(/\bdon t\b/gi, "don't");
  text = text.replace(/\bisn t\b/gi, "isn't");
  text = text.replace(/\baren t\b/gi, "aren't");
  text = text.replace(/\bwont\b/gi, "won't");
  text = text.replace(/\bim\b/gi, "I'm");
  return text;
}

function cleanPhonetic(raw) {
  let p = raw.trim();
  p = p.replace(/ë/g, 'ə').replace(/á/g, 'a').replace(/í/g, 'i');
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/')) p = `${p}/`;
  return p;
}

function cleanVietnamese(raw) {
  return raw.trim().replace(/\s+/g, ' ');
}

function parseLessons(text) {
  const lines = text.split(/\r?\n/);
  const lessons = [];
  let current = null;

  for (const line of lines) {
    const lessonMatch = line.match(/^Bài\s+(\d+):\s*(.+)$/i);
    if (lessonMatch) {
      if (current) lessons.push(current);
      current = {
        index: Number(lessonMatch[1]),
        titleFromDoc: lessonMatch[2].trim(),
        sentences: [],
      };
      continue;
    }
    if (!current) continue;

    const m = line.match(
      /^[A-Za-z]+:\s*"(.+?)"\s*(\/[^/]+\/)\s*\((.+)\)\s*$/,
    );
    if (m) {
      current.sentences.push({
        english: cleanEnglish(m[1]),
        phonetic: cleanPhonetic(m[2]),
        vietnamese: cleanVietnamese(m[3]),
      });
    }
  }
  if (current) lessons.push(current);
  return lessons;
}

function buildSentenceObjects(lessonNum, pairs) {
  let time = 0;
  return pairs.map((pair, index) => {
    const duration = estimateDuration(pair.english);
    const sentence = {
      id: `${lessonNum}-${index + 1}`,
      english: pair.english,
      phonetic: pair.phonetic,
      vietnamese: pair.vietnamese,
      time_start: Math.round(time * 100) / 100,
      time_end: Math.round((time + duration) * 100) / 100,
    };
    time += duration + 0.25;
    return sentence;
  });
}

function upsertCategory() {
  let source = readFileSync(categoriesPath, 'utf8');
  if (source.includes("id: '10'") || source.includes("slug: 'tinh-yeu'")) {
    source = source.replace(
      /(id: '10',[\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, source, 'utf8');
    console.log('Category 10 already present — updated lessonCount');
    return;
  }

  const entry = `  {
    id: '10',
    slug: 'tinh-yeu',
    name: 'Tình yêu',
    description: 'Hội thoại tiếng Anh về tình yêu và hẹn hò',
    icon: '💕',
    iconColor: 'bg-rose-500',
    imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=200&fit=crop',
    lessonCount: ${LESSON_META.length},
  },
];`;

  if (!source.includes('];\n\nexport function getCategoryById')) {
    throw new Error('Could not find categories array end marker');
  }

  source = source.replace(
    '];\n\nexport function getCategoryById',
    `${entry}\n\nexport function getCategoryById`,
  );
  writeFileSync(categoriesPath, source, 'utf8');
  console.log('Added category 10: Tình yêu');
}

const docText = readFileSync(docPath, 'utf8');
const parsed = parseLessons(docText);

if (parsed.length !== 10) {
  console.error(`Expected 10 lessons, got ${parsed.length}`);
  process.exit(1);
}

for (const lesson of parsed) {
  if (lesson.sentences.length < 8) {
    console.warn(
      `Bài ${lesson.index} only has ${lesson.sentences.length} sentences`,
    );
  }
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
const newIds = new Set(
  LESSON_META.map((_, i) => `lesson-${String(START_LESSON_NUM + i).padStart(2, '0')}`),
);
const filtered = lessons.filter(
  (l) => l.categoryId !== CATEGORY_ID && !newIds.has(l.id),
);

const created = [];
for (let i = 0; i < parsed.length; i += 1) {
  const meta = LESSON_META[i];
  const lessonNum = START_LESSON_NUM + i;
  const id = `lesson-${String(lessonNum).padStart(2, '0')}`;
  const sentences = buildSentenceObjects(lessonNum, parsed[i].sentences);
  const duration = Math.ceil(sentences.at(-1).time_end);

  created.push({
    id,
    categoryId: CATEGORY_ID,
    title: meta.title,
    description: meta.description,
    thumbnailUrl: `https://images.unsplash.com/${meta.thumb}?w=600&h=340&fit=crop`,
    audioUrl: '',
    duration,
    level: 'INTERMEDIATE',
    topic: TOPIC,
    sentences,
  });

  console.log(
    `✓ ${id}: ${meta.title} — ${sentences.length} câu, ~${duration}s`,
  );
}

filtered.push(...created);
writeFileSync(lessonsPath, `${JSON.stringify(filtered, null, 2)}\n`, 'utf8');
upsertCategory();

console.log(
  JSON.stringify(
    {
      totalLessons: filtered.length,
      added: created.length,
      categoryId: CATEGORY_ID,
    },
    null,
    2,
  ),
);
