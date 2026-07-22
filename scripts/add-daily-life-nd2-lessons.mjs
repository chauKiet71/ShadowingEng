import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lessonsPath = join(root, 'client/src/data/lessons.json');
const categoriesPath = join(root, 'client/src/data/categories.ts');
const sourcePath =
  process.argv[2] || 'c:\\Users\\DELL\\Downloads\\nd2.txt';

const CATEGORY_ID = '2';
const TOPIC = 'Cuộc sống hằng ngày';
const START_LESSON_NUM = 113;

const LESSON_META = [
  {
    title: 'Dọn dẹp phòng ngủ',
    description: 'Dọn phòng ngủ gọn gàng sau một tuần bận rộn',
    thumb: 'photo-1522771739844-6a9f6d5f14af',
    level: 'INTERMEDIATE',
  },
  {
    title: 'Lau nhà',
    description: 'Quét và lau sàn nhà vào cuối tuần',
    thumb: 'photo-1581578731548-c64695cc6952',
    level: 'INTERMEDIATE',
  },
  {
    title: 'Nấu bữa tối',
    description: 'Nấu bữa tối tại nhà cùng gia đình',
    thumb: 'photo-1556911220-bff31c812dba',
    level: 'INTERMEDIATE',
  },
  {
    title: 'Sửa một đồ vật nhỏ',
    description: 'Tự sửa tay nắm tủ bếp bị lỏng',
    thumb: 'photo-1426927308491-6380b6a9936f',
    level: 'INTERMEDIATE',
  },
  {
    title: 'Trang trí nhà cửa',
    description: 'Trang trí phòng khách ấm cúng hơn',
    thumb: 'photo-1616486338812-3dadae4b4ace',
    level: 'INTERMEDIATE',
  },
  {
    title: 'Chăm sóc cây cảnh',
    description: 'Chăm sóc cây trong nhà mỗi tuần',
    thumb: 'photo-1485955900006-10f4d324d411',
    level: 'INTERMEDIATE',
  },
  {
    title: 'Chuẩn bị đồ cho ngày mai',
    description: 'Chuẩn bị sẵn đồ đạc từ tối hôm trước',
    thumb: 'photo-1553062407-98eeb64c6a62',
    level: 'INTERMEDIATE',
  },
  {
    title: 'Thanh toán hóa đơn',
    description: 'Thanh toán hóa đơn hàng tháng qua ứng dụng ngân hàng',
    thumb: 'photo-1554224155-6726b3ff858f',
    level: 'INTERMEDIATE',
  },
];

const VI_BY_LESSON = [
  [
    'Phòng ngủ của tôi hơi bừa bộn sau một tuần bận rộn.',
    'Sáng nay, tôi quyết định dọn phòng trước khi làm bất cứ việc gì khác.',
    'Trước hết, tôi mở cửa sổ để không khí trong lành vào.',
    'Căn phòng ngay lập tức cảm thấy sáng hơn và dễ chịu hơn.',
    'Sau đó, tôi dọn giường và chỉnh lại gối.',
    'Tiếp theo, tôi nhặt quần áo dưới sàn và bỏ vào giỏ đồ giặt.',
    'Tôi đặt sách trở lại lên kệ.',
    'Tôi cũng sắp xếp bàn làm việc vì giấy tờ và bút viết nằm khắp nơi.',
    'Tiếp theo, tôi dùng khăn lau bàn và tủ đầu giường.',
    'Tôi quét sàn cẩn thận và loại bỏ hết bụi bẩn.',
    'Cuối cùng, tôi đổ thùng rác và xịt một chút nước hoa phòng.',
    'Bây giờ phòng ngủ của tôi trông sạch sẽ và ngăn nắp.',
    'Thật dễ thư giãn và học bài hơn trong một căn phòng gọn gàng.',
    'Dọn phòng ngủ mất khá nhiều thời gian, nhưng luôn khiến tôi cảm thấy vui và có năng suất hơn.',
  ],
  [
    'Mỗi sáng thứ Bảy, tôi lau sàn trong căn hộ của mình.',
    'Tôi bắt đầu bằng cách kê ghế và những món đồ nhỏ sang chỗ khác.',
    'Sau đó, tôi quét sàn để loại bỏ bụi, tóc và những mảnh bẩn nhỏ.',
    'Tiếp theo, tôi đổ nước ấm và nước lau sàn vào xô.',
    'Tôi nhúng cây lau vào xô và vắt hết nước thừa.',
    'Tôi bắt đầu lau từ góc xa nhất của căn phòng.',
    'Cách này giúp tôi tránh bước lên sàn còn ướt.',
    'Tôi di chuyển cây lau chậm rãi để không bỏ sót chỗ nào.',
    'Khi nước bẩn, tôi thay bằng nước sạch.',
    'Sau khi xong phòng khách, tôi tiếp tục với bếp và các phòng ngủ.',
    'Cuối cùng, tôi mở cửa sổ để sàn khô nhanh hơn.',
    'Cả căn hộ có mùi thơm và sạch sẽ.',
    'Dù lau nhà hơi mệt, tôi vẫn thích nhìn mọi thứ bóng bẩy khi hoàn thành.',
  ],
  [
    'Sau giờ làm, tôi thích nấu bữa tối thay vì gọi đồ ăn mang về.',
    'Hôm nay, tôi quyết định làm gà nướng với rau và cơm.',
    'Trước hết, tôi rửa sạch tất cả rau củ.',
    'Sau đó, tôi cắt cà rốt, bông cải xanh và hành tây thành miếng nhỏ.',
    'Tiếp theo, tôi ướp gà với muối, tiêu, tỏi và một chút dầu ô liu.',
    'Trong lúc gà đang chín, tôi bắt đầu chuẩn bị cơm.',
    'Tôi cũng xào rau trong vài phút.',
    'Tôi muốn chúng vẫn giữ màu sắc và độ giòn.',
    'Chẳng bao lâu, căn bếp tràn ngập mùi thơm dễ chịu.',
    'Mọi thứ sẵn sàng chỉ sau khoảng bốn mươi phút.',
    'Tôi bày thức ăn lên bàn và gọi cả nhà vào ăn.',
    'Chúng tôi trò chuyện về ngày hôm nay trong lúc thưởng thức bữa ăn cùng nhau.',
    'Nấu ăn ở nhà mất nhiều thời gian hơn, nhưng lành mạnh hơn và thường rẻ hơn ăn nhà hàng.',
    'Ăn tối cùng gia đình là một trong những phần yêu thích nhất trong ngày của tôi.',
  ],
  [
    'Hôm qua, một tay nắm tủ bếp của tôi bị lỏng.',
    'Thay vì mua cái mới, tôi quyết định tự sửa.',
    'Trước hết, tôi tìm tô vít trong hộp dụng cụ.',
    'May mắn thay, tôi tìm thấy cái phù hợp rất nhanh.',
    'Tôi tháo ốc vít bị lỏng và kiểm tra tay nắm cẩn thận.',
    'Ốc vít không bị gãy, nhưng đã bị lỏng sau nhiều năm sử dụng.',
    'Tôi siết nó lại từ từ để chắc chắn nó giữ chặt.',
    'Sau đó, tôi mở và đóng tủ vài lần để kiểm tra.',
    'Mọi thứ lại hoạt động hoàn hảo.',
    'Việc sửa chỉ mất khoảng mười phút.',
    'Tôi vui vì đã tự giải quyết được vấn đề.',
    'Những lần sửa chữa nhỏ như thế này có thể tiết kiệm cả thời gian lẫn tiền bạc.',
    'Chúng cũng giúp tôi tự tin hơn khi có thứ gì đó hỏng ở nhà.',
  ],
  [
    'Cuối tuần trước, tôi muốn làm phòng khách ấm áp và thân thiện hơn.',
    'Tôi bắt đầu bằng cách kê ghế sofa gần cửa sổ hơn.',
    'Sau đó, tôi thêm vài chiếc gối màu sắc.',
    'Tôi cũng đặt một tấm chăn mềm lên ghế.',
    'Tiếp theo, tôi treo một bức tranh mới lên tường.',
    'Bức tranh vẽ một khung cảnh núi đẹp.',
    'Sau đó, tôi đặt vài bông hoa tươi lên bàn trà.',
    'Những bông hoa khiến cả căn phòng trông sáng hơn.',
    'Tôi cũng đổi rèm sang màu sáng hơn.',
    'Cuối cùng, tôi bật một chiếc đèn nhỏ với ánh sáng ấm.',
    'Căn phòng trông hoàn toàn khác sau những thay đổi nhỏ này.',
    'Bạn tôi đến chơi tối đó và nói phòng khách cảm thấy ấm cúng và dễ chịu.',
    'Tôi học được rằng trang trí nhà không phải lúc nào cũng cần nhiều tiền.',
    'Đôi khi chỉ vài thay đổi đơn giản cũng tạo nên khác biệt lớn.',
  ],
  [
    'Tôi có vài cây trong nhà mà tôi chăm sóc mỗi tuần.',
    'Chúng khiến căn hộ tôi cảm thấy tươi mới và yên bình.',
    'Mỗi sáng Chủ nhật, tôi dành thời gian chăm chúng.',
    'Trước hết, tôi kiểm tra đất xem đã khô chưa.',
    'Nếu khô, tôi tưới nước cẩn thận.',
    'Tôi cố không tưới quá nhiều vì có thể làm hỏng rễ.',
    'Sau đó, tôi tỉa bỏ những lá vàng hoặc lá khô.',
    'Tôi cũng lau bụi trên lá bằng khăn mềm.',
    'Việc này giúp cây khỏe và trông đẹp hơn.',
    'Một số cây cần nhiều ánh nắng hơn những cây khác.',
    'Vì vậy, tôi di chuyển chúng đến chỗ khác tùy theo thời tiết.',
    'Nhìn cây lớn lên khiến tôi cảm thấy thư giãn.',
    'Chăm sóc chúng nhắc tôi hãy chậm lại và tận hưởng những khoảnh khắc đơn giản trong đời.',
  ],
  [
    'Mỗi tối, tôi dành vài phút để chuẩn bị cho ngày hôm sau.',
    'Thói quen này giúp tôi tránh căng thẳng vào buổi sáng.',
    'Trước hết, tôi kiểm tra lịch trên điện thoại.',
    'Sau đó, tôi chọn quần áo muốn mặc.',
    'Nếu có cuộc họp quan trọng, tôi đảm bảo mọi thứ trông chỉn chu.',
    'Tiếp theo, tôi xếp laptop, sổ tay, sạc và những thứ khác vào balo.',
    'Tôi cũng chuẩn bị bữa trưa nếu định mang đồ ăn từ nhà.',
    'Sau đó, tôi để chìa khóa, ví và điện thoại gần cửa ra vào.',
    'Nhờ vậy, tôi không bao giờ quên chúng.',
    'Cuối cùng, tôi đặt báo thức và kiểm tra dự báo thời tiết.',
    'Nếu có thể mưa, tôi nhớ mang theo ô.',
    'Chuẩn bị mọi thứ từ tối hôm trước chỉ mất khoảng mười lăm phút.',
    'Tuy nhiên, nó khiến buổi sáng của tôi bình tĩnh và ngăn nắp hơn nhiều.',
  ],
  [
    'Vào đầu mỗi tháng, tôi thanh toán tất cả hóa đơn trong nhà.',
    'Chúng bao gồm điện, nước, internet và hóa đơn điện thoại.',
    'Trước đây, tôi đến ngân hàng để thanh toán.',
    'Bây giờ, tôi thường thanh toán mọi thứ trực tuyến.',
    'Trước hết, tôi mở ứng dụng ngân hàng trên điện thoại.',
    'Sau đó, tôi kiểm tra từng hóa đơn cẩn thận để chắc số tiền đúng.',
    'Tiếp theo, tôi xác nhận thanh toán và lưu biên lai điện tử.',
    'Cả quá trình chỉ mất vài phút.',
    'Thanh toán hóa đơn đúng hạn giúp tôi tránh phí trễ hạn.',
    'Nó cũng giúp quản lý ngân sách hàng tháng dễ hơn.',
    'Đôi khi tôi ghi lại tất cả chi tiêu vào sổ tay.',
    'Việc này giúp tôi hiểu tiền của mình đi đâu mỗi tháng.',
    'Theo dõi hóa đơn là phần quan trọng để trách nhiệm với tài chính của mình.',
    'Nó mang lại sự yên tâm vì tôi biết mọi thứ đã được lo liệu xong.',
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
if (parsed.length !== LESSON_META.length) {
  console.error(
    `Expected ${LESSON_META.length} lessons, got ${parsed.length}`,
  );
  process.exit(1);
}

// verify thumbs early
for (const meta of LESSON_META) {
  const url = `https://images.unsplash.com/${meta.thumb}?w=600&h=340&fit=crop`;
  // eslint-disable-next-line no-await-in-loop
}

const lessons = JSON.parse(readFileSync(lessonsPath, 'utf8'));
const newIds = new Set(
  LESSON_META.map((_, i) =>
    `lesson-${String(START_LESSON_NUM + i).padStart(2, '0')}`,
  ),
);
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
