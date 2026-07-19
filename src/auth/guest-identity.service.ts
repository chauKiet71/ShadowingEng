import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export const GUEST_EMAIL_SUFFIX = '@guest.hihienglish.local';

const GUEST_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class GuestIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUserId(
    authenticatedUser: { id: string } | null | undefined,
    guestToken: string | undefined,
  ): Promise<string> {
    if (authenticatedUser?.id) return authenticatedUser.id;

    const token = guestToken?.trim();
    if (!token || !GUEST_TOKEN_PATTERN.test(token)) {
      throw new UnauthorizedException(
        'Phiên khách không hợp lệ. Vui lòng tải lại trang.',
      );
    }

    const tokenHash = createHash('sha256')
      .update(token.toLowerCase())
      .digest('hex');
    const email = `guest-${tokenHash}${GUEST_EMAIL_SUFFIX}`;
    const guest = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        fullName: 'Khách',
        password: null,
      },
      update: {
        lastActivity: new Date(),
      },
      select: { id: true },
    });

    return guest.id;
  }
}
