import { Injectable } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GUEST_EMAIL_SUFFIX } from '../auth/guest-identity.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const registeredUserWhere: Prisma.UserWhereInput = {
      NOT: { email: { endsWith: GUEST_EMAIL_SUFFIX } },
    };
    const [total, newUsers, proUsers, activeUsers] = await Promise.all([
      this.prisma.user.count({ where: registeredUserWhere }),
      this.prisma.user.count({
        where: {
          ...registeredUserWhere,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.user.count({
        where: { ...registeredUserWhere, isPremium: true },
      }),
      this.prisma.user.count({
        where: { ...registeredUserWhere, status: UserStatus.ACTIVE },
      }),
    ]);
    return { total, newUsers, proUsers, activeUsers };
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: UserStatus;
    isPremium?: boolean;
    search?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const where: Prisma.UserWhereInput = {
      NOT: { email: { endsWith: GUEST_EMAIL_SUFFIX } },
    };

    if (params.status) where.status = params.status;
    if (params.isPremium !== undefined) where.isPremium = params.isPremium;
    if (params.search) {
      where.OR = [
        { fullName: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
          status: true,
          isPremium: true,
          package: { select: { name: true } },
          createdAt: true,
          lastActivity: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async getProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        xp: true,
        level: true,
        streakDays: true,
        isPremium: true,
        package: true,
        createdAt: true,
      },
    });
  }
}
