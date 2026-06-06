import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { BalanceTxSource, BalanceTxType, BonusTxType, BonusTxSource } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async deposit(params: {
    patientId: string;
    amount: Prisma.Decimal;
    note?: string;
    staffId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.patientBalance.upsert({
        where: { patientId: params.patientId },
        create: { patientId: params.patientId, balance: params.amount },
        update: { balance: { increment: params.amount } },
      });

      const updated = await tx.patientBalance.findUnique({
        where: { patientId: params.patientId },
      });

      return tx.balanceTransaction.create({
        data: {
          type: BalanceTxType.CREDIT,
          amount: params.amount,
          balanceAfter: updated!.balance,
          source: BalanceTxSource.DEPOSIT,
          note: params.note,
          patientBalance: { connect: { patientId: params.patientId } },
          createdBy: { connect: { id: params.staffId } },
        },
      });
    });
  }

  async refund(params: {
    patientId: string;
    amount: Prisma.Decimal;
    note?: string;
    sourceId?: string;
    staffId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.patientBalance.findUnique({ where: { patientId: params.patientId } });
      if (!balance || balance.balance.lessThan(params.amount)) {
        throw new BadRequestException('Balans yetarli emas');
      }

      await tx.patientBalance.update({
        where: { patientId: params.patientId },
        data: { balance: { decrement: params.amount } },
      });

      const updated = await tx.patientBalance.findUnique({ where: { patientId: params.patientId } });

      return tx.balanceTransaction.create({
        data: {
          type: BalanceTxType.DEBIT,
          amount: params.amount,
          balanceAfter: updated!.balance,
          source: BalanceTxSource.REFUND,
          sourceId: params.sourceId,
          note: params.note,
          patientBalance: { connect: { patientId: params.patientId } },
          createdBy: { connect: { id: params.staffId } },
        },
      });
    });
  }

  async adjustment(params: {
    patientId: string;
    amount: Prisma.Decimal;
    type: BalanceTxType;
    note?: string;
    staffId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.patientBalance.findUnique({ where: { patientId: params.patientId } });
      if (params.type === BalanceTxType.DEBIT) {
        if (!balance || balance.balance.lessThan(params.amount)) {
          throw new BadRequestException('Balans yetarli emas');
        }
        await tx.patientBalance.update({
          where: { patientId: params.patientId },
          data: { balance: { decrement: params.amount } },
        });
      } else {
        await tx.patientBalance.upsert({
          where: { patientId: params.patientId },
          create: { patientId: params.patientId, balance: params.amount },
          update: { balance: { increment: params.amount } },
        });
      }

      const updated = await tx.patientBalance.findUnique({ where: { patientId: params.patientId } });

      return tx.balanceTransaction.create({
        data: {
          type: params.type,
          amount: params.amount,
          balanceAfter: updated!.balance,
          source: BalanceTxSource.ADJUSTMENT,
          note: params.note,
          patientBalance: { connect: { patientId: params.patientId } },
          createdBy: { connect: { id: params.staffId } },
        },
      });
    });
  }

  async earnBonus(params: {
    patientId: string;
    amount: Prisma.Decimal;
    source: BonusTxSource;
    note?: string;
    staffId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.patientBonusBalance.upsert({
        where: { patientId: params.patientId },
        create: { patientId: params.patientId, balance: params.amount },
        update: { balance: { increment: params.amount } },
      });

      const updated = await tx.patientBonusBalance.findUnique({
        where: { patientId: params.patientId },
      });

      return tx.bonusTransaction.create({
        data: {
          type: BonusTxType.EARN,
          amount: params.amount,
          balanceAfter: updated!.balance,
          source: params.source,
          note: params.note,
          bonusBalance: { connect: { patientId: params.patientId } },
          createdBy: { connect: { id: params.staffId } },
        },
      });
    });
  }

  async charge(
    tx: Prisma.TransactionClient,
    params: {
      patientId: string;
      totalAmount: Prisma.Decimal;
      cashToUse: Prisma.Decimal;
      bonusToUse: Prisma.Decimal;
      source: BalanceTxSource;
      sourceId: string;
      note?: string;
      staffId: string;
    },
  ) {
    const { patientId, totalAmount, cashToUse, bonusToUse, source, sourceId, note, staffId } = params;
    const zero = new Prisma.Decimal(0);

    if (!cashToUse.add(bonusToUse).equals(totalAmount)) {
      throw new BadRequestException('cashToUse + bonusToUse must equal totalAmount');
    }
    if (cashToUse.lessThan(zero) || bonusToUse.lessThan(zero)) {
      throw new BadRequestException('cashToUse and bonusToUse must be non-negative');
    }

    const [cashBal, bonusBal] = await Promise.all([
      tx.patientBalance.findUnique({ where: { patientId } }),
      tx.patientBonusBalance.findUnique({ where: { patientId } }),
    ]);

    const currentCash = cashBal?.balance ?? zero;
    const currentBonus = bonusBal?.balance ?? zero;

    if (currentCash.lessThan(cashToUse)) {
      throw new BadRequestException('Insufficient cash balance');
    }
    if (currentBonus.lessThan(bonusToUse)) {
      throw new BadRequestException('Insufficient bonus balance');
    }

    if (bonusToUse.greaterThan(zero)) {
      await tx.patientBonusBalance.update({
        where: { patientId },
        data: { balance: { decrement: bonusToUse } },
      });
      const updatedBonus = await tx.patientBonusBalance.findUnique({ where: { patientId } });
      await tx.bonusTransaction.create({
        data: {
          type: BonusTxType.SPEND,
          amount: bonusToUse,
          balanceAfter: updatedBonus!.balance,
          source: BonusTxSource.SERVICE_SPEND,
          sourceId,
          note,
          bonusBalance: { connect: { patientId } },
          createdBy: { connect: { id: staffId } },
        },
      });
    }

    if (cashToUse.greaterThan(zero)) {
      await tx.patientBalance.update({
        where: { patientId },
        data: { balance: { decrement: cashToUse } },
      });
      const updatedCash = await tx.patientBalance.findUnique({ where: { patientId } });
      await tx.balanceTransaction.create({
        data: {
          type: BalanceTxType.DEBIT,
          amount: cashToUse,
          balanceAfter: updatedCash!.balance,
          source,
          sourceId,
          note,
          patientBalance: { connect: { patientId } },
          createdBy: { connect: { id: staffId } },
        },
      });
    }

    return { cashUsed: cashToUse, bonusUsed: bonusToUse };
  }

  async getBalances(patientId: string) {
    const zero = new Prisma.Decimal(0);
    const [cashBal, bonusBal] = await Promise.all([
      this.prisma.patientBalance.findUnique({ where: { patientId } }),
      this.prisma.patientBonusBalance.findUnique({ where: { patientId } }),
    ]);
    const cash = cashBal?.balance ?? zero;
    const bonus = bonusBal?.balance ?? zero;
    return { cash, bonus, total: cash.add(bonus) };
  }

  async getTransactionHistory(
    patientId: string,
    params: { page: number; limit: number; type?: 'cash' | 'bonus' | 'all' },
  ) {
    const { page, limit, type = 'all' } = params;
    const skip = (page - 1) * limit;

    if (type === 'bonus') {
      const [data, total] = await Promise.all([
        this.prisma.bonusTransaction.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.bonusTransaction.count({ where: { patientId } }),
      ]);
      return { data, total, page, limit };
    }

    if (type === 'cash') {
      const [data, total] = await Promise.all([
        this.prisma.balanceTransaction.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.balanceTransaction.count({ where: { patientId } }),
      ]);
      return { data, total, page, limit };
    }

    const [cashData, bonusData] = await Promise.all([
      this.prisma.balanceTransaction.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bonusTransaction.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);
    return { cash: cashData, bonus: bonusData, page, limit };
  }

  async getBonusHistory(patientId: string, params: { page: number; limit: number }) {
    return this.getTransactionHistory(patientId, { ...params, type: 'bonus' });
  }
}
