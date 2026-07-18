export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  imageUrl: string;
  lessonCount: number;
}

export const categories: Category[] = [
  {
    id: '1',
    slug: 'du-lich',
    name: 'Du lịch & Khám phá',
    description: 'Khám phá thế giới qua tiếng Anh',
    icon: '🏔️',
    iconColor: 'bg-green-500',
    imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&h=200&fit=crop',
    lessonCount: 11,
  },
  {
    id: '2',
    slug: 'cuoc-song',
    name: 'Cuộc sống hằng ngày',
    description: 'Giao tiếp trong đời sống thường nhật',
    icon: '🎧',
    iconColor: 'bg-purple-500',
    imageUrl: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=200&h=200&fit=crop',
    lessonCount: 11,
  },
  {
    id: '3',
    slug: 'cong-viec',
    name: 'Công việc & Sự nghiệp',
    description: 'Tiếng Anh chuyên nghiệp',
    icon: '💼',
    iconColor: 'bg-teal-500',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
  {
    id: '4',
    slug: 'tin-tuc',
    name: 'Tin tức & Xã hội',
    description: 'Cập nhật thế giới quanh ta',
    icon: '📰',
    iconColor: 'bg-orange-500',
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
  {
    id: '5',
    slug: 'giai-tri',
    name: 'Giải trí & Phim ảnh',
    description: 'Học qua phim và giải trí',
    icon: '🎬',
    iconColor: 'bg-pink-500',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
  {
    id: '6',
    slug: 'khoa-hoc',
    name: 'Khoa học & Công nghệ',
    description: 'Khám phá khoa học hiện đại',
    icon: '🔬',
    iconColor: 'bg-emerald-600',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
  {
    id: '7',
    slug: 'suc-khoe',
    name: 'Sức khỏe & Lối sống',
    description: 'Sống khỏe, sống vui',
    icon: '🥗',
    iconColor: 'bg-yellow-500',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
  {
    id: '8',
    slug: 'hoc-tap',
    name: 'Học tập & Giáo dục',
    description: 'Nâng cao kiến thức',
    icon: '🎓',
    iconColor: 'bg-blue-500',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
  {
    id: '9',
    slug: 'doi-song-sinh-vien',
    name: 'Đời sống sinh viên',
    description: 'Hội thoại tiếng Anh trong đời sống sinh viên',
    icon: '🏫',
    iconColor: 'bg-indigo-500',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
  {
    id: '10',
    slug: 'tinh-yeu',
    name: 'Tình yêu',
    description: 'Hội thoại tiếng Anh về tình yêu và hẹn hò',
    icon: '💕',
    iconColor: 'bg-rose-500',
    imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200&h=200&fit=crop',
    lessonCount: 10,
  },
];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}
