import { Module } from '@nestjs/common';
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { IsString, IsEmail, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtGuard } from '../admin-auth/admin-jwt.guard';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class CreateAdminUserDto {
  @IsEmail() email: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() @MinLength(8) password: string;
  @IsString() roleId: string;
}

class UpdateAdminUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() roleId?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE', 'SUSPENDED']) status?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

class CreateRoleDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() permissionKeys?: string[];
}

class UpdateRoleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() permissionKeys?: string[];
}

class CreatePermissionDto {
  @IsString() key: string;
  @IsString() name: string;
  @IsString() module: string;
  @IsOptional() @IsString() description?: string;
}

class UpdatePermissionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() description?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
class AdminUsersService {
  constructor(private prisma: PrismaService) {}

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
    const exists = await this.prisma.adminUser.findUnique({ where: { email: dto.email } });
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
    if (dto.password)  data.passwordHash = await bcrypt.hash(dto.password, 12);
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
    await this.prisma.adminUser.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
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
        _count: { select: { adminUsers: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createRole(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Role name already exists');
    const role = await this.prisma.role.create({ data: { name: dto.name, description: dto.description } });
    if (dto.permissionKeys?.length) {
      await this.syncPermissions(role.id, dto.permissionKeys);
    }
    return this.getRole(role.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem && dto.name) throw new BadRequestException('Cannot rename system roles');
    const data: any = {};
    if (dto.name)        data.name        = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    await this.prisma.role.update({ where: { id }, data });
    if (dto.permissionKeys !== undefined) {
      await this.syncPermissions(id, dto.permissionKeys);
    }
    return this.getRole(id);
  }

  async deleteRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, include: { _count: { select: { adminUsers: true } } } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system roles');
    if ((role as any)._count.adminUsers > 0) throw new BadRequestException('Role still has assigned users');
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } }, _count: { select: { adminUsers: true } } },
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

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { key: 'asc' }] });
  }

  async createPermission(dto: CreatePermissionDto) {
    const exists = await this.prisma.permission.findUnique({ where: { key: dto.key } });
    if (exists) throw new ConflictException('Permission key already exists');
    return this.prisma.permission.create({ data: { key: dto.key, name: dto.name, module: dto.module, description: dto.description || '' } });
  }

  async updatePermission(id: string, dto: UpdatePermissionDto) {
    const p = await this.prisma.permission.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Permission not found');
    const data: any = {};
    if (dto.name !== undefined)        data.name        = dto.name;
    if (dto.module !== undefined)      data.module      = dto.module;
    if (dto.description !== undefined) data.description = dto.description;
    return this.prisma.permission.update({ where: { id }, data });
  }

  async syncPermissionDefs(defs: { key: string; name: string; module: string; description: string }[]) {
    for (const def of defs) {
      await this.prisma.permission.upsert({
        where: { key: def.key },
        update: { name: def.name, module: def.module, description: def.description },
        create: { key: def.key, name: def.name, module: def.module, description: def.description },
      });
    }
    return { synced: defs.length };
  }

  async deletePermission(id: string) {
    const p = await this.prisma.permission.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Permission not found');
    await this.prisma.rolePermission.deleteMany({ where: { permissionId: id } });
    await this.prisma.permission.delete({ where: { id } });
    return { success: true };
  }
}

// ─── Controllers ─────────────────────────────────────────────────────────────

@ApiTags('Admin — Users')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
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
@Controller('admin/permissions')
class AdminPermissionsController {
  constructor(private svc: AdminUsersService) {}
  @Get()    list() { return this.svc.listPermissions(); }
  @Post()   create(@Body() dto: CreatePermissionDto) { return this.svc.createPermission(dto); }
  @Post('sync') sync(@Body() body: { keys: any[] }) { return this.svc.syncPermissionDefs(body.keys); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePermissionDto) { return this.svc.updatePermission(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.deletePermission(id); }
}

// ─── Module ───────────────────────────────────────────────────────────────────

@Module({
  providers: [AdminUsersService],
  controllers: [AdminUsersController, AdminRolesController, AdminPermissionsController],
})
export class AdminUsersModule {}
