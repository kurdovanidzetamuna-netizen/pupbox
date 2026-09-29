import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Populates `req.user` when a valid bearer token is present, and lets the
 * request through anonymously when it is not.
 *
 * The cart needs both: guests build a cart against an `x-session-id` header,
 * signed-in customers against their account. Leaving the controller unguarded
 * made `req.user` permanently undefined, so every signed-in customer fell
 * through to the shared `sessionId: 'guest'` cart — they saw each other's
 * items, and checkout (which looks the cart up by userId) always found it
 * empty. A plain AuthGuard would fix that but reject guests outright.
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  // Never throw: a missing or invalid token simply means "not signed in".
  handleRequest<TUser = any>(_err: any, user: any): TUser {
    return (user || undefined) as TUser;
  }
}
