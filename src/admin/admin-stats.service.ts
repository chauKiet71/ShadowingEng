import { Injectable } from '@nestjs/common';
import { PaymentStatus, VideoTranslateStatus } from '@prisma/client';
import { GUEST_EMAIL_SUFFIX } from '../auth/guest-identity.service';
import { PrismaService } from '../prisma/prisma.service';

export type AdminStatsRange = '7d' | '30d' | '90d' | 'custom';

const MAX_RANGE_DAYS = 366;

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return startOfDay(date);
}

function rangeToDays(range: AdminStatsRange) {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  return 30;
}

function buildDayList(days: number, end = new Date()) {
  const endDay = startOfDay(end);
  const start = new Date(endDay);
  start.setDate(start.getDate() - (days - 1));
  return buildDayListBetween(start, endDay);
}

function buildDayListBetween(startInput: Date, endInput: Date) {
  let start = startOfDay(startInput);
  let end = startOfDay(endInput);
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const maxStart = new Date(end);
  maxStart.setDate(maxStart.getDate() - (MAX_RANGE_DAYS - 1));
  if (start < maxStart) start = maxStart;

  const list: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    list.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { start, end, list, days: list.length };
}

export type AdminStatsQuery = {
  range?: AdminStatsRange;
  from?: string;
  to?: string;
};

type DayBucket = {
  date: string;
  newUsers: number;
  activeUsers: number;
  revenue: number;
  paidOrders: number;
  lessonsCompleted: number;
  speakingSessions: number;
  videoReady: number;
  videoFailed: number;
  vocabUpdates: number;
};

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(query: AdminStatsQuery = {}) {
    const fromDate = query.from ? parseDay(query.from) : null;
    const toDate = query.to ? parseDay(query.to) : null;
    const hasCustom = !!(fromDate && toDate);

    let range: AdminStatsRange = query.range ?? '30d';
    if (range !== '7d' && range !== '30d' && range !== '90d' && range !== 'custom') {
      range = '30d';
    }

    const built = hasCustom
      ? buildDayListBetween(fromDate!, toDate!)
      : (() => {
          const days = rangeToDays(range === 'custom' ? '30d' : range);
          return buildDayList(days);
        })();

    if (hasCustom) range = 'custom';

    const { start, end, list, days } = built;
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const registeredWhere = {
      NOT: { email: { endsWith: GUEST_EMAIL_SUFFIX } },
    };

    const [
      newUsers,
      paidOrders,
      lessonHistory,
      speakingSessions,
      videoJobs,
      vocabProgress,
      registeredInRange,
      paidUserIds,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          ...registeredWhere,
          createdAt: { gte: start, lt: endExclusive },
        },
        select: { id: true, createdAt: true },
      }),
      this.prisma.paymentOrder.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: start, lt: endExclusive },
        },
        select: { userId: true, amount: true, paidAt: true },
      }),
      this.prisma.userLessonHistory.findMany({
        where: { lastListenedAt: { gte: start, lt: endExclusive } },
        select: {
          userId: true,
          status: true,
          lastListenedAt: true,
          listenedSeconds: true,
        },
      }),
      this.prisma.speakingSession.findMany({
        where: { createdAt: { gte: start, lt: endExclusive } },
        select: { userId: true, createdAt: true },
      }),
      this.prisma.videoTranslateJob.findMany({
        where: {
          OR: [
            { completedAt: { gte: start, lt: endExclusive } },
            {
              status: VideoTranslateStatus.FAILED,
              updatedAt: { gte: start, lt: endExclusive },
            },
          ],
        },
        select: {
          userId: true,
          status: true,
          completedAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.userVocabularyProgress.findMany({
        where: { updatedAt: { gte: start, lt: endExclusive } },
        select: { userId: true, updatedAt: true },
      }),
      this.prisma.user.count({
        where: {
          ...registeredWhere,
          createdAt: { gte: start, lt: endExclusive },
        },
      }),
      this.prisma.paymentOrder.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: start, lt: endExclusive },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const buckets = new Map<string, DayBucket>();
    const activeSets = new Map<string, Set<string>>();
    for (const date of list) {
      buckets.set(date, {
        date,
        newUsers: 0,
        activeUsers: 0,
        revenue: 0,
        paidOrders: 0,
        lessonsCompleted: 0,
        speakingSessions: 0,
        videoReady: 0,
        videoFailed: 0,
        vocabUpdates: 0,
      });
      activeSets.set(date, new Set());
    }

    const markActive = (date: string, userId: string) => {
      activeSets.get(date)?.add(userId);
    };

    for (const user of newUsers) {
      const key = dayKey(user.createdAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.newUsers += 1;
      markActive(key, user.id);
    }

    for (const order of paidOrders) {
      if (!order.paidAt) continue;
      const key = dayKey(order.paidAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.paidOrders += 1;
      bucket.revenue += order.amount;
      markActive(key, order.userId);
    }

    for (const row of lessonHistory) {
      const key = dayKey(row.lastListenedAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (row.status === 'COMPLETED') bucket.lessonsCompleted += 1;
      markActive(key, row.userId);
    }

    for (const row of speakingSessions) {
      const key = dayKey(row.createdAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.speakingSessions += 1;
      markActive(key, row.userId);
    }

    for (const job of videoJobs) {
      if (job.status === VideoTranslateStatus.READY && job.completedAt) {
        const key = dayKey(job.completedAt);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.videoReady += 1;
          markActive(key, job.userId);
        }
      } else if (job.status === VideoTranslateStatus.FAILED) {
        const key = dayKey(job.updatedAt);
        const bucket = buckets.get(key);
        if (bucket) {
          bucket.videoFailed += 1;
          markActive(key, job.userId);
        }
      }
    }

    for (const row of vocabProgress) {
      const key = dayKey(row.updatedAt);
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.vocabUpdates += 1;
      markActive(key, row.userId);
    }

    for (const [date, set] of activeSets) {
      const bucket = buckets.get(date);
      if (bucket) bucket.activeUsers = set.size;
    }

    const series = list.map((date) => buckets.get(date)!);

    const summary = series.reduce(
      (acc, day) => {
        acc.newUsers += day.newUsers;
        acc.revenue += day.revenue;
        acc.paidOrders += day.paidOrders;
        acc.lessonsCompleted += day.lessonsCompleted;
        acc.speakingSessions += day.speakingSessions;
        acc.videoReady += day.videoReady;
        acc.videoFailed += day.videoFailed;
        acc.vocabUpdates += day.vocabUpdates;
        acc.activeUsersSum += day.activeUsers;
        return acc;
      },
      {
        newUsers: 0,
        revenue: 0,
        paidOrders: 0,
        lessonsCompleted: 0,
        speakingSessions: 0,
        videoReady: 0,
        videoFailed: 0,
        vocabUpdates: 0,
        activeUsersSum: 0,
      },
    );

    const engagedUserIds = new Set<string>();
    for (const row of lessonHistory) engagedUserIds.add(row.userId);
    for (const row of speakingSessions) engagedUserIds.add(row.userId);
    for (const job of videoJobs) engagedUserIds.add(job.userId);
    for (const row of vocabProgress) engagedUserIds.add(row.userId);

    const activatedUserIds = new Set(engagedUserIds);
    for (const user of newUsers) activatedUserIds.add(user.id);
    for (const order of paidOrders) activatedUserIds.add(order.userId);

    const listeningMinutes = Math.round(
      lessonHistory.reduce((sum, row) => sum + (row.listenedSeconds || 0), 0) /
        60,
    );

    return {
      range,
      days,
      from: start.toISOString(),
      to: end.toISOString(),
      generatedAt: new Date().toISOString(),
      summary: {
        newUsers: summary.newUsers,
        avgDailyActive: Math.round((summary.activeUsersSum / days) * 10) / 10,
        revenue: summary.revenue,
        paidOrders: summary.paidOrders,
        lessonsCompleted: summary.lessonsCompleted,
        listeningMinutes,
        speakingSessions: summary.speakingSessions,
        videoReady: summary.videoReady,
        videoFailed: summary.videoFailed,
        vocabUpdates: summary.vocabUpdates,
      },
      series,
      funnel: {
        registered: registeredInRange,
        activated: activatedUserIds.size,
        engaged: engagedUserIds.size,
        paid: paidUserIds.length,
      },
      featureMix: {
        listening: summary.lessonsCompleted,
        speaking: summary.speakingSessions,
        video: summary.videoReady,
        vocabulary: summary.vocabUpdates,
      },
    };
  }
}
