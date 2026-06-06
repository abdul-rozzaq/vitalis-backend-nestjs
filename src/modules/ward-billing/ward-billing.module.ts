import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { BalanceModule } from '../balance/balance.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { WardBillingScheduler } from './ward-billing.scheduler';

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, BalanceModule, InvoiceModule],
  providers: [WardBillingScheduler],
})
export class WardBillingModule {}
