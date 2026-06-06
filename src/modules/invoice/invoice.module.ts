import { Module } from '@nestjs/common';
import { InvoiceController, PatientInvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BalanceModule } from '../balance/balance.module';

@Module({
  imports: [PrismaModule, BalanceModule],
  controllers: [InvoiceController, PatientInvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
