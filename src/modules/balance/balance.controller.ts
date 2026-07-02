import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { Prisma } from '../../generated/prisma/client';
import { BalanceTxType, BonusTxSource } from '../../generated/prisma/enums';
import { BalanceService } from './balance.service';
import { AdjustmentDto } from './dto/adjustment.dto';
import { DepositDto } from './dto/deposit.dto';
import { EarnBonusDto } from './dto/earn-bonus.dto';
import { RefundDto } from './dto/refund.dto';

@Controller('patients/:patientId/balance')
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  @Get()
  getBalances(@Param('patientId') patientId: string) {
    return this.balanceService.getBalances(patientId);
  }

  @Post('deposit')
  deposit(
    @Param('patientId') patientId: string,
    @Body() dto: DepositDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.balanceService.deposit({
      patientId,
      amount: new Prisma.Decimal(dto.amount),
      paymentMethod: dto.paymentMethod,
      note: dto.note,
      staffId: user.userId,
    });
  }

  @Post('refund')
  refund(
    @Param('patientId') patientId: string,
    @Body() dto: RefundDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.balanceService.refund({
      patientId,
      amount: new Prisma.Decimal(dto.amount),
      note: dto.note,
      sourceId: dto.sourceId,
      staffId: user.userId,
    });
  }

  @Post('adjustment')
  adjustment(
    @Param('patientId') patientId: string,
    @Body() dto: AdjustmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.balanceService.adjustment({
      patientId,
      amount: new Prisma.Decimal(dto.amount),
      type: dto.type,
      note: dto.note,
      staffId: user.userId,
    });
  }

  @Get('transactions')
  getTransactionHistory(
    @Param('patientId') patientId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: 'cash' | 'bonus' | 'all',
  ) {
    return this.balanceService.getTransactionHistory(patientId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
    });
  }
}

@Controller('patients/:patientId/bonus')
export class BonusController {
  constructor(private readonly balanceService: BalanceService) {}

  @Post('deposit')
  earnBonus(
    @Param('patientId') patientId: string,
    @Body() dto: EarnBonusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.balanceService.earnBonus({
      patientId,
      amount: new Prisma.Decimal(dto.amount),
      source: dto.source as BonusTxSource,
      note: dto.note,
      staffId: user.userId,
    });
  }

  @Get('transactions')
  getBonusHistory(
    @Param('patientId') patientId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.balanceService.getBonusHistory(patientId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }
}
