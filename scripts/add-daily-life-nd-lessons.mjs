import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsPath = join(root, 'client/src/data/lessons.json');
const categoriesPath = join(root, 'client/src/data/categories.ts');
const sourcePath =
  process.argv[2] || 'c:\\Users\\DELL\\Downloads\\nd.txt';

const CATEGORY_ID = '2';
const TOPIC = 'Cuộc sống hằng ngày';
const START_LESSON_NUM = 103;

const LESSON_META = [
  {
    title: 'Đánh răng và rửa mặt',
    description: 'Thói quen vệ sinh cá nhân buổi sáng',
    thumb: 'photo-1556228578-0d85b1a4d571',
    level: 'BEGINNER',
  },
  {
    title: 'Chuẩn bị bữa sáng',
    description: 'Làm bữa sáng đơn giản trước khi ra ngoài',
    thumb: 'photo-1533089860892-a7c6f0a88666',
    level: 'BEGINNER',
  },
  {
    title: 'Dọn giường',
    description: 'Dọn giường mỗi sáng để bắt đầu ngày mới',
    thumb: 'photo-1631049307264-da0ec9d70304',
    level: 'BEGINNER',
  },
  {
    title: 'Mặc quần áo',
    description: 'Chọn quần áo phù hợp với thời tiết và công việc',
    thumb: 'photo-1489987707025-afc232f7ea0f',
    level: 'BEGINNER',
  },
  {
    title: 'Tìm chìa khóa',
    description: 'Tìm chìa khóa bị thất lạc và giữ thói quen gọn gàng',
    thumb: 'photo-1582139329536-e7284fece509',
    level: 'BEGINNER',
  },
  {
    title: 'Kiểm tra thời tiết',
    description: 'Xem dự báo thời tiết trước khi ra ngoài',
    thumb: 'photo-1504608524841-42fe6f032b4b',
    level: 'BEGINNER',
  },
  {
    title: 'Tưới cây',
    description: 'Chăm sóc cây cảnh trên ban công mỗi ngày',
    thumb: 'photo-1416879595882-3373a0480b5b',
    level: 'BEGINNER',
  },
  {
    title: 'Cho thú cưng ăn',
    description: 'Cho chó ăn và đi dạo buổi sáng',
    thumb: 'photo-1587300003388-59208cc962cb',
    level: 'BEGINNER',
  },
  {
    title: 'Giặt quần áo',
    description: 'Giặt và phơi quần áo trong tuần',
    thumb: 'photo-1582735689369-4fe89db7114c',
    level: 'BEGINNER',
  },
  {
    title: 'Gấp quần áo',
    description: 'Gấp quần áo và sắp xếp ngăn nắp trong tủ',
    thumb: 'photo-1558618666-fcd25c85cd64',
    level: 'BEGINNER',
  },
];

/** Bản dịch VI theo đúng thứ tự câu EN trong nd.txt */
const VI_BY_LESSON = [
  [
    'Mỗi sáng, tôi thức dậy lúc sáu giờ ba mươi.',
    'Tôi đi vào phòng tắm và bật đèn.',
    'Trước hết, tôi rửa mặt bằng nước ấm.',
    'Việc đó giúp tôi cảm thấy tươi tỉnh và tỉnh táo.',
    'Sau đó tôi bôi kem đánh răng lên bàn chải.',
    'Tôi đánh răng cẩn thận khoảng hai phút.',
    'Tôi đảm bảo đánh sạch mọi chiếc răng.',
    'Sau đó, tôi súc miệng bằng nước.',
    'Đôi khi tôi dùng nước súc miệng để hơi thở thơm mát.',
    'Cuối cùng, tôi lau mặt bằng khăn sạch.',
    'Bây giờ tôi cảm thấy sạch sẽ và sẵn sàng bắt đầu ngày mới.',
  ],
  [
    'Tôi thường chuẩn bị bữa sáng sau khi mặc quần áo.',
    'Tôi mở tủ lạnh và lấy ra vài quả trứng cùng sữa.',
    'Hôm nay tôi quyết định làm trứng chiên và bánh mì nướng.',
    'Trong lúc bánh mì đang trong lò nướng, tôi chiên trứng.',
    'Sau đó tôi rót một cốc nước cam.',
    'Đôi khi tôi cũng cắt một quả chuối hoặc táo.',
    'Tôi xếp mọi thứ ra đĩa và ngồi vào bàn.',
    'Bữa sáng của tôi đơn giản, nhưng mang lại năng lượng.',
    'Tôi thưởng thức bữa ăn trong lúc nghe nhạc thư giãn.',
    'Sau bữa sáng, tôi rửa bát trước khi ra khỏi nhà.',
  ],
  [
    'Việc đầu tiên tôi làm sau khi thức dậy là dọn giường.',
    'Tôi kéo chăn lên cho gọn gàng.',
    'Sau đó tôi vuốt phẳng ga giường bằng tay.',
    'Tiếp theo, tôi đặt gối đúng vị trí.',
    'Một chiếc giường sạch sẽ khiến căn phòng trông gọn gàng hơn.',
    'Việc này chỉ mất vài phút.',
    'Khi tôi về nhà vào buổi tối, căn phòng cảm thấy dễ chịu hơn.',
    'Bố mẹ tôi luôn nói rằng thói quen tốt bắt đầu từ những việc nhỏ.',
    'Dọn giường mỗi sáng giúp tôi bắt đầu ngày mới một cách tích cực.',
  ],
  [
    'Sau khi tắm, tôi chọn quần áo cho ngày hôm đó.',
    'Tôi xem thời tiết trước khi quyết định.',
    'Nếu trời nóng, tôi mặc áo thun và quần short.',
    'Nếu trời lạnh, tôi mặc áo khoác và quần dài.',
    'Hôm nay tôi cần đi làm, nên tôi chọn một chiếc áo sơ mi sạch và quần đen.',
    'Tôi cũng mang giày thoải mái vì tôi đi bộ nhiều.',
    'Trước khi ra ngoài, tôi nhìn vào gương.',
    'Tôi đảm bảo mọi thứ trông gọn gàng và chỉn chu.',
    'Bây giờ tôi đã sẵn sàng để đi ra ngoài.',
  ],
  [
    'Sáng nay tôi không tìm thấy chìa khóa.',
    'Tôi nhìn trên bàn, nhưng chúng không ở đó.',
    'Sau đó tôi kiểm tra balo và túi áo khoác.',
    'Tôi vẫn không tìm thấy chúng.',
    'Tôi bắt đầu lo lắng vì sắp bị muộn.',
    'Cuối cùng, tôi nhớ ra tối qua đã để chúng gần cửa ra vào.',
    'Chìa khóa nằm trong một cái giỏ nhỏ.',
    'Tôi nhặt chúng lên và mỉm cười.',
    'Bây giờ tôi luôn để chìa khóa ở cùng một chỗ.',
    'Điều đó giúp tôi tiết kiệm rất nhiều thời gian mỗi sáng.',
  ],
  [
    'Trước khi ra khỏi nhà, tôi luôn kiểm tra thời tiết.',
    'Tôi thường dùng ứng dụng thời tiết trên điện thoại.',
    'Hôm nay ứng dụng báo chiều sẽ mưa.',
    'Vì vậy tôi quyết định mang theo ô.',
    'Nhiệt độ khoảng hai mươi bốn độ.',
    'Bên ngoài trời mát và nhiều mây.',
    'Đôi khi thời tiết thay đổi rất nhanh.',
    'Đó là lý do tôi thích chuẩn bị trước.',
    'Kiểm tra thời tiết chỉ mất một phút.',
    'Nó giúp tôi lên kế hoạch cho ngày tốt hơn.',
  ],
  [
    'Tôi có vài cây nhỏ trên ban công.',
    'Mỗi sáng tôi tưới chúng trước bữa sáng.',
    'Tôi dùng một bình tưới nhỏ.',
    'Tôi tưới đủ nước cho mỗi cây, nhưng không quá nhiều.',
    'Một số cây cần nhiều ánh nắng hơn những cây khác.',
    'Tôi cũng tỉa bỏ lá khô khi nhìn thấy.',
    'Nhìn cây lớn lên khiến tôi vui.',
    'Chúng làm ngôi nhà tôi trông xanh và đẹp hơn.',
    'Chăm sóc cây là một trong những thói quen hàng ngày yêu thích của tôi.',
  ],
  [
    'Tôi có một chú chó dễ thương tên Max.',
    'Mỗi sáng Max chờ tôi trong bếp.',
    'Nó biết đã đến giờ ăn sáng.',
    'Tôi đổ thức ăn chó vào bát của nó.',
    'Sau đó tôi cho nó nước sạch.',
    'Trong lúc nó ăn, tôi xoa đầu và nói chuyện với nó.',
    'Sau bữa sáng, chúng tôi thường đi dạo một chút.',
    'Max luôn háo hức được ra ngoài.',
    'Chăm sóc chó là một phần quan trọng trong thói quen hàng ngày của tôi.',
    'Nó khiến mọi buổi sáng trở nên vui vẻ hơn.',
  ],
  [
    'Tôi thường giặt quần áo hai lần một tuần.',
    'Trước hết, tôi tách quần áo trắng khỏi quần áo màu.',
    'Sau đó tôi bỏ quần áo bẩn vào máy giặt.',
    'Tôi cho thêm bột giặt.',
    'Sau khi chọn chương trình giặt phù hợp, tôi nhấn nút bắt đầu.',
    'Trong lúc máy chạy, tôi làm việc nhà khác.',
    'Khoảng một giờ sau, quần áo đã sạch.',
    'Tôi lấy chúng ra và phơi trên ban công.',
    'Quần áo sạch và mới luôn có mùi dễ chịu.',
  ],
  [
    'Sau khi quần áo khô, tôi gấp chúng gọn gàng.',
    'Tôi bắt đầu với áo thun.',
    'Sau đó tôi gấp quần và khăn.',
    'Tôi ghép tất thành đôi và để chúng lại với nhau.',
    'Tiếp theo, tôi xếp mọi thứ vào đúng ngăn kéo.',
    'Khi quần áo được sắp xếp, thật dễ tìm thứ tôi cần.',
    'Căn phòng tôi cũng trông sạch sẽ hơn nhiều.',
    'Gấp quần áo không khó, nhưng hơi mất thời gian.',
    'Tôi thích hoàn thành việc này vì mọi thứ trông gọn gàng và ngăn nắp sau đó.',
  ],
];

function estimateDuration(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(2.0, Math.min(8, words * 0.38 + 0.8));
}

function parseSource(text) {
  const lines = text.split(/\r?\n/);
  const lessons = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    const titleMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (titleMatch) {
      if (current) lessons.push(current);
      current = {
        index: Number(titleMatch[1]),
        title: titleMatch[2].trim(),
        english: [],
      };
      continue;
    }
    if (!current || !line) continue;
    current.english.push(line);
  }
  if (current) lessons.push(current);
  return lessons;
}

function buildSentences(lessonNum, englishList, vietnameseList) {
  if (englishList.length !== vietnameseList.length) {
    throw new Error(
      `Lesson ${lessonNum}: EN ${englishList.length} != VI ${vietnameseList.length}`,
    );
  }
  let time = 0;
  return englishList.map((english, index) => {
    const duration = estimateDuration(english);
    const sentence = {
      id: `${lessonNum}-${index + 1}`,
      english,
      phonetic: '',
      vietnamese: vietnameseList[index],
      time_start: Math.round(time * 100) / 100,
      time_end: Math.round((time + duration) * 100) / 100,
    };
    time += duration + 0.2;
    return sentence;
  });
}

function updateCategoryCount(newCount) {
  let source = readFileSync(categoriesPath, 'utf8');
  source = source.replace(
    /(id: '2',[\s\S]*?lessonCount:\s*)\d+/,
    `$1${newCount}`,
  );
  writeFileSync(categoriesPath, source, 'utf8');
}

const parsed = parseSource(readFileSync(sourcePath, 'utf8'));
if (parsed.length !== 10) {
  console.error(`Expected 10 lessons, got ${parsed.length}`);
  process.exit(1);
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
const newIds = new Set(
  LESSON_META.map((_, i) => `lesson-${String(START_LESSON_NUM + i).padStart(2, '0')}`),
);

// Remove previous inserts of these ids only (keep existing daily lessons)
const filtered = lessons.filter((l) => !newIds.has(l.id));
const created = [];

for (let i = 0; i < parsed.length; i += 1) {
  const meta = LESSON_META[i];
  const lessonNum = START_LESSON_NUM + i;
  const id = `lesson-${String(lessonNum).padStart(2, '0')}`;
  const sentences = buildSentences(
    lessonNum,
    parsed[i].english,
    VI_BY_LESSON[i],
  );
  const duration = Math.ceil(sentences.at(-1).time_end);

  created.push({
    id,
    categoryId: CATEGORY_ID,
    title: meta.title,
    description: meta.description,
    thumbnailUrl: `https://images.unsplash.com/${meta.thumb}?w=600&h=340&fit=crop`,
    audioUrl: '',
    duration,
    level: meta.level,
    topic: TOPIC,
    sentences,
  });

  console.log(`✓ ${id}: ${meta.title} — ${sentences.length} câu, ~${duration}s`);
}

filtered.push(...created);
const dailyCount = filtered.filter((l) => l.categoryId === CATEGORY_ID).length;
writeFileSync(lessonsPath, `${JSON.stringify(filtered, null, 2)}\n`, 'utf8');
updateCategoryCount(dailyCount);

console.log(
  JSON.stringify(
    { totalLessons: filtered.length, added: created.length, dailyCount },
    null,
    2,
  ),
);
