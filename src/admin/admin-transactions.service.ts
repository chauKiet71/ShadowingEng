import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
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
export class AdminTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = startOfMonth(now);

    const [
      pending,
      paidTodayAgg,
      revenueMonthAgg,
      expired7d,
      paidTotal,
    ] = await Promise.all([
      this.prisma.paymentOrder.count({
        where: { status: PaymentStatus.PENDING },
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
      this.prisma.paymentOrder.count({
        where: {
          status: { in: [PaymentStatus.EXPIRED, PaymentStatus.CANCELLED] },
          updatedAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.paymentOrder.count({
        where: { status: PaymentStatus.PAID },
      }),
    ]);

    return {
      pending,
      paidToday: paidTodayAgg._count,
      revenueToday: paidTodayAgg._sum.amount ?? 0,
      paidMonth: revenueMonthAgg._count,
      revenueMonth: revenueMonthAgg._sum.amount ?? 0,
      expiredOrCancelled7d: expired7d,
      paidTotal,
    };
  }

  async list(params: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const where: Prisma.PaymentOrderWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    const search = params.search?.trim();
    if (search) {
      where.OR = [
        { paymentCode: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { package: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.paymentOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          paymentCode: true,
          amount: true,
          paidAmount: true,
          status: true,
          paidAt: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          package: {
            select: { id: true, name: true },
          },
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              sepayTransactionId: true,
              status: true,
              reason: true,
              createdAt: true,
              processedAt: true,
            },
          },
        },
      }),
      this.prisma.paymentOrder.count({ where }),
    ]);

    return {
      orders: orders.map((order) => ({
        id: order.id,
        paymentCode: order.paymentCode,
        amount: order.amount,
        paidAmount: order.paidAmount,
        status: order.status,
        paidAt: order.paidAt?.toISOString() ?? null,
        expiresAt: order.expiresAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        user: order.user,
        package: order.package,
        events: order.transactions.map((tx) => ({
          id: tx.id,
          sepayTransactionId: tx.sepayTransactionId,
          status: tx.status,
          reason: tx.reason,
          createdAt: tx.createdAt.toISOString(),
          processedAt: tx.processedAt?.toISOString() ?? null,
        })),
      })),
      total,
      page,
      limit,
    };
  }
}
