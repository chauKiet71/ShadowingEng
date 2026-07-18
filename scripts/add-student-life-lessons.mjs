import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsPath = join(root, 'client/src/data/lessons.json');
const categoriesPath = join(root, 'client/src/data/categories.ts');
const docPath = 'D:\\Code\\ShowdingEng\\_docx_content.txt';

const CATEGORY_ID = '9';
const TOPIC = 'Đời sống sinh viên';
const START_LESSON_NUM = 83;

const LESSON_META = [
  {
    title: 'Ngày đầu nhập học',
    description: 'Hỏi đường và làm quen trong ngày đầu đến trường',
    thumb: 'photo-1523240795612-9a054b0db644',
  },
  {
    title: 'Chuyển vào ký túc xá',
    description: 'Làm quen bạn cùng phòng và sắp xếp không gian sống',
    thumb: 'photo-1555854877-bab0e564b8d5',
  },
  {
    title: 'Đăng ký môn học',
    description: 'Đăng ký lớp học và chọn môn cho học kỳ mới',
    thumb: 'photo-1434030216411-0b793f4b4173',
  },
  {
    title: 'Học nhóm tại thư viện',
    description: 'Phân công và làm bài tập nhóm tại phòng học',
    thumb: 'photo-1481627834876-b7833e8f5570',
  },
  {
    title: 'Tham gia câu lạc bộ',
    description: 'Đăng ký câu lạc bộ tranh biện và hỏi thông tin',
    thumb: 'photo-1529156069898-49953e39b3ac',
  },
  {
    title: 'Áp lực mùa thi',
    description: 'Chia sẻ áp lực thi cử và cách ôn tập hiệu quả',
    thumb: 'photo-1606326608606-aa0b62935f2b',
  },
  {
    title: 'Tìm việc làm thêm',
    description: 'Tìm việc part-time trong trường và chuẩn bị hồ sơ',
    thumb: 'photo-1522202176988-66273c2fd55f',
  },
  {
    title: 'Quản lý chi tiêu',
    description: 'Theo dõi ngân sách và thay đổi thói quen tiêu dùng',
    thumb: 'photo-1554224155-6726b3ff858f',
  },
  {
    title: 'Tìm kiếm thực tập',
    description: 'Ứng tuyển thực tập, networking và chuẩn bị pitch',
    thumb: 'photo-1556761175-5973dc0f32e7',
  },
  {
    title: 'Chuẩn bị tốt nghiệp',
    description: 'Chuẩn bị lễ tốt nghiệp và kiểm tra điều kiện ra trường',
    thumb: 'photo-1627556704290-2b1f5853ff78',
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
  return raw
    .trim()
    .replace(/^Nhên /i, 'Nhân ')
    .replace(/\s+/g, ' ');
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

    // Name: "English" /phonetic/ (Vietnamese)
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
  if (source.includes("id: '9'") || source.includes('slug: \'doi-song-sinh-vien\'')) {
    console.log('Category 9 already present — updating lessonCount only if needed');
    source = source.replace(
      /(id: '9',[\s\S]*?lessonCount:\s*)\d+/,
      `$1${LESSON_META.length}`,
    );
    writeFileSync(categoriesPath, source, 'utf8');
    return;
  }

  const entry = `  {
    id: '9',
    slug: 'doi-song-sinh-vien',
    name: 'Đời sống sinh viên',
    description: 'Hội thoại tiếng Anh trong đời sống sinh viên',
    icon: '🏫',
    iconColor: 'bg-indigo-500',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop',
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
  // Fix double closing — entry already has ]; so previous ]; must be removed
  // Actually we replaced `];\n\nexport` with `{...},\n];\n\nexport` but the previous last category still ends with `},` and then we had `];` - wait:
  // Original ends with:
  //   },
  // ];
  //
  // We replace `];\n\nexport function getCategoryById` with `{entry},\n];\n\nexport...`
  // So result is:
  //   },
  //   { id 9 ... },
  // ];
  // which is correct.

  writeFileSync(categoriesPath, source, 'utf8');
  console.log('Added category 9: Đời sống sinh viên');
}

const docText = readFileSync(docPath, 'utf8');
const parsed = parseLessons(docText);

if (parsed.length !== 10) {
  console.error(`Expected 10 lessons, got ${parsed.length}`);
  process.exit(1);
}

for (const lesson of parsed) {
  if (lesson.sentences.length < 10) {
    console.warn(
      `Bài ${lesson.index} only has ${lesson.sentences.length} sentences`,
    );
  }
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));

// Remove any previous inserts for this category / lesson ids we're about to write
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
