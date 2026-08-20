import { Injectable, NotFoundException } from '@nestjs/common';
import {
  getCatalogLesson,
  listCatalogLessons,
} from '../catalog/content-catalog';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { featured?: boolean; categoryId?: string }) {
    const catalog = listCatalogLessons(params);
    if (catalog.length > 0) return catalog;

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
    const catalog = getCatalogLesson(id);
    if (catalog) return catalog;

    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        category: true,
        transcripts: { orderBy: { orderIndex: 'asc' } },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    return lesson;
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

  toHistoryEntry(row: {
    lessonId: string;
    status: string;
    progressPercentage: number;
    listenedSeconds: number;
    lastListenedAt: Date;
    isFavorite: boolean;
  }) {
    return {
      lessonId: row.lessonId,
      status: row.status,
      progress: row.progressPercentage / 100,
      listenedSeconds: row.listenedSeconds,
      lastListenedAt: row.lastListenedAt.toISOString(),
      isFavorite: row.isFavorite,
    };
  }

  async getMyHistoryEntries(userId: string) {
    const rows = await this.prisma.userLessonHistory.findMany({
      where: { userId },
      orderBy: { lastListenedAt: 'desc' },
    });
    return rows.map((row) => this.toHistoryEntry(row));
  }

  async upsertHistory(
    userId: string,
    dto: {
      lessonId: string;
      status?: string;
      progress?: number;
      listenedSeconds?: number;
      isFavorite?: boolean;
    },
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      select: { id: true },
    });
    if (!lesson) return null;

    const progressPercentage = Math.round(
      Math.min(100, Math.max(0, (dto.progress ?? 0) * 100)),
    );
    const status =
      dto.status === 'COMPLETED' || dto.status === 'LEARNING'
        ? dto.status
        : undefined;

    const row = await this.prisma.userLessonHistory.upsert({
      where: { userId_lessonId: { userId, lessonId: dto.lessonId } },
      create: {
        userId,
        lessonId: dto.lessonId,
        status: status === 'COMPLETED' ? 'COMPLETED' : 'LEARNING',
        progressPercentage,
        listenedSeconds: dto.listenedSeconds ?? 0,
        isFavorite: dto.isFavorite ?? false,
        lastListenedAt: new Date(),
      },
      update: {
        ...(status ? { status } : {}),
        progressPercentage,
        listenedSeconds: dto.listenedSeconds ?? 0,
        ...(dto.isFavorite === undefined ? {} : { isFavorite: dto.isFavorite }),
        lastListenedAt: new Date(),
      },
    });
    return this.toHistoryEntry(row);
  }

  async getMyFavoriteIds(userId: string) {
    const [favorites, historyFavs] = await Promise.all([
      this.prisma.userFavorite.findMany({
        where: { userId },
        select: { lessonId: true },
      }),
      this.prisma.userLessonHistory.findMany({
        where: { userId, isFavorite: true },
        select: { lessonId: true },
      }),
    ]);
    return [
      ...new Set([
        ...favorites.map((item) => item.lessonId),
        ...historyFavs.map((item) => item.lessonId),
      ]),
    ];
  }

  async setFavorite(userId: string, lessonId: string, favorite: boolean) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) return { lessonId, saved: favorite };

    if (favorite) {
      await this.prisma.userFavorite.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId },
        update: {},
      });
    } else {
      await this.prisma.userFavorite.deleteMany({
        where: { userId, lessonId },
      });
    }

    await this.prisma.userLessonHistory.updateMany({
      where: { userId, lessonId },
      data: { isFavorite: favorite },
    });
    return { lessonId, saved: favorite };
  }
}
