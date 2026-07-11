import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { featured?: boolean; categoryId?: string }) {
    const where: Record<string, unknown> = {};
    if (params?.featured) where.isFeatured = true;
    if (params?.categoryId) where.categoryId = params.categoryId;

    return this.prisma.lesson.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: {
        category: true,
        transcripts: { orderBy: { orderIndex: 'asc' } },
      },
    });
  }

  async getHistory(userId: string, status?: string) {
    const where: Record<string, unknown> = { userId };
    if (status && status !== 'all') where.status = status.toUpperCase();

    return this.prisma.userLessonHistory.findMany({
      where,
      include: { lesson: { include: { category: true } } },
      orderBy: { lastListenedAt: 'desc' },
    });
  }

  async getHistoryStats(userId: string) {
    const completedLessons = await this.prisma.userLessonHistory.count({
      where: { userId, status: 'COMPLETED' },
    });
    const histories = await this.prisma.userLessonHistory.findMany({
      where: { userId },
    });
    const lessonsListened = histories.length;
    const hoursListened =
      histories.reduce((sum, h) => sum + h.listenedSeconds, 0) / 3600;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      completedLessons,
      lessonsListened,
      hoursListened: Math.round(hoursListened * 10) / 10,
      streakDays: user?.streakDays || 0,
      weeklyGoal: 20,
      weeklyProgress: Math.min(12.6, hoursListened),
    };
  }
}
