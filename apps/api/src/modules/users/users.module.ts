import { Module } from '@nestjs/common';
import { UsersController, AdminCustomersController } from './users.controller';
import { AddressesController } from './addresses.controller';

@Module({ controllers: [UsersController, AdminCustomersController, AddressesController] })
export class UsersModule {}
