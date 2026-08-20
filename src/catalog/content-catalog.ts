import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface CatalogSentence {
  id: string;
  english: string;
  phonetic?: string;
  vietnamese: string;
  time_start: number;
  time_end: number;
  words?: Array<{ text: string; start: number; end: number }>;
}

export interface CatalogLesson {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  audioUrl: string;
  duration: number;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  topic: string;
  sentences: CatalogSentence[];
}

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  imageUrl: string;
  lessonCount: number;
  isPopular: boolean;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { id: '1', slug: 'du-lich', name: 'Du lịch & Khám phá', description: 'Khám phá thế giới qua tiếng Anh', icon: '🏔️', iconColor: 'bg-green-500', imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&h=200&fit=crop', lessonCount: 11, isPopular: true },
  { id: '2', slug: 'cuoc-song', name: 'Cuộc sống hằng ngày', description: 'Giao tiếp trong đời sống thường nhật', icon: '🎧', iconColor: 'bg-purple-500', imageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=200&h=200&fit=crop', lessonCount: 28, isPopular: true },
  { id: '3', slug: 'cong-viec', name: 'Công việc & Sự nghiệp', description: 'Tiếng Anh chuyên nghiệp', icon: '💼', iconColor: 'bg-teal-500', imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop', lessonCount: 10, isPopular: true },
  { id: '4', slug: 'tin-tuc', name: 'Tin tức & Xã hội', description: 'Cập nhật thế giới quanh ta', icon: '📰', iconColor: 'bg-orange-500', imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop', lessonCount: 10, isPopular: true },
  { id: '5', slug: 'giai-tri', name: 'Giải trí & Phim ảnh', description: 'Học qua phim và giải trí', icon: '🎬', iconColor: 'bg-pink-500', imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop', lessonCount: 10, isPopular: true },
  { id: '6', slug: 'khoa-hoc', name: 'Khoa học & Công nghệ', description: 'Khám phá khoa học hiện đại', icon: '🔬', iconColor: 'bg-emerald-600', imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=200&h=200&fit=crop', lessonCount: 10, isPopular: true },
  { id: '7', slug: 'suc-khoe', name: 'Sức khỏe & Lối sống', description: 'Sống khỏe, sống vui', icon: '🥗', iconColor: 'bg-yellow-500', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop', lessonCount: 10, isPopular: true },
  { id: '8', slug: 'hoc-tap', name: 'Học tập & Giáo dục', description: 'Nâng cao kiến thức', icon: '🎓', iconColor: 'bg-blue-500', imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop', lessonCount: 10, isPopular: true },
  { id: '9', slug: 'doi-song-sinh-vien', name: 'Đời sống sinh viên', description: 'Hội thoại tiếng Anh trong đời sống sinh viên', icon: '🏫', iconColor: 'bg-indigo-500', imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '10', slug: 'tinh-yeu', name: 'Tình yêu', description: 'Hội thoại tiếng Anh về tình yêu và hẹn hò', icon: '💕', iconColor: 'bg-rose-500', imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '11', slug: 'xe-dien', name: 'Xe điện', description: 'Học tiếng Anh về xe điện và giao thông xanh', icon: '⚡', iconColor: 'bg-cyan-500', imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=200&h=200&fit=crop', lessonCount: 15, isPopular: false },
  { id: '12', slug: 'ngon-ngu-van-hoa', name: 'Ngôn ngữ & Văn hóa', description: 'Khám phá ngôn ngữ và văn hóa các nước qua tiếng Anh', icon: '🌍', iconColor: 'bg-violet-500', imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '13', slug: 'thiet-bi-di-dong', name: 'Thiết bị di động', description: 'Học tiếng Anh về smartphone và công nghệ di động', icon: '📱', iconColor: 'bg-sky-500', imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '14', slug: 'cung-cau', name: 'Cung & Cầu', description: 'Học tiếng Anh về kinh tế: cung, cầu và thị trường', icon: '📈', iconColor: 'bg-amber-500', imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '15', slug: 'gia-dinh-nuoi-day-con', name: 'Gia đình & Nuôi dạy con', description: 'Giao tiếp và gắn kết trong gia đình qua tiếng Anh', icon: '👨‍👩‍👧‍👦', iconColor: 'bg-rose-400', imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '16', slug: 'tai-chinh-ca-nhan', name: 'Tài chính cá nhân', description: 'Học tiếng Anh về tiết kiệm, ngân sách và đầu tư', icon: '💰', iconColor: 'bg-emerald-500', imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '17', slug: 'the-thao', name: 'Thể thao', description: 'Học tiếng Anh về tập luyện, thi đấu và tinh thần thể thao', icon: '⚽', iconColor: 'bg-lime-500', imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '18', slug: 'am-thuc', name: 'Ẩm thực', description: 'Học tiếng Anh về món ăn, nấu nướng và văn hóa ẩm thực', icon: '🍜', iconColor: 'bg-orange-500', imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '19', slug: 'mang-xa-hoi-sang-tao-noi-dung', name: 'Mạng xã hội & Sáng tạo nội dung', description: 'Học tiếng Anh về mạng xã hội, video ngắn và sáng tạo nội dung', icon: '📱', iconColor: 'bg-indigo-500', imageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '20', slug: 'ky-nang-mem', name: 'Kỹ năng mềm', description: 'Học tiếng Anh về quản lý thời gian, giao tiếp và làm việc nhóm', icon: '🧠', iconColor: 'bg-fuchsia-500', imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '21', slug: 'tam-ly-hoc', name: 'Tâm lý học', description: 'Học tiếng Anh về sức khỏe tinh thần, cảm xúc và động lực', icon: '🧩', iconColor: 'bg-teal-500', imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '22', slug: 'lich-su-di-san', name: 'Lịch sử & Di sản', description: 'Học tiếng Anh về lịch sử, di sản văn hóa và bảo tồn', icon: '🏛️', iconColor: 'bg-stone-500', imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '23', slug: 'thu-cung-dong-vat', name: 'Thú cưng & Động vật', description: 'Học tiếng Anh về thú cưng, động vật hoang dã và bảo tồn', icon: '🐾', iconColor: 'bg-amber-600', imageUrl: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
  { id: '24', slug: 'nghe-thuat-sang-tao', name: 'Nghệ thuật & Sáng tạo', description: 'Học tiếng Anh về nghệ thuật, âm nhạc, văn học và sáng tạo', icon: '🎨', iconColor: 'bg-pink-500', imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop', lessonCount: 10, isPopular: false },
];

let cachedLessons: CatalogLesson[] | null = null;

function resolveLessonsPath() {
  const candidates = [
    join(process.cwd(), 'client/src/data/lessons.json'),
    join(process.cwd(), 'src/catalog/lessons.json'),
    join(__dirname, 'lessons.json'),
  ];
  return candidates.find((path) => existsSync(path));
}

export function loadCatalogLessons(): CatalogLesson[] {
  if (cachedLessons) return cachedLessons;
  const filePath = resolveLessonsPath();
  if (!filePath) {
    cachedLessons = [];
    return cachedLessons;
  }
  cachedLessons = JSON.parse(readFileSync(filePath, 'utf8')) as CatalogLesson[];
  return cachedLessons;
}

function categoryOf(categoryId: string) {
  return CATALOG_CATEGORIES.find((item) => item.id === categoryId) ?? null;
}

function resolveAudioUrl(lesson: CatalogLesson) {
  if (lesson.audioUrl?.trim()) return lesson.audioUrl;
  return `/audio/${lesson.id}.wav`;
}

export function toLessonListDto(lesson: CatalogLesson) {
  const category = categoryOf(lesson.categoryId);
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    thumbnailUrl: lesson.thumbnailUrl,
    audioUrl: resolveAudioUrl(lesson),
    duration: lesson.duration,
    level: lesson.level,
    topic: lesson.topic,
    categoryId: lesson.categoryId,
    isFeatured: lesson.level === 'BEGINNER',
    isNew: false,
    isHot: false,
    category: category
      ? {
          id: category.id,
          name: category.name,
          icon: category.icon,
          iconColor: category.iconColor,
          imageUrl: category.imageUrl,
          lessonCount: category.lessonCount,
        }
      : null,
  };
}

export function toLessonDetailDto(lesson: CatalogLesson) {
  return {
    ...toLessonListDto(lesson),
    transcripts: lesson.sentences.map((sentence, index) => ({
      id: sentence.id,
      orderIndex: index,
      englishText: sentence.english,
      vietnamese: sentence.vietnamese,
      startTime: sentence.time_start,
      endTime: sentence.time_end,
      phonetic: sentence.phonetic ?? '',
      words: sentence.words ?? [],
    })),
  };
}

export function listCatalogLessons(params?: {
  featured?: boolean;
  categoryId?: string;
}) {
  let lessons = loadCatalogLessons();
  if (params?.featured) {
    lessons = lessons.filter((lesson) => lesson.level === 'BEGINNER');
  }
  if (params?.categoryId) {
    lessons = lessons.filter((lesson) => lesson.categoryId === params.categoryId);
  }
  return lessons.map(toLessonListDto);
}

export function getCatalogLesson(id: string) {
  const lesson = loadCatalogLessons().find((item) => item.id === id);
  return lesson ? toLessonDetailDto(lesson) : null;
}

export function listCatalogCategories(popularOnly = false) {
  const categories = popularOnly
    ? CATALOG_CATEGORIES.filter((item) => item.isPopular)
    : CATALOG_CATEGORIES;
  return categories.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    icon: item.icon,
    iconColor: item.iconColor,
    imageUrl: item.imageUrl,
    lessonCount: item.lessonCount,
    isPopular: item.isPopular,
  }));
}
