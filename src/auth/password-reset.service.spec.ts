import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  const activeReset = (overrides: Record<string, unknown> = {}) => ({
    id: 'reset-1',
    email: 'user@example.com',
    codeHash: 'hash',
    resetToken: null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    verified: false,
    attempts: 0,
    createdAt: new Date(),
    ...overrides,
  });

  function createService() {
    const user = {
      findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
      update: jest.fn().mockResolvedValue({ id: 'user-1' }),
    };
    const passwordReset = {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue(activeReset()),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const transaction = { user, passwordReset };
    const prisma = {
      user,
      passwordReset,
      $transaction: jest.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const mail = {
      sendPasswordResetCode: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PasswordResetService(prisma as never, mail as never);

    return { service, prisma, mail };
  }

  it('does not reveal whether an email exists', async () => {
    const { service, prisma, mail } = createService();
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.forgotPassword({
      email: ' Missing@Example.com ',
    });

    expect(result.email).toBe('missing@example.com');
    expect(result.message).toContain('Nếu email đã được đăng ký');
    expect(prisma.passwordReset.findFirst).not.toHaveBeenCalled();
    expect(mail.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('stores a hash and sends a six-digit OTP', async () => {
    const { service, prisma, mail } = createService();

    await service.forgotPassword({ email: 'USER@example.com' });

    const mailCalls = mail.sendPasswordResetCode.mock.calls as unknown as Array<
      [string, string]
    >;
    const createCalls = prisma.passwordReset.create.mock
      .calls as unknown as Array<[{ data: { codeHash: string } }]>;
    const code = mailCalls[0][1];
    const createData = createCalls[0][0].data;

    expect(code).toMatch(/^\d{6}$/);
    await expect(bcrypt.compare(code, createData.codeHash)).resolves.toBe(true);
    expect(createData.codeHash).not.toBe(code);
  });

  it('does not send another OTP during the cooldown', async () => {
    const { service, prisma, mail } = createService();
    prisma.passwordReset.findFirst.mockResolvedValue(activeReset());

    await service.resendCode({ email: 'user@example.com' });

    expect(prisma.passwordReset.create).not.toHaveBeenCalled();
    expect(mail.sendPasswordResetCode).not.toHaveBeenCalled();
  });

  it('invalidates an OTP after the fifth failed attempt', async () => {
    const { service, prisma } = createService();
    const codeHash = await bcrypt.hash('123456', 10);
    prisma.passwordReset.findFirst.mockResolvedValue(
      activeReset({ codeHash, attempts: 4 }),
    );

    await expect(
      service.verifyCode({ email: 'user@example.com', code: '654321' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.passwordReset.delete).toHaveBeenCalledWith({
      where: { id: 'reset-1' },
    });
  });

  it('returns a raw reset token but only stores its SHA-256 hash', async () => {
    const { service, prisma } = createService();
    const codeHash = await bcrypt.hash('123456', 10);
    prisma.passwordReset.findFirst.mockResolvedValue(activeReset({ codeHash }));

    const result = await service.verifyCode({
      email: 'user@example.com',
      code: '123456',
    });
    const updateCalls = prisma.passwordReset.updateMany.mock
      .calls as unknown as Array<[{ data: { resetToken: string } }]>;
    const storedToken = updateCalls[0][0].data.resetToken;

    expect(result.resetToken).toMatch(/^[a-f\d]{64}$/);
    expect(storedToken).toBe(
      createHash('sha256').update(result.resetToken).digest('hex'),
    );
    expect(storedToken).not.toBe(result.resetToken);
  });

  it('consumes a reset token and updates the password in one transaction', async () => {
    const { service, prisma } = createService();
    const resetToken = 'a'.repeat(64);
    const resetTokenHash = createHash('sha256')
      .update(resetToken)
      .digest('hex');
    prisma.passwordReset.findUnique.mockResolvedValue(
      activeReset({ verified: true, resetToken: resetTokenHash }),
    );

    await service.resetPassword({
      resetToken,
      password: 'StrongPassword1!',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const userUpdateCalls = prisma.user.update.mock.calls as unknown as Array<
      [{ data: { password: string } }]
    >;
    const passwordHash = userUpdateCalls[0][0].data.password;
    await expect(
      bcrypt.compare('StrongPassword1!', passwordHash),
    ).resolves.toBe(true);
  });

  it('removes an unusable OTP when the mail provider fails', async () => {
    const { service, prisma, mail } = createService();
    mail.sendPasswordResetCode.mockRejectedValue(
      new ServiceUnavailableException('SMTP unavailable'),
    );

    await expect(
      service.forgotPassword({ email: 'user@example.com' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.passwordReset.deleteMany).toHaveBeenLastCalledWith({
      where: { id: 'reset-1' },
    });
  });
});
