import { Module } from '@nestjs/common';
import { UsersController, AdminCustomersController } from './users.controller';

@Module({ controllers: [UsersController, AdminCustomersController] })
export class UsersModule {}
