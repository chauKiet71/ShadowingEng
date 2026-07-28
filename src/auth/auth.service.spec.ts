import { BadRequestException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService avatar upload', () => {
  const updatedUser = {
    id: 'user-123',
    email: 'user@example.com',
    fullName: 'Test User',
    role: 'USER',
    isPremium: false,
    premiumExpiresAt: null,
    packageId: null,
    package: null,
    avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v2/avatar.webp',
    xp: 0,
    level: 1,
    streakDays: 0,
    status: UserStatus.ACTIVE,
  };

  function createService() {
    const prisma = {
      user: { update: jest.fn().mockResolvedValue(updatedUser) },
    };
    const cloudinary = {
      uploadAvatar: jest.fn().mockResolvedValue(updatedUser.avatarUrl),
    };
    const service = new AuthService(
      prisma as never,
      {} as never,
      cloudinary as never,
    );
    return { service, prisma, cloudinary };
  }

  it('stores the secure Cloudinary URL on the user', async () => {
    const { service, prisma, cloudinary } = createService();
    const buffer = Buffer.from('image');

    const result = await service.updateAvatar('user-123', {
      buffer,
      mimetype: 'image/png',
      originalname: 'avatar.png',
    });

    expect(cloudinary.uploadAvatar).toHaveBeenCalledWith('user-123', buffer);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-123' },
        data: { avatarUrl: updatedUser.avatarUrl },
      }),
    );
    expect(result.avatarUrl).toBe(updatedUser.avatarUrl);
    expect(result).not.toHaveProperty('status');
  });

  it('rejects unsupported image types before uploading', async () => {
    const { service, cloudinary } = createService();

    await expect(
      service.updateAvatar('user-123', {
        buffer: Buffer.from('fake'),
        mimetype: 'application/pdf',
        originalname: 'avatar.png',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cloudinary.uploadAvatar).not.toHaveBeenCalled();
  });
});
