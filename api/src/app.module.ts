import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { StoresModule } from './modules/stores/stores.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WeightAdjustmentModule } from './modules/weight-adjustment/weight-adjustment.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportingModule } from './modules/reporting/reporting.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,

    // Domain modules — see /docs/architecture.md for how these relate.
    // weight-adjustment stays independent: orders calls it, it calls nothing back.
    AuthModule,
    UsersModule,
    CatalogModule,
    StoresModule,
    PricingModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    WeightAdjustmentModule,
    InvoicingModule,
    PaymentsModule,
    DeliveryModule,
    NotificationsModule,
    ReportingModule,
  ],
})
export class AppModule {}
