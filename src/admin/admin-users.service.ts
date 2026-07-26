import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GUEST_EMAIL_SUFFIX } from '../auth/guest-identity.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePremium(
    userId: string,
    body: {
      premiumExpiresAt?: string | null;
      isPremium?: boolean;
      packageId?: string | null;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        NOT: { email: { endsWith: GUEST_EMAIL_SUFFIX } },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isPremium: true,
        premiumExpiresAt: true,
        packageId: true,
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    let premiumExpiresAt: Date | null | undefined = undefined;
    if (body.premiumExpiresAt !== undefined) {
      if (body.premiumExpiresAt === null || body.premiumExpiresAt === '') {
        premiumExpiresAt = null;
      } else {
        const parsed = new Date(body.premiumExpiresAt);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('Ngày hết hạn không hợp lệ');
        }
        premiumExpiresAt = parsed;
      }
    }

    let packageId: string | null | undefined = undefined;
    if (body.packageId !== undefined) {
      if (body.packageId === null || body.packageId === '') {
        packageId = null;
      } else {
        const pkg = await this.prisma.package.findUnique({
          where: { id: body.packageId },
          select: { id: true },
        });
        if (!pkg) throw new BadRequestException('Gói đăng ký không tồn tại');
        packageId = pkg.id;
      }
    }

    let isPremium = body.isPremium;
    if (isPremium === undefined && premiumExpiresAt !== undefined) {
      if (premiumExpiresAt === null) {
        isPremium = true;
      } else {
        isPremium = premiumExpiresAt > new Date();
      }
    }
    if (isPremium === undefined && packageId !== undefined) {
      isPremium = packageId !== null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(isPremium !== undefined ? { isPremium } : {}),
        ...(premiumExpiresAt !== undefined ? { premiumExpiresAt } : {}),
        ...(packageId !== undefined ? { packageId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        isPremium: true,
        premiumExpiresAt: true,
        package: { select: { id: true, name: true } },
      },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      isPremium: updated.isPremium,
      packageName: updated.package?.name ?? null,
      packageId: updated.package?.id ?? null,
      expiresAt: updated.premiumExpiresAt?.toISOString() ?? null,
    };
  }
}
