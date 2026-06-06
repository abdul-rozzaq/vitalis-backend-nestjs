import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '../../generated/prisma/client';
import { BalanceTxSource, InvoiceItemSourceType, InvoiceSourceType, WardStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../balance/balance.service';
import { InvoiceService } from '../invoice/invoice.service';

@Injectable()
export class WardBillingScheduler {
  private readonly logger = new Logger(WardBillingScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Cron('0 0 * * *')
  async processNightlyRoomCharges() {
    this.logger.log('Starting nightly room charges...');

    const occupiedWards = await this.prisma.wards.findMany({
      where: { status: WardStatus.OCCUPIED },
      include: { room: true },
    });

    for (const ward of occupiedWards) {
      try {
        const dailyRate: Prisma.Decimal = ward.dailyRate ?? new Prisma.Decimal(0);

        if (dailyRate.equals(0)) continue;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const existing = await this.prisma.balanceTransaction.findFirst({
          where: {
            source: BalanceTxSource.WARD_DAILY,
            sourceId: ward.id,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        });

        if (existing) {
          this.logger.log(`Ward ${ward.id} already charged today, skipping.`);
          continue;
        }

        // Use a system user ID - find admin user
        const adminUser = await this.prisma.user.findFirst();
        if (!adminUser) continue;

        const invoice = await this.invoiceService.createInvoice({
          patientId: ward.patientId,
          sourceType: InvoiceSourceType.WARD,
          sourceId: ward.id,
          items: [
            {
              description: `Palata narxi (${ward.room.name})`,
              quantity: 1,
              unitPrice: dailyRate,
              sourceType: InvoiceItemSourceType.WARD_DAILY,
              sourceId: ward.id,
              dateFrom: todayStart,
              dateTo: todayEnd,
            },
          ],
          staffId: adminUser.id,
        });

        try {
          await this.prisma.$transaction(async (tx) => {
            await this.balanceService.charge(tx, {
              patientId: ward.patientId,
              totalAmount: dailyRate,
              cashToUse: dailyRate,
              bonusToUse: new Prisma.Decimal(0),
              source: BalanceTxSource.WARD_DAILY,
              sourceId: ward.id,
              note: `Palata kunlik to'lov: ${ward.room.name}`,
              staffId: adminUser.id,
            });

            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                paidCash: dailyRate,
                status: 'PAID',
              },
            });

            await tx.wards.update({
              where: { id: ward.id },
              data: { totalCharged: { increment: dailyRate } },
            });
          });
        } catch (err) {
          this.logger.warn(`Ward ${ward.id}: insufficient balance. Invoice ${invoice.id} left as ISSUED.`);
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'ISSUED' },
          });
          await this.prisma.wards.update({
            where: { id: ward.id },
            data: { totalCharged: { increment: dailyRate } },
          });
        }
      } catch (err) {
        this.logger.error(`Error processing ward ${ward.id}: ${err.message}`);
      }
    }

    this.logger.log('Nightly room charges complete.');
  }
}
