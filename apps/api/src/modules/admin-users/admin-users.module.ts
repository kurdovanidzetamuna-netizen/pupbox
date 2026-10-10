import { Module, OnModuleInit } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { IsString, IsEmail, IsOptional, IsEnum, MinLength, MaxLength, IsNotIn, IsIn, IsArray, ArrayMaxSize } from 'class-validator';

/** The password early seeds gave every install; never allowed again. */
const RETIRED = { message: 'That is the old default password. Choose another.' };
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';
import { AdminPerms, PERMISSION_CATALOGUE, PERMISSION_KEYS } from '../admin-auth/admin-permissions';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class CreateAdminUserDto {
  @IsEmail() email: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  // Admins guard the whole shop: 12 characters, as the setup script requires.
  @IsString() @MinLength(12) @IsNotIn(['Admin@123456'], RETIRED) password: string;
  @IsString() roleId: string;
}

class UpdateAdminUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() roleId?: string;
  // Only what the database has: "SUSPENDED" used to pass here and crash the save.
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE'], { message: 'Status must be ACTIVE or INACTIVE' }) status?: string;
  @IsOptional() @IsString() @MinLength(12) @IsNotIn(['Admin@123456'], RETIRED) password?: string;
}

class CreateRoleDto {
  @IsString() @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) permissionKeys?: string[];
}

class UpdateRoleDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @IsString({ each: true }) permissionKeys?: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
class AdminUsersService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  /**
   * Bring the permission table in line with what the API checks: add new
   * ones, drop ones nothing checks any more, and keep the system role
   * (Super Admin) holding all of them.
   */
  async onModuleInit() {
    try {
      for (const p of PERMISSION_CATALOGUE) {
        await this.prisma.permission.upsert({
          where: { key: p.key },
          update: { name: p.name, module: p.key.split('.')[0], description: p.description },
          create: { key: p.key, name: p.name, module: p.key.split('.')[0], description: p.description },
        });
      }
      const stale = await this.prisma.permission.findMany({ where: { key: { notIn: PERMISSION_KEYS } }, select: { id: true } });
      if (stale.length) {
        const ids = stale.map((p) => p.id);
        await this.prisma.rolePermission.deleteMany({ where: { permissionId: { in: ids } } });
        await this.prisma.permission.deleteMany({ where: { id: { in: ids } } });
      }
      for (const role of await this.prisma.role.findMany({ where: { isSystem: true }, select: { id: true } })) {
        await this.syncPermissions(role.id, PERMISSION_KEYS);
      }
    } catch (e: any) {
      console.error(`Permission sync failed: ${e?.message ?? e}`);
    }
  }

  /** Only keys the API actually checks; anything else is a mistake worth saying so. */
  private checkKeys(keys: string[]) {
    const unknown = keys.filter((k) => !PERMISSION_KEYS.includes(k));
    if (unknown.length) throw new BadRequestException(`Unknown permission: ${unknown.join(', ')}`);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(page = 1, limit = 20, search?: string) {
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        include: { role: { include: { permissions: { include: { permission: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.adminUser.count({ where }),
    ]);
    return { items: items.map(u => this.sanitize(u)), total, page, pages: Math.ceil(total / limit) };
  }

  async getUser(id: string) {
    const u = await this.prisma.adminUser.findFirst({
      where: { id, deletedAt: null },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!u) throw new NotFoundException('User not found');
    return this.sanitize(u);
  }

  async createUser(dto: CreateAdminUserDto) {
    dto.email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.adminUser.findFirst({ where: { email: { equals: dto.email, mode: 'insensitive' } } });
    if (exists) throw new ConflictException('Email already in use');
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new BadRequestException('Role not found');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const u = await this.prisma.adminUser.create({
      data: { email: dto.email, firstName: dto.firstName, lastName: dto.lastName, passwordHash, roleId: dto.roleId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    return this.sanitize(u);
  }

  async updateUser(id: string, dto: UpdateAdminUserDto) {
    const u = await this.prisma.adminUser.findFirst({ where: { id, deletedAt: null } });
    if (!u) throw new NotFoundException('User not found');
    const data: any = {};
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName)  data.lastName  = dto.lastName;
    if (dto.roleId)    data.roleId    = dto.roleId;
    if (dto.status)    data.status    = dto.status;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
      // Signs out this admin's existing sessions.
      data.passwordChangedAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    }
    const losesManage = (dto.status && dto.status !== 'ACTIVE') || (dto.roleId && !(await this.roleCanManage(dto.roleId)));
    if (losesManage) await this.assertAnotherManager(id);
    const updated = await this.prisma.adminUser.update({
      where: { id },
      data,
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    return this.sanitize(updated);
  }

  async deleteUser(id: string) {
    const u = await this.prisma.adminUser.findFirst({ where: { id, deletedAt: null } });
    if (!u) throw new NotFoundException('User not found');
    await this.assertAnotherManager(id);
    await this.prisma.adminUser.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }

  private async roleCanManage(roleId: string) {
    return (await this.prisma.rolePermission.count({ where: { roleId, permission: { key: 'admin.manage' } } })) > 0;
  }

  /**
   * Someone must always be able to manage admins. Refuses a change that would
   * leave no active admin with admin.manage (other than `exceptUserId`, or
   * outside `exceptRoleId`) — otherwise nobody could ever fix it from admin.
   */
  private async assertAnotherManager(exceptUserId?: string, exceptRoleId?: string) {
    const others = await this.prisma.adminUser.count({
      where: {
        deletedAt: null, status: 'ACTIVE',
        ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
        role: { ...(exceptRoleId ? { id: { not: exceptRoleId } } : {}), permissions: { some: { permission: { key: 'admin.manage' } } } },
      },
    });
    if (!others) throw new BadRequestException('This would leave nobody able to manage admins. Give another active admin that permission first.');
  }

  private sanitize(u: any) {
    const { passwordHash, ...rest } = u;
    return rest;
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  async listRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { adminUsers: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createRole(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Role name already exists');
    if (dto.permissionKeys) this.checkKeys(dto.permissionKeys);
    const role = await this.prisma.role.create({ data: { name: dto.name, description: dto.description } });
    if (dto.permissionKeys?.length) {
      await this.syncPermissions(role.id, dto.permissionKeys);
    }
    return this.getRole(role.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem && dto.name && dto.name !== role.name) throw new BadRequestException('Cannot rename system roles');
    // The system role always has everything, so nobody can lock the shop out of its own admin.
    if (role.isSystem && dto.permissionKeys !== undefined && PERMISSION_KEYS.some((k) => !dto.permissionKeys!.includes(k))) {
      throw new BadRequestException(`${role.name} always has every permission. Make a new role for limited access.`);
    }
    if (dto.permissionKeys) this.checkKeys(dto.permissionKeys);
    const data: any = {};
    if (dto.name)        data.name        = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    await this.prisma.role.update({ where: { id }, data });
    if (dto.permissionKeys !== undefined && !dto.permissionKeys.includes('admin.manage') && (await this.roleCanManage(id))) {
      await this.assertAnotherManager(undefined, id);
    }
    if (dto.permissionKeys !== undefined) {
      await this.syncPermissions(id, dto.permissionKeys);
    }
    return this.getRole(id);
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, include: { _count: { select: { adminUsers: { where: { deletedAt: null } } } } } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system roles');
    // Removed admins keep their role id for the record; only current ones block deleting the role.
    const current = await this.prisma.adminUser.count({ where: { roleId: id, deletedAt: null } });
    if (current > 0) throw new BadRequestException('Role still has assigned users');
    await this.prisma.adminUser.updateMany({ where: { roleId: id, deletedAt: { not: null } }, data: { roleId: (await this.prisma.role.findFirst({ where: { isSystem: true }, select: { id: true } }))?.id ?? id } });
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } }, _count: { select: { adminUsers: { where: { deletedAt: null } } } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private async syncPermissions(roleId: string, keys: string[]) {
    const perms = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (perms.length) {
      await this.prisma.rolePermission.createMany({
        data: perms.map(p => ({ roleId, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }

  // ── Permissions ────────────────────────────────────────────────────────────

  /** The catalogue in display order, with the database id of each. */
  async listPermissions() {
    const rows = await this.prisma.permission.findMany({ where: { key: { in: PERMISSION_KEYS } }, select: { id: true, key: true } });
    return PERMISSION_CATALOGUE.map((p) => ({ ...p, id: rows.find((r) => r.key === p.key)?.id ?? null }));
  }

}

// ─── Controllers ─────────────────────────────────────────────────────────────

@ApiTags('Admin — Users')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'admin.manage', write: 'admin.manage' })
@Controller('admin/users')
class AdminUsersController {
  constructor(private svc: AdminUsersService) {}
  @Get()   list(@Query('page') p?: string, @Query('limit') l?: string, @Query('search') s?: string) { return this.svc.listUsers(p ? +p : 1, l ? +l : 20, s); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.getUser(id); }
  @Post()  create(@Body() dto: CreateAdminUserDto) { return this.svc.createUser(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) { return this.svc.updateUser(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deleteUser(id); }
}

@ApiTags('Admin — Roles')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'admin.manage', write: 'admin.manage' })
@Controller('admin/roles')
class AdminRolesController {
  constructor(private svc: AdminUsersService) {}
  @Get()   list() { return this.svc.listRoles(); }
  @Post()  create(@Body() dto: CreateRoleDto) { return this.svc.createRole(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateRoleDto) { return this.svc.updateRole(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deleteRole(id); }
}

@ApiTags('Admin — Permissions')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@AdminPerms({ read: 'admin.manage', write: 'admin.manage' })
@Controller('admin/permissions')
class AdminPermissionsController {
  constructor(private svc: AdminUsersService) {}
  @Get()    list() { return this.svc.listPermissions(); }
}

// ─── Module ───────────────────────────────────────────────────────────────────

@Module({
  providers: [AdminUsersService],
  controllers: [AdminUsersController, AdminRolesController, AdminPermissionsController],
})
export class AdminUsersModule {}
