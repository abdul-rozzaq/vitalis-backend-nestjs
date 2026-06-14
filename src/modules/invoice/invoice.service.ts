import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  BalanceTxSource,
  InvoiceItemSourceType,
  InvoiceSourceType,
  InvoiceStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { BalanceService } from '../balance/balance.service';

const INVOICE_INCLUDE = {
  items: true,
  payments: true,
  patient: true,
} as const;

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
  ) {}

  async listInvoices(params: {
    status?: InvoiceStatus;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: Prisma.InvoiceWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) (where.createdAt as any).gte = params.dateFrom;
      if (params.dateTo) (where.createdAt as any).lte = params.dateTo;
    }
    return this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: INVOICE_INCLUDE,
    });
  }

  async createInvoice(params: {
    patientId: string;
    sourceType: InvoiceSourceType;
    sourceId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      sourceType: InvoiceItemSourceType;
      sourceId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }>;
    dueDate?: Date;
    note?: string;
    staffId: string;
  }) {
    const totalAmount = params.items.reduce((sum, item) => {
      return sum.add(item.unitPrice.mul(item.quantity));
    }, new Prisma.Decimal(0));

    return this.prisma.invoice.create({
      data: {
        patientId: params.patientId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        totalAmount,
        dueDate: params.dueDate,
        note: params.note,
        createdById: params.staffId,
        items: {
          create: params.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice.mul(item.quantity),
            sourceType: item.sourceType,
            sourceId: item.sourceId,
            dateFrom: item.dateFrom,
            dateTo: item.dateTo,
          })),
        },
      },
      include: { items: true, patient: true },
    });
  }

  async payInvoice(params: {
    invoiceId: string;
    cashAmount: Prisma.Decimal;
    bonusAmount: Prisma.Decimal;
    staffId: string;
    note?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: params.invoiceId },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }
      if (
        invoice.status === InvoiceStatus.PAID ||
        invoice.status === InvoiceStatus.CANCELLED
      ) {
        throw new BadRequestException(`Invoice is already ${invoice.status}`);
      }

      const totalPayment = params.cashAmount.add(params.bonusAmount);

      const invoicePayment = await tx.invoicePayment.create({
        data: {
          invoiceId: invoice.id,
          cashAmount: params.cashAmount,
          bonusAmount: params.bonusAmount,
          totalAmount: totalPayment,
          note: params.note,
          createdById: params.staffId,
        },
      });

      await this.balanceService.charge(tx, {
        patientId: invoice.patientId,
        totalAmount: totalPayment,
        cashToUse: params.cashAmount,
        bonusToUse: params.bonusAmount,
        source: BalanceTxSource.INVOICE_PAYMENT,
        sourceId: invoicePayment.id,
        note: params.note,
        staffId: params.staffId,
      });

      const newPaidCash = invoice.paidCash.add(params.cashAmount);
      const newPaidBonus = invoice.paidBonus.add(params.bonusAmount);
      const newStatus = newPaidCash
        .add(newPaidBonus)
        .greaterThanOrEqualTo(invoice.totalAmount)
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

      return tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidCash: newPaidCash,
          paidBonus: newPaidBonus,
          status: newStatus,
        },
        include: INVOICE_INCLUDE,
      });
    });
  }

  async getInvoice(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
  }

  async cancelInvoice(id: string) {
    const inv = await this.prisma.invoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
      include: INVOICE_INCLUDE,
    });
  }

  async getPatientInvoices(
    patientId: string,
    params: { page: number; limit: number },
  ) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: INVOICE_INCLUDE,
      }),
      this.prisma.invoice.count({ where: { patientId } }),
    ]);
    return { data, total, page, limit };
  }
}