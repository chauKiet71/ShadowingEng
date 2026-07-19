import { UnauthorizedException } from '@nestjs/common';
import {
  GuestIdentityService,
  GUEST_EMAIL_SUFFIX,
} from './guest-identity.service';

describe('GuestIdentityService', () => {
  const upsert = jest.fn();
  const service = new GuestIdentityService({
    user: { upsert },
  } as never);

  beforeEach(() => {
    upsert.mockReset();
  });

  it('uses the authenticated account without provisioning a guest', async () => {
    await expect(
      service.resolveUserId({ id: 'authenticated-user' }, undefined),
    ).resolves.toBe('authenticated-user');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('provisions a stable guest account from a browser token', async () => {
    upsert.mockResolvedValue({ id: 'guest-user' });

    await expect(
      service.resolveUserId(null, '123e4567-e89b-42d3-a456-426614174000'),
    ).resolves.toBe('guest-user');

    expect(upsert).toHaveBeenCalledTimes(1);
    const calls = upsert.mock.calls as Array<[{ where: { email: string } }]>;
    const call = calls[0][0];
    expect(call.where.email).toMatch(
      new RegExp(
        `^guest-[a-f0-9]{64}${GUEST_EMAIL_SUFFIX.replaceAll('.', '\\.')}$`,
      ),
    );
  });

  it('rejects requests without a valid guest token', async () => {
    await expect(
      service.resolveUserId(null, 'not-a-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(upsert).not.toHaveBeenCalled();
  });
});
