import { getFeaturedLessons } from './lessons';
export { categories } from './categories';

export const featuredLessons = getFeaturedLessons().map(
  ({ id, title, duration, level, thumbnailUrl, topic }) => ({
    id,
    title,
    duration,
    level,
    thumbnailUrl,
    topic,
  }),
);

export const historyItems = [
  { id: 'lesson-79', title: 'Never Give Up', status: 'COMPLETED', topic: 'Education', level: 'Intermediate', duration: 60, progress: 100, lastListened: 'Hôm nay, 09:30', isFavorite: true, thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=120&h=80&fit=crop' },
  { id: 'lesson-01', title: 'Traveling Abroad', status: 'LEARNING', topic: 'Travel', level: 'Intermediate', duration: 59, progress: 60, lastListened: 'Hôm qua, 20:15', isFavorite: false, thumbnailUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=120&h=80&fit=crop' },
  { id: 'lesson-11', title: 'Morning Routine', status: 'LEARNING', topic: 'Daily Life', level: 'Beginner', duration: 58, progress: 30, lastListened: '2 ngày trước', isFavorite: true, thumbnailUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=120&h=80&fit=crop' },
];

export const transcripts = [
  { id: '1', englishText: 'Today is hard.', vietnamese: 'Hôm nay thật khó khăn.', startTime: 0, endTime: 3, isActive: false },
  { id: '2', englishText: 'Tomorrow will be worse.', vietnamese: 'Ngày mai sẽ còn tệ hơn.', startTime: 3, endTime: 6, isActive: false },
  { id: '3', englishText: 'But the day after tomorrow will be sunshine.', vietnamese: 'Nhưng ngày kia sẽ có nắng.', startTime: 6, endTime: 12, isActive: true },
];

export const adminUsers = [
  { id: '1', fullName: 'Minh Anh', email: 'minhanh@email.com', avatarUrl: 'https://i.pravatar.cc/40?u=1', package: 'Pro', status: 'ACTIVE', createdAt: '2025-01-15', lastActivity: '2025-07-10' },
  { id: '2', fullName: 'Hoàng Nam', email: 'hoangnam@email.com', avatarUrl: 'https://i.pravatar.cc/40?u=2', package: 'Free', status: 'ACTIVE', createdAt: '2025-02-20', lastActivity: '2025-07-09' },
  { id: '3', fullName: 'Lan Chi', email: 'lanchi@email.com', avatarUrl: 'https://i.pravatar.cc/40?u=3', package: 'Premium', status: 'ACTIVE', createdAt: '2025-03-10', lastActivity: '2025-07-08' },
  { id: '4', fullName: 'Tuấn Kiệt', email: 'tuankiet@email.com', avatarUrl: 'https://i.pravatar.cc/40?u=4', package: 'Free', status: 'INACTIVE', createdAt: '2025-04-05', lastActivity: '2025-06-15' },
  { id: '5', fullName: 'Phương Thảo', email: 'phuongthao@email.com', avatarUrl: 'https://i.pravatar.cc/40?u=5', package: 'Pro', status: 'ACTIVE', createdAt: '2025-05-12', lastActivity: '2025-07-10' },
  { id: '6', fullName: 'Đức Anh', email: 'ducanh@email.com', avatarUrl: 'https://i.pravatar.cc/40?u=6', package: 'Free', status: 'LOCKED', createdAt: '2025-06-01', lastActivity: '2025-06-20' },
];

export const packages = [
  { id: '1', name: 'Pro', description: 'Học hiệu quả hơn mỗi ngày', price: 149000, duration: '1 tháng', icon: 'crown', status: 'ACTIVE', userCount: 3275, isVisible: true },
  { id: '2', name: 'Premium', description: 'Tối ưu cho người học nghiêm túc', price: 299000, duration: '3 tháng', icon: 'diamond', status: 'ACTIVE', userCount: 1850, isVisible: true },
  { id: '3', name: 'Basic', description: 'Bắt đầu hành trình nghe tiếng Anh', price: 99000, duration: '1 tháng', icon: 'star', status: 'ACTIVE', userCount: 4200, isVisible: true },
  { id: '4', name: 'Lifetime', description: 'Trọn đời không giới hạn', price: 1990000, duration: 'Trọn đời', icon: 'infinity', status: 'PAUSED', userCount: 320, isVisible: false },
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatPrice(price: number): string {
  return price.toLocaleString('vi-VN') + ' đ';
}
