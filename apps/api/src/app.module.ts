import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TagsModule } from './modules/tags/tags.module';
import { ProductsModule } from './modules/products/products.module';
import { SubscriptionPlansModule } from './modules/subscription-plans/subscription-plans.module';
import { BoxTiersModule } from './modules/box-tiers/box-tiers.module';
import { DogsModule } from './modules/dogs/dogs.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { CartModule } from './modules/cart/cart.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CmsModule } from './modules/cms/cms.module';
import { BlogModule } from './modules/blog/blog.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { GiftsModule } from './modules/gifts/gifts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BoxCampaignsModule } from './modules/box-campaigns/box-campaigns.module';
import { BoxShipmentsModule } from './modules/box-shipments/box-shipments.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { SmsModule } from './modules/sms/sms.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { CustomBoxModule } from './modules/custom-box/custom-box.module';
import { CrmModule } from './modules/crm/crm.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    // The monorepo keeps a single .env at the repo root, but turbo runs this
    // package with cwd = apps/api, where ConfigModule's default lookup finds
    // nothing — the API then boots with no JWT_SECRET and dies at startup.
    // Looked up explicitly, local file first so a per-app override still wins.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
    }),
    // A plain sentence when someone hits a limit (the default reads "ThrottlerException: Too Many Requests").
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }], errorMessage: 'Too many tries in a short time. Please wait a few minutes and try again.' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminAuthModule,
    CategoriesModule,
    TagsModule,
    ProductsModule,
    SubscriptionPlansModule,
    BoxTiersModule,
    DogsModule,
    SubscriptionsModule,
    CartModule,
    CheckoutModule,
    PaymentsModule,
    OrdersModule,
    CmsModule,
    BlogModule,
    ReferralsModule,
    GiftsModule,
    AnalyticsModule,
    ReportsModule,
    EmailModule,
    SmsModule,
    NotificationsModule,
    NewsletterModule,
    SellersModule,
    CustomBoxModule,
    CrmModule,
    AuditModule,
    BoxCampaignsModule,
    BoxShipmentsModule,
    CouponsModule,
    AdminUsersModule,
    UploadModule,
  ],
  // The limits in ThrottlerModule only apply once this guard is registered;
  // until now nothing slowed down password guessing.
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
