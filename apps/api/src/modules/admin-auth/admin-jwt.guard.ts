import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ADMIN_PERMS_KEY, AdminPermsSpec, allowed } from './admin-permissions';

/**
 * A signed-in admin whose role grants what the route asks for (@AdminPerms).
 * Routes without @AdminPerms only need a valid admin sign-in.
 */
@Injectable()
export class AdminJwtGuard extends AuthGuard('admin-jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (!(await super.canActivate(ctx))) return false;
    const spec = this.reflector.getAllAndOverride<AdminPermsSpec>(ADMIN_PERMS_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest();
    if (!allowed(spec, req.method, req.user?.permissions ?? [])) {
      throw new ForbiddenException('Your role doesn’t allow this. Ask an administrator for access.');
    }
    return true;
  }
}
