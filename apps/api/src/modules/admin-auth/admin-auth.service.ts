import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

const RETIRED_DEFAULT_PASSWORDS = ['Admin@123456'];

@Injectable()
export class AdminAuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (admin.status !== 'ACTIVE') throw new UnauthorizedException('Account is inactive');

    // Early seeds gave every install the same public password. Outside
    // development it must be changed before anyone can use it to sign in.
    if (process.env.NODE_ENV === 'production' && RETIRED_DEFAULT_PASSWORDS.includes(password)) {
      throw new UnauthorizedException('This account still uses the default password. Reset it with prisma/set-admin-password.ts.');
    }

    const permissions = admin.role.permissions.map((rp) => rp.permission.key);

    const token = this.jwt.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role.name,
      permissions,
      isAdmin: true,
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role.name,
        permissions,
      },
      token,
    };
  }
}
