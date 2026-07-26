import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { GUEST_EMAIL_SUFFIX } from '../auth/guest-identity.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminPackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubscribers(packageId: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id: packageId },
      select: { id: true, name: true },
    });
    if (!pkg) throw new NotFoundException('Gói đăng ký không tồn tại');

    const users = await this.prisma.user.findMany({
      where: {
        packageId,
        NOT: { email: { endsWith: GUEST_EMAIL_SUFFIX } },
      },
      orderBy: { premiumExpiresAt: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        isPremium: true,
        premiumExpiresAt: true,
        createdAt: true,
        package: { select: { id: true, name: true } },
        paymentOrders: {
          where: {
            packageId,
            status: PaymentStatus.PAID,
          },
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: {
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      package: pkg,
      total: users.length,
      subscribers: users.map((user) => {
        const latestPaid = user.paymentOrders[0];
        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          isPremium: user.isPremium,
          packageName: user.package?.name ?? pkg.name,
          subscribedAt:
            latestPaid?.paidAt?.toISOString() ??
            latestPaid?.createdAt?.toISOString() ??
            null,
          expiresAt: user.premiumExpiresAt?.toISOString() ?? null,
        };
      }),
    };
  }
}
