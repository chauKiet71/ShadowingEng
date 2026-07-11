import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { titleByEnglish } from './lesson-labels-vi.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outPath = join(root, 'client/src/data/lessons.json');
const legacyPath = outPath;

const levels = ['BEGINNER', 'BEGINNER', 'BEGINNER', 'INTERMEDIATE', 'INTERMEDIATE', 'INTERMEDIATE', 'INTERMEDIATE', 'ADVANCED', 'ADVANCED', 'ADVANCED'];

const categories = [
  {
    id: '1',
    topic: 'Travel',
    topicVi: 'Du lịch & Khám phá',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1469854523086-cc02fe5d8800',
      'photo-1488646953014-85cb44e25828',
      'photo-1501785888041-af3ef285b470',
      'photo-1476514525535-07fb3b4fd5ee',
      'photo-1523906834658-6e24ef2386f9',
      'photo-1502920917128-1aa500764cbd',
      'photo-1530789253388-582c481c54b0',
      'photo-1544551763-46a013bb70d5',
      'photo-1500530855697-b586d89ba3ee',
      'photo-1432405972618-c60b0225b4f9',
    ],
    lessons: [
      ['Traveling Abroad', 'Những câu hữu ích khi đi du lịch nước ngoài'],
      ['At the Airport', 'Giao tiếp tại sân bay quốc tế'],
      ['Booking a Hotel', 'Đặt phòng khách sạn bằng tiếng Anh'],
      ['Asking for Directions', 'Hỏi đường khi đi du lịch'],
      ['Ordering Food Abroad', 'Gọi món tại nhà hàng nước ngoài'],
      ['Using Public Transport', 'Sử dụng phương tiện công cộng'],
      ['Shopping for Souvenirs', 'Mua quà lưu niệm khi du lịch'],
      ['Visiting a Museum', 'Tham quan bảo tàng và di tích'],
      ['Beach Vacation', 'Kỳ nghỉ biển và hoạt động ngoài trời'],
      ['Mountain Adventure', 'Chuyến phiêu lưu leo núi'],
    ],
  },
  {
    id: '2',
    topic: 'Daily Life',
    topicVi: 'Cuộc sống hằng ngày',
    image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1499750310107-5fef28a66643',
      'photo-1495474472287-4d71bcdd2085',
      'photo-1556911220-bff31c812dba',
      'photo-1542838132-92c53300491e',
      'photo-1581578731548-c64695cc6952',
      'photo-1527515637462-cff94eecc1ac',
      'photo-1517457373958-b7bdd4587205',
      'photo-1423666639041-f56000c27a9a',
      'photo-1517248135467-4c7edcad34c4',
      'photo-1504674900247-0877df9cc836',
    ],
    lessons: [
      ['Morning Routine', 'Học cách mô tả thói quen buổi sáng'],
      ['At the Coffee Shop', 'Giao tiếp khi gọi đồ uống tại quán cà phê'],
      ['Grocery Shopping', 'Đi siêu thị và mua sắm hằng ngày'],
      ['Doing Household Chores', 'Công việc nhà và dọn dẹp'],
      ['Weekend Plans', 'Kế hoạch cuối tuần với bạn bè'],
      ['Phone Conversations', 'Nói chuyện điện thoại hằng ngày'],
      ['Meeting Neighbors', 'Làm quen với hàng xóm'],
      ['Evening Wind Down', 'Thư giãn sau một ngày dài'],
      ['Family Dinner', 'Bữa tối gia đình và trò chuyện'],
      ['Daily Errands', 'Giải quyết việc vặt trong ngày'],
    ],
  },
  {
    id: '3',
    topic: 'Career',
    topicVi: 'Công việc & Sự nghiệp',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1497366216548-37526070297c',
      'photo-1521737711862-e3b97375f902',
      'photo-1552664730-d307ca884978',
      'photo-1454165804606-c3d57bc86b40',
      'photo-1553877522-43269d4ea984',
      'photo-1517245386807-bb43f82c33c4',
      'photo-1600880292203-757bb62b4baf',
      'photo-1556761175-5973dc0f32e7',
      'photo-1573497019940-1c28c88b4f3e',
      'photo-1507679799987-c73779587cdf',
    ],
    lessons: [
      ['Job Interview Tips', 'Chuẩn bị cho buổi phỏng vấn xin việc'],
      ['First Day at Work', 'Ngày đầu tiên đi làm'],
      ['Team Meeting', 'Tham gia cuộc họp nhóm'],
      ['Writing Work Emails', 'Viết email công việc chuyên nghiệp'],
      ['Giving a Presentation', 'Thuyết trình trước đồng nghiệp'],
      ['Remote Work Habits', 'Thói quen làm việc từ xa hiệu quả'],
      ['Career Goals', 'Đặt mục tiêu nghề nghiệp'],
      ['Workplace Culture', 'Văn hóa công sở quốc tế'],
      ['Time Management', 'Quản lý thời gian tại nơi làm việc'],
      ['Networking Skills', 'Kỹ năng kết nối trong sự nghiệp'],
    ],
  },
  {
    id: '4',
    topic: 'News & Society',
    topicVi: 'Tin tức & Xã hội',
    image: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1504711434969-e33886168f5c',
      'photo-1495020689069-958852a7765e',
      'photo-1586339949912-3e9457bef6d3',
      'photo-1529107386315-e1a2ed48a620',
      'photo-1522071820081-009f0129c71c',
      'photo-1557804506-669a67965ba0',
      'photo-1469474968028-56623f02e42e',
      'photo-1529156069898-49953e39b3ac',
      'photo-1559027615-cd4628902d4a',
      'photo-1531206756012-12c9d2827f14',
    ],
    lessons: [
      ['Reading the News', 'Đọc và hiểu tin tức tiếng Anh'],
      ['Climate Change Awareness', 'Nhận thức về biến đổi khí hậu'],
      ['Local Community Events', 'Sự kiện cộng đồng địa phương'],
      ['Social Media Impact', 'Ảnh hưởng của mạng xã hội'],
      ['Global Economy', 'Tin tức về kinh tế thế giới'],
      ['Cultural Diversity', 'Đa dạng văn hóa trong xã hội'],
      ['Volunteer Work', 'Hoạt động tình nguyện'],
      ['Urban Development', 'Phát triển đô thị hiện đại'],
      ['Public Health News', 'Tin tức sức khỏe cộng đồng'],
      ['Discussing Current Events', 'Thảo luận về thời sự'],
    ],
  },
  {
    id: '5',
    topic: 'Entertainment',
    topicVi: 'Giải trí & Phim ảnh',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1489599849927-2ee91cede3ba',
      'photo-1478720568477-152d9b164e26',
      'photo-1511671782779-c97d3d27a1d4',
      'photo-1493225457124-a3eb161ffa5f',
      'photo-1507003211169-0a1dd7228f2d',
      'photo-1514525253161-7a46d19cd819',
      'photo-1536440136628-849c177e76a1',
      'photo-1574267432552-4c4b0b0b0b0b',
      'photo-1440404653325-ab127d49abc1',
      'photo-1598899134739-24c46f58b8c0',
    ],
    lessons: [
      ['Watching Movies', 'Xem phim và thảo luận cốt truyện'],
      ['Favorite TV Shows', 'Chia sẻ về chương trình truyền hình yêu thích'],
      ['Music and Concerts', 'Âm nhạc và buổi hòa nhạc'],
      ['Gaming Culture', 'Văn hóa chơi game giải trí'],
      ['Reading for Fun', 'Đọc sách giải trí'],
      ['Theater Experience', 'Trải nghiệm xem kịch nghệ thuật'],
      ['Streaming Services', 'Dịch vụ xem phim trực tuyến'],
      ['Weekend Entertainment', 'Giải trí cuối tuần'],
      ['Film Reviews', 'Viết và đọc đánh giá phim'],
      ['Celebrity Interviews', 'Phỏng vấn người nổi tiếng'],
    ],
  },
  {
    id: '6',
    topic: 'Science & Technology',
    topicVi: 'Khoa học & Công nghệ',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1532094349884-543bc11b234d',
      'photo-1518770660439-4636190af475',
      'photo-1451187580459-43490279c0fa',
      'photo-1581091226825-a6a2a5aee158',
      'photo-1576086213369-97a306d36557',
      'photo-1485827404703-89b55fcc595e',
      'photo-1516321318423-f06f85e504b3',
      'photo-1504384308090-c894fdcc538d',
      'photo-1558494949-ef010cbdcc31',
      'photo-1507146423298-258a429d05d5',
    ],
    lessons: [
      ['Technology in Daily Life', 'Công nghệ trong cuộc sống hàng ngày'],
      ['Artificial Intelligence', 'Trí tuệ nhân tạo và ứng dụng'],
      ['Space Exploration', 'Khám phá vũ trụ'],
      ['Renewable Energy', 'Năng lượng tái tạo'],
      ['Medical Breakthroughs', 'Đột phá trong y học'],
      ['Robotics Today', 'Robot trong đời sống hiện đại'],
      ['Internet of Things', 'Internet vạn vật'],
      ['Cybersecurity Basics', 'An ninh mạng cơ bản'],
      ['Scientific Discovery', 'Những phát hiện khoa học mới'],
      ['Future of Technology', 'Tương lai của công nghệ'],
    ],
  },
  {
    id: '7',
    topic: 'Health & Lifestyle',
    topicVi: 'Sức khỏe & Lối sống',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1490645935967-10de28ba3fef',
      'photo-1571019614242-c5c5dee9f50b',
      'photo-1544367567-0f2fcb009e0b',
      'photo-1498837167922-ddd27525cd27',
      'photo-1506126613408-eca07ce68773',
      'photo-1517836357463-d25dfeac3438',
      'photo-1545205597-3d9d02c29597',
      'photo-1512621776951-a57141f2eefd',
      'photo-1571902943202-507ec2618e8f',
      'photo-1518611012118-696072aa579a',
    ],
    lessons: [
      ['Healthy Lifestyle', 'Thói quen sống lành mạnh mỗi ngày'],
      ['Exercise Routine', 'Lịch tập thể dục đều đặn'],
      ['Mental Health Care', 'Chăm sóc sức khỏe tinh thần'],
      ['Nutrition Basics', 'Kiến thức dinh dưỡng cơ bản'],
      ['Yoga and Meditation', 'Yoga và thiền định'],
      ['Better Sleep Habits', 'Thói quen ngủ ngon'],
      ['Stress Management', 'Quản lý căng thẳng hiệu quả'],
      ['Healthy Cooking', 'Nấu ăn lành mạnh tại nhà'],
      ['Outdoor Wellness', 'Hoạt động ngoài trời cho sức khỏe'],
      ['Wellness Goals', 'Đặt mục tiêu sống khỏe'],
    ],
  },
  {
    id: '8',
    topic: 'Education',
    topicVi: 'Học tập & Giáo dục',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=340&fit=crop',
    thumbs: [
      'photo-1523240795612-9a054b0db644',
      'photo-1427504494785-3a9ca7044f45',
      'photo-1522202176988-66273c2fd55f',
      'photo-1434030216411-0b793f4b4173',
      'photo-1503676260728-1c00da094a0b',
      'photo-1524178232363-1fb2b075b655',
      'photo-1456513080510-7bf3a84b82f8',
      'photo-1488190211975-475b702e2fda',
      'photo-1519681393784-d120267933ba',
      'photo-1529156069898-49953e39b3ac',
    ],
    lessons: [
      ['Learning English Effectively', 'Phương pháp học tiếng Anh hiệu quả'],
      ['Study Habits', 'Thói quen học tập tốt'],
      ['Online Courses', 'Học trực tuyến và e-learning'],
      ['University Life', 'Cuộc sống sinh viên đại học'],
      ['Exam Preparation', 'Chuẩn bị cho kỳ thi'],
      ['Reading Strategies', 'Chiến lược đọc hiểu'],
      ['Note Taking Skills', 'Kỹ năng ghi chép'],
      ['Language Exchange', 'Trao đổi ngôn ngữ với bạn bè'],
      ['Never Give Up', 'Không bỏ cuộc trên hành trình học'],
      ['Classroom Discussion', 'Thảo luận trong lớp học'],
    ],
  },
];

const legacyByTitle = new Map();
try {
  const legacy = JSON.parse(readFileSync(legacyPath, 'utf8'));
  for (const lesson of legacy) {
    legacyByTitle.set(lesson.title, lesson);
  }
} catch {
  // ignore
}

function buildSentences(lessonNum, title, topic, topicVi, pairs) {
  let time = 0;
  const step = 4.2;
  return pairs.map(([english, vietnamese], index) => {
    const sentence = {
      id: `${lessonNum}-${index + 1}`,
      english,
      phonetic: '',
      vietnamese,
      time_start: time,
      time_end: time + step,
    };
    time += step;
    return sentence;
  });
}

function defaultPairs(title, topic, topicVi) {
  return [
    [`Today we will learn useful English about ${title.toLowerCase()}.`, `Hôm nay chúng ta học tiếng Anh hữu ích về ${title}.`],
    [`This topic is part of ${topic} and very practical.`, `Chủ đề này thuộc ${topicVi} và rất thiết thực.`],
    [`Let us start with common phrases you can use every day.`, `Hãy bắt đầu với những cụm từ thường dùng mỗi ngày.`],
    [`Listen carefully and repeat each sentence clearly.`, `Hãy lắng nghe kỹ và lặp lại từng câu rõ ràng.`],
    [`Practice speaking slowly at first, then increase your speed.`, `Luyện nói chậm trước, sau đó tăng tốc độ dần.`],
    [`Try to use these expressions in real conversations.`, `Hãy dùng các câu này trong hội thoại thực tế.`],
    [`Shadowing helps you improve pronunciation and fluency.`, `Shadowing giúp bạn cải thiện phát âm và độ trôi chảy.`],
    [`Review this lesson again tomorrow for better memory.`, `Ôn lại bài này vào ngày mai để nhớ lâu hơn.`],
    [`Ask a friend to practice this topic with you.`, `Nhờ bạn bè luyện tập chủ đề này cùng bạn.`],
    [`Great job! You are one step closer to fluent English.`, `Làm tốt lắm! Bạn đã tiến thêm một bước tới tiếng Anh trôi chảy.`],
  ];
}

const lessons = [];
let globalIndex = 0;

for (const category of categories) {
  category.lessons.forEach(([title, description], index) => {
    globalIndex += 1;
    const lessonNum = globalIndex;
    const id = `lesson-${String(lessonNum).padStart(2, '0')}`;
    const legacy = legacyByTitle.get(title);

    const sentences = legacy?.sentences?.length
      ? legacy.sentences.map((s, i) => ({
          ...s,
          id: `${lessonNum}-${i + 1}`,
        }))
      : buildSentences(lessonNum, title, category.topic, category.topicVi, defaultPairs(title, category.topic, category.topicVi));

    const duration = legacy?.duration ?? Math.ceil(sentences[sentences.length - 1].time_end);

    lessons.push({
      id,
      categoryId: category.id,
      title: titleByEnglish[title] ?? title,
      description,
      thumbnailUrl: `https://images.unsplash.com/${category.thumbs[index]}?w=600&h=340&fit=crop`,
      audioUrl: '',
      duration,
      level: legacy?.level ?? levels[index],
      topic: category.topicVi,
      sentences,
    });
  });
}

writeFileSync(outPath, JSON.stringify(lessons, null, 2), 'utf8');
console.log(`Generated ${lessons.length} lessons -> ${outPath}`);
