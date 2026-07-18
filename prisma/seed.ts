import { PrismaClient, LessonLevel, PackageStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SPEAKING_SCENARIOS } from '../src/speaking/speaking-scenarios';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@shadowing.com' },
    update: {},
    create: {
      email: 'admin@shadowing.com',
      fullName: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
      isPremium: true,
      xp: 5000,
      level: 10,
      streakDays: 30,
    },
  });

  const packages = await Promise.all([
    prisma.package.upsert({
      where: { id: 'pkg-1m' },
      update: {
        name: '1 Tháng',
        description: 'Gói Premium 1 tháng',
        price: 99000,
        duration: '1 tháng',
        months: 1,
        monthlyPrice: 99000,
        originalPrice: null,
        badge: null,
        sortOrder: 0,
        icon: 'crown',
        status: PackageStatus.ACTIVE,
        isVisible: true,
      },
      create: {
        id: 'pkg-1m',
        name: '1 Tháng',
        description: 'Gói Premium 1 tháng',
        price: 99000,
        duration: '1 tháng',
        months: 1,
        monthlyPrice: 99000,
        icon: 'crown',
        status: PackageStatus.ACTIVE,
        isVisible: true,
        sortOrder: 0,
      },
    }),
    prisma.package.upsert({
      where: { id: 'pkg-3m' },
      update: {
        name: '3 Tháng',
        description: 'Gói Premium 3 tháng',
        price: 207000,
        duration: '3 tháng',
        months: 3,
        monthlyPrice: 69000,
        originalPrice: 297000,
        badge: 'Tiết kiệm 33%',
        sortOrder: 1,
        icon: 'crown',
        status: PackageStatus.ACTIVE,
        isVisible: true,
      },
      create: {
        id: 'pkg-3m',
        name: '3 Tháng',
        description: 'Gói Premium 3 tháng',
        price: 207000,
        duration: '3 tháng',
        months: 3,
        monthlyPrice: 69000,
        originalPrice: 297000,
        badge: 'Tiết kiệm 33%',
        icon: 'crown',
        status: PackageStatus.ACTIVE,
        isVisible: true,
        sortOrder: 1,
      },
    }),
    prisma.package.upsert({
      where: { id: 'pkg-12m' },
      update: {
        name: '12 Tháng',
        description: 'Gói Premium 12 tháng',
        price: 588000,
        duration: '12 tháng',
        months: 12,
        monthlyPrice: 49000,
        originalPrice: 1188000,
        badge: 'Tiết kiệm 50%',
        sortOrder: 2,
        icon: 'crown',
        status: PackageStatus.ACTIVE,
        isVisible: true,
      },
      create: {
        id: 'pkg-12m',
        name: '12 Tháng',
        description: 'Gói Premium 12 tháng',
        price: 588000,
        duration: '12 tháng',
        months: 12,
        monthlyPrice: 49000,
        originalPrice: 1188000,
        badge: 'Tiết kiệm 50%',
        icon: 'crown',
        status: PackageStatus.ACTIVE,
        isVisible: true,
        sortOrder: 2,
      },
    }),
  ]);

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Du lịch & Khám phá',
        description: 'Khám phá thế giới qua tiếng Anh',
        icon: '🏔️',
        iconColor: 'bg-green-500',
        lessonCount: 28,
        isPopular: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Cuộc sống hằng ngày',
        description: 'Giao tiếp trong đời sống thường nhật',
        icon: '🎧',
        iconColor: 'bg-purple-500',
        lessonCount: 35,
        isPopular: true,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Công việc & Sự nghiệp',
        description: 'Tiếng Anh chuyên nghiệp',
        icon: '💼',
        iconColor: 'bg-teal-500',
        lessonCount: 22,
        isPopular: true,
      },
    }),
  ]);

  const lesson = await prisma.lesson.create({
    data: {
      title: 'Never Give Up',
      description: 'Motivational speech about perseverance',
      duration: 45,
      level: LessonLevel.INTERMEDIATE,
      topic: 'Motivation',
      categoryId: categories[0].id,
      isFeatured: true,
      transcripts: {
        create: [
          {
            orderIndex: 0,
            englishText: 'Today is hard.',
            vietnamese: 'Hôm nay thật khó khăn.',
            startTime: 0,
            endTime: 3,
          },
          {
            orderIndex: 1,
            englishText: 'Tomorrow will be worse.',
            vietnamese: 'Ngày mai sẽ còn tệ hơn.',
            startTime: 3,
            endTime: 6,
          },
          {
            orderIndex: 2,
            englishText: 'But the day after tomorrow will be sunshine.',
            vietnamese: 'Nhưng ngày kia sẽ có nắng.',
            startTime: 6,
            endTime: 12,
          },
        ],
      },
    },
  });

  let speakingCount = 0;
  for (const scenario of SPEAKING_SCENARIOS) {
    await prisma.speakingScenario.upsert({
      where: { slug: scenario.slug },
      create: { ...scenario },
      update: {
        title: scenario.title,
        description: scenario.description,
        icon: scenario.icon,
        color: scenario.color,
        learnerRole: scenario.learnerRole,
        aiRole: scenario.aiRole,
        objective: scenario.objective,
        minLevel: scenario.minLevel,
        maxLevel: scenario.maxLevel,
        openingHint: scenario.openingHint,
        sortOrder: scenario.sortOrder,
        isVisible: true,
      },
    });
    speakingCount += 1;
  }

  console.log('Seed completed:', {
    packages: packages.length,
    categories: categories.length,
    lesson: lesson.title,
    speakingScenarios: speakingCount,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
