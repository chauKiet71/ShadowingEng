import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Attaches the current user when a valid JWT is present, while still allowing
 * anonymous access to public endpoints.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false | null,
  ): TUser | null {
    return user || null;
  }
}
