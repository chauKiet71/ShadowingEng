import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, VideoTranslateStatus } from '@prisma/client';
import { GUEST_EMAIL_SUFFIX } from '../auth/guest-identity.service';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

@Injectable()
export class AdminOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const today = startOfDay(now);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = startOfMonth(now);
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const registeredWhere: Prisma.UserWhereInput = {
      NOT: { email: { endsWith: GUEST_EMAIL_SUFFIX } },
    };

    const [
      usersTotal,
      usersNewToday,
      usersNew7d,
      usersNew30d,
      dau,
      premiumActive,
      premiumExpiring7d,
      revenueTodayAgg,
      revenueMonthAgg,
      paidUsers30d,
      lessonsCompletedToday,
      listeningAgg,
      speakingSessionsToday,
      videoReadyToday,
      videoFailedToday,
      videoFailedRecent,
      vocabLearnedToday,
      paymentsPending,
      paymentsPaidToday,
      paymentsExpiredRecent,
      recentOrders,
      recentUsers,
      lessonsTotal,
      categoriesTotal,
      lockedLessons,
      premiumExpiringUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: registeredWhere }),
      this.prisma.user.count({
        where: { ...registeredWhere, createdAt: { gte: today } },
      }),
      this.prisma.user.count({
        where: { ...registeredWhere, createdAt: { gte: day7 } },
      }),
      this.prisma.user.count({
        where: { ...registeredWhere, createdAt: { gte: day30 } },
      }),
      this.prisma.user.count({
        where: { ...registeredWhere, lastActivity: { gte: today } },
      }),
      this.prisma.user.count({
        where: {
          ...registeredWhere,
          isPremium: true,
          OR: [
            { premiumExpiresAt: null },
            { premiumExpiresAt: { gt: now } },
          ],
        },
      }),
      this.prisma.user.count({
        where: {
          ...registeredWhere,
          isPremium: true,
          premiumExpiresAt: { gt: now, lte: weekAhead },
        },
      }),
      this.prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.PAID, paidAt: { gte: today } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.paymentOrder.aggregate({
        where: { status: PaymentStatus.PAID, paidAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.paymentOrder.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: day30 },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.userLessonHistory.count({
        where: {
          status: 'COMPLETED',
          lastListenedAt: { gte: today },
        },
      }),
      this.prisma.userLessonHistory.aggregate({
        where: { lastListenedAt: { gte: today } },
        _sum: { listenedSeconds: true },
        _count: true,
      }),
      this.prisma.speakingSession.count({
        where: { createdAt: { gte: today } },
      }),
      this.prisma.videoTranslateJob.count({
        where: {
          status: VideoTranslateStatus.READY,
          completedAt: { gte: today },
        },
      }),
      this.prisma.videoTranslateJob.count({
        where: {
          status: VideoTranslateStatus.FAILED,
          updatedAt: { gte: today },
        },
      }),
      this.prisma.videoTranslateJob.findMany({
        where: { status: VideoTranslateStatus.FAILED },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          originalFilename: true,
          errorMessage: true,
          updatedAt: true,
          user: { select: { fullName: true, email: true } },
        },
      }),
      this.prisma.userVocabularyProgress.count({
        where: { updatedAt: { gte: today } },
      }),
      this.prisma.paymentOrder.count({
        where: { status: PaymentStatus.PENDING },
      }),
      this.prisma.paymentOrder.count({
        where: { status: PaymentStatus.PAID, paidAt: { gte: today } },
      }),
      this.prisma.paymentOrder.count({
        where: {
          status: { in: [PaymentStatus.EXPIRED, PaymentStatus.CANCELLED] },
          updatedAt: { gte: day7 },
        },
      }),
      this.prisma.paymentOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          paymentCode: true,
          amount: true,
          status: true,
          paidAt: true,
          createdAt: true,
          user: { select: { fullName: true, email: true } },
          package: { select: { name: true } },
        },
      }),
      this.prisma.user.findMany({
        where: registeredWhere,
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
          isPremium: true,
        },
      }),
      this.prisma.lesson.count(),
      this.prisma.category.count(),
      this.prisma.lessonAccess.count({ where: { isLocked: true } }),
      this.prisma.user.findMany({
        where: {
          ...registeredWhere,
          isPremium: true,
          premiumExpiresAt: { gt: now, lte: weekAhead },
        },
        orderBy: { premiumExpiresAt: 'asc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          email: true,
          premiumExpiresAt: true,
          package: { select: { name: true } },
        },
      }),
    ]);

    const conversionRate30d =
      usersNew30d > 0
        ? Math.round((paidUsers30d.length / usersNew30d) * 1000) / 10
        : 0;

    const listeningMinutesToday = Math.round(
      (listeningAgg._sum.listenedSeconds ?? 0) / 60,
    );

    const activity = [
      ...recentUsers.map((u) => ({
        type: 'user' as const,
        title: u.fullName || u.email,
        subtitle: 'Đăng ký tài khoản mới',
        at: u.createdAt.toISOString(),
      })),
      ...recentOrders
        .filter((o) => o.status === PaymentStatus.PAID && o.paidAt)
        .map((o) => ({
          type: 'payment' as const,
          title: `${o.user.fullName || o.user.email} · ${o.package.name}`,
          subtitle: `Thanh toán ${o.amount.toLocaleString('vi-VN')}₫`,
          at: (o.paidAt ?? o.createdAt).toISOString(),
        })),
      ...videoFailedRecent.slice(0, 3).map((j) => ({
        type: 'alert' as const,
        title: j.title || j.originalFilename || 'Dịch video thất bại',
        subtitle: j.errorMessage?.slice(0, 80) || 'Job FAILED',
        at: j.updatedAt.toISOString(),
      })),
    ]
      .sort((a, b) => +new Date(b.at) - +new Date(a.at))
      .slice(0, 10);

    return {
      generatedAt: now.toISOString(),
      kpis: {
        usersTotal,
        usersNewToday,
        usersNew7d,
        dau,
        premiumActive,
        premiumExpiring7d,
        revenueToday: revenueTodayAgg._sum.amount ?? 0,
        revenueMonth: revenueMonthAgg._sum.amount ?? 0,
        paidOrdersToday: revenueTodayAgg._count,
        paidOrdersMonth: revenueMonthAgg._count,
        conversionRate30d,
      },
      features: {
        lessonsCompletedToday,
        listeningSessionsToday: listeningAgg._count,
        listeningMinutesToday,
        speakingSessionsToday,
        videoJobsReadyToday: videoReadyToday,
        videoJobsFailedToday: videoFailedToday,
        vocabUpdatedToday: vocabLearnedToday,
      },
      payments: {
        pending: paymentsPending,
        paidToday: paymentsPaidToday,
        expiredOrCancelled7d: paymentsExpiredRecent,
        recent: recentOrders.map((o) => ({
          id: o.id,
          paymentCode: o.paymentCode,
          amount: o.amount,
          status: o.status,
          paidAt: o.paidAt?.toISOString() ?? null,
          createdAt: o.createdAt.toISOString(),
          userName: o.user.fullName || o.user.email,
          packageName: o.package.name,
        })),
      },
      content: {
        lessonsTotal,
        categoriesTotal,
        lockedLessons,
      },
      alerts: {
        videoFailed: videoFailedRecent.map((j) => ({
          id: j.id,
          title: j.title || j.originalFilename || 'Video',
          errorMessage: j.errorMessage,
          userName: j.user.fullName || j.user.email,
          at: j.updatedAt.toISOString(),
        })),
        premiumExpiring: premiumExpiringUsers.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          packageName: u.package?.name ?? 'Pro',
          expiresAt: u.premiumExpiresAt?.toISOString() ?? null,
        })),
      },
      activity,
    };
  }
}
