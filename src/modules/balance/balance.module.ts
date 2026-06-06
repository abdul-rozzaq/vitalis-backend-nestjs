import { Module } from '@nestjs/common';
import { BalanceController, BonusController } from './balance.controller';
import { BalanceService } from './balance.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BalanceController, BonusController],
  providers: [BalanceService],
  exports: [BalanceService],
})
export class BalanceModule {}
