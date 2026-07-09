import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client';
import {
  BalanceTxSource,
  InvoiceItemSourceType,
  InvoiceSourceType,
  WardStatus,
} from '../../generated/prisma/enums';
import { clinicDayUTC } from '../../common/clinic-time';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../balance/balance.service';
import { InvoiceService } from '../invoice/invoice.service';

@Injectable()
export class WardBillingScheduler implements OnModuleInit {
  private readonly logger = new Logger(WardBillingScheduler.name);
  private systemUserId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly invoiceService: InvoiceService,
  ) {}

  async onModuleInit() {
    const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!admin) {
      this.logger.error('No ADMIN user found — ward billing cron will not function correctly.');
      return;
    }
    this.systemUserId = admin.id;
    this.logger.log(
      `Ward billing system user resolved: ${admin.first_name} ${admin.last_name} (${admin.id})`,
    );
  }

  // Runs at 00:00 Asia/Tashkent every day
  @Cron('0 0 * * *', { timeZone: 'Asia/Tashkent' })
  async processNightlyRoomCharges() {
    if (!this.systemUserId) {
      this.logger.error('systemUserId not set — skipping billing run.');
      return;
    }

    this.logger.log('Starting nightly room charges (Asia/Tashkent 00:00)...');

    // Timezone-safe day boundaries using existing clinic-time utility
    const todayStart = clinicDayUTC();
    const todayEnd = new Date(todayStart.getTime() + 86_400_000 - 1);

    const occupiedWards = await this.prisma.wards.findMany({
      where: { status: WardStatus.OCCUPIED },
      include: { room: true },
    });

    for (const ward of occupiedWards) {
      try {
        await this.chargeWard(ward, todayStart, todayEnd);
      } catch (err) {
        this.logger.error(`Error processing ward ${ward.id}: ${err.message}`);
      }
    }

    this.logger.log('Nightly room charges complete.');
  }

  private async chargeWard(
    ward: Awaited<ReturnType<typeof this.prisma.wards.findFirst>> & { room: any },
    todayStart: Date,
    todayEnd: Date,
  ) {
    const patientRate = ward.patientPricePerDay as Prisma.Decimal | null;

    // Skip wards without new-style pricing — dailyRate is no longer used
    if (!patientRate) {
      this.logger.log(`Ward ${ward.id}: no patientPricePerDay set — skipping.`);
      return;
    }

    const zero = new Prisma.Decimal(0);
    const companionRate = (ward.companionPricePerDay as Prisma.Decimal | null) ?? zero;

    // Formula: dailyCharge = patientPricePerDay + (companionPricePerDay × companionsCount)
    const companionCharge = companionRate.mul(ward.companionsCount);
    const totalDaily = patientRate.add(companionCharge);

    if (totalDaily.equals(zero)) return;

    // Idempotency: one WARD_DAILY charge per ward per clinic day
    const existing = await this.prisma.balanceTransaction.findFirst({
      where: {
        source: BalanceTxSource.WARD_DAILY,
        sourceId: ward.id,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existing) {
      this.logger.log(`Ward ${ward.id} already charged today — skipping.`);
      return;
    }

    // Compute Bonus → Balance split
    // Priority: use as much bonus as possible, charge remainder from cash
    const [cashBal, bonusBal] = await Promise.all([
      this.prisma.patientBalance.findUnique({ where: { patientId: ward.patientId } }),
      this.prisma.patientBonusBalance.findUnique({ where: { patientId: ward.patientId } }),
    ]);

    const availableBonus = bonusBal?.balance ?? zero;
    const bonusToUse = Prisma.Decimal.min(availableBonus, totalDaily);
    const cashToUse = totalDaily.sub(bonusToUse);

    // Create invoice first (outside transaction — if tx fails, invoice is left as ISSUED)
    const invoice = await this.invoiceService.createInvoice({
      patientId: ward.patientId,
      sourceType: InvoiceSourceType.WARD,
      sourceId: ward.id,
      items: [
        {
          description: `Palata narxi (${ward.room.name})`,
          quantity: 1,
          unitPrice: totalDaily,
          sourceType: InvoiceItemSourceType.WARD_DAILY,
          sourceId: ward.id,
          dateFrom: todayStart,
          dateTo: todayEnd,
        },
      ],
      staffId: this.systemUserId!,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        // Existing charge() handles bonus deduction + cash deduction + transaction records
        await this.balanceService.charge(tx, {
          patientId: ward.patientId,
          totalAmount: totalDaily,
          cashToUse,
          bonusToUse,
          source: BalanceTxSource.WARD_DAILY,
          sourceId: ward.id,
          note: `Palata kunlik to'lov: ${ward.room.name}`,
          staffId: this.systemUserId!,
        });

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidCash: cashToUse,
            paidBonus: bonusToUse,
            status: 'PAID',
          },
        });

        await tx.wards.update({
          where: { id: ward.id },
          data: { totalCharged: { increment: totalDaily } },
        });
      });
    } catch (err) {
      // Insufficient balance — leave invoice as ISSUED, still record totalCharged
      this.logger.warn(
        `Ward ${ward.id}: insufficient balance. Invoice ${invoice.id} left as ISSUED.`,
      );
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'ISSUED' },
      });
      await this.prisma.wards.update({
        where: { id: ward.id },
        data: { totalCharged: { increment: totalDaily } },
      });
    }
  }
}
