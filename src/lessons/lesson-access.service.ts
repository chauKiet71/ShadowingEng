import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LessonAccessService {
  constructor(private prisma: PrismaService) {}

  async getAccessMap(): Promise<Record<string, boolean>> {
    const rows = await this.prisma.lessonAccess.findMany({
      select: { lessonId: true, isLocked: true },
    });

    return Object.fromEntries(rows.map((row) => [row.lessonId, row.isLocked]));
  }

  async getLockedLessonIds(): Promise<string[]> {
    const rows = await this.prisma.lessonAccess.findMany({
      where: { isLocked: true },
      select: { lessonId: true },
    });
    return rows.map((row) => row.lessonId);
  }

  async setLocked(lessonId: string, isLocked: boolean) {
    const row = await this.prisma.lessonAccess.upsert({
      where: { lessonId },
      create: { lessonId, isLocked },
      update: { isLocked },
      select: { lessonId: true, isLocked: true, updatedAt: true },
    });

    return row;
  }
}
