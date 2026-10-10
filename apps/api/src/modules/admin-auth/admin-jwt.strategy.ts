import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  /**
   * Checked against the database on every request, not just the token: a
   * removed or deactivated admin, or one whose password changed, is signed
   * out at once, and role changes apply immediately.
   */
  async validate(payload: any) {
    if (!payload.isAdmin) throw new UnauthorizedException('Admin access required');
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, status: true, deletedAt: true, passwordChangedAt: true, role: { select: { name: true, permissions: { select: { permission: { select: { key: true } } } } } } },
    });
    if (!admin || admin.deletedAt || admin.status !== 'ACTIVE') throw new UnauthorizedException();
    if (admin.passwordChangedAt && (payload.iat ?? 0) * 1000 < admin.passwordChangedAt.getTime()) throw new UnauthorizedException();
    return { id: admin.id, email: admin.email, role: admin.role.name, permissions: admin.role.permissions.map((p) => p.permission.key) };
  }
}
