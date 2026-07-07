import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TagsModule } from './modules/tags/tags.module';
import { ProductsModule } from './modules/products/products.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { DogsModule } from './modules/dogs/dogs.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CmsModule } from './modules/cms/cms.module';
import { BlogModule } from './modules/blog/blog.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BoxCampaignsModule } from './modules/box-campaigns/box-campaigns.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminAuthModule,
    CategoriesModule,
    TagsModule,
    ProductsModule,
    SubscriptionPlansModule,
    DogsModule,
    SubscriptionsModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    OrdersModule,
    CmsModule,
    BlogModule,
    ReferralsModule,
    AnalyticsModule,
    ReportsModule,
    EmailModule,
    AuditModule,
    BoxCampaignsModule,
    CouponsModule,
    AdminUsersModule,
    UploadModule,
  ],
})
export class AppModule {}
